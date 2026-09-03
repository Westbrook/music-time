import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createApp, useTimeZone } from './helpers/app.mjs';

const stylesheet = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

async function createStyledApp(t) {
    const app = await createApp(t);
    const style = app.document.createElement('style');
    style.textContent = stylesheet;
    app.document.head.append(style);
    return app;
}

function focusButton(card) {
    const buttons = card.querySelectorAll('.card-focus-button');
    assert.equal(buttons.length, 1, 'Each card has exactly one focus control');
    return buttons[0];
}

function assertSameNodes(actual, expected) {
    assert.equal(actual.length, expected.length);
    expected.forEach((node, index) => assert.equal(actual[index], node));
}

function assertOnlyVisibleCard(app, selected) {
    for (const card of app.document.querySelectorAll('.card')) {
        assert.equal(
            app.window.getComputedStyle(card).display === 'none',
            card !== selected,
            `${card.querySelector('h2').textContent} has the expected visibility`
        );
    }
}

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

function assertAudioStopped(app) {
    assert.equal(app.element('toneBtn').textContent.trim(), 'Start Tone');
    assert.equal(app.element('metronomeBtn').textContent.trim(), 'Start Metronome');
    assert.deepEqual(heldNotes(app), []);
    assert.equal(app.document.querySelectorAll('.piano-key.active').length, 0);
    assert.equal(app.element('beatIndicator').querySelectorAll('.active, .accent').length, 0);
    const voiceCounts = app.contexts.map((context) => context.oscillators.length);
    app.clock.tick(1_000);
    assert.deepEqual(
        app.contexts.map((context) => context.oscillators.length),
        voiceCounts,
        'Stopped audio must not schedule more voices'
    );
    for (const context of app.contexts) {
        for (const voice of context.oscillators) {
            assert.equal(voice.playing, false);
            assert.equal(voice.disconnected, true);
        }
        assert.ok(context.gains.every((gain) => gain.disconnected));
    }
}

for (const headingId of [
    'practiceHeading',
    'historyHeading',
    'metronomeHeading',
    'tunerHeading',
    'chordalHeading'
]) {
    test(`${headingId} can focus and restore every card without replacing existing controls`, async (t) => {
        const app = await createStyledApp(t);
        const cards = [...app.document.querySelectorAll('.card')];
        const originalDisplays = cards.map((card) => app.window.getComputedStyle(card).display);
        const originalParents = cards.map((card) => card.parentElement);
        const controls = [...app.document.querySelectorAll('input, select, button')];
        const controlParents = controls.map((control) => control.parentElement);
        const selected = app.element(headingId).closest('.card');
        const button = focusButton(selected);
        const title = app.element(headingId).textContent;
        const saved = app.storage.readRaw();

        assert.equal(button.tagName, 'BUTTON');
        assert.equal(button.type, 'button');
        assert.equal(button.getAttribute('aria-label'), `Focus ${title}`);
        assert.equal(button.getAttribute('title'), `Focus ${title}`);
        assert.equal(button.getAttribute('aria-pressed'), 'false');
        const icon = button.querySelector('svg');
        assert.ok(icon, 'The focus control has an icon');
        assert.equal(icon.getAttribute('aria-hidden'), 'true');
        assert.equal(icon.getAttribute('focusable'), 'false');
        const unfocusedIcon = icon.innerHTML;

        app.click(button);

        assertOnlyVisibleCard(app, selected);
        assert.equal(button.getAttribute('aria-label'), `Remove focus from ${title}`);
        assert.equal(button.getAttribute('title'), `Remove focus from ${title}`);
        assert.equal(button.getAttribute('aria-pressed'), 'true');
        assert.notEqual(button.querySelector('svg').innerHTML, unfocusedIcon);
        assertSameNodes([...app.document.querySelectorAll('.card')], cards);
        assertSameNodes(
            cards.map((card) => card.parentElement),
            originalParents
        );
        assertSameNodes([...app.document.querySelectorAll('input, select, button')], controls);
        assertSameNodes(
            controls.map((control) => control.parentElement),
            controlParents
        );

        app.click(button);

        assert.deepEqual(
            cards.map((card) => app.window.getComputedStyle(card).display),
            originalDisplays
        );
        assertSameNodes([...app.document.querySelectorAll('.card')], cards);
        assert.equal(button.getAttribute('aria-label'), `Focus ${title}`);
        assert.equal(button.getAttribute('aria-pressed'), 'false');
        assert.equal(button.querySelector('svg').innerHTML, unfocusedIcon);
        assert.equal(app.storage.readRaw(), saved, 'Changing the layout does not save a session');
        assert.equal(app.contexts.length, 0, 'Changing the layout does not initialize audio');
    });
}

test('removing card focus restores scroll position and keeps keyboard focus on its control', async (t) => {
    const app = await createStyledApp(t);
    const card = app.element('chordalHeading').closest('.card');
    const button = focusButton(card);
    const scrollingElement = app.document.scrollingElement || app.document.documentElement;
    scrollingElement.scrollTop = 640;
    scrollingElement.scrollLeft = 24;
    button.focus();

    app.click(button);

    assert.equal(scrollingElement.scrollTop, 0);
    assert.equal(scrollingElement.scrollLeft, 0);
    assert.equal(app.document.activeElement, button);
    scrollingElement.scrollTop = 120;
    app.click(button);

    assert.equal(scrollingElement.scrollTop, 640);
    assert.equal(scrollingElement.scrollLeft, 24);
    assert.equal(app.document.activeElement, button);
});

for (const [formId, controlId, value, playbackId, label] of [
    ['metronomeForm', 'bpmInput', '85', 'metronomeBtn', 'Metronome'],
    ['toneForm', 'noteSelect', 'A', 'toneBtn', 'Tone']
]) {
    test(`${label} focus controls preserve drafts, audio, and native form submission`, async (t) => {
        const app = await createStyledApp(t);
        const form = app.element(formId);
        const button = focusButton(form);
        const control = app.element(controlId);
        const playback = app.element(playbackId);
        const submissions = [];
        form.addEventListener('submit', (event) => submissions.push(event));
        app.input(controlId, value, control.tagName === 'SELECT' ? 'change' : 'input');

        app.click(button);

        assertOnlyVisibleCard(app, form);
        assert.equal(submissions.length, 0, 'Focusing a form must not submit it');
        assert.equal(app.contexts.length, 0);
        assert.equal(app.element(controlId), control);
        assert.equal(control.value, value);
        assert.equal(control.form, form);
        assert.equal(playback.form, form);
        app.click(playback);
        assert.equal(submissions.length, 1);
        assert.equal(submissions[0].submitter, playback);
        assert.equal(submissions[0].defaultPrevented, true);
        assert.equal(playback.textContent.trim(), `Stop ${label}`);
        const context = app.contexts[0];
        const voice = context.oscillators[0];
        assert.equal(voice.playing, true);
        const originalStopCalls = voice.stopCalls.length;

        app.click(button);
        assert.equal(submissions.length, 1, 'Removing focus must not submit the form');
        assert.equal(voice.playing, true, 'Removing focus preserves active playback');
        assert.equal(voice.stopCalls.length, originalStopCalls);
        assert.equal(control.value, value);
        app.click(button);
        assert.equal(context.oscillators.length, 1, 'Refocusing does not restart playback');
        form.requestSubmit();

        assert.equal(submissions.length, 2);
        assert.equal(submissions[1].defaultPrevented, true);
        assert.equal(playback.textContent.trim(), `Start ${label}`);
        app.clock.tick(1_000);
        assert.equal(voice.playing, false);
        assert.equal(voice.disconnected, true);
        assert.equal(context.oscillators.length, 1);
    });
}

test('focused Chordal Studies preserves held notes and momentary release and stop controls', async (t) => {
    const app = await createStyledApp(t);
    const card = app.element('chordalHeading').closest('.card');
    const held = keyFor(app, 'Hold');
    const momentary = keyFor(app, 'Momentary', 'D');
    app.click(held);
    const context = app.contexts[0];
    const heldVoice = context.oscillators[0];

    app.click(focusButton(card));

    assertOnlyVisibleCard(app, card);
    assert.equal(heldVoice.playing, true);
    assert.deepEqual(heldNotes(app), ['C3']);
    app.pointer(momentary, 'pointerdown');
    const momentaryVoice = context.oscillators.at(-1);
    assert.equal(momentaryVoice.playing, true);
    app.pointer(momentary, 'pointerup');
    app.clock.tick(250);
    assert.equal(momentaryVoice.playing, false);
    assert.equal(momentaryVoice.disconnected, true);
    assert.equal(heldVoice.playing, true);
    app.click('stopNotesBtn');
    assertAudioStopped(app);
    assertOnlyVisibleCard(app, card);
});

test('focused Practice Timer Pause, Start, and Done preserve timing and control hidden audio tools', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createStyledApp(t);
    const timer = app.element('practiceHeading').closest('.card');
    const focus = focusButton(timer);
    app.input('bpmInput', 60);
    app.input('beatsPerMeasure', 3);
    app.input('noteSelect', 'A', 'change');
    app.input('octaveSelect', 4, 'change');
    app.input('instrumentSelect', 'triangle', 'change');
    app.click('startBtn');
    app.click('metronomeBtn');
    app.click('toneBtn');
    app.click(keyFor(app, 'Hold'));
    app.click(keyFor(app, 'Hold', 'E', 4));
    app.clock.tick(925);
    const context = app.contexts[0];
    const voices = [...context.oscillators];
    const stopCounts = voices.map((voice) => voice.stopCalls.length);

    app.click(focus);

    assertOnlyVisibleCard(app, timer);
    assert.deepEqual(context.oscillators, voices, 'Focusing does not replace active audio nodes');
    assert.deepEqual(
        voices.map((voice) => voice.stopCalls.length),
        stopCounts,
        'Hiding audio cards does not stop their playback'
    );
    assert.deepEqual(heldNotes(app), ['C3', 'E4']);
    app.clock.tick(1_000);
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:01');
    const queuedBeat = context.oscillators.find((voice) => voice.startTime > context.currentTime);
    assert.ok(queuedBeat, 'Pause is exercised with a future metronome beat already queued');
    app.click('pauseBtn');

    assert.equal(app.storage.readSaved().activeSession.status, 'paused');
    assert.equal(app.storage.readSaved().activeSession.elapsedMs, 1_925);
    assert.equal(app.element('startBtn').disabled, false);
    assert.equal(app.element('pauseBtn').disabled, true);
    assert.equal(app.element('doneBtn').disabled, false);
    assert.ok(queuedBeat.stopTime <= context.currentTime, 'Pause cancels the future beat');
    assertAudioStopped(app);
    assertOnlyVisibleCard(app, timer);
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:01');
    const voicesBeforeResume = context.oscillators.length;
    app.click('startBtn');

    assert.equal(app.element('startBtn').disabled, true);
    assert.equal(app.element('pauseBtn').disabled, false);
    assert.equal(app.element('toneBtn').textContent.trim(), 'Stop Tone');
    assert.equal(app.element('metronomeBtn').textContent.trim(), 'Stop Metronome');
    assert.deepEqual(heldNotes(app), ['C3', 'E4']);
    const restored = context.oscillators.slice(voicesBeforeResume);
    assert.equal(
        restored.length,
        4,
        'Resume restores one beat, the tuning tone, and two held notes'
    );
    for (const [frequency, type] of [
        [440, 'sine'],
        [130.81, 'triangle'],
        [329.63, 'triangle']
    ]) {
        const voice = restored.find((voice) => voice.frequency.value === frequency);
        assert.ok(voice, `Resume restores ${frequency} Hz`);
        assert.equal(voice.playing, true);
        assert.equal(voice.type, type);
    }
    app.clock.tick(2_100);
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:04');
    app.click('doneBtn');

    assert.deepEqual(app.storage.readSaved(), {
        version: 2,
        dailyData: { '2026-08-26': 4.025 },
        activeSession: null
    });
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:00');
    assert.equal(app.element('pauseBtn').disabled, true);
    assert.equal(app.element('doneBtn').disabled, true);
    assertAudioStopped(app);
    assertOnlyVisibleCard(app, timer);
    app.click(focus);
    for (const card of app.document.querySelectorAll('.card')) {
        assert.notEqual(app.window.getComputedStyle(card).display, 'none');
    }
    app.click('startBtn');
    assertAudioStopped(app);
    assert.deepEqual(app.storage.readSaved().dailyData, { '2026-08-26': 4.025 });
});
