import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp, useTimeZone } from './helpers/app.mjs';

const hour = 3_600_000;
const grace = 15 * 60_000;

function jump(app, milliseconds) {
    app.clock.setSystemTime(app.clock.now + milliseconds);
    app.fire(app.window, 'focus');
}

function runningData(timestamp, elapsedMs = 0, extra = {}) {
    return {
        version: 2,
        dailyData: {},
        activeSession: {
            status: 'running',
            elapsedMs,
            dailyMs: elapsedMs ? { '2026-08-26': elapsedMs } : {},
            timestamp: Date.parse(timestamp),
            ...extra
        }
    };
}

test('the check-in appears at a full active hour and counts down from fifteen minutes', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t, { now: '2026-08-26T12:23:00Z' });
    assert.equal(app.element('practiceCheckIn').hidden, true);
    app.click('startBtn');
    jump(app, hour - 500);
    assert.equal(app.element('practiceCheckIn').hidden, true);
    app.clock.tick(500);

    assert.equal(app.element('stopwatchDisplay').textContent, '01:00:00');
    assert.equal(app.element('practiceCheckIn').hidden, false);
    assert.match(app.element('practiceCheckIn').textContent, /Still working\?/);
    assert.equal(app.element('checkInCountdown').textContent, '15:00');
    app.clock.tick(1_000);
    assert.equal(app.element('checkInCountdown').textContent, '14:59');
    assert.equal(app.element('startBtn').disabled, true);

    app.fire(app.window, 'pagehide');
    assert.deepEqual(app.storage.readSaved().activeSession.checkIn, {
        elapsedMs: hour,
        dailyMs: { '2026-08-26': hour },
        timestamp: Date.parse('2026-08-26T13:23:00Z')
    });
});

test('confirming counts the grace period and the next prompt comes at the next session hour', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t);
    app.click('startBtn');
    jump(app, hour + 5 * 60_000);
    assert.equal(app.element('checkInCountdown').textContent, '10:00');
    app.click('confirmPracticeBtn');

    assert.equal(app.element('practiceCheckIn').hidden, true);
    assert.equal(app.element('stopwatchDisplay').textContent, '01:05:00');
    const saved = app.storage.readSaved();
    assert.equal(saved.activeSession.nextCheckInMs, 2 * hour);
    assert.equal(saved.activeSession.checkIn, undefined);

    const restored = await createApp(t, {
        now: '2026-08-26T13:05:00Z',
        storedData: saved
    });
    jump(restored, 55 * 60_000 - 1);
    assert.equal(restored.element('practiceCheckIn').hidden, true);
    jump(restored, 1);
    assert.equal(restored.element('practiceCheckIn').hidden, false);
    assert.equal(restored.element('checkInCountdown').textContent, '15:00');
    jump(restored, grace);
    assert.deepEqual(restored.storage.readSaved(), {
        version: 2,
        dailyData: { '2026-08-26': 7_200 },
        activeSession: null
    });
});

test('pausing acknowledges a pending check-in and excludes the paused interval from the next hour', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t);
    app.click('startBtn');
    jump(app, hour + 5 * 60_000);
    app.click('pauseBtn');

    const saved = app.storage.readSaved().activeSession;
    assert.equal(saved.status, 'paused');
    assert.equal(saved.elapsedMs, hour + 5 * 60_000);
    assert.equal(saved.nextCheckInMs, 2 * hour);
    assert.equal(saved.checkIn, undefined);
    assert.equal(app.element('practiceCheckIn').hidden, true);
    jump(app, 20 * 60_000);
    app.click('startBtn');
    jump(app, 55 * 60_000);

    assert.equal(app.element('practiceCheckIn').hidden, false);
    assert.equal(app.element('stopwatchDisplay').textContent, '02:00:00');
    assert.equal(app.element('checkInCountdown').textContent, '15:00');
});

for (const action of ['doneBtn', 'endPracticeBtn']) {
    test(`${action} before the deadline saves the actual elapsed practice`, async (t) => {
        useTimeZone(t, 'UTC');
        const app = await createApp(t);
        app.click('startBtn');
        jump(app, hour);
        app.clock.setSystemTime(app.clock.now + grace - 1);
        app.click(action);

        assert.deepEqual(app.storage.readSaved(), {
            version: 2,
            dailyData: { '2026-08-26': 4_499.999 },
            activeSession: null
        });
        assert.equal(app.element('practiceCheckIn').hidden, true);
    });
}

for (const action of ['confirmPracticeBtn', 'pauseBtn', 'doneBtn', 'endPracticeBtn']) {
    test(`${action} at the deadline cannot keep or revive the unanswered grace period`, async (t) => {
        useTimeZone(t, 'UTC');
        const app = await createApp(t);
        app.click('startBtn');
        jump(app, hour);
        app.clock.setSystemTime(app.clock.now + grace);
        app.click(action);

        assert.deepEqual(app.storage.readSaved(), {
            version: 2,
            dailyData: { '2026-08-26': 3_600 },
            activeSession: null
        });
        assert.equal(app.element('practiceCheckIn').hidden, true);
        assert.equal(app.element('pauseBtn').disabled, true);
        app.clock.tick(1_000);
        assert.equal(app.element('stopwatchDisplay').textContent, '00:00:00');
    });
}

for (const event of ['focus', 'pageshow', 'pagehide', 'beforeunload', 'visibilitychange']) {
    test(`${event} catches a slept-through hour and deadline without timer callbacks`, async (t) => {
        useTimeZone(t, 'UTC');
        const app = await createApp(t);
        app.click('startBtn');
        app.clock.setSystemTime(app.clock.now + 3 * hour);
        if (event === 'visibilitychange') app.setHidden(true);
        else app.fire(app.window, event);

        assert.deepEqual(app.storage.readSaved(), {
            version: 2,
            dailyData: { '2026-08-26': 3_600 },
            activeSession: null
        });
    });
}

test('hidden periodic checkpoints enforce the deadline while visual timers are suspended', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t);
    app.click('startBtn');
    jump(app, hour);
    app.setHidden(true);
    app.clock.setSystemTime(app.clock.now + grace);
    app.clock.tick(5_000);

    assert.equal(app.storage.readSaved().activeSession, null);
    assert.deepEqual(app.storage.readSaved().dailyData, { '2026-08-26': 3_600 });
    app.setHidden(false);
    assert.equal(app.element('practiceCheckIn').hidden, true);
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:00');
    assert.equal(app.element('todayTotal').textContent, '1h 0m');
});

test('restoring at one hour five minutes keeps the original trigger and remaining deadline', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t, {
        now: '2026-08-26T13:05:00Z',
        storedData: runningData('2026-08-26T12:00:00Z')
    });
    assert.equal(app.element('practiceCheckIn').hidden, false);
    assert.equal(app.element('checkInCountdown').textContent, '10:00');
    assert.equal(app.element('stopwatchDisplay').textContent, '01:05:00');
    app.fire(app.window, 'pagehide');
    const saved = app.storage.readSaved();
    assert.equal(saved.activeSession.checkIn.timestamp, Date.parse('2026-08-26T13:00:00Z'));

    const restored = await createApp(t, {
        now: '2026-08-26T13:14:00Z',
        storedData: saved
    });
    assert.equal(restored.element('checkInCountdown').textContent, '01:00');
    jump(restored, 60_000);
    assert.deepEqual(restored.storage.readSaved().dailyData, { '2026-08-26': 3_600 });
    assert.equal(restored.storage.readSaved().activeSession, null);
});

test('a next-day restore finalizes forgotten practice at its first missed hour', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t, {
        now: '2026-08-27T12:00:00Z',
        storedData: runningData('2026-08-26T12:00:00Z')
    });

    assert.deepEqual(app.storage.readSaved(), {
        version: 2,
        dailyData: { '2026-08-26': 3_600 },
        activeSession: null
    });
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:00');
    assert.equal(app.element('practiceCheckIn').hidden, true);
});

test('older checkpoints preserve their accrued time and begin protection at the next full hour', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t, {
        now: '2026-08-26T12:10:00Z',
        storedData: runningData('2026-08-26T12:00:00Z', hour + 30 * 60_000)
    });
    assert.equal(app.element('stopwatchDisplay').textContent, '01:40:00');
    assert.equal(app.element('practiceCheckIn').hidden, true);
    jump(app, 20 * 60_000);
    assert.equal(app.element('practiceCheckIn').hidden, false);
    assert.equal(app.element('checkInCountdown').textContent, '15:00');
    jump(app, grace);
    assert.deepEqual(app.storage.readSaved().dailyData, { '2026-08-26': 7_200 });
});

for (const { start, expected } of [
    {
        start: '2026-08-26T23:00:00Z',
        expected: { '2026-08-26': 3_600 }
    },
    {
        start: '2026-08-26T23:30:00Z',
        expected: { '2026-08-26': 1_800, '2026-08-27': 1_800 }
    },
    {
        start: '2026-08-26T22:50:00Z',
        expected: { '2026-08-26': 3_600 }
    }
]) {
    test(`expiry allocates only the hour snapshot across midnight from ${start}`, async (t) => {
        useTimeZone(t, 'UTC');
        const app = await createApp(t, { now: start });
        app.click('startBtn');
        jump(app, hour + grace);

        assert.deepEqual(app.storage.readSaved().dailyData, expected);
        assert.equal(app.storage.readSaved().activeSession, null);
    });
}

for (const { transition, start, trigger } of [
    {
        transition: 'spring',
        start: '2026-03-08T01:30:00-05:00',
        trigger: '2026-03-08T03:30:00-04:00'
    },
    {
        transition: 'autumn',
        start: '2026-11-01T01:30:00-04:00',
        trigger: '2026-11-01T01:30:00-05:00'
    }
]) {
    test(`the ${transition} DST transition uses elapsed time for both the hour and grace period`, async (t) => {
        useTimeZone(t, 'America/New_York');
        const app = await createApp(t, { now: start });
        app.click('startBtn');
        jump(app, hour);
        assert.equal(app.clock.now, Date.parse(trigger));
        assert.equal(app.element('checkInCountdown').textContent, '15:00');
        jump(app, grace - 1);
        assert.equal(app.element('practiceCheckIn').hidden, false);
        app.clock.setSystemTime(app.clock.now + 1);
        app.fire(app.window, 'focus');

        assert.deepEqual(app.storage.readSaved().dailyData, { [start.slice(0, 10)]: 3_600 });
        assert.equal(app.storage.readSaved().activeSession, null);
    });
}

test('automatic completion stops practice audio and cancels future sound', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t);
    app.click('startBtn');
    jump(app, hour);
    app.click('toneBtn');
    app.click('metronomeBtn');
    app.click(app.element('pianoKeyboardHold').querySelector('.piano-key'));
    app.clock.tick(250);
    jump(app, grace);

    assert.equal(app.element('toneBtn').textContent.trim(), 'Start Tone');
    assert.equal(app.element('metronomeBtn').textContent.trim(), 'Start Metronome');
    assert.equal(app.document.querySelectorAll('.piano-key.active').length, 0);
    const counts = app.contexts.map((context) => context.oscillators.length);
    app.clock.tick(1_000);
    assert.deepEqual(
        app.contexts.map((context) => context.oscillators.length),
        counts
    );
    for (const context of app.contexts) {
        assert.ok(context.oscillators.every((voice) => !voice.playing && voice.disconnected));
    }
    assert.deepEqual(app.storage.readSaved().dailyData, { '2026-08-26': 3_600 });
});

test('failed automatic completion keeps the hour rollback paused and retries exactly once', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t, {
        storedData: { version: 2, dailyData: { '2026-08-26': 60 }, activeSession: null }
    });
    app.click('startBtn');
    jump(app, hour);
    app.storage.failWrites = true;
    jump(app, grace);

    assert.equal(app.element('stopwatchDisplay').textContent, '01:00:00');
    assert.equal(app.element('pauseBtn').disabled, true);
    assert.equal(app.element('doneBtn').disabled, false);
    assert.equal(app.element('practiceCheckIn').hidden, true);
    assert.match(app.element('storageStatus').textContent, /could not be saved/);
    assert.deepEqual(app.storage.readSaved().dailyData, { '2026-08-26': 60 });
    jump(app, hour);
    assert.equal(app.element('stopwatchDisplay').textContent, '01:00:00');
    app.storage.failWrites = false;
    app.fire(app.window, 'pagehide');
    const saved = app.storage.readSaved();
    assert.equal(saved.activeSession.status, 'paused');
    assert.equal(saved.activeSession.elapsedMs, hour);
    assert.deepEqual(saved.activeSession.dailyMs, { '2026-08-26': hour });

    const restored = await createApp(t, { storedData: saved, now: '2026-08-27T12:00:00Z' });
    restored.click('doneBtn');
    restored.click('doneBtn');
    assert.deepEqual(restored.storage.readSaved(), {
        version: 2,
        dailyData: { '2026-08-26': 3_660 },
        activeSession: null
    });
});

test('a missed external edit at expiry is preserved while the rolled-back session stays recoverable', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t);
    app.click('startBtn');
    jump(app, hour);
    const external = { version: 2, dailyData: { '2026-08-26': 120 }, activeSession: null };
    app.storage.changeExternally(external, { notify: false });
    const writes = app.storage.writes.length;
    jump(app, grace);

    assert.deepEqual(app.storage.readSaved(), external);
    assert.equal(app.storage.writes.length, writes);
    assert.equal(app.element('stopwatchDisplay').textContent, '01:00:00');
    assert.equal(app.element('pauseBtn').disabled, true);
    assert.equal(app.element('practiceCheckIn').hidden, true);
    assert.match(app.element('storageStatus').textContent, /another tab|changed/i);
    app.click('doneBtn');
    assert.deepEqual(app.storage.readSaved(), external);
});
