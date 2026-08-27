import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import { withGlobal } from '@sinonjs/fake-timers';
import { JSDOM, VirtualConsole } from 'jsdom';

const storageKey = 'trombonePracticeData';
const [html, source] = await Promise.all([
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../script.js', import.meta.url), 'utf8')
]);
const appScript = new Script(source, { filename: 'script.js' });

function createStorage(window, initialData, options) {
    const values = new Map(Object.entries(options.entries || {}));
    if (initialData !== undefined) {
        values.set(
            storageKey,
            typeof initialData === 'string' ? initialData : JSON.stringify(initialData)
        );
    }

    return {
        reads: 0,
        writes: [],
        failReads: options.failReads || false,
        failWrites: options.failWrites || false,
        rejectWrite: options.rejectWrite || (() => false),
        getItem(key) {
            this.reads++;
            if (this.failReads) {
                throw new window.DOMException('Storage cannot be read', 'SecurityError');
            }
            return values.get(key) ?? null;
        },
        setItem(key, value) {
            if (this.failWrites || this.rejectWrite(key)) {
                throw new window.DOMException('Storage is unavailable', 'QuotaExceededError');
            }
            const text = String(value);
            this.writes.push({ key, value: text });
            values.set(key, text);
        },
        removeItem(key) {
            values.delete(key);
        },
        readSaved() {
            const value = values.get(storageKey);
            return value === undefined ? null : JSON.parse(value);
        },
        readRaw(key = storageKey) {
            return values.get(key) ?? null;
        },
        readBackups() {
            return Object.fromEntries(
                [...values].filter(([key]) => key.startsWith(`${storageKey}.backup.`))
            );
        },
        changeExternally(value, { key = storageKey, notify = true } = {}) {
            const oldValue = values.get(key) ?? null;
            if (key === null) values.clear();
            else if (value === null) values.delete(key);
            else values.set(key, typeof value === 'string' ? value : JSON.stringify(value));
            if (notify) {
                window.dispatchEvent(
                    new window.StorageEvent('storage', {
                        key,
                        oldValue,
                        newValue: values.get(key) ?? null
                    })
                );
            }
        }
    };
}

function createAudioParam(value = 0) {
    return {
        value,
        events: [],
        setValueAtTime(value, time) {
            this.value = value;
            this.events.push({ type: 'set', value, time });
            return this;
        },
        linearRampToValueAtTime(value, time) {
            this.value = value;
            this.events.push({ type: 'linear', value, time });
            return this;
        },
        exponentialRampToValueAtTime(value, time) {
            this.value = value;
            this.events.push({ type: 'exponential', value, time });
            return this;
        },
        setTargetAtTime(value, time, timeConstant) {
            this.value = value;
            this.events.push({ type: 'target', value, time, timeConstant });
            return this;
        },
        cancelScheduledValues(time) {
            this.events.push({ type: 'cancel', time });
            return this;
        },
        cancelAndHoldAtTime(time) {
            this.events.push({ type: 'hold', time });
            return this;
        }
    };
}

function createAudioContextClass(window, clock, contexts, options) {
    class AudioNode extends window.EventTarget {
        connections = new Set();
        disconnected = false;
        disconnectCalls = 0;

        connect(destination) {
            this.connections.add(destination);
            return destination;
        }

        disconnect() {
            this.connections.clear();
            this.disconnected = true;
            this.disconnectCalls++;
        }
    }

    class Oscillator extends AudioNode {
        frequency = createAudioParam(440);
        type = 'sine';
        startTime = null;
        stopTime = null;
        startCalls = [];
        stopCalls = [];
        onended = null;
        endTimer = null;
        ended = false;

        constructor(context) {
            super();
            this.context = context;
        }

        start(time = this.context.currentTime) {
            assert.equal(this.startTime, null, 'An oscillator can only be started once');
            this.startCalls.push({ time, scheduledAt: this.context.currentTime });
            this.startTime = Math.max(time, this.context.currentTime);
        }

        stop(time = this.context.currentTime) {
            assert.notEqual(this.startTime, null, 'An oscillator must be started before stopping');
            this.stopCalls.push({ time, scheduledAt: this.context.currentTime });
            this.stopTime = Math.max(time, this.context.currentTime);
            this.scheduleEnd();
        }

        scheduleEnd() {
            clock.clearTimeout(this.endTimer);
            this.endTimer = null;
            if (this.stopTime === null || this.ended || this.context.state !== 'running') return;

            this.endTimer = clock.setTimeout(
                () => {
                    this.endTimer = null;
                    this.ended = true;
                    this.dispatchEvent(new window.Event('ended'));
                    this.onended?.(new window.Event('ended'));
                },
                Math.max(0, (this.stopTime - this.context.currentTime) * 1000)
            );
        }

        get playing() {
            const now = this.context.currentTime;
            return (
                this.context.state === 'running' &&
                !this.ended &&
                this.startTime !== null &&
                now >= this.startTime &&
                (this.stopTime === null || now < this.stopTime)
            );
        }
    }

    return class AudioContext extends window.EventTarget {
        runningSince = window.performance.now();
        elapsedTime = 0;
        currentState = options.state || 'running';
        destination = new AudioNode();
        oscillators = [];
        gains = [];
        resumeCalls = 0;
        closeCalls = 0;
        pendingResumes = [];
        onstatechange = null;

        constructor() {
            super();
            if (options.constructorFailure) {
                throw options.constructorFailure instanceof Error
                    ? options.constructorFailure
                    : new Error('Audio cannot be initialized');
            }
            contexts.push(this);
        }

        get currentTime() {
            return (
                this.elapsedTime +
                (this.state === 'running'
                    ? (window.performance.now() - this.runningSince) / 1000
                    : 0)
            );
        }

        get state() {
            return this.currentState;
        }

        setState(state) {
            if (this.currentState === state) return;
            this.elapsedTime = this.currentTime;
            this.runningSince = window.performance.now();
            this.currentState = state;
            this.oscillators.forEach((oscillator) => oscillator.scheduleEnd());
            this.dispatchEvent(new window.Event('statechange'));
            this.onstatechange?.(new window.Event('statechange'));
        }

        createOscillator() {
            assert.notEqual(this.state, 'closed', 'Cannot allocate a voice on a closed context');
            const oscillator = new Oscillator(this);
            this.oscillators.push(oscillator);
            return oscillator;
        }

        createGain() {
            const gain = new AudioNode();
            gain.gain = createAudioParam(1);
            if (options.cancelAndHold === false) delete gain.gain.cancelAndHoldAtTime;
            this.gains.push(gain);
            return gain;
        }

        resume() {
            this.resumeCalls++;
            if (this.state === 'closed') {
                return Promise.reject(
                    new window.DOMException('Audio context is closed', 'InvalidStateError')
                );
            }
            if (options.resume === 'deferred') {
                return new Promise((resolve, reject) => {
                    this.pendingResumes.push({ resolve, reject });
                });
            }
            if (options.resume === 'reject') {
                return Promise.reject(new Error('Audio resume was blocked'));
            }
            return Promise.resolve().then(() => this.setState('running'));
        }

        resolveResume() {
            const pending = this.pendingResumes.splice(0);
            assert.ok(pending.length, 'Expected an in-flight audio resume request');
            if (this.state !== 'closed') this.setState('running');
            pending.forEach(({ resolve }) => resolve());
        }

        rejectResume(error = new Error('Audio resume was blocked')) {
            const pending = this.pendingResumes.splice(0);
            assert.ok(pending.length, 'Expected an in-flight audio resume request');
            pending.forEach(({ reject }) => reject(error));
        }

        close() {
            this.closeCalls++;
            this.setState('closed');
            return Promise.resolve();
        }
    };
}

/** Load the actual page/script in an isolated DOM; no source rewriting or production test hooks. */
export async function createApp(
    t,
    { now = '2026-08-26T12:00:00Z', storedData, storageOptions = {}, audioOptions = {} } = {}
) {
    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (error) => errors.push(error.cause ?? error));
    const dom = new JSDOM(html, {
        url: 'https://practice-timer.test/',
        runScripts: 'outside-only',
        pretendToBeVisual: true,
        virtualConsole
    });
    const { window } = dom;

    // Wait for jsdom's own ready event before registering the application's listener.
    await new Promise((resolve) => {
        window.document.addEventListener('DOMContentLoaded', resolve, { once: true });
    });

    const clock = withGlobal(window).install({
        now: new Date(now).getTime(),
        toFake: [
            'Date',
            'setTimeout',
            'clearTimeout',
            'setInterval',
            'clearInterval',
            'performance'
        ]
    });
    t.after(() => {
        clock.uninstall();
        window.close();
        assert.deepEqual(errors, [], 'The application must not emit uncaught errors');
    });

    const storage = createStorage(window, storedData, storageOptions);
    Object.defineProperty(window, 'localStorage', { value: storage });
    const contexts = [];
    if (audioOptions.supported !== false) {
        const contextClass = createAudioContextClass(window, clock, contexts, audioOptions);
        if (audioOptions.webkit) window.webkitAudioContext = contextClass;
        else window.AudioContext = contextClass;
    }

    appScript.runInContext(dom.getInternalVMContext());
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

    function element(id) {
        const found = window.document.getElementById(id);
        assert.ok(found, `Missing element: ${id}`);
        return found;
    }

    function fire(target, type) {
        const node = typeof target === 'string' ? element(target) : target;
        const event = new window.Event(type, { bubbles: true, cancelable: true });
        node.dispatchEvent(event);
        return event;
    }

    function pointer(target, type, options = {}) {
        const node = typeof target === 'string' ? element(target) : target;
        const values = {
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
            button: 0,
            buttons: type === 'pointerdown' ? 1 : 0,
            ...options
        };
        // jsdom may not provide PointerEvent; keep real MouseEvent behavior and add its fields.
        const event = new (window.PointerEvent || window.MouseEvent)(type, values);
        for (const property of ['pointerId', 'pointerType', 'isPrimary']) {
            if (!(property in event))
                Object.defineProperty(event, property, { value: values[property] });
        }
        node.dispatchEvent(event);
        return event;
    }

    function keyboard(target, type, key, options = {}) {
        const node = typeof target === 'string' ? element(target) : target;
        const event = new window.KeyboardEvent(type, {
            bubbles: true,
            cancelable: true,
            key,
            ...options
        });
        node.dispatchEvent(event);
        return event;
    }

    return {
        window,
        document: window.document,
        clock,
        storage,
        contexts,
        element,
        fire,
        pointer,
        keyboard,
        async flushAudio() {
            // Readiness handlers can chain several native promises; do not advance the clock.
            for (let i = 0; i < 12; i++) await Promise.resolve();
        },
        setHidden(hidden) {
            Object.defineProperty(window.document, 'hidden', { configurable: true, value: hidden });
            fire(window.document, 'visibilitychange');
        },
        click(target, options) {
            const node = typeof target === 'string' ? element(target) : target;
            if (options) {
                const event = new window.MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    ...options
                });
                node.dispatchEvent(event);
                return event;
            }
            node.click();
        },
        input(id, value, event = 'input') {
            element(id).value = String(value);
            fire(id, event);
        }
    };
}

export function useTimeZone(t, zone) {
    const original = process.env.TZ;
    process.env.TZ = zone;
    t.after(() => {
        if (original === undefined) delete process.env.TZ;
        else process.env.TZ = original;
    });
}
