import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp, useTimeZone } from './helpers/app.mjs';

const viewIds = [
    'stopwatchDisplay',
    'practiceStatus',
    'startBtn',
    'pauseBtn',
    'doneBtn',
    'ringSeconds',
    'ringMinutes',
    'ringHours',
    'todayTotal',
    'weekTotal',
    'todayRing',
    'todayMinutesRing',
    'weekDaysRing',
    'weekRing',
    'weekMinutesRing',
    'dailyList'
];

function observeMutations(t, app, nodes = viewIds.map((id) => app.element(id))) {
    const records = [];
    const observer = new app.window.MutationObserver((mutations) => records.push(...mutations));
    for (const node of nodes) {
        observer.observe(node, {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true
        });
    }
    t.after(() => observer.disconnect());
    return () => {
        records.push(...observer.takeRecords());
        return records.splice(0);
    };
}

function rowsByDate(app) {
    return new Map([...app.element('dailyList').children].map((row) => [row.dataset.date, row]));
}

function assertSameRows(app, expected) {
    const current = rowsByDate(app);
    assert.equal(current.size, 7);
    for (const [date, row] of expected) assert.equal(current.get(date), row);
}

test('subsecond ticks change only the seconds ring after Done becomes available', async (t) => {
    const app = await createApp(t);
    app.click('startBtn');
    app.clock.tick(100);
    const secondsRing = app.element('ringSeconds');
    const originalOffset = secondsRing.style.strokeDashoffset;
    const rows = rowsByDate(app);
    const readMutations = observeMutations(t, app);

    app.clock.tick(800);

    const mutations = readMutations();
    assert.ok(mutations.length > 0, 'The seconds ring should continue moving every 100ms');
    assert.ok(
        mutations.every(
            (mutation) =>
                mutation.target === secondsRing &&
                mutation.type === 'attributes' &&
                mutation.attributeName === 'style'
        ),
        'Unchanged text, buttons, history rows, and other rings must not be rewritten'
    );
    assert.notEqual(secondsRing.style.strokeDashoffset, originalOffset);
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:00');
    assert.equal(app.element('doneBtn').disabled, false);
    assertSameRows(app, rows);

    app.clock.tick(100);
    const display = app.element('stopwatchDisplay');
    const nextMutations = readMutations();
    assert.equal(display.textContent, '00:00:01');
    assert.equal(
        nextMutations.filter(
            (mutation) => display === mutation.target || display.contains(mutation.target)
        ).length,
        1,
        'The whole-second display changes once at its boundary'
    );
});

test('steady timer frames reuse DOM lookups and calendar labels', async (t) => {
    const app = await createApp(t);
    app.click('startBtn');
    const spies = [
        t.mock.method(app.document, 'getElementById'),
        t.mock.method(app.document, 'querySelector'),
        t.mock.method(app.document, 'querySelectorAll'),
        t.mock.method(app.window.Element.prototype, 'querySelector'),
        t.mock.method(app.window.Element.prototype, 'querySelectorAll'),
        t.mock.method(app.window.Date.prototype, 'toLocaleDateString')
    ];
    app.storage.reads = 0;

    app.clock.tick(900);

    assert.equal(app.storage.reads, 0);
    for (const spy of spies) assert.equal(spy.mock.callCount(), 0);
});

for (const status of ['idle', 'paused']) {
    test(`${status} minute checks do not rewrite an unchanged view or touch storage`, async (t) => {
        useTimeZone(t, 'UTC');
        const app = await createApp(t, {
            storedData: {
                version: 2,
                dailyData: { '2026-08-26': 60 },
                activeSession:
                    status === 'paused'
                        ? {
                              status: 'paused',
                              elapsedMs: 1_125,
                              dailyMs: { '2026-08-26': 1_125 },
                              timestamp: Date.parse('2026-08-26T11:59:00Z')
                          }
                        : null
            }
        });
        const rows = rowsByDate(app);
        const readMutations = observeMutations(t, app);
        const reads = app.storage.reads;
        const writes = app.storage.writes.length;

        app.clock.tick(180_000);

        assert.deepEqual(readMutations(), []);
        assert.equal(app.storage.reads, reads);
        assert.equal(app.storage.writes.length, writes);
        assertSameRows(app, rows);
    });
}

test('a one-millisecond active tail completes a displayed minute and enables Done', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t, {
        storedData: { version: 2, dailyData: { '2026-08-26': 59.999 }, activeSession: null }
    });
    assert.equal(app.element('todayTotal').textContent, '0m');
    app.click('startBtn');
    const writes = app.storage.writes.length;
    app.clock.tick(1);
    app.fire(app.window, 'focus');

    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:00');
    assert.equal(app.element('doneBtn').disabled, false);
    assert.equal(app.element('todayTotal').textContent, '1m');
    assert.equal(app.element('weekTotal').textContent, '1m');
    assert.equal(app.storage.writes.length, writes, 'Refreshing the view is not a checkpoint');
    const historyNodes = ['todayTotal', 'weekTotal', 'dailyList'].map((id) => app.element(id));
    const readMutations = observeMutations(t, app, historyNodes);
    app.click('doneBtn');

    assert.deepEqual(app.storage.readSaved().dailyData, { '2026-08-26': 60 });
    assert.equal(app.storage.readSaved().activeSession, null);
    assert.deepEqual(
        readMutations(),
        [],
        'Moving active time into saved history changes no totals'
    );
});

for (const withSession of [false, true]) {
    test(`weekly minute boundaries sum exact milliseconds ${withSession ? 'including paused time' : 'across completed days'}`, async (t) => {
        useTimeZone(t, 'UTC');
        const app = await createApp(t, {
            storedData: {
                version: 2,
                dailyData: {
                    '2026-08-26': 59.998,
                    '2026-08-25': 0.001,
                    ...(withSession ? {} : { '2026-08-24': 0.001 })
                },
                activeSession: withSession
                    ? {
                          status: 'paused',
                          elapsedMs: 1,
                          dailyMs: { '2026-08-26': 1 },
                          timestamp: Date.parse('2026-08-26T12:00:00Z')
                      }
                    : null
            }
        });

        assert.equal(app.element('todayTotal').textContent, '0m');
        assert.equal(app.element('weekTotal').textContent, '1m');
        assert.ok(Number(app.element('weekMinutesRing').style.strokeDashoffset) < 1);
    });
}

for (const status of ['idle', 'paused']) {
    test(`${status} history rolls over at local midnight and reuses the six overlapping rows`, async (t) => {
        useTimeZone(t, 'UTC');
        const now = '2026-08-26T23:59:59.500Z';
        const app = await createApp(t, {
            now,
            storedData: {
                version: 2,
                dailyData: { '2026-08-20': 120, '2026-08-26': 60, '2026-08-27': 180 },
                activeSession:
                    status === 'paused'
                        ? {
                              status: 'paused',
                              elapsedMs: 30_000,
                              dailyMs: { '2026-08-26': 30_000 },
                              timestamp: Date.parse(now)
                          }
                        : null
            }
        });
        const oldRows = rowsByDate(app);
        const reads = app.storage.reads;
        const writes = app.storage.writes.length;
        assert.equal(oldRows.size, 7);
        assert.equal(app.element('todayTotal').textContent, '1m');
        assert.equal(app.element('weekTotal').textContent, '3m');

        app.clock.tick(500);

        const newRows = rowsByDate(app);
        assert.deepEqual(
            [...newRows.keys()],
            [
                '2026-08-27',
                '2026-08-26',
                '2026-08-25',
                '2026-08-24',
                '2026-08-23',
                '2026-08-22',
                '2026-08-21'
            ]
        );
        for (const [date, row] of oldRows) {
            if (date !== '2026-08-20') assert.equal(newRows.get(date), row);
        }
        assert.equal(oldRows.get('2026-08-20').isConnected, false);
        assert.equal(newRows.get('2026-08-27').querySelector('.daily-date').textContent, 'Today');
        assert.equal(
            oldRows.get('2026-08-26').querySelector('.daily-date').textContent,
            'Yesterday'
        );
        assert.notEqual(
            oldRows.get('2026-08-25').querySelector('.daily-date').textContent,
            'Yesterday'
        );
        assert.equal(app.element('todayTotal').textContent, '3m');
        assert.equal(app.element('weekTotal').textContent, '4m');
        assert.equal(
            app.element('stopwatchDisplay').textContent,
            status === 'paused' ? '00:00:30' : '00:00:00'
        );
        assert.equal(app.storage.reads, reads);
        assert.equal(app.storage.writes.length, writes);
    });
}

for (const { transition, now, dayHours, date, tomorrow } of [
    {
        transition: 'spring',
        now: '2026-03-08T00:00:00-05:00',
        dayHours: 23,
        date: '2026-03-08',
        tomorrow: '2026-03-09'
    },
    {
        transition: 'autumn',
        now: '2026-11-01T00:00:00-04:00',
        dayHours: 25,
        date: '2026-11-01',
        tomorrow: '2026-11-02'
    }
]) {
    test(`an idle calendar follows the ${dayHours}-hour ${transition} DST day`, async (t) => {
        useTimeZone(t, 'America/New_York');
        const app = await createApp(t, { now });
        const originalToday = rowsByDate(app).get(date);
        const writes = app.storage.writes.length;

        app.clock.tick(dayHours * 3_600_000 - 1);
        assert.equal(app.element('dailyList').firstElementChild.dataset.date, date);
        app.clock.tick(1);

        assert.equal(app.element('dailyList').firstElementChild.dataset.date, tomorrow);
        assert.equal(rowsByDate(app).get(date), originalToday);
        assert.equal(app.storage.writes.length, writes);
    });
}

test('focus catches up a running view at the event time without writing storage', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t);
    app.click('startBtn');
    app.clock.tick(100);
    const reads = app.storage.reads;
    const writes = app.storage.writes.length;
    app.clock.setSystemTime(app.clock.now + 61_025);
    app.fire(app.window, 'focus');

    assert.equal(app.element('stopwatchDisplay').textContent, '00:01:01');
    assert.equal(app.element('todayTotal').textContent, '1m');
    assert.equal(app.element('weekTotal').textContent, '1m');
    assert.equal(app.storage.reads, reads);
    assert.equal(app.storage.writes.length, writes);
    app.click('pauseBtn');
    assert.equal(app.storage.readSaved().activeSession.elapsedMs, 61_125);
});

test('focus immediately refreshes idle history after a calendar jump', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t, {
        storedData: {
            version: 2,
            dailyData: { '2026-08-26': 60, '2026-08-28': 120 },
            activeSession: null
        }
    });
    const originalToday = rowsByDate(app).get('2026-08-26');
    const reads = app.storage.reads;
    const writes = app.storage.writes.length;
    app.clock.setSystemTime(Date.parse('2026-08-28T12:00:00Z'));
    app.fire(app.window, 'focus');

    assert.equal(app.element('dailyList').firstElementChild.dataset.date, '2026-08-28');
    assert.equal(rowsByDate(app).get('2026-08-26'), originalToday);
    assert.equal(app.element('todayTotal').textContent, '2m');
    assert.equal(app.element('weekTotal').textContent, '3m');
    assert.equal(app.storage.reads, reads);
    assert.equal(app.storage.writes.length, writes);
});

for (const change of ['clock', 'time zone']) {
    test(`idle calendar checks notice a visible ${change} change within one minute`, async (t) => {
        useTimeZone(t, 'UTC');
        const app = await createApp(t, { now: '2026-08-26T01:00:00Z' });
        const reads = app.storage.reads;
        const writes = app.storage.writes.length;
        if (change === 'clock') app.clock.setSystemTime(Date.parse('2026-08-27T01:00:00Z'));
        else process.env.TZ = 'America/New_York';
        app.clock.tick(60_000);

        assert.equal(
            app.element('dailyList').firstElementChild.dataset.date,
            change === 'clock' ? '2026-08-27' : '2026-08-25'
        );
        assert.equal(app.storage.reads, reads);
        assert.equal(app.storage.writes.length, writes);
    });
}

test('hidden pages freeze timer visuals but continue periodic running checkpoints', async (t) => {
    const app = await createApp(t);
    const pageTitle = app.document.title;
    app.click('startBtn');
    app.clock.tick(1_250);
    assert.equal(app.document.title, pageTitle);
    app.setHidden(true);
    const readMutations = observeMutations(t, app);
    const displayAtHide = app.element('stopwatchDisplay').textContent;
    const rows = rowsByDate(app);
    const writesAtHide = app.storage.writes.length;
    assert.equal(app.storage.readSaved().activeSession.elapsedMs, 1_250);
    assert.equal(app.document.title, `00:00:01 | ${pageTitle}`);
    assert.equal(app.clock.countTimers(), 2, 'Only title updates and running-session saves remain');

    app.clock.tick(1_000);
    assert.equal(app.document.title, `00:00:02 | ${pageTitle}`);
    assert.equal(app.storage.writes.length, writesAtHide);
    app.clock.tick(9_000);

    assert.deepEqual(readMutations(), []);
    assert.equal(app.document.title, `00:00:11 | ${pageTitle}`);
    assert.equal(app.element('stopwatchDisplay').textContent, displayAtHide);
    assertSameRows(app, rows);
    assert.equal(app.storage.writes.length - writesAtHide, 2);
    const saved = app.storage.readSaved().activeSession;
    assert.equal(saved.status, 'running');
    assert.ok(saved.elapsedMs >= 10_000 && saved.elapsedMs <= 11_250);

    const writesBeforeShow = app.storage.writes.length;
    app.setHidden(false);
    assert.equal(app.document.title, pageTitle);
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:11');
    assert.equal(app.storage.writes.length, writesBeforeShow);
    app.clock.tick(800);
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:12');
    app.click('pauseBtn');
    assert.equal(app.storage.readSaved().activeSession.elapsedMs, 12_050);
});

test('hidden titles catch up from wall-clock time without duplicating prefixes after tab switches', async (t) => {
    const app = await createApp(t);
    const pageTitle = app.document.title;
    app.click('startBtn');
    app.clock.tick(250);
    app.setHidden(true);
    assert.equal(app.document.title, `00:00:00 | ${pageTitle}`);
    const writesAtHide = app.storage.writes.length;

    app.clock.setSystemTime(app.clock.now + 24 * 60_000 + 29_000);
    app.clock.tick(1_000);

    assert.equal(app.document.title, `00:24:30 | ${pageTitle}`);
    assert.equal(app.storage.writes.length, writesAtHide);
    for (let i = 0; i < 3; i++) {
        app.setHidden(false);
        assert.equal(app.document.title, pageTitle);
        app.setHidden(true);
        assert.equal(app.document.title, `00:24:30 | ${pageTitle}`);
        assert.equal(app.clock.countTimers(), 2);
    }
    app.clock.tick(1_000);
    assert.equal(app.document.title, `00:24:31 | ${pageTitle}`);
    app.setHidden(false);
    assert.equal(app.document.title, pageTitle);
});

for (const status of ['idle', 'paused']) {
    test(`${status} hidden pages have no timer work and catch up their calendar when visible`, async (t) => {
        useTimeZone(t, 'UTC');
        const app = await createApp(t, {
            storedData: {
                version: 2,
                dailyData: { '2026-08-26': 60 },
                activeSession:
                    status === 'paused'
                        ? {
                              status: 'paused',
                              elapsedMs: 30_000,
                              dailyMs: { '2026-08-26': 30_000 },
                              timestamp: Date.parse('2026-08-26T12:00:00Z')
                          }
                        : null
            }
        });
        const pageTitle = app.document.title;
        const hiddenTitle = `${status === 'paused' ? '00:00:30' : '00:00:00'} | ${pageTitle}`;
        const originalToday = rowsByDate(app).get('2026-08-26');
        const writes = app.storage.writes.length;
        app.setHidden(true);
        assert.equal(app.document.title, hiddenTitle);
        const readMutations = observeMutations(t, app);
        assert.equal(app.clock.countTimers(), 0);

        app.clock.tick(86_400_000);
        assert.deepEqual(readMutations(), []);
        assert.equal(app.document.title, hiddenTitle);
        app.setHidden(false);

        assert.equal(app.document.title, pageTitle);
        assert.equal(app.element('dailyList').firstElementChild.dataset.date, '2026-08-27');
        assert.equal(rowsByDate(app).get('2026-08-26'), originalToday);
        assert.equal(app.element('todayTotal').textContent, '0m');
        assert.equal(app.element('weekTotal').textContent, '1m');
        assert.equal(
            app.element('stopwatchDisplay').textContent,
            status === 'paused' ? '00:00:30' : '00:00:00'
        );
        assert.equal(app.storage.writes.length, writes);
    });
}

test('ending a paused session resets its hidden title and keeps schedulers stopped', async (t) => {
    const app = await createApp(t);
    const pageTitle = app.document.title;
    app.click('startBtn');
    app.clock.tick(2_250);
    app.click('pauseBtn');
    app.setHidden(true);
    assert.equal(app.document.title, `00:00:02 | ${pageTitle}`);
    app.clock.tick(60_000);
    assert.equal(app.document.title, `00:00:02 | ${pageTitle}`);
    app.click('doneBtn');

    assert.equal(app.document.title, `00:00:00 | ${pageTitle}`);
    assert.equal(app.storage.readSaved().activeSession, null);
    assert.equal(app.clock.countTimers(), 0);
    app.setHidden(false);
    assert.equal(app.document.title, pageTitle);
});

test('an expired check-in resets the hidden title and stops its updates', async (t) => {
    const app = await createApp(t);
    const pageTitle = app.document.title;
    app.click('startBtn');
    app.setHidden(true);
    app.clock.setSystemTime(app.clock.now + 75 * 60_000);
    app.clock.tick(1_000);

    assert.equal(app.document.title, `00:00:00 | ${pageTitle}`);
    assert.equal(app.storage.readSaved().activeSession, null);
    assert.equal(app.clock.countTimers(), 0);
});

test('pagehide stops hidden title updates and pageshow resumes one title timer', async (t) => {
    const app = await createApp(t);
    const pageTitle = app.document.title;
    app.click('startBtn');
    app.clock.tick(1_250);
    app.setHidden(true);
    app.fire(app.window, 'pagehide');
    assert.equal(app.clock.countTimers(), 0);
    const titleAtHide = app.document.title;
    const writesAtHide = app.storage.writes.length;
    app.clock.tick(5_000);

    assert.equal(app.document.title, titleAtHide);
    assert.equal(app.storage.writes.length, writesAtHide);
    for (let i = 0; i < 3; i++) app.fire(app.window, 'pageshow');
    assert.equal(app.document.title, `00:00:06 | ${pageTitle}`);
    assert.equal(app.clock.countTimers(), 2);
    app.clock.tick(1_000);
    assert.equal(app.document.title, `00:00:07 | ${pageTitle}`);
    app.setHidden(false);
    assert.equal(app.document.title, pageTitle);
});

test('pagehide clears all schedulers and repeated pageshow resumes just one of each', async (t) => {
    const app = await createApp(t);
    app.click('startBtn');
    app.clock.tick(250);
    app.fire(app.window, 'pagehide');
    assert.equal(app.storage.readSaved().activeSession.elapsedMs, 250);
    assert.equal(app.clock.countTimers(), 0);
    const readMutations = observeMutations(t, app);
    const writesAtHide = app.storage.writes.length;

    app.clock.tick(5_000);

    assert.deepEqual(readMutations(), []);
    assert.equal(app.storage.writes.length, writesAtHide);
    app.fire(app.window, 'pageshow');
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:05');
    const resumedTimers = app.clock.countTimers();
    assert.ok(resumedTimers > 0);
    for (let i = 0; i < 3; i++) app.fire(app.window, 'pageshow');
    assert.equal(app.clock.countTimers(), resumedTimers);
    assert.equal(app.storage.writes.length, writesAtHide);
    app.clock.tick(10_000);

    assert.equal(app.storage.writes.length - writesAtHide, 2);
    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:15');
    assert.equal(app.storage.readSaved().activeSession.elapsedMs, 15_250);
    app.click('pauseBtn');
    assert.ok(app.clock.countTimers() <= 1, 'Only a visible calendar check may remain paused');
});

test('pageshow resumes the practice timer without restarting stopped audio', async (t) => {
    const app = await createApp(t);
    app.click('startBtn');
    app.click('toneBtn');
    app.click('metronomeBtn');
    app.clock.tick(250);
    const context = app.contexts[0];
    app.fire(app.window, 'pagehide');
    app.clock.tick(5_000);
    const voicesAtHide = context.oscillators.length;
    app.fire(app.window, 'pageshow');
    app.clock.tick(1_000);

    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:06');
    assert.equal(app.contexts.length, 1);
    assert.equal(context.state, 'closed');
    assert.equal(context.oscillators.length, voicesAtHide);
    assert.equal(app.element('toneBtn').textContent.trim(), 'Start Tone');
    assert.equal(app.element('metronomeBtn').textContent.trim(), 'Start Metronome');
});

test('failed completion and its retry keep the same history rows and displayed totals', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t, {
        storedData: { version: 2, dailyData: { '2026-08-26': 59 }, activeSession: null }
    });
    app.click('startBtn');
    app.clock.tick(1_000);
    const rows = rowsByDate(app);
    const historyNodes = ['todayTotal', 'weekTotal', 'dailyList'].map((id) => app.element(id));
    const readMutations = observeMutations(t, app, historyNodes);
    app.storage.failWrites = true;
    app.click('doneBtn');
    app.clock.tick(1_000);

    assert.equal(app.element('stopwatchDisplay').textContent, '00:00:01');
    assert.equal(app.element('pauseBtn').disabled, true);
    assert.equal(app.element('doneBtn').disabled, false);
    assert.equal(app.element('todayTotal').textContent, '1m');
    assert.deepEqual(readMutations(), []);
    assertSameRows(app, rows);
    app.storage.failWrites = false;
    app.click('doneBtn');

    assert.deepEqual(app.storage.readSaved().dailyData, { '2026-08-26': 60 });
    assert.deepEqual(readMutations(), []);
    assertSameRows(app, rows);
});
