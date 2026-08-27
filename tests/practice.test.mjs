import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp, useTimeZone } from './helpers/app.mjs';

const storageKey = 'trombonePracticeData';

test('the page initializes every feature without starting audio', async (t) => {
    const app = await createApp(t);

    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:00');
    assert.equal(app.element('dailyList').children.length, 7);
    assert.equal(app.element('pianoKeyboardHold').children.length, 24);
    assert.equal(app.element('pianoKeyboardMomentary').children.length, 24);
    assert.equal(app.element('pauseBtn').disabled, true);
    assert.equal(app.element('doneBtn').disabled, true);
    assert.equal(app.contexts.length, 0);
});

test('start, pause, resume, and done record only running time', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t);

    app.click('startBtn');
    app.clock.tick(60_000);
    app.click('pauseBtn');
    app.clock.tick(5_000);
    assert.equal(app.element('stopwatchDisplay').textContent, '00:01:00');
    assert.equal(app.element('startBtn').disabled, false);

    app.click('startBtn');
    app.clock.tick(2_000);
    app.click('doneBtn');

    assert.deepEqual(app.storage.readSaved(), {
        version: 2,
        dailyData: { '2026-08-26': 62 },
        activeSession: null
    });
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:00');
    assert.equal(app.element('doneBtn').disabled, true);
});

test('a running saved session resumes including time since its checkpoint', async (t) => {
    const app = await createApp(t, {
        storedData: {
            version: 1,
            dailyData: {},
            activeSession: {
                elapsed: 20,
                timestamp: Date.parse('2026-08-26T11:59:30Z'),
                running: true
            }
        }
    });

    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:50');
    assert.equal(app.element('startBtn').disabled, true);
    app.clock.tick(1_000);
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:51');
});

test('a paused saved session does not accrue time until resumed', async (t) => {
    const app = await createApp(t, {
        storedData: {
            version: 1,
            dailyData: {},
            activeSession: {
                elapsed: 42,
                timestamp: Date.parse('2026-08-25T12:00:00Z'),
                running: false
            }
        }
    });

    app.clock.tick(10_000);
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:42');
    assert.equal(app.element('startBtn').disabled, false);
    assert.equal(app.element('pauseBtn').disabled, true);
    assert.equal(app.element('doneBtn').disabled, false);
});

test('unloading checkpoints a running session before the periodic save', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t);
    app.click('startBtn');
    app.clock.tick(1_300);
    app.window.dispatchEvent(new app.window.Event('beforeunload'));

    assert.deepEqual(app.storage.readSaved().activeSession, {
        elapsedMs: 1_300,
        dailyMs: { '2026-08-26': 1_300 },
        timestamp: app.clock.now,
        status: 'running'
    });
});

test('invalid JSON does not prevent the page from starting', async (t) => {
    const app = await createApp(t, { storedData: '{broken' });
    app.click('startBtn');
    app.clock.tick(1_000);

    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:01');
    assert.equal(app.element('dailyList').children.length, 7);
});

test('valid JSON with a malformed storage shape does not break initialization', async (t) => {
    const app = await createApp(t, { storedData: { version: 1 } });
    assert.equal(app.element('dailyList').children.length, 7);
    app.click('startBtn');
    app.clock.tick(1_000);
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:01');
});

test('a failed save does not discard the session being completed', async (t) => {
    const app = await createApp(t);
    app.click('startBtn');
    app.clock.tick(10_000);
    app.storage.failWrites = true;
    app.click('doneBtn');

    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:10');
    assert.equal(app.element('doneBtn').disabled, false);
});

test('completing a session writes its total and clears its checkpoint atomically', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t);
    app.click('startBtn');
    app.clock.tick(1_000);
    app.storage.writes.length = 0;
    app.click('doneBtn');

    assert.equal(app.storage.writes.length, 1);
    assert.deepEqual(app.storage.readSaved(), {
        version: 2,
        dailyData: { '2026-08-26': 1 },
        activeSession: null
    });
});

test('failed completion pauses the session and a successful retry records it exactly once', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t, {
        storedData: { version: 2, dailyData: { '2026-08-26': 60 }, activeSession: null }
    });
    app.click('startBtn');
    app.clock.tick(10_000);
    app.storage.failWrites = true;
    app.click('doneBtn');
    app.clock.tick(5_000);

    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:10');
    assert.equal(app.element('pauseBtn').disabled, true);
    assert.equal(app.element('storageStatus').hidden, false);
    assert.match(app.element('storageStatus').textContent, /could not be saved/);
    assert.deepEqual(app.storage.readSaved().dailyData, { '2026-08-26': 60 });

    app.storage.failWrites = false;
    app.storage.writes.length = 0;
    app.click('doneBtn');
    app.click('doneBtn');
    assert.equal(app.storage.writes.length, 1);
    assert.deepEqual(app.storage.readSaved(), {
        version: 2,
        dailyData: { '2026-08-26': 70 },
        activeSession: null
    });
    assert.equal(app.element('storageStatus').hidden, true);
});

for (const action of ['pauseBtn', 'doneBtn']) {
    test(`${action} captures elapsed time even when rendering callbacks have not run`, async (t) => {
        useTimeZone(t, 'UTC');
        const app = await createApp(t);
        app.click('startBtn');
        app.clock.tick(100);
        app.clock.setSystemTime(app.clock.now + 1_275);
        app.click(action);

        if (action === 'pauseBtn') {
            assert.equal(app.storage.readSaved().activeSession.elapsedMs, 1_375);
            app.click('doneBtn');
        }
        assert.deepEqual(app.storage.readSaved().dailyData, { '2026-08-26': 1.375 });
    });
}

for (const event of ['pagehide', 'beforeunload']) {
    test(`${event} captures current time without waiting for a rendering tick`, async (t) => {
        const app = await createApp(t);
        app.click('startBtn');
        app.clock.setSystemTime(app.clock.now + 1_375);
        app.window.dispatchEvent(new app.window.Event(event));

        assert.equal(app.storage.readSaved().activeSession.elapsedMs, 1_375);
        assert.equal(app.storage.readSaved().activeSession.timestamp, app.clock.now);
    });
}

for (const action of ['pauseBtn', 'doneBtn']) {
    test(`pagehide retries a dirty paused checkpoint after a failed ${action} save`, async (t) => {
        useTimeZone(t, 'UTC');
        const app = await createApp(t);
        app.click('startBtn');
        app.clock.tick(1_250);
        app.storage.failWrites = true;
        app.click(action);
        app.clock.tick(10_000);
        app.storage.failWrites = false;
        app.window.dispatchEvent(new app.window.Event('pagehide'));

        const saved = app.storage.readSaved();
        assert.deepEqual(saved.dailyData, {});
        assert.equal(saved.activeSession.status, 'paused');
        assert.equal(saved.activeSession.elapsedMs, 1_250);

        const restored = await createApp(t, {
            now: '2026-08-27T12:00:00Z',
            storedData: saved
        });
        assert.equal(restored.element('stopwatchDisplay').textContent, '00:00:01');
        assert.equal(restored.element('startBtn').disabled, false);
        restored.click('doneBtn');
        assert.deepEqual(restored.storage.readSaved().dailyData, { '2026-08-26': 1.25 });
    });
}

test('a failed unload checkpoint asks the browser to warn about unsaved practice', async (t) => {
    const app = await createApp(t);
    app.click('startBtn');
    app.clock.tick(1_000);
    app.storage.failWrites = true;
    const event = new app.window.Event('beforeunload', { cancelable: true });
    app.window.dispatchEvent(event);

    assert.equal(event.defaultPrevented, true);
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:01');
});

test('hiding the page checkpoints the current session without waiting for a timer tick', async (t) => {
    const app = await createApp(t);
    app.click('startBtn');
    app.clock.setSystemTime(app.clock.now + 1_375);
    Object.defineProperty(app.document, 'hidden', { configurable: true, value: true });
    app.document.dispatchEvent(new app.window.Event('visibilitychange'));

    assert.equal(app.storage.readSaved().activeSession.elapsedMs, 1_375);
    assert.equal(app.storage.readSaved().activeSession.timestamp, app.clock.now);
});

test('migration backs up the exact legacy bytes before writing version 2', async (t) => {
    useTimeZone(t, 'UTC');
    const raw = '{ "version": 1, "dailyData": {"2026-08-25": 90}, "activeSession": null }';
    const app = await createApp(t, { storedData: raw });
    assert.equal(app.storage.readRaw(), raw);
    app.click('startBtn');

    assert.deepEqual(Object.values(app.storage.readBackups()), [raw]);
    assert.equal(app.storage.readSaved().version, 2);
    assert.deepEqual(app.storage.readSaved().dailyData, { '2026-08-25': 90 });
    const backupIndex = app.storage.writes.findIndex(({ key }) =>
        key.startsWith(`${storageKey}.backup.`)
    );
    const primaryIndex = app.storage.writes.findIndex(({ key }) => key === storageKey);
    assert.ok(backupIndex >= 0 && backupIndex < primaryIndex);
});

test('a delayed migration save keeps its pending notice but does not revive an expired confirmation', async (t) => {
    useTimeZone(t, 'UTC');
    const raw = JSON.stringify({
        version: 1,
        dailyData: { '2026-08-20': 60 },
        activeSession: null
    });
    const app = await createApp(t, { storedData: raw });
    const pendingNotice = app.element('storageStatus').textContent;
    app.clock.setSystemTime(Date.parse('2026-08-27T00:00:00Z'));
    app.fire(app.window, 'focus');

    assert.equal(app.element('storageStatus').hidden, false);
    assert.equal(app.element('storageStatus').textContent, pendingNotice);
    assert.equal(app.storage.readRaw(), raw);
    assert.deepEqual(app.storage.readBackups(), {});

    app.click('startBtn');

    assert.equal(app.element('storageStatus').hidden, true);
    assert.equal(app.element('storageStatus').textContent, '');
    assert.deepEqual(Object.values(app.storage.readBackups()), [raw]);
    assert.deepEqual(app.storage.readSaved().dailyData, { '2026-08-20': 60 });
});

test('expiration preserves save errors and a later successful retry cannot revive a stale notice', async (t) => {
    useTimeZone(t, 'UTC');
    const raw = JSON.stringify({
        version: 1,
        dailyData: { '2026-08-26': 60 },
        activeSession: null
    });
    const app = await createApp(t, { storedData: raw });
    app.click('startBtn');
    assert.match(app.element('storageStatus').textContent, /Saved data was recovered/);
    app.clock.tick(1_000);
    app.storage.failWrites = true;
    app.click('doneBtn');
    const saveError = app.element('storageStatus').textContent;
    assert.match(saveError, /could not be saved/);
    const writes = app.storage.writes.length;

    app.clock.setSystemTime(Date.parse('2026-09-02T00:00:00Z'));
    app.fire(app.window, 'focus');

    assert.equal(app.element('storageStatus').hidden, false);
    assert.equal(app.element('storageStatus').textContent, saveError);
    assert.equal(app.element('storageStatus').dataset.kind, 'error');
    assert.equal(app.storage.writes.length, writes);
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:01');
    assert.deepEqual(Object.values(app.storage.readBackups()), [raw]);

    app.storage.failWrites = false;
    app.click('doneBtn');

    assert.equal(app.element('storageStatus').hidden, true);
    assert.equal(app.element('storageStatus').textContent, '');
    assert.deepEqual(Object.values(app.storage.readBackups()), [raw]);
});

for (const [description, storedData] of [
    ['unreadable data', '{broken'],
    ['an empty migration', { version: 1, dailyData: {}, activeSession: null }],
    [
        'future-dated recovered data',
        { version: 1, dailyData: { '2030-01-01': 60 }, activeSession: null }
    ]
]) {
    test(`the confirmation for ${description} is bounded to seven local calendar days`, async (t) => {
        useTimeZone(t, 'America/New_York');
        const app = await createApp(t, {
            now: '2026-08-26T12:00:00-04:00',
            storedData
        });
        app.click('startBtn');
        app.click('pauseBtn');
        const saved = app.storage.readRaw();
        const backups = app.storage.readBackups();
        const writes = app.storage.writes.length;

        app.clock.setSystemTime(Date.parse('2026-09-01T23:59:59.999-04:00'));
        app.fire(app.window, 'focus');
        assert.match(app.element('storageStatus').textContent, /Saved data was recovered/);
        app.clock.tick(1);

        assert.equal(app.element('storageStatus').hidden, true);
        assert.equal(app.element('storageStatus').textContent, '');
        assert.equal(app.storage.readRaw(), saved);
        assert.deepEqual(app.storage.readBackups(), backups);
        assert.equal(app.storage.writes.length, writes);
    });
}

test('failed backup writes protect the original record and preserve the unsaved session', async (t) => {
    useTimeZone(t, 'UTC');
    const raw = JSON.stringify({
        version: 1,
        dailyData: { '2026-08-26': 60 },
        activeSession: null
    });
    const app = await createApp(t, {
        storedData: raw,
        storageOptions: { rejectWrite: (key) => key.startsWith(`${storageKey}.backup.`) }
    });
    app.click('startBtn');
    app.clock.tick(1_000);
    app.click('doneBtn');

    assert.equal(app.storage.readRaw(), raw);
    assert.deepEqual(app.storage.readBackups(), {});
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:01');
    app.storage.rejectWrite = () => false;
    app.click('doneBtn');
    assert.deepEqual(Object.values(app.storage.readBackups()), [raw]);
    assert.deepEqual(app.storage.readSaved().dailyData, { '2026-08-26': 61 });
});

test('repeated failed primary writes reuse the completed backup', async (t) => {
    const raw = JSON.stringify({ version: 1, dailyData: {}, activeSession: null });
    const app = await createApp(t, {
        storedData: raw,
        storageOptions: { rejectWrite: (key) => key === storageKey }
    });
    app.click('startBtn');
    app.clock.tick(6_000);
    app.click('doneBtn');
    app.clock.tick(2_000);
    app.window.dispatchEvent(new app.window.Event('pagehide'));

    assert.equal(app.storage.readRaw(), raw);
    assert.deepEqual(Object.values(app.storage.readBackups()), [raw]);
    assert.equal(
        app.storage.writes.filter(({ key }) => key.startsWith(`${storageKey}.backup.`)).length,
        1
    );
});

test('a backup name collision preserves both originals', async (t) => {
    const key = `${storageKey}.backup.${Date.parse('2026-08-26T12:00:00Z')}`;
    const raw = JSON.stringify({ version: 1, dailyData: {}, activeSession: null });
    const app = await createApp(t, {
        storedData: raw,
        storageOptions: { entries: { [key]: 'an earlier recovery record' } }
    });
    app.click('startBtn');

    assert.equal(app.storage.readRaw(key), 'an earlier recovery record');
    assert.deepEqual(Object.values(app.storage.readBackups()), ['an earlier recovery record', raw]);
});

test('future schema versions are never overwritten by controls or lifecycle saves', async (t) => {
    const raw = JSON.stringify({
        version: 99,
        dailyData: { '2026-08-26': 500 },
        other: 'preserve me'
    });
    const app = await createApp(t, { storedData: raw });
    app.click('startBtn');
    app.clock.tick(6_000);
    app.click('pauseBtn');
    app.click('doneBtn');
    app.window.dispatchEvent(new app.window.Event('pagehide'));
    app.window.dispatchEvent(new app.window.Event('beforeunload'));

    assert.equal(app.storage.readRaw(), raw);
    assert.equal(app.element('startBtn').disabled, true);
    assert.match(app.element('storageStatus').textContent, /unrecognized version/);
    assert.deepEqual(app.storage.readBackups(), {});
});

test('malformed history values are recovered selectively with an exact backup', async (t) => {
    useTimeZone(t, 'UTC');
    const raw =
        '{"version":1,"dailyData":{"2026-08-26":60,"2026-02-30":50,"2026-08-25":"10","2026-08-24":-3,"2026-08-23":1e100,"__proto__":10},"activeSession":{"elapsed":20,"timestamp":"bad","running":true}}';
    const app = await createApp(t, { storedData: raw });
    assert.equal(app.element('todayTotal').textContent, '1m');
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:00');
    assert.equal(app.element('storageStatus').hidden, false);
    app.click('startBtn');
    app.clock.tick(1_000);
    app.click('doneBtn');

    assert.deepEqual(app.storage.readSaved().dailyData, { '2026-08-26': 61 });
    assert.deepEqual(Object.values(app.storage.readBackups()), [raw]);
});

for (const [description, invalid] of [
    ['invalid timestamp', { timestamp: 8_640_000_000_000_001 }],
    ['unsafe duration', { elapsedMs: Number.MAX_SAFE_INTEGER + 1 }],
    ['negative duration', { elapsedMs: -1 }],
    ['invalid state', { status: 'unknown' }],
    ['overallocated time', { dailyMs: { '2026-08-26': 2_000 } }],
    ['invalid allocation date', { dailyMs: { '2026-02-30': 1_000 } }]
]) {
    test(`a stored session with ${description} is rejected without losing valid history`, async (t) => {
        const storedData = {
            version: 2,
            dailyData: { '2026-08-26': 60 },
            activeSession: {
                status: 'running',
                elapsedMs: 1_000,
                dailyMs: { '2026-08-26': 1_000 },
                timestamp: Date.parse('2026-08-26T12:00:00Z'),
                ...invalid
            }
        };
        const app = await createApp(t, { storedData });
        assert.equal(app.element('stopwatchDisplay').textContent, '00:00:00');
        assert.equal(app.element('todayTotal').textContent, '1m');
        assert.equal(app.element('storageStatus').hidden, false);
        assert.deepEqual(app.storage.readSaved(), storedData);
    });
}

test('a temporary read failure retains the pending session until saving recovers', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t);
    app.click('startBtn');
    app.clock.tick(1_000);
    app.storage.failReads = true;
    app.click('doneBtn');
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:01');

    app.storage.failReads = false;
    app.click('doneBtn');
    assert.deepEqual(app.storage.readSaved().dailyData, { '2026-08-26': 1 });
});

test('an initial read failure cannot turn an unread existing record into an empty baseline', async (t) => {
    const raw = JSON.stringify({
        version: 2,
        dailyData: { '2026-08-26': 60 },
        activeSession: null
    });
    const app = await createApp(t, { storedData: raw, storageOptions: { failReads: true } });
    app.click('startBtn');
    app.clock.tick(1_000);
    app.storage.failReads = false;
    app.click('doneBtn');

    assert.equal(app.storage.readRaw(), raw);
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:01');
    assert.equal(app.element('startBtn').disabled, true);
});

test('an initially unreadable empty store can save once access recovers', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t, { storageOptions: { failReads: true } });
    app.click('startBtn');
    app.clock.tick(1_000);
    app.storage.failReads = false;
    app.click('doneBtn');

    assert.deepEqual(app.storage.readSaved().dailyData, { '2026-08-26': 1 });
});

for (const [description, value, key] of [
    ['changed', { version: 2, dailyData: { '2026-08-26': 90 }, activeSession: null }, storageKey],
    ['removed', null, storageKey],
    ['cleared', null, null]
]) {
    test(`a ${description} external record pauses this tab without overwriting the other change`, async (t) => {
        const app = await createApp(t);
        app.click('startBtn');
        app.clock.tick(1_000);
        const writes = app.storage.writes.length;
        app.storage.changeExternally(value, { key });
        app.clock.tick(5_000);
        app.click('startBtn');
        app.click('doneBtn');
        app.window.dispatchEvent(new app.window.Event('pagehide'));

        assert.equal(app.element('stopwatchDisplay').textContent, '00:00:01');
        assert.equal(app.element('startBtn').disabled, true);
        assert.equal(app.element('pauseBtn').disabled, true);
        assert.equal(app.storage.writes.length, writes);
        assert.equal(app.storage.readRaw(), value === null ? null : JSON.stringify(value));
        assert.match(app.element('storageStatus').textContent, /another tab/);
    });
}

test('a missed storage event is detected before finalization writes', async (t) => {
    const app = await createApp(t);
    app.click('startBtn');
    app.clock.tick(1_000);
    const changed = { version: 2, dailyData: { '2026-08-26': 900 }, activeSession: null };
    app.storage.changeExternally(changed, { notify: false });
    const writes = app.storage.writes.length;
    app.click('doneBtn');

    assert.deepEqual(app.storage.readSaved(), changed);
    assert.equal(app.storage.writes.length, writes);
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:01');
    assert.equal(app.element('startBtn').disabled, true);
});

test('unrelated and already-observed storage events do not interrupt the timer', async (t) => {
    const app = await createApp(t);
    app.click('startBtn');
    app.storage.changeExternally('other data', { key: 'another-application' });
    app.window.dispatchEvent(new app.window.StorageEvent('storage', { key: storageKey }));
    app.clock.tick(1_000);

    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:01');
    assert.equal(app.element('pauseBtn').disabled, false);
    assert.equal(app.element('storageStatus').hidden, true);
});

test('a backwards clock change never subtracts already accrued practice', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t);
    app.click('startBtn');
    app.clock.tick(1_000);
    app.clock.setSystemTime(app.clock.now - 3_600_000);
    app.click('pauseBtn');
    assert.equal(app.storage.readSaved().activeSession.elapsedMs, 1_000);
    app.click('startBtn');
    app.clock.tick(1_000);
    app.click('doneBtn');

    assert.deepEqual(app.storage.readSaved().dailyData, { '2026-08-26': 2 });
});

test('overflowing a daily total keeps the completed session available for recovery', async (t) => {
    useTimeZone(t, 'UTC');
    const dailyData = { '2026-08-26': (Number.MAX_SAFE_INTEGER - 1) / 1000 };
    const app = await createApp(t, { storedData: { version: 2, dailyData, activeSession: null } });
    app.click('startBtn');
    app.clock.tick(1_000);
    app.click('doneBtn');

    assert.deepEqual(app.storage.readSaved().dailyData, dailyData);
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:01');
    assert.match(app.element('storageStatus').textContent, /too large/);
});

test('expired daily allocations do not prevent safe finalization of a paused session', async (t) => {
    useTimeZone(t, 'UTC');
    const duration = Number.MAX_SAFE_INTEGER - 1;
    const app = await createApp(t, {
        storedData: {
            version: 2,
            dailyData: { '2026-08-01': duration / 1000, '2026-08-26': 60 },
            activeSession: {
                status: 'paused',
                elapsedMs: 1_000,
                dailyMs: { '2026-08-01': 1_000 },
                timestamp: Date.parse('2026-08-01T12:00:00Z')
            }
        }
    });
    app.click('doneBtn');

    assert.deepEqual(app.storage.readSaved(), {
        version: 2,
        dailyData: { '2026-08-26': 60 },
        activeSession: null
    });
});

test('long absences preserve elapsed time while bounding per-day allocation to seven days', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t, {
        storedData: {
            version: 2,
            dailyData: {},
            activeSession: {
                status: 'running',
                elapsedMs: 0,
                dailyMs: {},
                timestamp: Date.parse('2026-08-01T12:00:00Z')
            }
        }
    });
    assert.equal(app.element('stopwatchDisplay').textContent, '600:00:00');
    app.click('doneBtn');

    const dailyData = app.storage.readSaved().dailyData;
    assert.equal(Object.keys(dailyData).length, 7);
    assert.equal(dailyData['2026-08-19'], undefined);
    assert.equal(dailyData['2026-08-20'], 86_400);
    assert.equal(dailyData['2026-08-26'], 43_200);
});

test('timer ticks preserve unchanged history rows and avoid storage reads', async (t) => {
    const app = await createApp(t);
    app.click('startBtn');
    const rows = [...app.element('dailyList').children];
    app.storage.reads = 0;
    app.clock.tick(1_000);

    assert.equal(app.storage.reads, 0);
    for (const [index, row] of rows.entries()) {
        assert.equal(app.element('dailyList').children[index], row);
    }
});
