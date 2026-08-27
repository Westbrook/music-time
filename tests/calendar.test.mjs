import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp, useTimeZone } from './helpers/app.mjs';

test('practice is recorded under the local date west of UTC', async (t) => {
    useTimeZone(t, 'America/New_York');
    const app = await createApp(t, { now: '2026-08-26T23:30:00-04:00' });
    app.click('startBtn');
    app.clock.tick(1_000);
    app.click('doneBtn');

    assert.deepEqual(app.storage.readSaved().dailyData, { '2026-08-26': 1 });
});

for (const [zone, now] of [
    ['Asia/Tokyo', '2026-08-26T12:00:00+09:00'],
    ['Pacific/Auckland', '2026-08-26T12:00:00+12:00']
]) {
    test(`practice uses the local calendar date in ${zone}`, async (t) => {
        useTimeZone(t, zone);
        const app = await createApp(t, { now });
        app.click('startBtn');
        app.clock.tick(1_000);
        app.click('doneBtn');

        assert.deepEqual(app.storage.readSaved().dailyData, { '2026-08-26': 1 });
    });
}

test('migration preserves existing date keys in a zone east of UTC', async (t) => {
    useTimeZone(t, 'Asia/Tokyo');
    const app = await createApp(t, {
        now: '2026-08-26T12:00:00+09:00',
        storedData: {
            version: 1,
            dailyData: { '2026-08-25': 120, '2026-08-26': 60 },
            activeSession: null
        }
    });

    assert.equal(app.element('todayTotal').textContent, '1m');
    assert.equal(app.element('weekTotal').textContent, '3m');
    app.click('startBtn');
    app.clock.tick(1_000);
    app.click('doneBtn');

    assert.equal(app.storage.readSaved().version, 2);
    assert.deepEqual(app.storage.readSaved().dailyData, {
        '2026-08-25': 120,
        '2026-08-26': 61
    });
});

for (const { description, zone, now, recoveredDay, expiresAt, withSession } of [
    {
        description: 'an older completed date',
        zone: 'Asia/Tokyo',
        now: '2026-08-26T12:00:00+09:00',
        recoveredDay: '2026-08-25',
        expiresAt: '2026-09-01T00:00:00+09:00',
        withSession: false
    },
    {
        description: 'a recovered active date across spring DST',
        zone: 'America/New_York',
        now: '2026-03-05T12:00:00-05:00',
        recoveredDay: '2026-03-05',
        expiresAt: '2026-03-12T00:00:00-04:00',
        withSession: true
    },
    {
        description: 'a completed date across autumn DST',
        zone: 'America/New_York',
        now: '2026-10-29T12:00:00-04:00',
        recoveredDay: '2026-10-29',
        expiresAt: '2026-11-05T00:00:00-05:00',
        withSession: false
    }
]) {
    test(`the recovery notice expires when ${description} leaves the visible history`, async (t) => {
        useTimeZone(t, zone);
        const raw = JSON.stringify({
            version: 1,
            dailyData: withSession ? { '2026-03-04': 60 } : { [recoveredDay]: 60 },
            activeSession: withSession
                ? { elapsed: 60, timestamp: Date.parse(now), running: false }
                : null
        });
        const app = await createApp(t, { now, storedData: raw });
        if (withSession) app.click('doneBtn');
        else {
            app.click('startBtn');
            app.click('pauseBtn');
        }
        const saved = app.storage.readRaw();
        const writes = app.storage.writes.length;
        const reads = app.storage.reads;
        app.clock.setSystemTime(Date.parse(expiresAt) - 1);
        app.fire(app.window, 'focus');

        assert.equal(app.element('weekTotal').textContent, '1m');
        assert.equal(app.element('storageStatus').hidden, false);
        assert.match(app.element('storageStatus').textContent, /Saved data was recovered/);
        app.clock.tick(1);

        assert.equal(app.element('weekTotal').textContent, '0m');
        assert.equal(app.element('storageStatus').hidden, true);
        assert.equal(app.element('storageStatus').textContent, '');
        assert.equal(app.storage.reads, reads);
        assert.equal(app.storage.writes.length, writes);
        assert.equal(app.storage.readRaw(), saved);
        assert.deepEqual(Object.values(app.storage.readBackups()), [raw]);
    });
}

test('the seven-day total includes yesterday after the spring DST transition', async (t) => {
    useTimeZone(t, 'America/New_York');
    const app = await createApp(t, {
        now: '2026-03-09T00:30:00-04:00',
        storedData: {
            version: 1,
            dailyData: { '2026-03-08': 600 },
            activeSession: null
        }
    });

    assert.equal(app.element('weekTotal').textContent, '10m');
    const yesterday = app.element('dailyList').children[1];
    assert.equal(yesterday.querySelector('.daily-date').textContent, 'Yesterday');
    assert.equal(yesterday.querySelector('.daily-duration').textContent, '10m');
});

test('the autumn DST transition does not duplicate today in the seven-day history', async (t) => {
    useTimeZone(t, 'America/New_York');
    const app = await createApp(t, {
        now: '2026-11-01T23:30:00-05:00',
        storedData: {
            version: 1,
            dailyData: {
                '2026-11-01': 60,
                '2026-10-31': 120,
                '2026-10-30': 180,
                '2026-10-29': 240,
                '2026-10-28': 300,
                '2026-10-27': 360,
                '2026-10-26': 420,
                '2026-10-25': 480
            },
            activeSession: null
        }
    });

    const rows = [...app.element('dailyList').children];
    const labels = rows.map((row) => row.querySelector('.daily-date').textContent);
    assert.equal(rows.length, 7);
    assert.equal(new Set(labels).size, 7);
    assert.deepEqual(labels.slice(0, 2), ['Today', 'Yesterday']);
    assert.deepEqual(
        rows.map((row) => row.querySelector('.daily-duration').textContent),
        ['1m', '2m', '3m', '4m', '5m', '6m', '7m']
    );
    assert.equal(app.element('weekTotal').textContent, '28m');
});

for (const { transition, now, retainedDates, expiredDate, futureDate } of [
    {
        transition: 'spring',
        now: '2026-03-09T00:30:00-04:00',
        retainedDates: [
            '2026-03-03',
            '2026-03-04',
            '2026-03-05',
            '2026-03-06',
            '2026-03-07',
            '2026-03-08',
            '2026-03-09'
        ],
        expiredDate: '2026-03-02',
        futureDate: '2026-03-10'
    },
    {
        transition: 'autumn',
        now: '2026-11-01T23:30:00-05:00',
        retainedDates: [
            '2026-10-26',
            '2026-10-27',
            '2026-10-28',
            '2026-10-29',
            '2026-10-30',
            '2026-10-31',
            '2026-11-01'
        ],
        expiredDate: '2026-10-25',
        futureDate: '2026-11-02'
    }
]) {
    test(`finalization expires old history and preserves future dates across ${transition} DST`, async (t) => {
        useTimeZone(t, 'America/New_York');
        const retainedData = Object.fromEntries(
            retainedDates.map((date, index) => [date, (index + 1) * 60])
        );
        const dailyData = { [expiredDate]: 600, ...retainedData, [futureDate]: 600 };
        const app = await createApp(t, {
            now,
            storedData: { version: 1, dailyData, activeSession: null }
        });
        app.click('startBtn');
        app.clock.tick(1_000);
        app.click('pauseBtn');

        assert.deepEqual(app.storage.readSaved().dailyData, dailyData);
        app.click('doneBtn');

        assert.deepEqual(app.storage.readSaved().dailyData, {
            ...retainedData,
            [retainedDates.at(-1)]: 421,
            [futureDate]: 600
        });
        assert.equal(app.element('todayTotal').textContent, '7m');
        assert.equal(app.element('weekTotal').textContent, '28m');
    });
}

test('a session crossing midnight allocates practice to both calendar days', async (t) => {
    useTimeZone(t, 'UTC');
    const app = await createApp(t, { now: '2026-08-26T23:59:30Z' });
    app.click('startBtn');
    app.clock.tick(60_000);
    app.click('doneBtn');

    assert.deepEqual(app.storage.readSaved().dailyData, {
        '2026-08-26': 30,
        '2026-08-27': 30
    });
});

test('live history allocates the active session by day and keeps accrued time when paused', async (t) => {
    useTimeZone(t, 'UTC');
    const dailyData = { '2026-08-26': 120, '2026-08-27': 240 };
    const app = await createApp(t, {
        now: '2026-08-26T23:59:00Z',
        storedData: { version: 1, dailyData, activeSession: null }
    });
    app.click('startBtn');
    app.clock.tick(60_000);

    assert.equal(app.element('todayTotal').textContent, '4m');
    assert.equal(app.element('weekTotal').textContent, '7m');
    assert.equal(
        app.element('dailyList').children[1].querySelector('.daily-duration').textContent,
        '3m'
    );

    app.clock.tick(60_000);
    assert.equal(app.element('todayTotal').textContent, '5m');
    assert.equal(app.element('weekTotal').textContent, '8m');
    assert.deepEqual(
        [...app.element('dailyList').children]
            .slice(0, 2)
            .map((row) => row.querySelector('.daily-duration').textContent),
        ['5m', '3m']
    );

    app.click('pauseBtn');
    app.clock.tick(60_000);
    app.window.dispatchEvent(new app.window.Event('focus'));
    assert.equal(app.element('todayTotal').textContent, '5m');
    assert.equal(app.element('weekTotal').textContent, '8m');
    assert.deepEqual(app.storage.readSaved().dailyData, dailyData);
});

test('a pause spanning local midnight is excluded when the session resumes', async (t) => {
    useTimeZone(t, 'America/New_York');
    const app = await createApp(t, { now: '2026-08-26T23:58:30-04:00' });
    app.click('startBtn');
    app.clock.tick(60_000);
    app.click('pauseBtn');
    app.clock.tick(120_000);
    app.click('startBtn');
    app.clock.tick(60_000);

    assert.equal(app.element('stopwatchDisplay').textContent, '00:02:00');
    app.click('doneBtn');
    assert.deepEqual(app.storage.readSaved().dailyData, {
        '2026-08-26': 60,
        '2026-08-27': 60
    });
});

for (const { now, previousDaySeconds, todaySeconds } of [
    { now: '2026-08-26T23:59:59.750Z', previousDaySeconds: 0.25, todaySeconds: 0.875 },
    { now: '2026-08-26T23:59:59.125Z', previousDaySeconds: 0.875, todaySeconds: 0.25 }
]) {
    test(`fractional midnight allocation conserves 1.125 seconds starting at ${now}`, async (t) => {
        useTimeZone(t, 'UTC');
        const app = await createApp(t, { now });
        app.click('startBtn');
        app.clock.tick(1_125);
        app.click('doneBtn');

        const dailyData = app.storage.readSaved().dailyData;
        assert.deepEqual(dailyData, {
            '2026-08-26': previousDaySeconds,
            '2026-08-27': todaySeconds
        });
        assert.equal(
            Object.values(dailyData).reduce((sum, seconds) => sum + seconds, 0),
            1.125
        );
    });
}

for (const { transition, start, now, date, seconds } of [
    {
        transition: 'spring',
        start: '2026-03-08T00:00:00-05:00',
        now: '2026-03-09T00:00:00-04:00',
        date: '2026-03-08',
        seconds: 82_800
    },
    {
        transition: 'autumn',
        start: '2026-11-01T00:00:00-04:00',
        now: '2026-11-02T00:00:00-05:00',
        date: '2026-11-01',
        seconds: 90_000
    }
]) {
    test(`a restored session uses the actual length of the ${transition} DST day`, async (t) => {
        useTimeZone(t, 'America/New_York');
        const app = await createApp(t, {
            now,
            storedData: {
                version: 2,
                dailyData: {},
                activeSession: {
                    status: 'running',
                    elapsedMs: 0,
                    dailyMs: {},
                    timestamp: Date.parse(start)
                }
            }
        });
        app.click('doneBtn');

        assert.deepEqual(app.storage.readSaved().dailyData, { [date]: seconds });
    });
}
