import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp, useTimeZone } from './helpers/app.mjs';

const today = '2026-08-26';
const yesterday = '2026-08-25';
const initialData = {
    version: 2,
    dailyData: { [today]: 3723.456, [yesterday]: 2400 },
    activeSession: null
};

async function createEditorApp(t, options = {}) {
    useTimeZone(t, 'UTC');
    const app = await createApp(t, { storedData: initialData, ...options });
    // Ignore the startup storage capability probe when counting edit writes.
    app.storage.writes.length = 0;
    // jsdom has no native dialog methods. Actual focus trapping and Escape are
    // browser behavior; this shim only lets state/persistence tests open/close it.
    const dialog = app.element('dailyEditDialog');
    dialog.showModal = function () {
        this.open = true;
    };
    dialog.close = function () {
        this.open = false;
        app.fire(this, 'close');
    };
    app.edit = (day = today) => {
        const button = app.document.querySelector(`[data-date="${day}"] .daily-edit-button`);
        assert.ok(button, `Missing edit button for ${day}`);
        button.focus();
        app.click(button);
        assert.equal(dialog.open, true);
        return button;
    };
    return app;
}

test('opening and canceling a daily edit preserves exact saved time and returns focus', async (t) => {
    const app = await createEditorApp(t);
    const button = app.edit();
    assert.match(button.getAttribute('aria-label'), /2026-08-26/);
    assert.equal(button.getAttribute('aria-haspopup'), 'dialog');
    assert.equal(app.element('dailyEditHours').value, '1');
    assert.equal(app.element('dailyEditMinutes').value, '2');
    assert.equal(app.element('dailyEditSeconds').value, '3.456');
    assert.equal(app.document.activeElement, app.element('dailyEditHours'));
    app.input('dailyEditHours', 4);
    app.click('dailyEditCancel');
    assert.equal(app.element('dailyEditDialog').open, false);
    assert.equal(app.document.activeElement, button);
    assert.deepEqual(app.storage.readSaved(), initialData);
    assert.equal(app.storage.writes.length, 0);
});

test('Save replaces only the selected date, updates summaries and survives reload', async (t) => {
    const app = await createEditorApp(t);
    app.edit();
    app.input('dailyEditHours', 0);
    app.input('dailyEditMinutes', 30);
    app.input('dailyEditSeconds', '59.999');
    app.click('dailyEditSave');
    assert.equal(app.element('dailyEditDialog').open, false);
    assert.deepEqual(app.storage.readSaved().dailyData, { [today]: 1859.999, [yesterday]: 2400 });
    assert.equal(app.storage.writes.length, 1);
    assert.equal(app.element('todayTotal').textContent, '30m');
    assert.equal(app.element('weekTotal').textContent, '1h 10m');
    assert.match(app.element('dailyEditStatus').textContent, /2026-08-26 updated/);

    const reloaded = await createEditorApp(t, { storedData: app.storage.readRaw() });
    reloaded.edit();
    assert.equal(reloaded.element('dailyEditMinutes').value, '30');
    assert.equal(reloaded.element('dailyEditSeconds').value, '59.999');
});

test('saving an unchanged edit retains saved milliseconds', async (t) => {
    const app = await createEditorApp(t);
    app.edit();
    app.click('dailyEditSave');
    assert.deepEqual(app.storage.readSaved(), initialData);
});

for (const [id, expectedSeconds] of [
    ['dailyEditHours', 123.456],
    ['dailyEditMinutes', 3603.456],
    ['dailyEditSeconds', 3720]
]) {
    test(`blank ${id} saves as zero while preserving the other units and dates`, async (t) => {
        const app = await createEditorApp(t);
        app.edit();
        app.input(id, '');
        app.click('dailyEditSave');
        assert.equal(app.element('dailyEditDialog').open, false);
        assert.deepEqual(app.storage.readSaved().dailyData, {
            [today]: expectedSeconds,
            [yesterday]: 2400
        });
        assert.equal(app.storage.writes.length, 1);
    });
}

test('saving all inputs blank clears only the selected date', async (t) => {
    const app = await createEditorApp(t);
    app.edit();
    for (const id of ['dailyEditHours', 'dailyEditMinutes', 'dailyEditSeconds']) {
        app.input(id, '');
    }
    app.click('dailyEditSave');
    assert.equal(app.element('dailyEditDialog').open, false);
    assert.deepEqual(app.storage.readSaved().dailyData, { [yesterday]: 2400 });
    assert.equal(app.storage.writes.length, 1);
    assert.match(app.element('dailyEditStatus').textContent, /2026-08-26 cleared/);
});

for (const id of ['dailyEditHours', 'dailyEditMinutes', 'dailyEditSeconds']) {
    test(`incomplete numeric text in ${id} is not treated as a blank input`, async (t) => {
        const app = await createEditorApp(t);
        app.edit();
        app.input(id, '');
        // Browsers expose incomplete number input as an empty value with badInput.
        // jsdom cannot represent that native editing state, so model its validity.
        Object.defineProperty(app.element(id), 'validity', {
            get: () => ({ badInput: true, valid: false })
        });
        app.click('dailyEditSave');
        assert.equal(app.element('dailyEditDialog').open, true);
        assert.equal(app.element(id).value, '');
        assert.equal(app.element(id).getAttribute('aria-invalid'), 'true');
        assert.equal(app.document.activeElement, app.element(id));
        assert.deepEqual(app.storage.readSaved(), initialData);
        assert.equal(app.storage.writes.length, 0);
    });
}

test('Clear day changes only the draft until Save, and Cancel discards it', async (t) => {
    const app = await createEditorApp(t);
    app.edit(yesterday);
    app.click('dailyEditClear');
    for (const id of ['dailyEditHours', 'dailyEditMinutes', 'dailyEditSeconds']) {
        assert.equal(app.element(id).value, '0');
    }
    assert.deepEqual(app.storage.readSaved(), initialData);
    app.click('dailyEditCancel');
    app.edit(yesterday);
    assert.equal(app.element('dailyEditMinutes').value, '40');
    app.click('dailyEditClear');
    app.click('dailyEditSave');
    assert.deepEqual(app.storage.readSaved().dailyData, { [today]: 3723.456 });
    assert.equal(app.element('weekTotal').textContent, '1h 2m');
    assert.match(app.element('dailyEditStatus').textContent, /2026-08-25 cleared/);
});

test('a day without recorded time can be corrected through its row', async (t) => {
    const app = await createEditorApp(t);
    app.edit('2026-08-24');
    assert.equal(app.element('dailyEditMinutes').value, '0');
    app.input('dailyEditMinutes', 20);
    app.click('dailyEditSave');
    assert.deepEqual(app.storage.readSaved().dailyData, {
        ...initialData.dailyData,
        '2026-08-24': 1200
    });
});

for (const [id, value] of [
    ['dailyEditHours', '-1'],
    ['dailyEditHours', '1.5'],
    ['dailyEditHours', String(Number.MAX_SAFE_INTEGER)],
    ['dailyEditMinutes', '60'],
    ['dailyEditMinutes', '2.5'],
    ['dailyEditSeconds', '-0.001'],
    ['dailyEditSeconds', '60'],
    ['dailyEditSeconds', '0.0001']
]) {
    test(`invalid ${id} value ${JSON.stringify(value)} keeps the editor and saved history intact`, async (t) => {
        const app = await createEditorApp(t);
        app.edit();
        app.input(id, value);
        app.click('dailyEditSave');
        assert.equal(app.element('dailyEditDialog').open, true);
        assert.equal(app.element(id).getAttribute('aria-invalid'), 'true');
        assert.equal(app.document.activeElement, app.element(id));
        assert.equal(app.element('dailyEditNotice').hidden, false);
        assert.deepEqual(app.storage.readSaved(), initialData);
        assert.equal(app.storage.writes.length, 0);
    });
}

test('a failed edit save keeps its draft and totals until a successful retry', async (t) => {
    const app = await createEditorApp(t, { storageOptions: { failWrites: true } });
    app.edit(yesterday);
    app.input('dailyEditMinutes', 10);
    app.click('dailyEditSave');
    assert.equal(app.element('dailyEditDialog').open, true);
    assert.equal(app.element('dailyEditMinutes').value, '10');
    assert.equal(app.element('weekTotal').textContent, '1h 42m');
    assert.match(app.element('dailyEditNotice').textContent, /could not be saved/);
    assert.deepEqual(app.storage.readSaved(), initialData);
    app.storage.failWrites = false;
    app.click('dailyEditSave');
    assert.equal(app.element('dailyEditDialog').open, false);
    assert.deepEqual(app.storage.readSaved().dailyData, { [today]: 3723.456, [yesterday]: 600 });
    assert.equal(app.element('weekTotal').textContent, '1h 12m');
});

test('Cancel after a failed Save discards its draft and dismisses its save notice', async (t) => {
    const app = await createEditorApp(t, { storageOptions: { failWrites: true } });
    app.edit();
    app.input('dailyEditHours', 0);
    app.click('dailyEditSave');
    assert.equal(app.element('storageStatus').hidden, false);
    app.click('dailyEditCancel');
    assert.deepEqual(app.storage.readSaved(), initialData);
    assert.equal(app.element('storageStatus').hidden, true);
});

for (const notify of [false, true]) {
    test(`a ${notify ? 'notified' : 'delayed'} cross-tab edit cannot be overwritten by an open editor`, async (t) => {
        const app = await createEditorApp(t);
        app.edit();
        app.input('dailyEditHours', 2);
        const changed = { ...initialData, dailyData: { [today]: 600, [yesterday]: 1200 } };
        app.storage.changeExternally(changed, { notify });
        app.fire('dailyEditForm', 'submit');
        assert.equal(app.element('dailyEditDialog').open, true);
        assert.deepEqual(app.storage.readSaved(), changed);
        assert.equal(app.storage.writes.length, 0);
        assert.equal(app.element('dailyEditSave').disabled, true);
        assert.match(app.element('dailyEditNotice').textContent, /changed in another tab/);
    });
}

for (const state of ['running', 'paused', 'unsaved']) {
    test(`a ${state} session blocks edits with a visible instruction to finish it first`, async (t) => {
        const app = await createEditorApp(t);
        if (state === 'unsaved') app.storage.failWrites = true;
        app.click('startBtn');
        app.clock.tick(1000);
        if (state === 'paused') app.click('pauseBtn');
        const raw = app.storage.readRaw();
        app.edit(yesterday);
        assert.equal(app.element('dailyEditSave').disabled, true);
        assert.equal(app.element('dailyEditClear').disabled, true);
        assert.equal(app.element('dailyEditHours').disabled, true);
        assert.match(
            app.element('dailyEditNotice').textContent,
            /Finish your current session with Done/
        );
        app.fire('dailyEditForm', 'submit');
        assert.equal(app.storage.readRaw(), raw);
        app.click('dailyEditCancel');
        app.storage.failWrites = false;
        app.click('doneBtn');
        app.edit(yesterday);
        assert.equal(app.element('dailyEditSave').disabled, false);
        app.input('dailyEditMinutes', 5);
        app.click('dailyEditSave');
        assert.equal(app.storage.readSaved().dailyData[yesterday], 300);
    });
}

test('an editor keeps its selected date across midnight', async (t) => {
    const app = await createEditorApp(t, { now: '2026-08-26T23:59:59Z' });
    app.edit();
    app.clock.tick(1000);
    app.input('dailyEditHours', 0);
    app.input('dailyEditMinutes', 5);
    app.input('dailyEditSeconds', 0);
    app.click('dailyEditSave');
    assert.equal(app.storage.readSaved().dailyData[today], 300);
    assert.equal(app.storage.readSaved().dailyData['2026-08-27'], undefined);
    assert.equal(app.element('todayTotal').textContent, '0m');
});

test('a session finishing behind the dialog cannot turn an old total into a writable draft', async (t) => {
    const app = await createEditorApp(t);
    app.click('startBtn');
    app.clock.tick(1000);
    app.edit();
    // An automatic finish may occur while the native modal is open.
    app.click('doneBtn');
    const saved = app.storage.readRaw();
    assert.equal(app.element('dailyEditSave').disabled, true);
    assert.match(app.element('dailyEditNotice').textContent, /Recorded time changed/);
    app.fire('dailyEditForm', 'submit');
    assert.equal(app.storage.readRaw(), saved);
    app.click('dailyEditCancel');
    app.edit();
    assert.equal(app.element('dailyEditSeconds').value, '4.456');
    assert.equal(app.element('dailyEditSave').disabled, false);
});
