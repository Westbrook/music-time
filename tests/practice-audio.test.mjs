import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from './helpers/app.mjs';

function keyFor(app, mode, note = 'C', octave = 3) {
    const key = app
        .element(`pianoKeyboard${mode}`)
        .querySelector(`[data-note="${note}"][data-octave="${octave}"]`);
    assert.ok(key, `Missing ${mode} key ${note}${octave}`);
    return key;
}

function heldNotes(app) {
    return [...app.element('pianoKeyboardHold').querySelectorAll('[aria-pressed="true"]')]
        .map((key) => `${key.dataset.note}${key.dataset.octave}`)
        .sort();
}

function setSettings(app, settings) {
    for (const [id, value] of Object.entries(settings)) {
        app.input(id, value, app.element(id).tagName === 'SELECT' ? 'change' : 'input');
    }
}

function assertStoppedControls(app) {
    assert.equal(app.element('toneBtn').textContent.trim(), 'Start Tone');
    assert.equal(app.element('metronomeBtn').textContent.trim(), 'Start Metronome');
    assert.deepEqual(heldNotes(app), []);
    assert.equal(app.document.querySelectorAll('.piano-key.active').length, 0);
    assert.equal(app.element('beatIndicator').querySelectorAll('.active, .accent').length, 0);
}

function assertAudioSettles(app) {
    const counts = app.contexts.map((context) => context.oscillators.length);
    app.clock.tick(1_000);
    assert.deepEqual(
        app.contexts.map((context) => context.oscillators.length),
        counts,
        'Stopped features must not schedule additional sounds'
    );
    for (const context of app.contexts) {
        for (const oscillator of context.oscillators) {
            assert.equal(oscillator.playing, false);
            assert.equal(oscillator.disconnected, true);
        }
        assert.ok(context.gains.every((gain) => gain.disconnected));
    }
}

function startAllTools(app) {
    app.click('metronomeBtn');
    app.click('toneBtn');
    app.click(keyFor(app, 'Hold'));
}

test('Pause stops audio and Start restores captured settings and the exact held chord', async (t) => {
    const app = await createApp(t);
    const settings = {
        bpmInput: 60,
        beatsPerMeasure: 3,
        metronomeVolume: 35,
        noteSelect: 'A',
        octaveSelect: 4,
        volumeSlider: 80,
        instrumentSelect: 'triangle',
        chordVolumeSlider: 60
    };
    setSettings(app, settings);
    app.click('startBtn');
    startAllTools(app);
    app.click(keyFor(app, 'Hold', 'E', 4));
    app.clock.tick(925);
    const context = app.contexts[0];
    const queuedBeat = context.oscillators.find((voice) => voice.startTime > context.currentTime);
    assert.ok(queuedBeat, 'Pause should be tested with a future metronome beat already queued');

    app.click('pauseBtn');

    assertStoppedControls(app);
    assert.ok(queuedBeat.stopTime <= context.currentTime, 'Pause must cancel queued clicks now');
    for (const voice of context.oscillators) {
        assert.ok(
            voice.stopTime !== null && voice.stopTime <= context.currentTime + 0.11,
            'Pause must schedule every voice release without waiting for a later timer'
        );
    }
    assertAudioSettles(app);
    setSettings(app, {
        bpmInput: 144,
        beatsPerMeasure: 7,
        metronomeVolume: 10,
        noteSelect: 'D',
        octaveSelect: 2,
        volumeSlider: 20,
        instrumentSelect: 'square',
        chordVolumeSlider: 25
    });
    app.click(keyFor(app, 'Hold', 'D'));
    const independentNote = context.oscillators.at(-1);
    assert.equal(independentNote.playing, true, 'Audio controls remain usable while paused');
    const previousCount = context.oscillators.length;
    app.click('startBtn');

    for (const [id, value] of Object.entries(settings)) {
        assert.equal(app.element(id).value, String(value), `${id} restores the paused setting`);
    }
    assert.equal(app.element('bpmSlider').value, '60');
    assert.equal(app.element('bpmDisplay').textContent, '60');
    assert.equal(app.element('beatIndicator').children.length, 3);
    assert.equal(app.element('metronomeVolumeDisplay').textContent, '35%');
    assert.equal(app.element('noteDisplay').textContent, 'A4');
    assert.equal(app.element('freqDisplay').textContent, '440.00 Hz');
    assert.equal(app.element('volumeDisplay').textContent, '80%');
    assert.equal(app.element('chordVolumeDisplay').textContent, '60%');
    assert.deepEqual(heldNotes(app), ['C3', 'E4']);
    assert.equal(app.element('toneBtn').textContent.trim(), 'Stop Tone');
    assert.equal(app.element('metronomeBtn').textContent.trim(), 'Stop Metronome');

    const restored = context.oscillators.slice(previousCount);
    assert.equal(restored.length, 4);
    for (const [frequency, type, volume] of [
        [440, 'sine', 0.24],
        [130.81, 'triangle', 0.18],
        [329.63, 'triangle', 0.18]
    ]) {
        const voice = restored.find((node) => node.frequency.value === frequency);
        assert.ok(voice, `Restored sound at ${frequency} Hz`);
        assert.equal(voice.playing, true);
        assert.equal(voice.type, type);
        assert.equal([...voice.connections][0].gain.value, volume);
    }
    const firstBeat = restored.find((node) => node.frequency.value === 1200);
    assert.ok(firstBeat);
    assert.ok(
        [...firstBeat.connections][0].gain.events.some((event) => event.value === 0.175),
        'The restored metronome uses its captured volume'
    );
    app.clock.tick(3_000);
    assert.equal(independentNote.playing, false);
    assert.equal(independentNote.disconnected, true);
    const beats = context.oscillators
        .slice(previousCount)
        .filter((voice) => voice.frequency.value === 1200 || voice.frequency.value === 800);
    assert.deepEqual(
        beats.map((voice) => voice.frequency.value),
        [1200, 800, 800, 1200]
    );
    for (const [index, voice] of beats.entries()) {
        assert.ok(
            Math.abs(voice.startTime - firstBeat.startTime - index) < 1e-9,
            'Restored 60 BPM beats remain one second apart'
        );
    }
});

for (const activeTool of ['metronome', 'tone', 'hold', 'none']) {
    test(`Pause and Start restore only ${activeTool === 'none' ? 'silence' : activeTool}`, async (t) => {
        const app = await createApp(t);
        if (activeTool === 'hold') app.click(keyFor(app, 'Hold'));
        else if (activeTool !== 'none') app.click(`${activeTool}Btn`);
        const beforeStart = app.contexts[0]?.oscillators.length ?? 0;
        app.click('startBtn');
        assert.equal(
            app.contexts[0]?.oscillators.length ?? 0,
            beforeStart,
            'An initial timer Start leaves independently controlled audio alone'
        );
        app.clock.tick(200);
        app.click('pauseBtn');
        assertStoppedControls(app);
        assertAudioSettles(app);
        const beforeResume = app.contexts[0]?.oscillators.length ?? 0;
        app.click('startBtn');

        assert.equal(
            app.element('metronomeBtn').textContent.trim(),
            activeTool === 'metronome' ? 'Stop Metronome' : 'Start Metronome'
        );
        assert.equal(
            app.element('toneBtn').textContent.trim(),
            activeTool === 'tone' ? 'Stop Tone' : 'Start Tone'
        );
        assert.deepEqual(heldNotes(app), activeTool === 'hold' ? ['C3'] : []);
        assert.equal(
            app.contexts[0]?.oscillators.length ?? 0,
            beforeResume + (activeTool === 'none' ? 0 : 1)
        );
        if (activeTool === 'none') assert.equal(app.contexts.length, 0);
    });
}

test('each Pause captures the current active tools instead of reusing an earlier snapshot', async (t) => {
    const app = await createApp(t);
    app.click('startBtn');
    app.click('toneBtn');
    app.click(keyFor(app, 'Hold'));
    app.click('pauseBtn');
    app.click('startBtn');
    assert.equal(app.element('toneBtn').textContent.trim(), 'Stop Tone');
    assert.deepEqual(heldNotes(app), ['C3']);

    app.click('toneBtn');
    app.click(keyFor(app, 'Hold'));
    app.click('metronomeBtn');
    app.click(keyFor(app, 'Hold', 'D'));
    app.input('bpmInput', 83);
    app.click('pauseBtn');
    app.input('bpmInput', 120);
    app.click('startBtn');

    assert.equal(app.element('toneBtn').textContent.trim(), 'Start Tone');
    assert.equal(app.element('metronomeBtn').textContent.trim(), 'Stop Metronome');
    assert.deepEqual(heldNotes(app), ['D3']);
    assert.equal(app.element('bpmInput').value, '83');
    app.click('metronomeBtn');
    app.click('stopNotesBtn');
    app.click('pauseBtn');
    app.click('startBtn');
    assertStoppedControls(app);
    assertAudioSettles(app);
});

test('Pause silences momentary presses and auditions without latching them on Start', async (t) => {
    const app = await createApp(t);
    app.click('startBtn');
    const pressed = keyFor(app, 'Momentary', 'D');
    const audition = keyFor(app, 'Momentary', 'F');
    app.pointer(pressed, 'pointerdown', { pointerType: 'touch' });
    app.click(audition);
    const context = app.contexts[0];
    assert.equal(context.oscillators.length, 2);
    app.clock.tick(100);
    app.click('pauseBtn');
    assertStoppedControls(app);
    app.click('startBtn');
    assertStoppedControls(app);
    assertAudioSettles(app);
    assert.equal(context.oscillators.length, 2);

    app.pointer(pressed, 'pointerup', { pointerType: 'touch' });
    app.pointer(pressed, 'pointerdown', { pointerType: 'touch' });
    assert.equal(context.oscillators.length, 3, 'A fresh press can play after resuming');
    assert.equal(context.oscillators.at(-1).playing, true);
});

for (const sessionState of ['running', 'paused']) {
    test(`Done clears ${sessionState} audio and prevents a later Start from restoring it`, async (t) => {
        const app = await createApp(t);
        app.click('startBtn');
        startAllTools(app);
        app.clock.tick(200);
        if (sessionState === 'paused') {
            app.click('pauseBtn');
            assertStoppedControls(app);
            startAllTools(app);
            app.click(keyFor(app, 'Hold', 'E'));
        }
        app.pointer(keyFor(app, 'Momentary', 'D'), 'pointerdown');
        app.click('doneBtn');

        assertStoppedControls(app);
        assert.equal(app.storage.readSaved().activeSession, null);
        assert.equal(app.element('stopwatchDisplay').textContent, '00:00:00');
        assertAudioSettles(app);
        app.click('startBtn');
        assertStoppedControls(app);
        assertAudioSettles(app);
    });
}

for (const action of ['pauseBtn', 'doneBtn']) {
    test(`${action === 'pauseBtn' ? 'Pause' : 'Done'} cancels original and restored starts while audio resume is pending`, async (t) => {
        const app = await createApp(t, {
            audioOptions: { state: 'suspended', resume: 'deferred' }
        });
        app.click('startBtn');
        startAllTools(app);
        app.pointer(keyFor(app, 'Momentary', 'D'), 'pointerdown');
        const context = app.contexts[0];
        assert.equal(context.resumeCalls, 1);
        assert.equal(context.oscillators.length, 0);
        app.clock.tick(200);
        app.click('pauseBtn');
        assertStoppedControls(app);
        app.click('startBtn');
        assert.equal(app.element('toneBtn').textContent.trim(), 'Stop Tone');
        assert.equal(app.element('metronomeBtn').textContent.trim(), 'Stop Metronome');
        assert.deepEqual(heldNotes(app), ['C3']);
        app.click(action);
        assertStoppedControls(app);
        context.resolveResume();
        await app.flushAudio();
        assertAudioSettles(app);
        assert.equal(context.oscillators.length, 0, 'Late readiness cannot play canceled requests');

        app.click('startBtn');
        if (action === 'pauseBtn') {
            assert.equal(context.oscillators.length, 3);
            assert.deepEqual(heldNotes(app), ['C3']);
            assert.equal(app.element('toneBtn').textContent.trim(), 'Stop Tone');
            assert.equal(app.element('metronomeBtn').textContent.trim(), 'Stop Metronome');
        } else {
            assertStoppedControls(app);
            assert.equal(context.oscillators.length, 0);
        }
    });
}

test('a failed Done save still stops independent audio and discards the paused snapshot', async (t) => {
    const app = await createApp(t);
    app.click('startBtn');
    startAllTools(app);
    app.clock.tick(1_250);
    app.click('pauseBtn');
    assertStoppedControls(app);
    startAllTools(app);
    app.pointer(keyFor(app, 'Momentary', 'D'), 'pointerdown');
    app.storage.failWrites = true;
    app.click('doneBtn');

    assertStoppedControls(app);
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:01');
    assert.match(app.element('storageStatus').textContent, /could not be saved/);
    assert.equal(app.element('startBtn').disabled, false);
    assertAudioSettles(app);
    app.click('startBtn');
    assertStoppedControls(app);
    assertAudioSettles(app);
    app.storage.failWrites = false;
    app.click('doneBtn');
    assert.equal(app.storage.readSaved().activeSession, null);
});

test('paused audio snapshots stay in memory and a reloaded session resumes silently', async (t) => {
    const app = await createApp(t);
    app.click('startBtn');
    startAllTools(app);
    app.clock.tick(200);
    app.click('pauseBtn');
    const saved = app.storage.readSaved();

    assert.deepEqual(Object.keys(saved).sort(), ['activeSession', 'dailyData', 'version']);
    assert.deepEqual(Object.keys(saved.activeSession).sort(), [
        'dailyMs',
        'elapsedMs',
        'status',
        'timestamp'
    ]);
    assert.ok(
        app.storage.writes.every(({ key }) => key === '__test__' || key === 'trombonePracticeData'),
        'Audio snapshots must not be written under another localStorage key'
    );
    const reloaded = await createApp(t, { storedData: saved });
    reloaded.click('startBtn');
    assertStoppedControls(reloaded);
    assert.equal(reloaded.contexts.length, 0);
});
