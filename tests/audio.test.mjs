import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from './helpers/app.mjs';

function keyFor(app, mode, note = 'C') {
    const key = app
        .element(`pianoKeyboard${mode}`)
        .querySelector(`[data-note="${note}"][data-octave="3"]`);
    assert.ok(key, `Missing ${mode} key ${note}3`);
    return key;
}

function assertAudioNotice(app) {
    const notice = app.element('audioStatus');
    assert.equal(notice.hidden, false);
    assert.ok(notice.textContent.trim(), 'An audio failure must have a visible explanation');
    assert.equal(notice.getAttribute('role'), 'status');
}

function assertDisposed(context) {
    for (const oscillator of context.oscillators) {
        assert.equal(oscillator.playing, false);
        assert.equal(oscillator.disconnected, true);
        assert.equal(oscillator.connections.size, 0);
    }
    for (const gain of context.gains) {
        assert.equal(gain.disconnected, true);
        assert.equal(gain.connections.size, 0);
    }
}

test('the tuning tone responds to note and volume changes and cleans up after stopping', async (t) => {
    const app = await createApp(t);
    app.click('toneBtn');
    const context = app.contexts[0];
    const oscillator = context.oscillators[0];
    const gain = context.gains[0];

    assert.equal(oscillator.frequency.value, 174.61);
    assert.equal(oscillator.playing, true);
    app.input('noteSelect', 'A', 'change');
    app.input('octaveSelect', 4, 'change');
    app.input('volumeSlider', 80);
    assert.equal(oscillator.frequency.value, 440);
    assert.equal(gain.gain.value, 0.24);
    assert.equal(app.element('freqDisplay').textContent, '440.00 Hz');

    app.click('toneBtn');
    app.clock.tick(100);
    assert.equal(oscillator.playing, false);
    assert.equal(oscillator.disconnected, true);
    assert.equal(gain.disconnected, true);
    assert.equal(app.element('toneBtn').textContent.trim(), 'Start Tone');
});

test('the metronome schedules the selected tempo and accents each measure', async (t) => {
    const app = await createApp(t);
    app.input('bpmInput', 60);
    app.input('beatsPerMeasure', 3, 'change');
    app.click('metronomeBtn');
    app.clock.tick(3_000);
    const oscillators = app.contexts[0].oscillators;

    assert.deepEqual(
        oscillators.map((node) => node.frequency.value),
        [1200, 800, 800, 1200]
    );
    assert.deepEqual(
        oscillators.map((node) => node.startCalls[0].time),
        [0, 1, 2, 3]
    );
    app.click('metronomeBtn');
    app.clock.tick(1_000);
    assert.equal(oscillators.length, 4);
    assert.equal(app.element('beatIndicator').querySelectorAll('.active, .accent').length, 0);
});

test('the metronome starts on its downbeat when audio time advances between startup reads', async (t) => {
    const app = await createApp(t, {
        audioOptions: { state: 'suspended', resume: 'deferred' }
    });
    app.click('metronomeBtn');
    const context = app.contexts[0];
    context.resolveResume();
    let timeReads = 0;
    Object.defineProperty(context, 'currentTime', {
        configurable: true,
        get() {
            return timeReads++ === 0 ? 0 : 0.002;
        }
    });
    await app.flushAudio();

    assert.equal(
        context.oscillators.length,
        1,
        'The first beat must play without waiting half a beat'
    );
    assert.equal(context.oscillators[0].frequency.value, 1200);
    assert.equal(context.oscillators[0].playing, true);
    assert.equal(app.element('metronomeBtn').textContent.trim(), 'Stop Metronome');
});

test('hold and momentary keyboards control the same pitch independently', async (t) => {
    const app = await createApp(t);
    const hold = app.element('pianoKeyboardHold').querySelector('[data-note="C"]');
    const momentary = app.element('pianoKeyboardMomentary').querySelector('[data-note="C"]');

    app.click(hold);
    app.pointer(momentary, 'pointerdown');
    const [heldVoice, momentaryVoice] = app.contexts[0].oscillators;
    assert.equal(heldVoice.frequency.value, 130.81);
    assert.equal(momentaryVoice.frequency.value, 130.81);

    app.pointer(momentary, 'pointerup');
    app.clock.tick(150);
    assert.equal(heldVoice.playing, true);
    assert.equal(momentaryVoice.playing, false);
    assert.equal(momentaryVoice.disconnected, true);

    app.click(hold);
    app.clock.tick(150);
    assert.equal(heldVoice.playing, false);
    assert.equal(heldVoice.disconnected, true);
});

test('restarting a tone before its release finishes disposes only the old voice', async (t) => {
    const app = await createApp(t);
    app.click('toneBtn');
    app.click('toneBtn');
    app.click('toneBtn');
    const [oldVoice, newVoice] = app.contexts[0].oscillators;
    app.clock.tick(100);

    assert.equal(oldVoice.playing, false);
    assert.equal(oldVoice.disconnected, true);
    assert.equal(newVoice.playing, true);
    assert.equal(newVoice.disconnected, false);
    assert.equal(app.element('toneBtn').textContent.trim(), 'Stop Tone');
});

test('a delayed metronome skips beats whose scheduled times have already passed', async (t) => {
    const app = await createApp(t);
    app.click('metronomeBtn');
    app.clock.jump(30_000);

    const scheduled = app.contexts[0].oscillators.flatMap((node) => node.startCalls);
    assert.ok(scheduled.length > 1, 'The metronome should resume after the delay');
    assert.ok(scheduled.length <= 3, 'A long delay must not cause a catch-up burst');
    assert.ok(
        scheduled.every(({ time, scheduledAt }) => time >= scheduledAt),
        'Audio must not be scheduled in the past to catch up missed beats'
    );
});

test('cancelling a momentary touch releases its note', async (t) => {
    const app = await createApp(t);
    const key = keyFor(app, 'Momentary');
    app.pointer(key, 'pointerdown', { pointerType: 'touch' });
    app.pointer(key, 'pointercancel', { pointerType: 'touch' });
    app.clock.tick(250);

    const voice = app.contexts[0].oscillators[0];
    assert.equal(voice.playing, false);
    assert.equal(voice.disconnected, true);
    assert.equal(key.classList.contains('active'), false);
});

test('all audio features lazily share one context and start synchronously when it is running', async (t) => {
    const app = await createApp(t);
    assert.equal(app.contexts.length, 0);
    app.click('toneBtn');
    app.click('metronomeBtn');
    app.click(keyFor(app, 'Hold'));
    app.pointer(keyFor(app, 'Momentary', 'D'), 'pointerdown');

    assert.equal(app.contexts.length, 1);
    const context = app.contexts[0];
    assert.equal(context.resumeCalls, 0);
    assert.deepEqual(
        context.oscillators.map((oscillator) => oscillator.frequency.value),
        [174.61, 1200, 130.81, 146.83]
    );
    assert.ok(context.oscillators.every((oscillator) => oscillator.playing));
});

test('the WebKit constructor fallback uses the same shared audio lifecycle', async (t) => {
    const app = await createApp(t, { audioOptions: { webkit: true } });
    app.click('toneBtn');
    app.click('metronomeBtn');

    assert.equal(app.contexts.length, 1);
    assert.equal(app.contexts[0].oscillators.length, 2);
    assert.ok(app.contexts[0].oscillators.every((oscillator) => oscillator.playing));
    app.fire(app.window, 'pagehide');
    assertDisposed(app.contexts[0]);
});

test('concurrent feature starts wait for one suspended-context resume before creating sounds', async (t) => {
    const app = await createApp(t, {
        audioOptions: { state: 'suspended', resume: 'deferred' }
    });
    app.click('toneBtn');
    app.click('metronomeBtn');
    app.click(keyFor(app, 'Hold'));
    app.pointer(keyFor(app, 'Momentary', 'D'), 'pointerdown', { pointerType: 'touch' });
    const context = app.contexts[0];

    assert.equal(app.contexts.length, 1);
    assert.equal(context.resumeCalls, 1);
    assert.equal(context.oscillators.length, 0);
    app.clock.tick(5_000);
    assert.equal(context.currentTime, 0, 'Suspended audio time must not follow the wall clock');
    assert.equal(context.oscillators.length, 0);

    context.resolveResume();
    await app.flushAudio();
    assert.equal(context.oscillators.length, 4);
    assert.ok(context.oscillators.every((oscillator) => oscillator.playing));
    assert.equal(app.element('toneBtn').textContent.trim(), 'Stop Tone');
    assert.equal(app.element('metronomeBtn').textContent.trim(), 'Stop Metronome');
});

test('controls changed while audio resumes are applied to the eventual voice', async (t) => {
    const app = await createApp(t, {
        audioOptions: { state: 'suspended', resume: 'deferred' }
    });
    app.click('toneBtn');
    app.input('noteSelect', 'A', 'change');
    app.input('octaveSelect', 4, 'change');
    app.input('volumeSlider', 80);
    const context = app.contexts[0];
    context.resolveResume();
    await app.flushAudio();

    assert.equal(context.oscillators[0].frequency.value, 440);
    assert.equal(context.gains[0].gain.value, 0.24);
});

test('a successful suspended-context resume starts audio on its resumed clock', async (t) => {
    const app = await createApp(t, { audioOptions: { state: 'suspended' } });
    app.click('toneBtn');
    const context = app.contexts[0];
    assert.equal(context.oscillators.length, 0);
    await app.flushAudio();

    assert.equal(context.state, 'running');
    assert.equal(context.oscillators.length, 1);
    assert.equal(context.oscillators[0].playing, true);
    app.clock.tick(1_000);
    assert.equal(context.currentTime, 1);
});

test('failed audio resume is visible, resets pending controls, and permits an explicit retry', async (t) => {
    const app = await createApp(t, {
        audioOptions: { state: 'suspended', resume: 'deferred' }
    });
    app.click('toneBtn');
    const context = app.contexts[0];
    context.rejectResume();
    await app.flushAudio();

    assertAudioNotice(app);
    assert.equal(context.oscillators.length, 0);
    assert.equal(app.element('toneBtn').textContent.trim(), 'Start Tone');

    app.click('toneBtn');
    assert.equal(context.resumeCalls, 2);
    context.resolveResume();
    await app.flushAudio();
    assert.equal(app.contexts.length, 1);
    assert.equal(context.oscillators[0].playing, true);
    assert.equal(app.element('audioStatus').hidden, true);
});

test('an immediately rejected resume is handled without an uncaught promise', async (t) => {
    const app = await createApp(t, { audioOptions: { state: 'suspended', resume: 'reject' } });
    app.click('metronomeBtn');
    await app.flushAudio();

    assertAudioNotice(app);
    assert.equal(app.contexts[0].oscillators.length, 0);
    assert.equal(app.element('metronomeBtn').textContent.trim(), 'Start Metronome');
});

test('unsupported audio leaves the timer usable and explains the limitation', async (t) => {
    const app = await createApp(t, { audioOptions: { supported: false } });
    app.click('toneBtn');
    app.click('metronomeBtn');
    app.click(keyFor(app, 'Hold'));
    await app.flushAudio();

    assertAudioNotice(app);
    assert.equal(app.contexts.length, 0);
    assert.equal(app.element('toneBtn').textContent.trim(), 'Start Tone');
    assert.equal(app.element('metronomeBtn').textContent.trim(), 'Start Metronome');
    app.click('startBtn');
    app.clock.tick(1_000);
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:01');
});

test('audio-constructor failures are visible without breaking other controls', async (t) => {
    const app = await createApp(t, { audioOptions: { constructorFailure: true } });
    app.click('toneBtn');
    app.click('metronomeBtn');
    app.pointer(keyFor(app, 'Momentary'), 'pointerdown', { pointerType: 'touch' });
    await app.flushAudio();

    assertAudioNotice(app);
    assert.equal(app.contexts.length, 0);
    assert.equal(app.element('toneBtn').textContent.trim(), 'Start Tone');
    assert.equal(app.element('metronomeBtn').textContent.trim(), 'Start Metronome');
    assert.equal(keyFor(app, 'Momentary').classList.contains('active'), false);
});

for (const feature of ['tone', 'metronome', 'hold']) {
    const toggle = (app) => {
        if (feature === 'hold') app.click(keyFor(app, 'Hold'));
        else app.click(feature === 'tone' ? 'toneBtn' : 'metronomeBtn');
    };

    test(`stopping a pending ${feature} cancels playback after resume`, async (t) => {
        const app = await createApp(t, {
            audioOptions: { state: 'suspended', resume: 'deferred' }
        });
        toggle(app);
        toggle(app);
        const context = app.contexts[0];
        context.resolveResume();
        await app.flushAudio();
        app.clock.tick(1_000);

        assert.equal(context.oscillators.length, 0);
        assert.equal(app.element('toneBtn').textContent.trim(), 'Start Tone');
        assert.equal(app.element('metronomeBtn').textContent.trim(), 'Start Metronome');
        assert.equal(keyFor(app, 'Hold').classList.contains('active'), false);
    });

    test(`restarting a pending ${feature} plays only the newest request`, async (t) => {
        const app = await createApp(t, {
            audioOptions: { state: 'suspended', resume: 'deferred' }
        });
        toggle(app);
        toggle(app);
        toggle(app);
        const context = app.contexts[0];
        context.resolveResume();
        await app.flushAudio();

        assert.equal(context.oscillators.length, 1);
        assert.equal(context.oscillators[0].playing, true);
    });
}

for (const release of [
    'pointerup',
    'outside pointerup',
    'pointercancel',
    'lostpointercapture',
    'blur',
    'hidden'
]) {
    test(`a pending momentary note cannot start after ${release}`, async (t) => {
        const app = await createApp(t, {
            audioOptions: { state: 'suspended', resume: 'deferred' }
        });
        const key = keyFor(app, 'Momentary');
        app.pointer(key, 'pointerdown', { pointerType: 'touch' });
        if (release === 'blur') app.fire(app.window, 'blur');
        else if (release === 'hidden') app.setHidden(true);
        else if (release === 'outside pointerup') {
            app.pointer(app.window, 'pointerup', { pointerType: 'touch' });
        } else app.pointer(key, release, { pointerType: 'touch' });
        const context = app.contexts[0];
        context.resolveResume();
        await app.flushAudio();

        assert.equal(context.oscillators.length, 0);
        assert.equal(key.classList.contains('active'), false);
    });
}

for (const release of ['blur', 'hidden']) {
    test(`${release} releases momentary notes without stopping intentional sustained audio`, async (t) => {
        const app = await createApp(t);
        const heldKey = keyFor(app, 'Hold');
        const momentaryKey = keyFor(app, 'Momentary', 'D');
        app.click('toneBtn');
        app.click('metronomeBtn');
        app.click(heldKey);
        app.pointer(momentaryKey, 'pointerdown');
        const context = app.contexts[0];
        const [tone, , held, momentary] = context.oscillators;

        if (release === 'blur') app.fire(app.window, 'blur');
        else app.setHidden(true);
        app.clock.tick(600);

        assert.equal(momentary.playing, false);
        assert.equal(momentary.disconnected, true);
        assert.equal(momentaryKey.classList.contains('active'), false);
        assert.equal(tone.playing, true);
        assert.equal(held.playing, true);
        assert.equal(heldKey.classList.contains('active'), true);
        assert.equal(app.element('metronomeBtn').textContent.trim(), 'Stop Metronome');
        assert.ok(context.oscillators.length > 4, 'Intentional metronome playback continues');
    });
}

test('hiding the page cancels only momentary requests while shared resume is pending', async (t) => {
    const app = await createApp(t, {
        audioOptions: { state: 'suspended', resume: 'deferred' }
    });
    app.click('toneBtn');
    app.click('metronomeBtn');
    app.click(keyFor(app, 'Hold'));
    app.pointer(keyFor(app, 'Momentary', 'D'), 'pointerdown', { pointerType: 'touch' });
    const context = app.contexts[0];
    app.setHidden(true);
    context.resolveResume();
    await app.flushAudio();

    assert.deepEqual(
        context.oscillators.map((oscillator) => oscillator.frequency.value),
        [174.61, 1200, 130.81]
    );
    assert.equal(keyFor(app, 'Hold').classList.contains('active'), true);
    assert.equal(keyFor(app, 'Momentary', 'D').classList.contains('active'), false);
});

test('a mouse release outside the key clears momentary notes without clearing hold notes', async (t) => {
    const app = await createApp(t);
    app.click(keyFor(app, 'Hold'));
    app.pointer(keyFor(app, 'Momentary', 'D'), 'pointerdown');
    const [held, momentary] = app.contexts[0].oscillators;
    app.pointer(app.window, 'pointerup');
    app.clock.tick(250);

    assert.equal(held.playing, true);
    assert.equal(momentary.playing, false);
    assert.equal(momentary.disconnected, true);
    assert.equal(keyFor(app, 'Momentary', 'D').classList.contains('active'), false);
});

test('lifting one of two touches on a key keeps the note until the final touch ends', async (t) => {
    const app = await createApp(t);
    const key = keyFor(app, 'Momentary');
    app.pointer(key, 'pointerdown', { pointerId: 1, pointerType: 'touch' });
    app.pointer(key, 'pointerdown', { pointerId: 2, pointerType: 'touch', isPrimary: false });
    const context = app.contexts[0];
    assert.equal(context.oscillators.length, 1);
    app.pointer(key, 'pointerup', { pointerId: 1, pointerType: 'touch' });
    app.clock.tick(250);

    assert.equal(context.oscillators[0].playing, true);
    assert.equal(key.classList.contains('active'), true);
    app.pointer(key, 'pointerup', { pointerId: 2, pointerType: 'touch', isPrimary: false });
    app.clock.tick(250);
    assertDisposed(context);
    assert.equal(key.classList.contains('active'), false);
});

for (const mode of ['Hold', 'Momentary']) {
    test(`repressing a ${mode.toLowerCase()} key during release preserves the new voice`, async (t) => {
        const app = await createApp(t);
        const key = keyFor(app, mode);
        if (mode === 'Hold') {
            app.click(key);
            app.click(key);
            app.click(key);
        } else {
            app.pointer(key, 'pointerdown');
            app.pointer(key, 'pointerup');
            app.pointer(key, 'pointerdown');
        }
        const context = app.contexts[0];
        const [oldVoice, newVoice] = context.oscillators;
        app.clock.tick(250);

        assert.equal(oldVoice.playing, false);
        assert.equal(oldVoice.disconnected, true);
        assert.equal(context.gains[0].disconnected, true);
        assert.equal(newVoice.playing, true);
        assert.equal(newVoice.disconnected, false);
        assert.equal(context.gains[1].disconnected, false);
        assert.equal(key.classList.contains('active'), true);
    });
}

test('repeated momentary press events do not allocate duplicate voices', async (t) => {
    const app = await createApp(t);
    const key = keyFor(app, 'Momentary');
    app.pointer(key, 'pointerdown');
    app.pointer(key, 'pointerdown', { pointerId: 2, pointerType: 'touch' });
    app.pointer(key, 'pointerdown');
    assert.equal(app.contexts[0].oscillators.length, 1);
    app.pointer(key, 'pointerup', { pointerId: 2, pointerType: 'touch' });
    app.clock.tick(250);
    assert.equal(app.contexts[0].oscillators[0].playing, true, 'Mouse input is still held');
    assert.equal(key.classList.contains('active'), true);
    app.pointer(key, 'pointerup');
    app.clock.tick(250);
    assertDisposed(app.contexts[0]);
});

test('repeated pending momentary presses allocate only one voice when resume succeeds', async (t) => {
    const app = await createApp(t, {
        audioOptions: { state: 'suspended', resume: 'deferred' }
    });
    const key = keyFor(app, 'Momentary');
    app.pointer(key, 'pointerdown', { pointerType: 'touch' });
    app.pointer(key, 'pointerdown', { pointerType: 'touch' });
    app.pointer(key, 'pointerdown', { pointerId: 2 });
    const context = app.contexts[0];
    context.resolveResume();
    await app.flushAudio();

    assert.equal(context.oscillators.length, 1);
    assert.equal(context.oscillators[0].playing, true);
});

test('voice release cancels the attack and schedules its stop on the audio clock immediately', async (t) => {
    const app = await createApp(t);
    app.click('toneBtn');
    app.click('toneBtn');
    const context = app.contexts[0];
    const oscillator = context.oscillators[0];
    const gain = context.gains[0];

    assert.equal(
        oscillator.stopCalls.length,
        1,
        'Stop must not depend on a later wall-clock timer'
    );
    assert.ok(oscillator.stopCalls[0].time > oscillator.stopCalls[0].scheduledAt);
    assert.ok(gain.gain.events.some(({ type }) => type === 'cancel' || type === 'hold'));
    assert.equal(
        oscillator.disconnected,
        false,
        'The release envelope stays connected until ended'
    );
    app.clock.tick(100);
    assert.equal(oscillator.ended, true);
    assertDisposed(context);
});

test('voice release supports contexts without cancelAndHoldAtTime', async (t) => {
    const app = await createApp(t, { audioOptions: { cancelAndHold: false } });
    app.click('toneBtn');
    app.click('toneBtn');
    const context = app.contexts[0];

    assert.ok(context.gains[0].gain.events.some(({ type }) => type === 'cancel'));
    assert.equal(context.oscillators[0].stopCalls.length, 1);
    app.clock.tick(100);
    assertDisposed(context);
});

test('finished metronome clicks disconnect their oscillator and gain nodes', async (t) => {
    const app = await createApp(t);
    app.click('metronomeBtn');
    const context = app.contexts[0];
    app.clock.tick(100);

    assert.equal(context.oscillators.length, 1);
    assert.equal(context.oscillators[0].ended, true);
    assertDisposed(context);
});

test('stopping the metronome cancels queued sounds and visual callbacks', async (t) => {
    const app = await createApp(t);
    app.click('metronomeBtn');
    app.clock.tick(425);
    const context = app.contexts[0];
    const queued = context.oscillators.find(
        (oscillator) => oscillator.startTime > context.currentTime
    );
    assert.ok(queued, 'The test must stop while a future beat is already queued');
    app.click('metronomeBtn');
    const countAtStop = context.oscillators.length;
    assert.ok(queued.stopTime <= context.currentTime);
    app.clock.tick(1_000);

    assert.equal(context.oscillators.length, countAtStop);
    assert.equal(app.element('beatIndicator').querySelectorAll('.active, .accent').length, 0);
    assertDisposed(context);
});

test('rapid metronome restart cannot flash a beat from the previous run', async (t) => {
    const app = await createApp(t);
    app.click('metronomeBtn');
    app.clock.tick(425);
    app.click('metronomeBtn');
    app.click('metronomeBtn');
    app.clock.tick(100);
    const dots = app.element('beatIndicator').children;

    assert.equal(dots[0].classList.contains('accent'), true);
    assert.equal(dots[1].classList.contains('active'), false);
});

test('zero metronome volume never schedules a positive gain', async (t) => {
    const app = await createApp(t);
    app.input('metronomeVolume', 0);
    app.click('metronomeBtn');
    app.clock.tick(1_000);

    assert.equal(app.element('metronomeVolumeDisplay').textContent, '0%');
    for (const gain of app.contexts[0].gains) {
        assert.equal(gain.gain.value, 0);
        assert.ok(
            gain.gain.events.every((event) => event.value === undefined || event.value === 0)
        );
    }
    assert.equal(app.element('metronomeBtn').textContent.trim(), 'Stop Metronome');
});

test('changing the meter cancels the old queue and restarts on the new downbeat', async (t) => {
    const app = await createApp(t);
    app.click('metronomeBtn');
    app.clock.tick(425);
    const context = app.contexts[0];
    const oldCount = context.oscillators.length;
    const queued = context.oscillators.find(
        (oscillator) => oscillator.startTime > context.currentTime
    );
    assert.ok(queued);
    app.input('beatsPerMeasure', 3, 'change');
    assert.ok(queued.stopTime <= context.currentTime);
    app.clock.tick(1_500);

    assert.equal(app.element('beatIndicator').children.length, 3);
    const newVoices = context.oscillators.slice(oldCount);
    assert.deepEqual(
        newVoices.slice(0, 4).map((oscillator) => oscillator.frequency.value),
        [1200, 800, 800, 1200]
    );
    assert.ok(
        newVoices.every((oscillator) =>
            oscillator.startCalls.every(({ time, scheduledAt }) => time >= scheduledAt)
        )
    );
});

test('pagehide stops every audio feature, releases nodes, and cancels future callbacks', async (t) => {
    const app = await createApp(t);
    app.click('toneBtn');
    app.click('metronomeBtn');
    app.click(keyFor(app, 'Hold'));
    app.pointer(keyFor(app, 'Momentary', 'D'), 'pointerdown', { pointerType: 'touch' });
    app.clock.tick(425);
    const context = app.contexts[0];
    const countAtHide = context.oscillators.length;
    app.fire(app.window, 'pagehide');
    app.clock.tick(5_000);

    assertDisposed(context);
    assert.equal(context.oscillators.length, countAtHide);
    assert.equal(app.element('toneBtn').textContent.trim(), 'Start Tone');
    assert.equal(app.element('metronomeBtn').textContent.trim(), 'Start Metronome');
    assert.equal(app.document.querySelectorAll('.piano-key.active').length, 0);
    assert.equal(keyFor(app, 'Hold').getAttribute('aria-pressed'), 'false');
    assert.equal(app.element('beatIndicator').querySelectorAll('.active, .accent').length, 0);
    assert.equal(context.state, 'closed');
    assert.equal(context.closeCalls, 1);
});

test('pagehide cancels every feature waiting for audio resume', async (t) => {
    const app = await createApp(t, {
        audioOptions: { state: 'suspended', resume: 'deferred' }
    });
    app.click('toneBtn');
    app.click('metronomeBtn');
    app.click(keyFor(app, 'Hold'));
    app.pointer(keyFor(app, 'Momentary', 'D'), 'pointerdown', { pointerType: 'touch' });
    const context = app.contexts[0];
    app.fire(app.window, 'pagehide');
    context.resolveResume();
    await app.flushAudio();
    app.clock.tick(5_000);

    assert.equal(context.oscillators.length, 0);
    assert.equal(app.element('toneBtn').textContent.trim(), 'Start Tone');
    assert.equal(app.element('metronomeBtn').textContent.trim(), 'Start Metronome');
    assert.equal(app.document.querySelectorAll('.piano-key.active').length, 0);
});

test('a new start after pagehide is independent of the old context pending resume', async (t) => {
    const app = await createApp(t, {
        audioOptions: { state: 'suspended', resume: 'deferred' }
    });
    app.click('toneBtn');
    const oldContext = app.contexts[0];
    app.fire(app.window, 'pagehide');
    app.click('metronomeBtn');
    assert.equal(app.contexts.length, 2);
    const newContext = app.contexts[1];
    oldContext.resolveResume();
    await app.flushAudio();

    assert.equal(oldContext.state, 'closed');
    assert.equal(oldContext.oscillators.length, 0);
    assert.equal(newContext.oscillators.length, 0);
    newContext.resolveResume();
    await app.flushAudio();
    assert.equal(newContext.oscillators.length, 1);
    assert.equal(newContext.oscillators[0].playing, true);
    assert.equal(app.element('metronomeBtn').textContent.trim(), 'Stop Metronome');
    assert.equal(app.element('toneBtn').textContent.trim(), 'Start Tone');
});

for (const state of ['suspended', 'interrupted']) {
    test(`${state} audio disposes active and releasing voices even while its clock is frozen`, async (t) => {
        const app = await createApp(t, { audioOptions: { resume: 'deferred' } });
        app.click('toneBtn');
        app.click('metronomeBtn');
        app.click(keyFor(app, 'Hold'));
        app.pointer(keyFor(app, 'Momentary', 'D'), 'pointerdown', { pointerType: 'touch' });
        app.pointer(keyFor(app, 'Momentary', 'D'), 'pointerup', { pointerType: 'touch' });
        const context = app.contexts[0];
        const countAtInterruption = context.oscillators.length;
        context.setState(state);
        app.clock.tick(5_000);

        assertAudioNotice(app);
        assertDisposed(context);
        assert.equal(context.currentTime, 0);
        assert.equal(context.oscillators.length, countAtInterruption);
        assert.equal(app.element('toneBtn').textContent.trim(), 'Start Tone');
        assert.equal(app.element('metronomeBtn').textContent.trim(), 'Start Metronome');
        assert.equal(app.document.querySelectorAll('.piano-key.active').length, 0);
        assert.equal(keyFor(app, 'Hold').getAttribute('aria-pressed'), 'false');

        app.click('toneBtn');
        assert.equal(context.resumeCalls, 1);
        assert.equal(context.oscillators.length, countAtInterruption);
        context.resolveResume();
        await app.flushAudio();
        assert.equal(context.oscillators.length, countAtInterruption + 1);
        assert.equal(context.oscillators.at(-1).playing, true);
        assert.equal(app.element('audioStatus').hidden, true);
    });
}

test('state interruption invalidates pending requests before a late resume resolves', async (t) => {
    const app = await createApp(t, {
        audioOptions: { state: 'suspended', resume: 'deferred' }
    });
    app.click('toneBtn');
    app.click('metronomeBtn');
    app.click(keyFor(app, 'Hold'));
    app.pointer(keyFor(app, 'Momentary', 'D'), 'pointerdown');
    const context = app.contexts[0];
    context.setState('interrupted');
    context.resolveResume();
    await app.flushAudio();
    app.clock.tick(1_000);

    assert.equal(context.oscillators.length, 0);
    assert.equal(app.element('toneBtn').textContent.trim(), 'Start Tone');
    assert.equal(app.element('metronomeBtn').textContent.trim(), 'Start Metronome');
    assert.equal(app.document.querySelectorAll('.piano-key.active').length, 0);

    app.click('toneBtn');
    assert.equal(context.oscillators.length, 1);
    assert.equal(context.oscillators[0].playing, true);
});
