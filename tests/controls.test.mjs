import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp, useTimeZone } from './helpers/app.mjs';

const pitches = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function keysFor(app, mode) {
    return [...app.element(`pianoKeyboard${mode}`).querySelectorAll('.piano-key')];
}

function keyFor(app, mode, index = 0) {
    return keysFor(app, mode)[index];
}

function accessibleName(element) {
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
        return labelledBy
            .split(/\s+/)
            .map((id) => element.ownerDocument.getElementById(id)?.textContent || '')
            .join(' ')
            .trim();
    }
    return (
        element.getAttribute('aria-label') ||
        [...(element.labels || [])].map((label) => label.textContent).join(' ') ||
        element.textContent
    ).trim();
}

// jsdom dispatches key events but does not synthesize the native button activation.
function activateButton(app, target, key, repeats = 0) {
    const down = app.keyboard(target, 'keydown', key);
    if (key === 'Enter' && !down.defaultPrevented) app.click(target);
    const repeatEvents = [];
    for (let index = 0; index < repeats; index++) {
        const repeat = app.keyboard(target, 'keydown', key, { repeat: true });
        repeatEvents.push(repeat);
        if (key === 'Enter' && !repeat.defaultPrevented) app.click(target);
    }
    releaseButton(app, target, key, down);
    return repeatEvents;
}

function releaseButton(app, target, key, down) {
    const up = app.keyboard(target, 'keyup', key);
    if (key === ' ' && !down.defaultPrevented && !up.defaultPrevented) app.click(target);
    return up;
}

function assertReleased(voice) {
    assert.equal(voice.playing, false);
    assert.equal(voice.disconnected, true);
}

function assertSameChildren(parent, expected) {
    assert.equal(parent.children.length, expected.length);
    expected.forEach((child, index) => assert.equal(parent.children[index], child));
}

function ringOffset(app, id) {
    const ring = app.element(id);
    assert.equal(ring.getAttribute('pathLength'), '1');
    const value = Number(ring.style.strokeDashoffset);
    assert.ok(Number.isFinite(value) && value >= 0 && value <= 1, `${id} must use unit progress`);
    return value;
}

test('every input has an accessible label and visual-only indicators are hidden from assistive technology', async (t) => {
    const app = await createApp(t);
    for (const input of app.document.querySelectorAll('input, select')) {
        assert.ok(accessibleName(input), `${input.id} needs an accessible label`);
    }
    for (const graphic of app.document.querySelectorAll('svg')) {
        assert.equal(graphic.getAttribute('aria-hidden'), 'true');
        assert.equal(graphic.getAttribute('focusable'), 'false');
    }
    assert.equal(app.element('beatIndicator').getAttribute('aria-hidden'), 'true');
    assert.equal(app.element('stopwatchDisplay').getAttribute('role'), 'timer');
    assert.equal(app.element('stopwatchDisplay').getAttribute('aria-live'), 'off');
    assert.equal(app.element('practiceStatus').getAttribute('role'), 'status');
    assert.equal(app.element('practiceStatus').getAttribute('aria-live') || 'polite', 'polite');
    assert.equal(app.element('toneBtn').hasAttribute('aria-pressed'), false);
    assert.equal(app.element('metronomeBtn').hasAttribute('aria-pressed'), false);
    assert.equal(app.element('stopNotesBtn').disabled, false);
});

for (const [formId, buttonId, label, controlIds] of [
    [
        'metronomeForm',
        'metronomeBtn',
        'Metronome',
        ['bpmInput', 'bpmSlider', 'beatsPerMeasure', 'metronomeVolume']
    ],
    ['toneForm', 'toneBtn', 'Tone', ['noteSelect', 'octaveSelect', 'volumeSlider']]
]) {
    test(`${label} button activation and form submission each toggle audio once without navigation`, async (t) => {
        const app = await createApp(t);
        const form = app.element(formId);
        const button = app.element(buttonId);
        assert.equal(form.tagName, 'FORM');
        assert.ok(accessibleName(form));
        for (const id of [...controlIds, buttonId]) assert.equal(app.element(id).form, form);
        const submissions = [];
        form.addEventListener('submit', (event) => submissions.push(event));

        app.click(button);
        assert.equal(submissions.length, 1);
        assert.equal(submissions[0].submitter, button);
        assert.equal(submissions[0].defaultPrevented, true);
        assert.equal(button.textContent.trim(), `Stop ${label}`);
        const context = app.contexts[0];
        assert.equal(context.oscillators.length, 1);

        form.requestSubmit();
        assert.equal(submissions.length, 2);
        assert.equal(submissions[1].defaultPrevented, true);
        assert.equal(button.textContent.trim(), `Start ${label}`);
        app.clock.tick(1_000);
        assert.equal(context.oscillators.length, 1);
        assertReleased(context.oscillators[0]);
    });

    test(`${label} form can cancel a start while audio resume is pending`, async (t) => {
        const app = await createApp(t, {
            audioOptions: { state: 'suspended', resume: 'deferred' }
        });
        const form = app.element(formId);
        form.requestSubmit();
        form.requestSubmit();
        const context = app.contexts[0];
        context.resolveResume();
        await app.flushAudio();
        assert.equal(context.oscillators.length, 0);
        assert.equal(app.element(buttonId).textContent.trim(), `Start ${label}`);
    });
}

for (const inputId of ['bpmInput', 'beatsPerMeasure']) {
    test(`Enter in ${inputId} commits both drafts and submits once, ignoring repeat and composition`, async (t) => {
        const app = await createApp(t);
        const form = app.element('metronomeForm');
        let submissions = 0;
        form.addEventListener('submit', () => submissions++);
        app.input('bpmInput', '123.6');
        app.input('beatsPerMeasure', '2.6');
        app.element(inputId).focus();

        const enter = app.keyboard(inputId, 'keydown', 'Enter');
        assert.equal(enter.defaultPrevented, true);
        assert.equal(submissions, 1);
        assert.equal(app.element('bpmInput').value, '124');
        assert.equal(app.element('beatsPerMeasure').value, '3');
        assert.equal(app.element('metronomeBtn').textContent.trim(), 'Stop Metronome');
        assert.equal(app.element('beatIndicator').children.length, 3);
        const context = app.contexts[0];
        assert.equal(context.oscillators.length, 1);

        assert.equal(
            app.keyboard(inputId, 'keydown', 'Enter', { repeat: true }).defaultPrevented,
            true
        );
        assert.equal(
            app.keyboard(inputId, 'keydown', 'Enter', { isComposing: true }).defaultPrevented,
            false
        );
        assert.equal(submissions, 1);
        assert.equal(context.oscillators.length, 1);

        app.input('bpmInput', '');
        app.input('beatsPerMeasure', '99');
        app.keyboard(inputId, 'keydown', 'Enter');
        assert.equal(submissions, 2);
        assert.equal(app.element('bpmInput').value, '124');
        assert.equal(app.element('beatsPerMeasure').value, '16');
        assert.equal(app.element('metronomeBtn').textContent.trim(), 'Start Metronome');
        app.clock.tick(1_000);
        assert.equal(
            context.oscillators.length,
            1,
            'Committing Stop must not start a new downbeat'
        );
        assertReleased(context.oscillators[0]);
    });
}

for (const mode of ['Hold', 'Momentary']) {
    test(`${mode} keys are named native buttons in chromatic order with one tab stop`, async (t) => {
        const app = await createApp(t);
        const group = app.element(`pianoKeyboard${mode}`);
        const keys = keysFor(app, mode);
        assert.equal(group.getAttribute('role'), 'group');
        assert.ok(accessibleName(group));
        assert.equal(keys.length, 24);
        assert.equal(new Set(keys.map(accessibleName)).size, 24, 'Each pitch has a distinct name');
        assert.deepEqual(
            keys.map((key) => `${key.dataset.note}${key.dataset.octave}`),
            [3, 4].flatMap((octave) => pitches.map((pitch) => `${pitch}${octave}`))
        );
        assert.equal(keys.filter((key) => key.tabIndex === 0).length, 1);
        for (const [index, key] of keys.entries()) {
            assert.equal(key.tagName, 'BUTTON');
            assert.equal(key.type, 'button');
            assert.ok(accessibleName(key), `Key ${index} must have an accessible name`);
            assert.equal(key.tabIndex, index === 0 ? 0 : -1);
            assert.equal(key.getAttribute('aria-pressed'), mode === 'Hold' ? 'false' : null);
        }
    });

    test(`${mode} arrow, Home, and End navigation moves focus without playing notes`, async (t) => {
        const app = await createApp(t);
        const keys = keysFor(app, mode);
        const otherMode = mode === 'Hold' ? 'Momentary' : 'Hold';
        keys[0].focus();
        for (const [key, targetIndex] of [
            ['ArrowRight', 1],
            ['ArrowRight', 2],
            ['ArrowLeft', 1],
            ['End', 23],
            ['Home', 0]
        ]) {
            const event = app.keyboard(app.document.activeElement, 'keydown', key);
            assert.equal(event.defaultPrevented, true);
            assert.equal(app.document.activeElement, keys[targetIndex]);
            assert.equal(keys.filter((button) => button.tabIndex === 0).length, 1);
            assert.equal(keys[targetIndex].tabIndex, 0);
        }
        assert.equal(keysFor(app, otherMode)[0].tabIndex, 0);
        assert.equal(app.contexts.length, 0);
    });
}

for (const key of ['Enter', ' ']) {
    test(`Hold ${key === ' ' ? 'Space' : key} activation toggles once and suppresses repeat`, async (t) => {
        const app = await createApp(t);
        const button = keyFor(app, 'Hold');
        const name = accessibleName(button);
        button.focus();
        const repeats = activateButton(app, button, key, 3);
        const voice = app.contexts[0].oscillators[0];
        assert.equal(voice.playing, true);
        assert.equal(button.getAttribute('aria-pressed'), 'true');
        assert.equal(accessibleName(button), name, 'A toggle retains its accessible name');

        assert.ok(
            repeats.every((repeat) => repeat.defaultPrevented),
            'Repeated native clicks must be suppressed'
        );
        assert.equal(app.contexts[0].oscillators.length, 1);
        assert.equal(button.getAttribute('aria-pressed'), 'true');

        activateButton(app, button, key);
        app.clock.tick(250);
        assertReleased(voice);
        assert.equal(button.getAttribute('aria-pressed'), 'false');
        assert.equal(accessibleName(button), name);
    });

    test(`Momentary ${key === ' ' ? 'Space' : key} plays only while held and prevents native click`, async (t) => {
        const app = await createApp(t);
        const button = keyFor(app, 'Momentary');
        button.focus();
        const down = app.keyboard(button, 'keydown', key);
        assert.equal(down.defaultPrevented, true);
        const voice = app.contexts[0].oscillators[0];
        assert.equal(voice.playing, true);
        app.keyboard(button, 'keydown', key, { repeat: true });
        assert.equal(app.contexts[0].oscillators.length, 1);
        app.keyboard(button, 'keyup', key);
        app.clock.tick(250);
        assertReleased(voice);
        assert.equal(button.classList.contains('active'), false);
        assert.equal(button.hasAttribute('aria-pressed'), false);
    });
}

for (const releaseFirst of ['keyboard', 'pointer']) {
    test(`mixed input keeps a momentary note after its ${releaseFirst} owner releases`, async (t) => {
        const app = await createApp(t);
        const key = keyFor(app, 'Momentary');
        key.focus();
        app.keyboard(key, 'keydown', ' ');
        app.pointer(key, 'pointerdown', { pointerId: 7, pointerType: 'touch' });
        const context = app.contexts[0];
        assert.equal(context.oscillators.length, 1);
        const releaseKeyboard = () => app.keyboard(key, 'keyup', ' ');
        const releasePointer = () => app.pointer(app.window, 'pointerup', { pointerId: 7 });
        if (releaseFirst === 'keyboard') releaseKeyboard();
        else releasePointer();
        app.clock.tick(500);
        assert.equal(context.oscillators[0].playing, true);
        assert.equal(key.classList.contains('active'), true);
        if (releaseFirst === 'keyboard') releasePointer();
        else releaseKeyboard();
        app.clock.tick(250);
        assertReleased(context.oscillators[0]);
    });
}

for (const releaseFirst of ['Enter', ' ']) {
    test(`Momentary Enter and Space ownership survives releasing ${releaseFirst === ' ' ? 'Space' : releaseFirst} first`, async (t) => {
        const app = await createApp(t);
        const key = keyFor(app, 'Momentary');
        key.focus();
        assert.equal(app.keyboard(key, 'keydown', 'Enter').defaultPrevented, true);
        assert.equal(app.keyboard(key, 'keydown', ' ').defaultPrevented, true);
        const context = app.contexts[0];
        assert.equal(context.oscillators.length, 1);
        const voice = context.oscillators[0];
        app.keyboard(key, 'keyup', releaseFirst);
        app.clock.tick(500);
        assert.equal(voice.playing, true);
        assert.equal(key.classList.contains('active'), true);
        app.keyboard(key, 'keyup', releaseFirst === 'Enter' ? ' ' : 'Enter');
        app.clock.tick(250);
        assertReleased(voice);
        assert.equal(key.classList.contains('active'), false);
        assert.equal(context.oscillators.length, 1);
    });
}

test('Escape cancels a pending Hold Space activation before keyup can restart its note', async (t) => {
    const app = await createApp(t, {
        audioOptions: { state: 'suspended', resume: 'deferred' }
    });
    const key = keyFor(app, 'Hold');
    key.focus();
    app.click(key);
    const context = app.contexts[0];
    const down = app.keyboard(key, 'keydown', ' ');
    assert.equal(down.defaultPrevented, false);
    assert.equal(key.getAttribute('aria-pressed'), 'true');
    app.keyboard(key, 'keydown', 'Escape');
    const up = releaseButton(app, key, ' ', down);
    assert.equal(up.defaultPrevented, true, 'Cancelled Space must not synthesize a native click');
    context.resolveResume();
    await app.flushAudio();
    assert.equal(context.oscillators.length, 0);
    assert.equal(key.getAttribute('aria-pressed'), 'false');
    assert.equal(key.classList.contains('active'), false);
});

test('moving keyboard focus releases its note without clearing a separate pointer owner', async (t) => {
    const app = await createApp(t);
    const [first, next] = keysFor(app, 'Momentary');
    first.focus();
    app.keyboard(first, 'keydown', 'Enter');
    app.pointer(first, 'pointerdown');
    app.keyboard(first, 'keydown', 'ArrowRight');
    assert.equal(app.document.activeElement, next);
    app.clock.tick(250);
    assert.equal(app.contexts[0].oscillators[0].playing, true);
    app.pointer(app.window, 'pointerup');
    app.clock.tick(250);
    assertReleased(app.contexts[0].oscillators[0]);
    assert.equal(app.contexts[0].oscillators.length, 1);
});

test('moving focus from a keyboard-only momentary note cancels a pending audio resume', async (t) => {
    const app = await createApp(t, { audioOptions: { state: 'suspended', resume: 'deferred' } });
    const key = keyFor(app, 'Momentary');
    key.focus();
    app.keyboard(key, 'keydown', 'Enter');
    app.keyboard(key, 'keydown', 'ArrowRight');
    const context = app.contexts[0];
    context.resolveResume();
    await app.flushAudio();
    assert.equal(context.oscillators.length, 0);
    assert.equal(key.classList.contains('active'), false);
});

test('a secondary pointer button and unrelated keyboard keys cannot start notes', async (t) => {
    const app = await createApp(t);
    for (const mode of ['Hold', 'Momentary']) {
        const key = keyFor(app, mode);
        app.pointer(key, 'pointerdown', { button: 2, buttons: 2 });
        app.pointer(key, 'pointerup', { button: 2 });
        app.keyboard(key, 'keydown', 'a');
        app.keyboard(key, 'keyup', 'a');
    }
    assert.equal(app.contexts.length, 0);
});

test('interacting with a key label uses its owning button on either keyboard', async (t) => {
    const app = await createApp(t);
    const hold = keyFor(app, 'Hold');
    const momentary = keyFor(app, 'Momentary');
    app.click(hold.querySelector('.piano-key-label'), { detail: 1 });
    app.pointer(momentary.querySelector('.piano-key-label'), 'pointerdown');
    const [heldVoice, momentaryVoice] = app.contexts[0].oscillators;
    assert.equal(heldVoice.playing, true);
    assert.equal(momentaryVoice.playing, true);
    assert.equal(hold.getAttribute('aria-pressed'), 'true');
    app.pointer(app.window, 'pointerup');
    app.click(hold.querySelector('.piano-key-label'), { detail: 1 });
    app.clock.tick(250);
    assertReleased(heldVoice);
    assertReleased(momentaryVoice);
    assert.equal(hold.getAttribute('aria-pressed'), 'false');
});

test('pointer capture keeps a note through pointerleave and outside release ends it once', async (t) => {
    const app = await createApp(t);
    const key = keyFor(app, 'Momentary');
    const captured = [];
    key.setPointerCapture = (id) => captured.push(id);
    app.pointer(key, 'pointerdown', { pointerId: 8, pointerType: 'pen' });
    assert.deepEqual(captured, [8]);
    app.pointer(key, 'pointerleave', { pointerId: 8, pointerType: 'pen' });
    const voice = app.contexts[0].oscillators[0];
    app.clock.tick(500);
    assert.equal(voice.playing, true);
    app.pointer(app.window, 'pointerup', { pointerId: 8, pointerType: 'pen' });
    app.pointer(key, 'lostpointercapture', { pointerId: 8, pointerType: 'pen' });
    app.clock.tick(250);
    assertReleased(voice);
    assert.equal(voice.stopCalls.length, 1);
});

test('releasing the primary mouse button while another button remains held stops its note', async (t) => {
    const app = await createApp(t);
    const key = keyFor(app, 'Momentary');
    app.pointer(key, 'pointerdown', { buttons: 1 });
    const voice = app.contexts[0].oscillators[0];
    app.pointer(key, 'pointermove', { button: 2, buttons: 3 });
    app.clock.tick(250);
    assert.equal(voice.playing, true);
    // Pointer Events report this button transition as a move, not the final pointerup.
    app.pointer(app.window, 'pointermove', { button: 0, buttons: 2 });
    app.clock.tick(250);
    assertReleased(voice);
    assert.equal(key.classList.contains('active'), false);
    app.pointer(app.window, 'pointerup', { button: 2, buttons: 0 });
    assert.equal(voice.stopCalls.length, 1);
});

test('releasing one touch does not release a different key or the other touch on that key', async (t) => {
    const app = await createApp(t);
    const [first, second] = keysFor(app, 'Momentary');
    app.pointer(first, 'pointerdown', { pointerId: 1, pointerType: 'touch' });
    app.pointer(first, 'pointerdown', { pointerId: 2, pointerType: 'touch', isPrimary: false });
    app.pointer(second, 'pointerdown', { pointerId: 3, pointerType: 'touch', isPrimary: false });
    const [firstVoice, secondVoice] = app.contexts[0].oscillators;
    app.pointer(app.window, 'pointercancel', { pointerId: 1, pointerType: 'touch' });
    app.clock.tick(250);
    assert.equal(firstVoice.playing, true);
    assert.equal(secondVoice.playing, true);
    app.pointer(app.window, 'pointerup', { pointerId: 2, pointerType: 'touch' });
    app.clock.tick(250);
    assertReleased(firstVoice);
    assert.equal(secondVoice.playing, true);
    app.pointer(app.window, 'pointerup', { pointerId: 3, pointerType: 'touch' });
    app.clock.tick(250);
    assertReleased(secondVoice);
});

test('the click following a pointer release does not restart a momentary note', async (t) => {
    const app = await createApp(t);
    const key = keyFor(app, 'Momentary');
    app.pointer(key, 'pointerdown');
    app.pointer(key, 'pointerup');
    app.click(key, { detail: 1 });
    app.clock.tick(500);
    assert.equal(app.contexts[0].oscillators.length, 1);
    assertReleased(app.contexts[0].oscillators[0]);
    assert.equal(key.classList.contains('active'), false);
});

test('a click-only momentary activation schedules a bounded audition on the audio clock', async (t) => {
    const app = await createApp(t);
    const key = keyFor(app, 'Momentary');
    app.click(key);
    const context = app.contexts[0];
    const voice = context.oscillators[0];
    assert.equal(voice.playing, true);
    assert.ok(voice.stopCalls.length > 0, 'The audition stop is scheduled immediately');
    assert.ok(voice.stopTime > context.currentTime && voice.stopTime <= context.currentTime + 0.5);
    app.clock.tick(1_000);
    assertReleased(voice);
    assert.equal(key.classList.contains('active'), false);
});

test('changing chord settings during an audition preserves its end and applies to the next audition', async (t) => {
    const app = await createApp(t);
    const key = keyFor(app, 'Momentary');
    app.click(key);
    const context = app.contexts[0];
    const firstVoice = context.oscillators[0];
    const firstGain = context.gains[0].gain;
    const envelope = firstGain.events.slice();
    const stopTime = firstVoice.stopTime;
    assert.ok(Math.abs(stopTime - firstVoice.startTime - 0.3) < 1e-9);
    app.clock.tick(100);
    app.input('chordVolumeSlider', 80);
    app.input('instrumentSelect', 'triangle', 'change');
    assert.deepEqual(firstGain.events, envelope, 'The bounded audition keeps its gain envelope');
    assert.equal(firstVoice.type, 'sine');
    assert.equal(firstVoice.stopTime, stopTime);
    assert.equal(firstVoice.stopCalls.length, 1);
    app.clock.tick(200);
    assertReleased(firstVoice);
    assert.equal(key.classList.contains('active'), false);

    app.click(key);
    const nextVoice = context.oscillators[1];
    const nextGain = context.gains[1].gain;
    assert.equal(nextVoice.type, 'triangle');
    assert.ok(nextGain.events.some((event) => event.type === 'linear' && event.value === 0.24));
    assert.ok(Math.abs(nextVoice.stopTime - nextVoice.startTime - 0.3) < 1e-9);
    app.clock.tick(300);
    assertReleased(nextVoice);
    assert.equal(key.classList.contains('active'), false);
});

test('a click-only audition cancelled during resume does not start after pagehide', async (t) => {
    const app = await createApp(t, { audioOptions: { state: 'suspended', resume: 'deferred' } });
    const key = keyFor(app, 'Momentary');
    app.click(key);
    const context = app.contexts[0];
    app.fire(app.window, 'pagehide');
    context.resolveResume();
    await app.flushAudio();
    app.clock.tick(1_000);
    assert.equal(context.oscillators.length, 0);
    assert.equal(key.classList.contains('active'), false);
});

test('a pointer press can replace a click-only audition without its old stop ending the held note', async (t) => {
    const app = await createApp(t);
    const key = keyFor(app, 'Momentary');
    app.click(key);
    app.clock.tick(100);
    app.pointer(key, 'pointerdown');
    app.clock.tick(600);
    const context = app.contexts[0];
    const heldVoice = context.oscillators.at(-1);
    assert.equal(heldVoice.playing, true);
    assert.equal(key.classList.contains('active'), true);
    app.pointer(key, 'pointerup');
    app.clock.tick(250);
    assertReleased(heldVoice);
});

test('a click-only activation cannot impose a timed stop on a momentary note already held', async (t) => {
    const app = await createApp(t);
    const key = keyFor(app, 'Momentary');
    app.pointer(key, 'pointerdown');
    const voice = app.contexts[0].oscillators[0];
    app.click(key);
    app.clock.tick(1_000);
    assert.equal(voice.playing, true);
    assert.equal(app.contexts[0].oscillators.length, 1);
    app.pointer(key, 'pointerup');
    app.clock.tick(250);
    assertReleased(voice);
});

for (const stop of [
    'button',
    'Hold',
    'Momentary',
    'instrumentSelect',
    'chordVolumeSlider',
    'stopNotesBtn'
]) {
    const action = stop === 'button' ? 'Stop chord notes' : `Escape on ${stop}`;
    const activateStop = (app) => {
        if (stop === 'button') app.click('stopNotesBtn');
        else {
            const target =
                stop === 'Hold' || stop === 'Momentary' ? keyFor(app, stop) : app.element(stop);
            target.focus();
            assert.equal(app.keyboard(target, 'keydown', 'Escape').defaultPrevented, true);
            assert.equal(app.document.activeElement, target);
        }
    };
    test(`${action} stops chord notes without changing settings or interrupting other features`, async (t) => {
        const app = await createApp(t);
        app.input('instrumentSelect', 'triangle', 'change');
        app.input('chordVolumeSlider', 72);
        app.click('startBtn');
        app.click('toneBtn');
        app.click('metronomeBtn');
        const hold = keyFor(app, 'Hold');
        const momentary = keyFor(app, 'Momentary');
        app.click(hold);
        app.pointer(momentary, 'pointerdown');
        const [tone, , heldVoice, momentaryVoice] = app.contexts[0].oscillators;
        let stopClicks = 0;
        app.element('stopNotesBtn').addEventListener('click', () => stopClicks++);
        activateStop(app);
        assert.equal(stopClicks, 1);
        app.clock.tick(1_000);
        assertReleased(heldVoice);
        assertReleased(momentaryVoice);
        assert.equal(hold.getAttribute('aria-pressed'), 'false');
        assert.equal(app.document.querySelectorAll('.piano-key.active').length, 0);
        assert.equal(tone.playing, true);
        assert.equal(app.element('toneBtn').textContent.trim(), 'Stop Tone');
        assert.equal(app.element('metronomeBtn').textContent.trim(), 'Stop Metronome');
        assert.equal(app.element('stopwatchDisplay').textContent, '00:00:01');
        assert.ok(app.contexts[0].oscillators.length > 4);
        assert.equal(app.element('instrumentSelect').value, 'triangle');
        assert.equal(app.element('chordVolumeSlider').value, '72');
        assert.equal(app.element('chordVolumeDisplay').textContent, '72%');
    });

    test(`${action} also invalidates chord requests waiting for a shared audio resume`, async (t) => {
        const app = await createApp(t, {
            audioOptions: { state: 'suspended', resume: 'deferred' }
        });
        const hold = keyFor(app, 'Hold');
        const momentary = keyFor(app, 'Momentary');
        app.click(hold);
        app.keyboard(momentary, 'keydown', 'Enter');
        assert.equal(hold.getAttribute('aria-pressed'), 'true');
        activateStop(app);
        const context = app.contexts[0];
        context.resolveResume();
        await app.flushAudio();
        assert.equal(context.oscillators.length, 0);
        assert.equal(hold.getAttribute('aria-pressed'), 'false');
        assert.equal(momentary.classList.contains('active'), false);
    });
}

test('Escape outside Chordal Studies keeps intentional chord playback running', async (t) => {
    const app = await createApp(t);
    app.click(keyFor(app, 'Hold'));
    const voice = app.contexts[0].oscillators[0];
    for (const id of ['bpmInput', 'metronomeVolume', 'noteSelect', 'volumeSlider', 'startBtn']) {
        app.element(id).focus();
        const event = app.keyboard(id, 'keydown', 'Escape');
        app.clock.tick(500);
        assert.equal(event.defaultPrevented, false);
        assert.equal(voice.playing, true);
    }
});

test('tempo editing changes audio only for valid whole values and restores blanks on commit', async (t) => {
    const app = await createApp(t);
    app.input('bpmInput', 150);
    assert.equal(app.element('bpmInput').getAttribute('aria-invalid'), 'false');
    assert.equal(app.element('bpmDisplay').textContent, '150');
    assert.equal(app.element('bpmSlider').value, '150');
    for (const text of ['', '0', '999', '150.6', 'invalid']) {
        app.input('bpmInput', text);
        assert.equal(app.element('bpmInput').getAttribute('aria-invalid'), 'true');
        assert.equal(app.element('bpmDisplay').textContent, '150');
        assert.equal(app.element('bpmSlider').value, '150');
        assert.equal(app.element('bpmInput').value, text === 'invalid' ? '' : text);
    }
    app.fire('bpmInput', 'blur');
    assert.equal(app.element('bpmInput').getAttribute('aria-invalid'), 'false');
    assert.equal(app.element('bpmInput').value, '150');
    app.click('metronomeBtn');
    app.clock.tick(800);
    assert.deepEqual(
        app.contexts[0].oscillators.map((voice) => voice.startCalls[0].time),
        [0, 0.4, 0.8]
    );
});

test('tempo commit rounds and clamps while numeric exponent input is parsed as a full number', async (t) => {
    const app = await createApp(t);
    for (const [text, expected, event] of [
        ['999', 240, 'change'],
        ['1', 40, 'blur'],
        ['123.6', 124, 'Enter'],
        ['1e2', 100, 'change']
    ]) {
        app.input('bpmInput', text);
        if (event === 'Enter') app.keyboard('bpmInput', 'keydown', 'Enter');
        else app.fire('bpmInput', event);
        assert.equal(app.element('bpmInput').value, String(expected));
        assert.equal(app.element('bpmInput').getAttribute('aria-invalid'), 'false');
        assert.equal(app.element('bpmSlider').value, String(expected));
        assert.equal(app.element('bpmDisplay').textContent, String(expected));
    }
    app.input('bpmInput', '');
    assert.equal(app.element('bpmInput').getAttribute('aria-invalid'), 'true');
    app.input('bpmSlider', 135);
    assert.equal(app.element('bpmInput').getAttribute('aria-invalid'), 'false');
    assert.equal(app.element('bpmInput').value, '135');
    assert.equal(app.element('bpmDisplay').textContent, '135');
});

test('meter editing keeps invalid text without replacing the last valid beats', async (t) => {
    const app = await createApp(t);
    app.input('beatsPerMeasure', 3);
    assert.equal(app.element('beatsPerMeasure').getAttribute('aria-invalid'), 'false');
    assert.equal(app.element('beatIndicator').children.length, 3);
    const dots = [...app.element('beatIndicator').children];
    for (const text of ['', '0', '17', '2.5', 'invalid']) {
        app.input('beatsPerMeasure', text);
        assert.equal(app.element('beatsPerMeasure').getAttribute('aria-invalid'), 'true');
        assertSameChildren(app.element('beatIndicator'), dots);
        assert.equal(app.element('beatsPerMeasure').value, text === 'invalid' ? '' : text);
    }
    app.fire('beatsPerMeasure', 'blur');
    assert.equal(app.element('beatsPerMeasure').getAttribute('aria-invalid'), 'false');
    assert.equal(app.element('beatsPerMeasure').value, '3');
    assertSameChildren(app.element('beatIndicator'), dots);
    app.click('metronomeBtn');
    app.clock.tick(1_500);
    assert.deepEqual(
        app.contexts[0].oscillators.map((voice) => voice.frequency.value),
        [1200, 800, 800, 1200]
    );
});

test('meter commit rounds and clamps zero to one without resetting unchanged beat nodes', async (t) => {
    const app = await createApp(t);
    for (const [text, expected, event] of [
        ['0', 1, 'change'],
        ['99', 16, 'blur'],
        ['2.6', 3, 'Enter']
    ]) {
        app.input('beatsPerMeasure', text);
        if (event === 'Enter') app.keyboard('beatsPerMeasure', 'keydown', 'Enter');
        else app.fire('beatsPerMeasure', event);
        assert.equal(app.element('beatsPerMeasure').value, String(expected));
        assert.equal(app.element('beatsPerMeasure').getAttribute('aria-invalid'), 'false');
        assert.equal(app.element('beatIndicator').children.length, expected);
        const dots = [...app.element('beatIndicator').children];
        app.fire('beatsPerMeasure', 'change');
        app.fire('beatsPerMeasure', 'blur');
        assertSameChildren(app.element('beatIndicator'), dots);
    }
});

test('committing a live meter edit does not schedule the new downbeat a second time', async (t) => {
    const app = await createApp(t);
    app.click('metronomeBtn');
    const context = app.contexts[0];
    app.input('beatsPerMeasure', 3);
    assert.equal(context.oscillators.length, 2);
    assert.equal(context.oscillators[1].frequency.value, 1200);
    assert.equal(app.element('beatIndicator').children.length, 3);
    app.fire('beatsPerMeasure', 'change');
    app.fire('beatsPerMeasure', 'blur');
    assert.equal(context.oscillators.length, 2);
    app.clock.tick(1_500);
    assert.deepEqual(
        context.oscillators.slice(1).map((voice) => voice.frequency.value),
        [1200, 800, 800, 1200]
    );
});

for (const [sliderId, displayId] of [
    ['volumeSlider', 'volumeDisplay'],
    ['metronomeVolume', 'metronomeVolumeDisplay'],
    ['chordVolumeSlider', 'chordVolumeDisplay']
]) {
    test(`${sliderId} uses the same rounded, bounded percentage for its value, label, and audio`, async (t) => {
        const app = await createApp(t);
        const slider = app.element(sliderId);
        assert.equal(slider.getAttribute('aria-valuetext'), `${slider.value}%`);
        for (const [value, expected] of [
            [40.6, 41],
            [-5, 0],
            [105, 100]
        ]) {
            app.input(sliderId, value);
            assert.equal(slider.value, String(expected));
            assert.equal(app.element(displayId).textContent, `${expected}%`);
            assert.equal(slider.getAttribute('aria-valuetext'), `${expected}%`);
        }
        app.input(sliderId, 40.6);
        if (sliderId === 'volumeSlider') app.click('toneBtn');
        else if (sliderId === 'metronomeVolume') app.click('metronomeBtn');
        else app.click(keyFor(app, 'Hold'));
        const gain = app.contexts[0].gains[0].gain;
        const peak = 0.41 * (sliderId === 'metronomeVolume' ? 0.5 : 0.3);
        assert.ok(gain.events.some((event) => event.type === 'linear' && event.value === peak));
        assert.ok(
            gain.events.every((event) => event.value === undefined || Number.isFinite(event.value))
        );
    });
}

test('invalid tuning selections retain the last pitch instead of producing NaN or an error', async (t) => {
    const app = await createApp(t);
    app.input('noteSelect', 'A', 'change');
    app.input('octaveSelect', 4, 'change');
    app.click('toneBtn');
    const voice = app.contexts[0].oscillators[0];
    for (const [id, invalidValue, expected] of [
        ['noteSelect', '', 'A'],
        ['noteSelect', 'constructor', 'A'],
        ['octaveSelect', '4.5', '4'],
        ['octaveSelect', '9', '4']
    ]) {
        const option = app.document.createElement('option');
        option.value = invalidValue;
        app.element(id).appendChild(option);
        app.input(id, invalidValue, 'change');
        assert.equal(app.element(id).value, expected);
        assert.equal(voice.frequency.value, 440);
        assert.equal(app.element('freqDisplay').textContent, '440.00 Hz');
        assert.equal(app.element('noteDisplay').textContent, 'A4');
    }
});

test('invalid waveform changes retain the last instrument across both keyboards', async (t) => {
    const app = await createApp(t);
    app.click(keyFor(app, 'Hold'));
    app.pointer(keyFor(app, 'Momentary'), 'pointerdown');
    app.input('instrumentSelect', 'triangle', 'change');
    const voices = app.contexts[0].oscillators;
    assert.ok(voices.every((voice) => voice.type === 'triangle'));
    app.input('instrumentSelect', 'invalid', 'change');
    assert.equal(app.element('instrumentSelect').value, 'triangle');
    assert.ok(voices.every((voice) => voice.type === 'triangle'));
});

test('practice status announces state transitions without mutations on ordinary timer ticks', async (t) => {
    const app = await createApp(t);
    const status = app.element('practiceStatus');
    const observer = new app.window.MutationObserver(() => {});
    observer.observe(status, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true
    });
    t.after(() => observer.disconnect());
    const idle = status.textContent;
    app.click('startBtn');
    const running = status.textContent;
    assert.notEqual(running, idle);
    assert.match(running, /running|started/i);
    observer.takeRecords();
    app.clock.tick(1_500);
    assert.deepEqual(observer.takeRecords(), []);
    assert.equal(status.textContent, running);
    app.click('pauseBtn');
    const paused = status.textContent;
    assert.notEqual(paused, running);
    assert.match(paused, /paused/i);
    observer.takeRecords();
    app.clock.tick(60_000);
    assert.deepEqual(observer.takeRecords(), []);
    app.click('startBtn');
    assert.match(status.textContent, /running|started|resumed/i);
    app.clock.tick(100);
    app.click('doneBtn');
    assert.match(status.textContent, /saved|complete/i);
});

test('failed Done does not announce a successful save and its retry does', async (t) => {
    const app = await createApp(t);
    app.click('startBtn');
    app.clock.tick(1_000);
    app.storage.failWrites = true;
    app.click('doneBtn');
    const status = app.element('practiceStatus');
    assert.match(status.textContent, /paused|could not|failed|unsaved/i);
    assert.doesNotMatch(status.textContent, /session saved|successfully saved/i);
    app.storage.failWrites = false;
    app.click('doneBtn');
    assert.match(status.textContent, /saved|complete/i);
});

test('timer rings cycle seconds and minutes while hours fill on an eight-hour scale', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t, {
        storedData: {
            version: 2,
            dailyData: {},
            activeSession: {
                status: 'paused',
                elapsedMs: 3_630_500,
                dailyMs: { '2026-08-26': 3_630_500 },
                timestamp: Date.parse('2026-08-26T12:00:00Z')
            }
        }
    });
    assert.equal(app.element('stopwatchDisplay').textContent, '01:00:30');
    assert.ok(Math.abs(ringOffset(app, 'ringSeconds') - (1 - 30.5 / 60)) < 1e-9);
    assert.equal(ringOffset(app, 'ringMinutes'), 1);
    assert.equal(ringOffset(app, 'ringHours'), 1 - 1 / 8);
    assert.equal(app.document.getElementById('ringDays'), null);
    assert.equal(app.document.querySelectorAll('.timer-ring-progress').length, 3);
});

for (const hours of [8, 9, 24, 168]) {
    test(`the timer hours ring stays full at ${hours} hours while smaller units keep cycling`, async (t) => {
        const app = await createApp(t, {
            storedData: {
                version: 2,
                dailyData: {},
                activeSession: {
                    status: 'paused',
                    elapsedMs: hours * 3_600_000 + 31 * 60_000 + 30_500,
                    dailyMs: {},
                    timestamp: Date.parse('2026-08-26T12:00:00Z')
                }
            }
        });
        assert.equal(
            app.element('stopwatchDisplay').textContent,
            `${String(hours).padStart(2, '0')}:31:30`
        );
        assert.equal(ringOffset(app, 'ringHours'), 0);
        assert.ok(Math.abs(ringOffset(app, 'ringMinutes') - (1 - 31 / 60)) < 1e-9);
        assert.ok(Math.abs(ringOffset(app, 'ringSeconds') - (1 - 30.5 / 60)) < 1e-9);
    });
}

for (const [totalMinutes, text, minutes, hours] of [
    [0, '0m', 0, 0],
    [30, '30m', 30, 0],
    [59, '59m', 59, 0],
    [60, '1h 0m', 0, 1],
    [90, '1h 30m', 30, 1],
    [479, '7h 59m', 59, 7],
    [480, '8h 0m', 0, 8],
    [541, '9h 1m', 1, 8]
]) {
    test(`Today rings show ${text} with repeating minutes and a capped hours ring`, async (t) => {
        useTimeZone(t, 'UTC');
        const app = await createApp(t, {
            storedData: {
                version: 2,
                dailyData: { '2026-08-26': totalMinutes * 60 },
                activeSession: null
            }
        });
        assert.equal(app.element('todayTotal').textContent, text);
        assert.equal(ringOffset(app, 'todayMinutesRing'), 1 - minutes / 60);
        assert.equal(ringOffset(app, 'todayRing'), 1 - hours / 8);
    });
}

for (const [totalMinutes, text, minutes, hours, days] of [
    [0, '0m', 0, 0, 0],
    [30, '30m', 30, 0, 0],
    [60, '1h 0m', 0, 1, 0],
    [1_439, '23h 59m', 59, 23, 0],
    [1_440, '24h 0m', 0, 0, 1],
    [1_530, '25h 30m', 30, 1, 1],
    [3_360, '56h 0m', 0, 8, 2],
    [10_079, '167h 59m', 59, 23, 6],
    [10_080, '168h 0m', 0, 0, 7],
    [10_141, '169h 1m', 1, 1, 7]
]) {
    test(`weekly rings show ${text} in minutes, hours within a day, and up to seven days`, async (t) => {
        useTimeZone(t, 'UTC');
        const app = await createApp(t, {
            storedData: {
                version: 2,
                dailyData: { '2026-08-25': totalMinutes * 60 },
                activeSession: null
            }
        });
        assert.equal(app.element('todayTotal').textContent, '0m');
        assert.equal(app.element('weekTotal').textContent, text);
        assert.equal(ringOffset(app, 'weekMinutesRing'), 1 - minutes / 60);
        assert.equal(ringOffset(app, 'weekRing'), 1 - hours / 24);
        assert.equal(ringOffset(app, 'weekDaysRing'), 1 - days / 7);
    });
}

for (const [label, elapsedMs, priorSeconds, before, after] of [
    ['eight hours', 28_799_500, 0, [7 / 8, 59 / 60, 7 / 24, 0], [1, 0, 8 / 24, 0]],
    ['one weekly day', 3_599_500, 23 * 3_600, [0, 59 / 60, 23 / 24, 0], [1 / 8, 0, 0, 1 / 7]]
]) {
    test(`live rings carry into ${label} without losing active practice`, async (t) => {
        useTimeZone(t, 'UTC');
        const app = await createApp(t, {
            storedData: {
                version: 2,
                dailyData: { '2026-08-25': priorSeconds },
                activeSession: {
                    status: 'running',
                    elapsedMs,
                    dailyMs: { '2026-08-26': elapsedMs },
                    timestamp: Date.parse('2026-08-26T12:00:00Z')
                }
            }
        });
        const ids = ['todayRing', 'todayMinutesRing', 'weekRing', 'weekDaysRing'];
        ids.forEach((id, index) => assert.equal(ringOffset(app, id), 1 - before[index]));
        app.clock.tick(500);
        ids.forEach((id, index) => assert.equal(ringOffset(app, id), 1 - after[index]));
        assert.equal(ringOffset(app, 'ringHours'), 1 - after[0]);
        assert.equal(ringOffset(app, 'ringMinutes'), 1);
        assert.equal(ringOffset(app, 'ringSeconds'), 1);
        assert.equal(ringOffset(app, 'weekMinutesRing'), 1);
        const total = app.element('weekTotal').textContent;
        app.click('doneBtn');
        assert.equal(app.element('weekTotal').textContent, total);
        for (const id of ['ringSeconds', 'ringMinutes', 'ringHours']) {
            assert.equal(ringOffset(app, id), 1);
        }
    });
}
