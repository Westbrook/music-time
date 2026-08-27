// Trombone Practice Timer - Main Application
// Browser support: Modern browsers with Web Audio API and LocalStorage

(function () {
    'use strict';

    /**
     * @typedef {{status: 'running' | 'paused', elapsedMs: number, dailyMs: Record<string, number>, timestamp: number}} ActiveSession
     * @typedef {{version: number, dailyData: Record<string, number>, activeSession: ActiveSession | null}} PracticeData
     * @typedef {{now: number, session: ActiveSession | null, dailyData: Record<string, number>, readOnly: boolean}} PracticeSnapshot
     * @typedef {{element: HTMLLIElement, date: HTMLSpanElement, duration: HTMLSpanElement, minutes: number | null}} HistoryRow
     * @typedef {{context: AudioContext, oscillator: OscillatorNode, gainNode: GainNode}} AudioVoice
     * @typedef {{voice: AudioVoice | null, keyEl: HTMLButtonElement, audition: boolean}} ActiveNote
     * @typedef {{el: HTMLElement, mode: 'hold' | 'momentary', activeNotes: Map<string, ActiveNote>}} PracticeKeyboard
     */

    // ============================================================================
    // Constants and Configuration
    // ============================================================================

    const STORAGE_KEY = 'trombonePracticeData';
    const STORAGE_VERSION = 2;
    const MIN_BPM = 40;
    const MAX_BPM = 240;
    const DAYS_TO_KEEP = 7;
    const AUDIO_RAMP_TIME = 0.015; // Prevent clicks on tone start/stop

    // Note frequencies (A4 = 440 Hz)
    const NOTE_FREQUENCIES = {
        C: [16.35, 32.7, 65.41, 130.81, 261.63, 523.25, 1046.5],
        'C#': [17.32, 34.65, 69.3, 138.59, 277.18, 554.37, 1108.73],
        D: [18.35, 36.71, 73.42, 146.83, 293.66, 587.33, 1174.66],
        'D#': [19.45, 38.89, 77.78, 155.56, 311.13, 622.25, 1244.51],
        E: [20.6, 41.2, 82.41, 164.81, 329.63, 659.25, 1318.51],
        F: [21.83, 43.65, 87.31, 174.61, 349.23, 698.46, 1396.91],
        'F#': [23.12, 46.25, 92.5, 185.0, 369.99, 739.99, 1479.98],
        G: [24.5, 49.0, 98.0, 196.0, 392.0, 783.99, 1567.98],
        'G#': [25.96, 51.91, 103.83, 207.65, 415.3, 830.61, 1661.22],
        A: [27.5, 55.0, 110.0, 220.0, 440.0, 880.0, 1760.0],
        'A#': [29.14, 58.27, 116.54, 233.08, 466.16, 932.33, 1864.66],
        B: [30.87, 61.74, 123.47, 246.94, 493.88, 987.77, 1975.53]
    };

    /** @typedef {keyof typeof NOTE_FREQUENCIES} NoteName */

    // ============================================================================
    // Utility Functions
    // ============================================================================

    function getLocalMidnight(date = new Date()) {
        const midnight = new Date(date);
        midnight.setHours(0, 0, 0, 0);
        return midnight;
    }

    function getDayKey(date = new Date()) {
        const year = String(date.getFullYear()).padStart(4, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /** @param {Date} date @param {number} offset */
    function shiftLocalDay(date, offset) {
        const shifted = new Date(date);
        shifted.setDate(shifted.getDate() + offset);
        shifted.setHours(0, 0, 0, 0);
        return shifted;
    }

    /** @param {Record<string, number>} dailyData @param {number} now */
    function retainRecentDays(dailyData, now) {
        const cutoff = getDayKey(shiftLocalDay(new Date(now), 1 - DAYS_TO_KEEP));
        return Object.fromEntries(Object.entries(dailyData).filter(([key]) => key >= cutoff));
    }

    /**
     * Allocate only the visible calendar window, even after a very long absence.
     * @param {number} start
     * @param {number} end
     */
    function allocatePracticeTime(start, end) {
        /** @type {Record<string, number>} */
        const dailyMs = {};
        if (end <= start) return dailyMs;
        const today = getLocalMidnight(new Date(end));
        // Ordinary timer frames stay within today; walk the window only for longer gaps.
        if (start >= today.getTime()) {
            dailyMs[getDayKey(today)] = end - start;
            return dailyMs;
        }
        for (let i = 0; i < DAYS_TO_KEEP; i++) {
            const day = shiftLocalDay(today, -i);
            const nextDay = shiftLocalDay(day, 1);
            const milliseconds = Math.max(
                0,
                Math.min(end, nextDay.getTime()) - Math.max(start, day.getTime())
            );
            if (milliseconds > 0) dailyMs[getDayKey(day)] = milliseconds;
        }
        return dailyMs;
    }

    /** @param {ActiveSession} session @param {number} now @returns {ActiveSession} */
    function advanceSession(session, now) {
        if (session.status === 'paused') return session;
        const elapsedMs = session.elapsedMs + Math.max(0, now - session.timestamp);
        if (!Number.isSafeInteger(elapsedMs)) throw new RangeError('Session duration is too large');
        const dailyMs = retainRecentDays(session.dailyMs, now);
        for (const [key, milliseconds] of Object.entries(
            allocatePracticeTime(session.timestamp, now)
        )) {
            dailyMs[key] = (dailyMs[key] || 0) + milliseconds;
        }
        // Reset the checkpoint after a backwards clock change without subtracting practice.
        return { ...session, elapsedMs, dailyMs, timestamp: now };
    }

    /** @param {number} seconds */
    function formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    /** @param {number} totalMinutes */
    function formatMinutes(totalMinutes) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    // These are date labels, not instants. UTC keeps cached formatting independent
    // of later system-timezone changes; local calendar keys still select the dates.
    const dateLabelFormatter = new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
    });

    /** @param {string} dateKey @param {number} index */
    function formatDateDisplay(dateKey, index) {
        if (index === 0) return 'Today';
        if (index === 1) return 'Yesterday';
        return dateLabelFormatter.format(new Date(`${dateKey}T00:00:00Z`));
    }

    /** @param {HTMLElement} element @param {string} text */
    function setText(element, text) {
        if (element.textContent !== text) element.textContent = text;
    }

    /** @param {HTMLButtonElement} button @param {boolean} disabled */
    function setDisabled(button, disabled) {
        if (button.disabled !== disabled) button.disabled = disabled;
    }

    /** @param {string} id @returns {SVGCircleElement | null} */
    function getCircle(id) {
        return document.querySelector(`circle#${id}`);
    }

    /** @param {SVGCircleElement | null} ring @param {number} progress */
    function setRingProgress(ring, progress) {
        // SVG pathLength="1" keeps progress independent of each circle's radius.
        const value = String(1 - Math.max(0, Math.min(1, progress)));
        if (ring && ring.style.strokeDashoffset !== value) ring.style.strokeDashoffset = value;
    }

    /** @param {Element} element @param {string} name @param {string} value */
    function setAttribute(element, name, value) {
        if (element.getAttribute(name) !== value) element.setAttribute(name, value);
    }

    /** @param {number} value @param {number} fallback @param {number} min @param {number} max */
    function normalizeInteger(value, fallback, min, max) {
        return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : fallback;
    }

    /**
     * Keep incomplete drafts editable. Valid integers apply live; committing rounds,
     * clamps, or restores the last valid value, using the same policy for every field.
     * @param {HTMLInputElement} input
     * @param {number} min
     * @param {number} max
     * @param {() => number} getValue
     * @param {(value: number) => void} onChange
     */
    function bindIntegerControl(input, min, max, getValue, onChange) {
        input.min = String(min);
        input.max = String(max);
        input.step = '1';
        /** @param {number} value */
        const setValue = (value) => {
            const normalized = normalizeInteger(value, getValue(), min, max);
            input.value = String(normalized);
            setAttribute(input, 'aria-invalid', 'false');
            onChange(normalized);
        };
        input.addEventListener('input', () => {
            const value = input.valueAsNumber;
            const valid = Number.isInteger(value) && value >= min && value <= max;
            setAttribute(input, 'aria-invalid', String(!valid));
            if (valid) onChange(value);
        });
        const commit = () => setValue(input.valueAsNumber);
        input.addEventListener('change', commit);
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' || event.isComposing) return;
            event.preventDefault();
            if (event.repeat) return;
            // The form commits all numeric drafts before toggling playback once.
            if (input.form) input.form.requestSubmit();
            else commit();
        });
        commit();
        return setValue;
    }

    /**
     * @param {HTMLInputElement} slider
     * @param {HTMLElement} display
     * @param {number} defaultVolume
     * @param {(volume: number) => void} onChange
     */
    function bindVolumeControl(slider, display, defaultVolume, onChange) {
        slider.min = '0';
        slider.max = '100';
        slider.step = '1';
        let percent = Math.round(defaultVolume * 100);
        let initialized = false;
        const update = () => {
            const next = normalizeInteger(slider.valueAsNumber, percent, 0, 100);
            slider.value = String(next);
            setText(display, `${next}%`);
            setAttribute(slider, 'aria-valuetext', `${next}%`);
            if (!initialized || next !== percent) onChange(next / 100);
            percent = next;
            initialized = true;
        };
        slider.addEventListener('input', update);
        slider.addEventListener('change', update);
        update();
    }

    // ============================================================================
    // Storage Manager
    // ============================================================================

    /** @param {unknown} value @returns {value is Record<string, unknown>} */
    function isRecord(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    /** @param {string} key */
    function isDayKey(key) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
        const date = new Date(`${key}T00:00:00Z`);
        return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key;
    }

    /** @param {unknown} value @returns {value is number} */
    function isMilliseconds(value) {
        return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
    }

    /** @param {unknown} value @returns {value is number} */
    function isTimestamp(value) {
        return isMilliseconds(value) && isDayKey(getDayKey(new Date(value)));
    }

    /** @param {unknown} value @returns {number | null} */
    function secondsToMilliseconds(value) {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
        const milliseconds = Math.round(value * 1000);
        return isMilliseconds(milliseconds) ? milliseconds : null;
    }

    /** @param {unknown} value @param {boolean} milliseconds */
    function normalizeDailyData(value, milliseconds) {
        /** @type {Record<string, number>} */
        const dailyData = {};
        let repaired = !isRecord(value);
        if (isRecord(value)) {
            for (const [key, duration] of Object.entries(value)) {
                const ms = milliseconds
                    ? isMilliseconds(duration)
                        ? duration
                        : null
                    : secondsToMilliseconds(duration);
                if (!isDayKey(key) || ms === null) {
                    repaired = true;
                    continue;
                }
                dailyData[key] = milliseconds ? ms : ms / 1000;
                if (dailyData[key] !== duration) repaired = true;
            }
        }
        return { dailyData, repaired };
    }

    /** @param {unknown} value @param {boolean} legacy @returns {ActiveSession | null} */
    function normalizeSession(value, legacy) {
        if (!isRecord(value) || !isTimestamp(value.timestamp)) return null;
        if (legacy) {
            const elapsedMs = secondsToMilliseconds(value.elapsed);
            if (elapsedMs === null || typeof value.running !== 'boolean') return null;
            // v1 contains no pause/day boundaries. Preserve its total without inventing intervals.
            return {
                status: value.running ? 'running' : 'paused',
                elapsedMs,
                dailyMs: elapsedMs > 0 ? { [getDayKey(new Date(value.timestamp))]: elapsedMs } : {},
                timestamp: value.timestamp
            };
        }
        if (
            !isMilliseconds(value.elapsedMs) ||
            (value.status !== 'running' && value.status !== 'paused')
        )
            return null;
        const { dailyData: dailyMs, repaired } = normalizeDailyData(value.dailyMs, true);
        const allocated = Object.values(dailyMs).reduce((sum, duration) => sum + duration, 0);
        if (repaired || !Number.isSafeInteger(allocated) || allocated > value.elapsedMs)
            return null;
        return {
            status: value.status,
            elapsedMs: value.elapsedMs,
            dailyMs,
            timestamp: value.timestamp
        };
    }

    /** @returns {PracticeData} */
    function createEmptyData() {
        return { version: STORAGE_VERSION, dailyData: {}, activeSession: null };
    }

    const StorageManager = {
        data: createEmptyData(),
        /** @type {string | null} */
        expectedRaw: null,
        /** @type {string | null} */
        pendingBackup: null,
        /** @type {string | null} */
        backupKey: null,
        readOnly: false,
        notice: '',
        /** @type {string | null} */
        recoveryNoticeExpiresOn: null,
        error: '',
        onConflict() {},

        init() {
            try {
                this.expectedRaw = localStorage.getItem(STORAGE_KEY);
                if (this.expectedRaw !== null) this.decode(this.expectedRaw);
            } catch (error) {
                this.fail(
                    'Saved practice could not be read. Keep this page open; saving will be retried.'
                );
            }
            window.addEventListener('storage', (event) => {
                if (event.key !== null && event.key !== STORAGE_KEY) return;
                try {
                    // A delayed event for a record we have already observed is harmless.
                    if (localStorage.getItem(STORAGE_KEY) === this.expectedRaw) return;
                } catch (error) {
                    this.conflict();
                    return;
                }
                this.conflict();
            });
            this.showStatus();
        },

        /** @param {string} raw */
        decode(raw) {
            /** @type {unknown} */
            let parsed;
            try {
                parsed = JSON.parse(raw);
            } catch (error) {
                this.prepareRecovery(
                    raw,
                    'Saved data was unreadable. The original will be backed up before any new data is saved.'
                );
                return;
            }
            if (isRecord(parsed) && parsed.version !== 1 && parsed.version !== STORAGE_VERSION) {
                this.readOnly = true;
                this.fail(
                    'Saved data uses an unrecognized version. It has not been changed; use a compatible app version.'
                );
                return;
            }
            const record = isRecord(parsed) ? parsed : {};
            const { dailyData, repaired } = normalizeDailyData(record.dailyData, false);
            const legacy = record.version === 1;
            const activeSession = normalizeSession(record.activeSession, legacy);
            this.data = { version: STORAGE_VERSION, dailyData, activeSession };
            if (legacy || repaired || (record.activeSession !== null && !activeSession)) {
                this.prepareRecovery(
                    raw,
                    legacy
                        ? 'Older history dates were preserved. Recovered session time is assigned to its last saved day; its original day boundaries were not recorded.'
                        : 'Some saved data was invalid. Valid history was recovered; the original will be backed up before saving.'
                );
            }
        },

        /** @param {string} raw @param {string} notice */
        prepareRecovery(raw, notice) {
            this.pendingBackup = raw;
            this.notice = notice;
            const today = getDayKey();
            const affectedDays = [
                ...Object.keys(this.data.dailyData),
                ...Object.keys(this.data.activeSession?.dailyMs || {})
            ];
            const latestDay = affectedDays.reduce(
                (latest, day) => (day > latest ? day : latest),
                ''
            );
            // Empty repairs get one week; future dates cannot extend that upper bound.
            const lastDay = latestDay && latestDay < today ? latestDay : today;
            this.recoveryNoticeExpiresOn = getDayKey(
                shiftLocalDay(new Date(`${lastDay}T00:00:00`), DAYS_TO_KEEP)
            );
        },

        expireRecoveryNotice(now = Date.now()) {
            if (
                this.pendingBackup !== null ||
                this.recoveryNoticeExpiresOn === null ||
                getDayKey(new Date(now)) < this.recoveryNoticeExpiresOn
            )
                return;
            this.recoveryNoticeExpiresOn = null;
            this.notice = '';
            this.showStatus();
        },

        /** @param {string} message */
        fail(message) {
            this.error = message;
            this.showStatus();
            return false;
        },

        showStatus() {
            const status = document.getElementById('storageStatus');
            if (!status) return;
            const message = this.error || this.notice;
            if (status.textContent !== message) status.textContent = message;
            status.hidden = !message;
            status.dataset.kind = this.error ? 'error' : 'info';
        },

        conflict() {
            this.readOnly = true;
            this.fail(
                'Practice data changed in another tab. This timer is paused and its unsaved time is kept here. Review the other tab before reloading; use one timer tab at a time.'
            );
            this.onConflict();
        },

        backupOriginal() {
            if (this.pendingBackup === null) return;
            const prefix = this.backupKey || `${STORAGE_KEY}.backup.${Date.now()}`;
            let key = prefix;
            let suffix = 0;
            let previous = localStorage.getItem(key);
            while (previous !== null && previous !== this.pendingBackup) {
                key = `${prefix}.${++suffix}`;
                previous = localStorage.getItem(key);
            }
            this.backupKey = key;
            if (previous === null) localStorage.setItem(key, this.pendingBackup);
        },

        /** @param {PracticeData} data */
        save(data) {
            if (this.readOnly) return false;
            try {
                const currentRaw = localStorage.getItem(STORAGE_KEY);
                if (currentRaw !== this.expectedRaw) {
                    this.conflict();
                    return false;
                }
                this.backupOriginal();
                const raw = JSON.stringify(data);
                localStorage.setItem(STORAGE_KEY, raw);
                this.expectedRaw = raw;
                this.data = data;
                if (this.pendingBackup !== null) {
                    this.pendingBackup = null;
                    this.notice =
                        'Saved data was recovered. A backup of the original was kept; existing history dates were not shifted.';
                }
                this.error = '';
                this.expireRecoveryNotice();
                this.showStatus();
                return true;
            } catch (error) {
                return this.fail(
                    'Practice could not be saved. Your session is still on this page. Keep it open and retry Done when storage is available.'
                );
            }
        },

        /** @param {ActiveSession | null} session */
        saveActiveSession(session) {
            const activeSession = session ? { ...session, dailyMs: { ...session.dailyMs } } : null;
            return this.save({ ...this.data, activeSession });
        },

        /** @param {ActiveSession} session @param {number} now */
        finishSession(session, now) {
            const dailyData = retainRecentDays(this.data.dailyData, now);
            for (const [key, milliseconds] of Object.entries(
                retainRecentDays(session.dailyMs, now)
            )) {
                const totalMs = Math.round((dailyData[key] || 0) * 1000) + milliseconds;
                if (!Number.isSafeInteger(totalMs)) {
                    return this.fail(
                        'This practice total is too large to save safely. Your session has been kept on this page.'
                    );
                }
                dailyData[key] = totalMs / 1000;
            }
            return this.save({
                version: STORAGE_VERSION,
                dailyData,
                activeSession: null
            });
        },

        getDailyData() {
            return this.data.dailyData;
        }
    };

    // ============================================================================
    // Stopwatch Module
    // ============================================================================

    const StopwatchView = {
        /** @type {HTMLElement | null} */
        display: null,
        /** @type {HTMLButtonElement | null} */
        startBtn: null,
        /** @type {HTMLButtonElement | null} */
        pauseBtn: null,
        /** @type {HTMLButtonElement | null} */
        doneBtn: null,
        /** @type {Record<'seconds' | 'minutes' | 'hours', SVGCircleElement | null>} */
        rings: { seconds: null, minutes: null, hours: null },
        /** @type {number | null} */
        lastElapsedMs: null,
        /** @type {HTMLElement | null} */
        status: null,
        /** @type {string | null} */
        lastState: null,

        init() {
            this.display = document.getElementById('stopwatchDisplay');
            this.status = document.getElementById('practiceStatus');
            this.startBtn = /** @type {HTMLButtonElement | null} */ (
                document.getElementById('startBtn')
            );
            this.pauseBtn = /** @type {HTMLButtonElement | null} */ (
                document.getElementById('pauseBtn')
            );
            this.doneBtn = /** @type {HTMLButtonElement | null} */ (
                document.getElementById('doneBtn')
            );
            this.rings = {
                seconds: getCircle('ringSeconds'),
                minutes: getCircle('ringMinutes'),
                hours: getCircle('ringHours')
            };
            if (!this.display || !this.startBtn || !this.pauseBtn || !this.doneBtn) {
                console.error('Stopwatch: Required DOM elements not found');
                return false;
            }
            return true;
        },

        /** @param {PracticeSnapshot} snapshot */
        render({ session, readOnly }) {
            const elapsedMs = session?.elapsedMs || 0;
            const running = session?.status === 'running';
            if (elapsedMs !== this.lastElapsedMs) {
                const seconds = Math.floor(elapsedMs / 1000);
                if (
                    this.lastElapsedMs === null ||
                    seconds !== Math.floor(this.lastElapsedMs / 1000)
                ) {
                    setText(this.display, formatDuration(seconds));
                }
                this.updateRings(elapsedMs / 1000);
                this.lastElapsedMs = elapsedMs;
            }
            setDisabled(this.startBtn, running || readOnly);
            setDisabled(this.pauseBtn, !running);
            // A positive subsecond session can be finished even while the label reads zero.
            setDisabled(this.doneBtn, elapsedMs === 0 || readOnly);
            const state = readOnly ? 'read-only' : session?.status || 'idle';
            if (state !== this.lastState) {
                // Announce actions, not every timer tick. Initial idle/restored state stays quiet.
                if (this.status && (this.lastState !== null || readOnly)) {
                    const message = readOnly
                        ? 'Practice controls unavailable. See the storage notice.'
                        : running
                          ? 'Practice timer started.'
                          : session
                            ? `Practice paused at ${formatDuration(elapsedMs / 1000)}.`
                            : 'Session saved.';
                    setText(this.status, message);
                }
                this.lastState = state;
            }
        },

        /** @param {number} elapsed */
        updateRings(elapsed) {
            setRingProgress(this.rings.seconds, (elapsed % 60) / 60);
            setRingProgress(this.rings.minutes, (Math.floor(elapsed / 60) % 60) / 60);
            // Hours stay full at eight; elapsed text and smaller units keep counting.
            setRingProgress(this.rings.hours, Math.floor(elapsed / 3600) / 8);
        }
    };

    // State transitions, persistence, and lifecycle scheduling live here. Views only
    // consume a snapshot; reading or painting the history cannot advance the session.
    const Stopwatch = {
        /** @type {ActiveSession | null} */
        session: null,
        dirty: false,
        pageActive: true,
        /** @type {number | null} */
        intervalId: null,
        /** @type {number | null} */
        saveIntervalId: null,
        /** @type {number | null} */
        calendarTimerId: null,

        get running() {
            return this.session?.status === 'running';
        },

        init() {
            if (!StopwatchView.init()) return;
            StopwatchView.startBtn.addEventListener('click', () => this.start());
            StopwatchView.pauseBtn.addEventListener('click', () => this.pause());
            StopwatchView.doneBtn.addEventListener('click', () => this.done());

            StorageManager.onConflict = () => this.pauseForConflict();
            const session = StorageManager.data.activeSession;
            if (session) {
                this.session = { ...session, dailyMs: { ...session.dailyMs } };
                this.dirty = StorageManager.pendingBackup !== null;
            }

            window.addEventListener('beforeunload', (event) => {
                if (!this.checkpoint() && this.dirty) {
                    event.preventDefault();
                    event.returnValue = '';
                }
            });
            window.addEventListener('pagehide', () => {
                this.checkpoint();
                this.pageActive = false;
                this.syncTimers();
            });
            window.addEventListener('pageshow', () => {
                this.pageActive = true;
                this.refresh();
                this.syncTimers(true);
            });
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) this.checkpoint();
                else this.refresh();
                this.syncTimers(true);
            });
            window.addEventListener('focus', () => {
                if (!this.pageActive || document.hidden) return;
                this.refresh();
                this.syncTimers(true);
            });

            this.refresh();
            this.syncTimers();
        },

        capture(now = Date.now()) {
            if (this.running) {
                try {
                    const previous = this.session;
                    this.session = advanceSession(previous, now);
                    if (now !== previous.timestamp) this.dirty = true;
                } catch (error) {
                    this.session = { ...this.session, status: 'paused' };
                    this.dirty = true;
                    this.syncTimers();
                    StorageManager.fail(
                        'This session is too large to keep timing safely. It has been paused without discarding its saved time.'
                    );
                }
            }
            return this.session;
        },

        // Reconcile timers rather than restarting them after every focus/action event.
        syncTimers(resetCalendar = false) {
            const timing = this.pageActive && this.running;
            const painting = timing && !document.hidden;
            if (painting && this.intervalId === null) {
                this.intervalId = setInterval(() => this.refresh(), 100);
            } else if (!painting && this.intervalId !== null) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            if (timing && this.saveIntervalId === null) {
                this.saveIntervalId = setInterval(() => {
                    const now = Date.now();
                    this.persistCheckpoint(now);
                    this.render(now);
                }, 5000);
            } else if (!timing && this.saveIntervalId !== null) {
                clearInterval(this.saveIntervalId);
                this.saveIntervalId = null;
            }

            const watchingCalendar = this.pageActive && !document.hidden && !this.running;
            if ((!watchingCalendar || resetCalendar) && this.calendarTimerId !== null) {
                clearTimeout(this.calendarTimerId);
                this.calendarTimerId = null;
            }
            if (watchingCalendar && this.calendarTimerId === null) {
                const now = Date.now();
                const midnight = shiftLocalDay(new Date(now), 1).getTime();
                // A minute-level safety check also catches visible clock/timezone changes.
                const delay = Math.max(1, Math.min(60_000, midnight - now));
                this.calendarTimerId = setTimeout(() => {
                    this.calendarTimerId = null;
                    this.refresh();
                    this.syncTimers();
                }, delay);
            }
        },

        checkpoint() {
            if (this.session && (this.running || this.dirty)) return this.persistCheckpoint();
            return true;
        },

        persistCheckpoint(now = Date.now()) {
            const session = this.capture(now);
            if (!session) return true;
            const saved = StorageManager.saveActiveSession(session);
            if (saved) this.dirty = false;
            return saved;
        },

        start() {
            if (this.running || StorageManager.readOnly) return;
            const now = Date.now();
            this.session = this.session
                ? { ...this.session, status: 'running', timestamp: now }
                : { status: 'running', elapsedMs: 0, dailyMs: {}, timestamp: now };
            this.dirty = true;
            this.persistCheckpoint(now);
            // Saving can synchronously report a conflict and pause this session.
            this.syncTimers();
            this.render(now);
        },

        pause() {
            if (!this.running) return;
            const now = Date.now();
            this.session = { ...this.capture(now), status: 'paused' };
            this.dirty = true;
            this.persistCheckpoint(now);
            this.syncTimers();
            this.render(now);
        },

        done() {
            const now = Date.now();
            const session = this.capture(now);
            if (!session || session.elapsedMs === 0) return;
            // Finalization remains one write; the views never predict a successful save.
            this.session = { ...session, status: 'paused' };
            this.dirty = true;
            if (StorageManager.finishSession(this.session, now)) {
                this.session = null;
                this.dirty = false;
            }
            this.syncTimers();
            this.render(now);
        },

        pauseForConflict() {
            const now = Date.now();
            const session = this.capture(now);
            if (session) {
                this.session = { ...session, status: 'paused' };
                this.dirty = true;
            }
            this.syncTimers();
            this.render(now);
        },

        refresh(now = Date.now()) {
            StorageManager.expireRecoveryNotice(now);
            this.capture(now);
            this.render(now);
        },

        render(now) {
            if (!this.pageActive || document.hidden) return;
            /** @type {PracticeSnapshot} */
            const snapshot = {
                now,
                session: this.session,
                dailyData: StorageManager.getDailyData(),
                readOnly: StorageManager.readOnly
            };
            StopwatchView.render(snapshot);
            PracticeHistory.render(snapshot);
        }
    };

    // ============================================================================
    // Practice History View
    // ============================================================================

    const PracticeHistory = {
        /** @type {HTMLElement | null} */
        todayDisplay: null,
        /** @type {HTMLElement | null} */
        weekDisplay: null,
        /** @type {HTMLElement | null} */
        dailyList: null,
        /** @type {Record<'todayHours' | 'todayMinutes' | 'weekDays' | 'weekHours' | 'weekMinutes', SVGCircleElement | null>} */
        rings: {
            todayHours: null,
            todayMinutes: null,
            weekDays: null,
            weekHours: null,
            weekMinutes: null
        },
        /** @type {Map<string, HistoryRow>} */
        rows: new Map(),
        /** @type {string | null} */
        todayKey: null,
        /** @type {number | null} */
        todayMinutes: null,
        /** @type {number | null} */
        weekMinutes: null,

        init() {
            this.todayDisplay = document.getElementById('todayTotal');
            this.weekDisplay = document.getElementById('weekTotal');
            this.dailyList = document.getElementById('dailyList');
            this.rings = {
                todayHours: getCircle('todayRing'),
                todayMinutes: getCircle('todayMinutesRing'),
                weekDays: getCircle('weekDaysRing'),
                weekHours: getCircle('weekRing'),
                weekMinutes: getCircle('weekMinutesRing')
            };
        },

        /** @param {number} now */
        updateCalendar(now) {
            const date = new Date(now);
            const todayKey = getDayKey(date);
            if (todayKey === this.todayKey) return;
            /** @type {Map<string, HistoryRow>} */
            const rows = new Map();
            for (let i = 0; i < DAYS_TO_KEEP; i++) {
                const key = getDayKey(shiftLocalDay(date, -i));
                let row = this.rows.get(key);
                if (!row) {
                    const element = document.createElement('li');
                    element.className = 'daily-item';
                    element.dataset.date = key;
                    const date = document.createElement('span');
                    date.className = 'daily-date';
                    const duration = document.createElement('span');
                    duration.className = 'daily-duration';
                    element.append(date, duration);
                    row = { element, date, duration, minutes: null };
                }
                setText(row.date, formatDateDisplay(key, i));
                rows.set(key, row);
            }
            this.dailyList.replaceChildren(...[...rows.values()].map((row) => row.element));
            this.rows = rows;
            this.todayKey = todayKey;
        },

        /** @param {PracticeSnapshot} snapshot */
        render({ now, dailyData, session }) {
            if (!this.todayDisplay || !this.weekDisplay || !this.dailyList) return;
            this.updateCalendar(now);
            const sessionDailyMs = session?.dailyMs || {};
            let todayMs = 0;
            let weekMs = 0;
            // Seven integer additions are cheap; date creation/formatting and DOM work
            // are cached. Sum milliseconds before flooring combined minute totals.
            for (const [key, row] of this.rows) {
                const milliseconds =
                    Math.round((dailyData[key] || 0) * 1000) + (sessionDailyMs[key] || 0);
                weekMs += milliseconds;
                if (key === this.todayKey) todayMs = milliseconds;
                const minutes = Math.floor(milliseconds / 60_000);
                if (minutes !== row.minutes) {
                    setText(row.duration, formatMinutes(minutes));
                    row.minutes = minutes;
                }
            }

            const todayMinutes = Math.floor(todayMs / 60_000);
            if (todayMinutes !== this.todayMinutes) {
                setText(this.todayDisplay, formatMinutes(todayMinutes));
                setRingProgress(this.rings.todayHours, Math.floor(todayMinutes / 60) / 8);
                setRingProgress(this.rings.todayMinutes, (todayMinutes % 60) / 60);
                this.todayMinutes = todayMinutes;
            }
            const weekMinutes = Math.floor(weekMs / 60_000);
            if (weekMinutes !== this.weekMinutes) {
                setText(this.weekDisplay, formatMinutes(weekMinutes));
                setRingProgress(this.rings.weekDays, Math.floor(weekMinutes / 1440) / 7);
                setRingProgress(this.rings.weekHours, (Math.floor(weekMinutes / 60) % 24) / 24);
                setRingProgress(this.rings.weekMinutes, (weekMinutes % 60) / 60);
                this.weekMinutes = weekMinutes;
            }
        }
    };

    // ============================================================================
    // Shared Audio Lifecycle
    // ============================================================================

    const AudioEngine = {
        /** @type {AudioContext | null} */
        context: null,
        /** @type {Promise<void> | null} */
        resumePromise: null,
        wasRunning: false,
        /** @type {Set<AudioVoice>} */
        voices: new Set(),
        /** @type {HTMLElement | null} */
        status: null,

        init() {
            this.status = document.getElementById('audioStatus');
            if (!(window.AudioContext || window.webkitAudioContext)) {
                this.showStatus(
                    'Audio is not supported in this browser. The practice timer still works.'
                );
            }
            window.addEventListener('pagehide', () => this.teardown());
        },

        /** @param {string} message */
        showStatus(message) {
            this.status.textContent = message;
            this.status.hidden = !message;
        },

        getContext() {
            if (!this.context || this.context.state === 'closed') {
                const Context = window.AudioContext || window.webkitAudioContext;
                const context = new Context();
                this.context = context;
                this.resumePromise = null;
                this.wasRunning = context.state === 'running';
                context.addEventListener('statechange', () => {
                    if (this.context !== context) return;
                    const running = context.state === 'running';
                    if (!running && (this.wasRunning || context.state !== 'suspended')) {
                        this.stopAll();
                        this.showStatus(
                            'Audio was interrupted. Start it again when you are ready.'
                        );
                    }
                    this.wasRunning = running;
                });
            }
            return this.context;
        },

        /**
         * Keep user intent separate from async readiness: Stop or release may happen
         * before the browser resolves resume(), including a later press of the same key.
         * @param {() => boolean} isCurrent
         * @param {(context: AudioContext) => void} onReady
         * @param {() => void} onFailure
         */
        startWhenReady(isCurrent, onReady, onFailure) {
            const fail = () => {
                if (!isCurrent()) return;
                onFailure();
                this.showStatus(
                    'Audio could not start. Try again or use a browser with Web Audio support. The practice timer still works.'
                );
            };
            try {
                const context = this.getContext();
                const start = () => {
                    if (!isCurrent()) return;
                    try {
                        if (context !== this.context || context.state !== 'running') {
                            fail();
                            return;
                        }
                        this.wasRunning = true;
                        this.showStatus('');
                        onReady(context);
                    } catch (e) {
                        fail();
                    }
                };
                if (context.state === 'running') {
                    start();
                    return;
                }
                if (!this.resumePromise) {
                    const promise = context.resume();
                    this.resumePromise = promise;
                    const clear = () => {
                        if (this.resumePromise === promise) this.resumePromise = null;
                    };
                    void promise.then(clear, clear);
                }
                void this.resumePromise.then(start, fail);
            } catch (e) {
                fail();
            }
        },

        /**
         * @param {AudioContext} context
         * @param {{frequency: number, type: OscillatorType, volume: number, attackTime: number, time?: number}} options
         * @returns {AudioVoice}
         */
        createVoice(context, { frequency, type, volume, attackTime, time = context.currentTime }) {
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            const voice = { context, oscillator, gainNode };
            this.voices.add(voice);
            oscillator.onended = () => this.disconnectVoice(voice);
            try {
                oscillator.type = type;
                oscillator.frequency.value = frequency;
                gainNode.gain.setValueAtTime(0, time);
                gainNode.gain.linearRampToValueAtTime(volume, time + attackTime);
                oscillator.connect(gainNode);
                gainNode.connect(context.destination);
                oscillator.start(time);
            } catch (e) {
                this.disconnectVoice(voice);
                throw e;
            }
            return voice;
        },

        /** @param {AudioParam} param @param {number} time */
        holdValue(param, time) {
            if (typeof param.cancelAndHoldAtTime === 'function') {
                param.cancelAndHoldAtTime(time);
            } else {
                const value = param.value;
                param.cancelScheduledValues(time);
                param.setValueAtTime(value, time);
            }
        },

        /** @param {AudioVoice} voice @param {number} volume @param {number} rampTime */
        setVolume(voice, volume, rampTime = AUDIO_RAMP_TIME) {
            const now = voice.context.currentTime;
            this.holdValue(voice.gainNode.gain, now);
            voice.gainNode.gain.linearRampToValueAtTime(volume, now + rampTime);
        },

        /** @param {AudioVoice} voice @param {number} releaseTime */
        releaseVoice(voice, releaseTime = 0) {
            if (!this.voices.has(voice)) return;
            const now = voice.context.currentTime;
            if (voice.context.state !== 'running') releaseTime = 0;
            if (releaseTime > 0) {
                this.setVolume(voice, 0, releaseTime);
            } else {
                voice.gainNode.gain.cancelScheduledValues(now);
                voice.gainNode.gain.setValueAtTime(0, now);
            }
            voice.oscillator.stop(now + releaseTime);
            // A suspended/closing context may never deliver ended. Teardown is immediate.
            if (releaseTime === 0) this.disconnectVoice(voice);
        },

        /** @param {AudioVoice} voice */
        disconnectVoice(voice) {
            if (!this.voices.delete(voice)) return;
            voice.oscillator.onended = null;
            voice.oscillator.disconnect();
            voice.gainNode.disconnect();
        },

        stopAll() {
            Metronome.stop();
            TuningTone.stop();
            ChordalStudies.stopAll();
            for (const voice of this.voices) this.releaseVoice(voice);
        },

        teardown() {
            this.stopAll();
            const context = this.context;
            this.context = null;
            this.resumePromise = null;
            this.wasRunning = false;
            if (context && context.state !== 'closed') {
                void context.close().catch(() => {
                    if (!this.context) {
                        this.showStatus(
                            'Audio stopped, but the browser could not close its audio device. Reload before starting audio again.'
                        );
                    }
                });
            }
        }
    };

    // ============================================================================
    // Metronome Module
    // ============================================================================

    const Metronome = {
        /** @type {AudioContext | null} */
        audioContext: null,
        running: false,
        bpm: 120,
        beatsPerMeasure: 4,
        currentBeat: 0,
        nextNoteTime: 0,
        scheduleAheadTime: 0.1,
        lookahead: 25.0,
        /** @type {number | null} */
        timerID: null,
        generation: 0,
        /** @type {Set<AudioVoice>} */
        scheduledVoices: new Set(),
        /** @type {Set<number>} */
        indicatorTimers: new Set(),
        volume: 0.7,
        /** @type {HTMLInputElement | null} */
        bpmSlider: null,
        /** @type {HTMLInputElement | null} */
        bpmInput: null,
        /** @type {HTMLElement | null} */
        bpmDisplay: null,
        /** @type {HTMLInputElement | null} */
        beatsInput: null,
        /** @type {HTMLButtonElement | null} */
        metronomeBtn: null,
        /** @type {HTMLElement | null} */
        beatIndicator: null,
        /** @type {HTMLInputElement | null} */
        volumeSlider: null,
        /** @type {HTMLElement | null} */
        volumeDisplay: null,

        init() {
            this.bpmSlider = /** @type {HTMLInputElement | null} */ (
                document.getElementById('bpmSlider')
            );
            this.bpmInput = /** @type {HTMLInputElement | null} */ (
                document.getElementById('bpmInput')
            );
            this.bpmDisplay = document.getElementById('bpmDisplay');
            this.beatsInput = /** @type {HTMLInputElement | null} */ (
                document.getElementById('beatsPerMeasure')
            );
            this.metronomeBtn = /** @type {HTMLButtonElement | null} */ (
                document.getElementById('metronomeBtn')
            );
            this.beatIndicator = document.getElementById('beatIndicator');
            this.volumeSlider = /** @type {HTMLInputElement | null} */ (
                document.getElementById('metronomeVolume')
            );
            this.volumeDisplay = document.getElementById('metronomeVolumeDisplay');

            const setBpm = bindIntegerControl(
                this.bpmInput,
                MIN_BPM,
                MAX_BPM,
                () => this.bpm,
                (value) => {
                    this.bpm = value;
                    this.bpmSlider.value = String(value);
                    setText(this.bpmDisplay, String(value));
                }
            );
            const updateTempo = () => setBpm(this.bpmSlider.valueAsNumber);
            this.bpmSlider.addEventListener('input', updateTempo);
            this.bpmSlider.addEventListener('change', updateTempo);

            const setBeats = bindIntegerControl(
                this.beatsInput,
                1,
                16,
                () => this.beatsPerMeasure,
                (value) => {
                    if (value === this.beatsPerMeasure) return;
                    this.beatsPerMeasure = value;
                    this.createBeatIndicators();
                    // Only a changed meter restarts on a downbeat; duplicate commits are inert.
                    if (this.running) {
                        this.stop();
                        this.start();
                    }
                }
            );

            this.metronomeBtn.form.addEventListener('submit', (event) => {
                event.preventDefault();
                const wasRunning = this.running;
                // Stop first so committing a changed meter cannot restart a stopped run.
                if (wasRunning) this.stop();
                setBpm(this.bpmInput.valueAsNumber);
                setBeats(this.beatsInput.valueAsNumber);
                if (!wasRunning) this.start();
            });

            bindVolumeControl(this.volumeSlider, this.volumeDisplay, this.volume, (volume) => {
                this.volume = volume;
            });

            this.createBeatIndicators();
        },

        createBeatIndicators() {
            this.beatIndicator.replaceChildren();
            for (let i = 0; i < this.beatsPerMeasure; i++) {
                const dot = document.createElement('div');
                dot.className = 'beat-dot';
                this.beatIndicator.appendChild(dot);
            }
        },

        start() {
            if (this.running) return;
            this.running = true;
            const generation = ++this.generation;
            this.metronomeBtn.textContent = 'Stop Metronome';
            this.metronomeBtn.classList.remove('btn-primary');
            this.metronomeBtn.classList.add('btn-danger');
            AudioEngine.startWhenReady(
                () => this.running && this.generation === generation,
                (context) => {
                    this.audioContext = context;
                    this.currentBeat = 0;
                    this.scheduler(true);
                },
                () => this.stop()
            );
        },

        stop() {
            this.running = false;
            this.generation++;
            if (this.timerID !== null) {
                clearTimeout(this.timerID);
                this.timerID = null;
            }
            for (const timer of this.indicatorTimers) clearTimeout(timer);
            this.indicatorTimers.clear();
            for (const voice of this.scheduledVoices) AudioEngine.releaseVoice(voice);
            this.scheduledVoices.clear();
            this.audioContext = null;
            this.metronomeBtn.textContent = 'Start Metronome';
            this.metronomeBtn.classList.remove('btn-danger');
            this.metronomeBtn.classList.add('btn-primary');
            this.clearBeatIndicators();
        },

        /**
         * @param {number} time
         * @param {number} beatNumber
         */
        scheduleNote(time, beatNumber) {
            const isAccent = beatNumber === 0;
            const peakVolume = this.volume * (isAccent ? 0.5 : 0.35);
            const voice = AudioEngine.createVoice(this.audioContext, {
                frequency: isAccent ? 1200 : 800,
                type: 'square',
                volume: peakVolume,
                attackTime: 0.0005,
                time
            });
            this.scheduledVoices.add(voice);
            voice.oscillator.onended = () => {
                AudioEngine.disconnectVoice(voice);
                this.scheduledVoices.delete(voice);
            };
            // Exponential ramps cannot end at zero. Muted clicks stay at zero throughout.
            if (peakVolume > 0) {
                voice.gainNode.gain.exponentialRampToValueAtTime(peakVolume * 0.01, time + 0.035);
                voice.gainNode.gain.linearRampToValueAtTime(0, time + 0.04);
            }
            voice.oscillator.stop(time + 0.04);

            const generation = this.generation;
            const timer = setTimeout(
                () => {
                    this.indicatorTimers.delete(timer);
                    if (this.running && this.generation === generation) {
                        this.updateBeatIndicator(beatNumber);
                    }
                },
                Math.max(0, (time - this.audioContext.currentTime) * 1000)
            );
            this.indicatorTimers.add(timer);
        },

        /** @param {number} beatNumber */
        updateBeatIndicator(beatNumber) {
            const dots = this.beatIndicator.querySelectorAll('.beat-dot');
            dots.forEach((dot, index) => {
                dot.classList.remove('active', 'accent');
                if (index === beatNumber) {
                    dot.classList.add(beatNumber === 0 ? 'accent' : 'active');
                }
            });
        },

        clearBeatIndicators() {
            const dots = this.beatIndicator.querySelectorAll('.beat-dot');
            dots.forEach((dot) => dot.classList.remove('active', 'accent'));
        },

        nextNote() {
            const secondsPerBeat = 60.0 / this.bpm;
            this.nextNoteTime += secondsPerBeat;
            this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure;
        },

        scheduler(firstBeat = false) {
            if (!this.running || !this.audioContext) return;
            if (this.audioContext.state !== 'running') {
                this.stop();
                return;
            }
            const now = this.audioContext.currentTime;
            // The audio clock can advance within one JS task. Do not skip a new downbeat.
            if (firstBeat) this.nextNoteTime = now;
            // Skip missed beats in constant time after throttling; never catch up in a burst.
            if (this.nextNoteTime < now) {
                const secondsPerBeat = 60 / this.bpm;
                const missed = Math.ceil((now - this.nextNoteTime) / secondsPerBeat);
                this.nextNoteTime += missed * secondsPerBeat;
                this.currentBeat = (this.currentBeat + missed) % this.beatsPerMeasure;
            }
            while (this.nextNoteTime < now + this.scheduleAheadTime) {
                this.scheduleNote(
                    Math.max(this.nextNoteTime, this.audioContext.currentTime),
                    this.currentBeat
                );
                this.nextNote();
            }

            if (this.running) {
                this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
            }
        }
    };

    // ============================================================================
    // Tuning Tone Generator Module
    // ============================================================================

    const TuningTone = {
        /** @type {AudioVoice | null} */
        voice: null,
        running: false,
        generation: 0,
        /** @type {NoteName} */
        currentNote: 'F',
        currentOctave: 3,
        currentFrequency: 174.61,
        volume: 0.5,
        /** @type {HTMLSelectElement | null} */
        noteSelect: null,
        /** @type {HTMLSelectElement | null} */
        octaveSelect: null,
        /** @type {HTMLInputElement | null} */
        volumeSlider: null,
        /** @type {HTMLElement | null} */
        volumeDisplay: null,
        /** @type {HTMLElement | null} */
        noteDisplay: null,
        /** @type {HTMLElement | null} */
        freqDisplay: null,
        /** @type {HTMLButtonElement | null} */
        toneBtn: null,

        init() {
            this.noteSelect = /** @type {HTMLSelectElement | null} */ (
                document.getElementById('noteSelect')
            );
            this.octaveSelect = /** @type {HTMLSelectElement | null} */ (
                document.getElementById('octaveSelect')
            );
            this.volumeSlider = /** @type {HTMLInputElement | null} */ (
                document.getElementById('volumeSlider')
            );
            this.volumeDisplay = document.getElementById('volumeDisplay');
            this.noteDisplay = document.getElementById('noteDisplay');
            this.freqDisplay = document.getElementById('freqDisplay');
            this.toneBtn = /** @type {HTMLButtonElement | null} */ (
                document.getElementById('toneBtn')
            );

            this.noteSelect.addEventListener('change', () => this.updateFrequency());
            this.octaveSelect.addEventListener('change', () => this.updateFrequency());

            bindVolumeControl(this.volumeSlider, this.volumeDisplay, this.volume, (volume) => {
                this.volume = volume;
                if (this.voice) {
                    AudioEngine.setVolume(this.voice, this.volume * 0.3);
                }
            });

            this.toneBtn.form.addEventListener('submit', (event) => {
                event.preventDefault();
                this.toggle();
            });

            this.updateFrequency();
        },

        updateFrequency() {
            if (Object.hasOwn(NOTE_FREQUENCIES, this.noteSelect.value)) {
                this.currentNote = /** @type {NoteName} */ (this.noteSelect.value);
            }
            const octave = Number(this.octaveSelect.value);
            if (Number.isInteger(octave) && octave >= 2 && octave <= 5) {
                this.currentOctave = octave;
            }
            this.noteSelect.value = this.currentNote;
            this.octaveSelect.value = String(this.currentOctave);

            const frequencies = NOTE_FREQUENCIES[this.currentNote];
            this.currentFrequency = frequencies[this.currentOctave];

            setText(this.noteDisplay, `${this.currentNote}${this.currentOctave}`);
            setText(this.freqDisplay, `${this.currentFrequency.toFixed(2)} Hz`);

            if (this.voice) {
                this.voice.oscillator.frequency.setTargetAtTime(
                    this.currentFrequency,
                    this.voice.context.currentTime,
                    AUDIO_RAMP_TIME
                );
            }
        },

        toggle() {
            if (this.running) {
                this.stop();
            } else {
                this.start();
            }
        },

        start() {
            if (this.running) return;
            this.running = true;
            const generation = ++this.generation;
            this.toneBtn.textContent = 'Stop Tone';
            this.toneBtn.classList.remove('btn-primary');
            this.toneBtn.classList.add('btn-danger');
            AudioEngine.startWhenReady(
                () => this.running && this.generation === generation,
                (context) => {
                    this.voice = AudioEngine.createVoice(context, {
                        frequency: this.currentFrequency,
                        type: 'sine',
                        volume: this.volume * 0.3,
                        attackTime: AUDIO_RAMP_TIME
                    });
                },
                () => this.stop()
            );
        },

        stop() {
            this.running = false;
            this.generation++;
            const voice = this.voice;
            this.voice = null;
            if (voice) AudioEngine.releaseVoice(voice, AUDIO_RAMP_TIME * 5);
            this.toneBtn.textContent = 'Start Tone';
            this.toneBtn.classList.remove('btn-danger');
            this.toneBtn.classList.add('btn-primary');
        }
    };

    // ============================================================================
    // Application Initialization
    // ============================================================================

    // Check for browser feature support
    function checkBrowserSupport() {
        const hasLocalStorage = (() => {
            try {
                const test = '__test__';
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch (e) {
                return false;
            }
        })();

        const hasWebAudio = !!(window.AudioContext || window.webkitAudioContext);

        if (!hasLocalStorage) {
            console.warn('LocalStorage not available - practice history will not be saved');
        }

        if (!hasWebAudio) {
            console.warn('Web Audio API not available - audio features will be limited');
        }

        return { hasLocalStorage, hasWebAudio };
    }

    // ============================================================================
    // Chordal Studies Module
    // ============================================================================

    const ChordalStudies = {
        // Separate active-note maps per keyboard so each can be controlled independently
        /** @type {Map<string, ActiveNote>} */
        activeNotesHold: new Map(),
        /** @type {Map<string, ActiveNote>} */
        activeNotesMomentary: new Map(),
        /** @type {Map<number, {keyEl: HTMLButtonElement, kb: PracticeKeyboard}>} */
        pointerKeys: new Map(),
        /** @type {Map<HTMLButtonElement, Set<string>>} */
        keyboardKeys: new Map(),
        volume: 0.5,
        /** @type {OscillatorType} */
        waveform: 'sine',
        /** @type {PracticeKeyboard[]} */
        keyboards: [], // Populated in init(): [{el, mode, activeNotes}]

        // Two octaves: C3 to B4
        /** @type {{note: NoteName, octave: number, isBlack: boolean}[]} */
        keyboard: [
            // Octave 3
            { note: 'C', octave: 3, isBlack: false },
            { note: 'C#', octave: 3, isBlack: true },
            { note: 'D', octave: 3, isBlack: false },
            { note: 'D#', octave: 3, isBlack: true },
            { note: 'E', octave: 3, isBlack: false },
            { note: 'F', octave: 3, isBlack: false },
            { note: 'F#', octave: 3, isBlack: true },
            { note: 'G', octave: 3, isBlack: false },
            { note: 'G#', octave: 3, isBlack: true },
            { note: 'A', octave: 3, isBlack: false },
            { note: 'A#', octave: 3, isBlack: true },
            { note: 'B', octave: 3, isBlack: false },
            // Octave 4
            { note: 'C', octave: 4, isBlack: false },
            { note: 'C#', octave: 4, isBlack: true },
            { note: 'D', octave: 4, isBlack: false },
            { note: 'D#', octave: 4, isBlack: true },
            { note: 'E', octave: 4, isBlack: false },
            { note: 'F', octave: 4, isBlack: false },
            { note: 'F#', octave: 4, isBlack: true },
            { note: 'G', octave: 4, isBlack: false },
            { note: 'G#', octave: 4, isBlack: true },
            { note: 'A', octave: 4, isBlack: false },
            { note: 'A#', octave: 4, isBlack: true },
            { note: 'B', octave: 4, isBlack: false }
        ],

        init() {
            const holdEl = document.getElementById('pianoKeyboardHold');
            const momentaryEl = document.getElementById('pianoKeyboardMomentary');
            this.instrumentSelect = /** @type {HTMLSelectElement | null} */ (
                document.getElementById('instrumentSelect')
            );
            this.volumeSlider = /** @type {HTMLInputElement | null} */ (
                document.getElementById('chordVolumeSlider')
            );
            this.volumeDisplay = document.getElementById('chordVolumeDisplay');

            if (!holdEl || !momentaryEl) return;

            this.keyboards = [
                { el: holdEl, mode: 'hold', activeNotes: this.activeNotesHold },
                { el: momentaryEl, mode: 'momentary', activeNotes: this.activeNotesMomentary }
            ];

            this.keyboards.forEach((kb) => this.renderKeyboard(kb));
            this.attachEventListeners();
        },

        /** @param {PracticeKeyboard} kb */
        renderKeyboard(kb) {
            const whiteKeyWidth = 40;
            const blackKeyWidth = 26;

            // Chromatic DOM order matches arrow navigation; CSS stacks the black keys.
            let whiteKeyIndex = 0;
            this.keyboard.forEach((keyData, index) => {
                const key = document.createElement('button');
                key.type = 'button';
                key.className = `piano-key ${keyData.isBlack ? 'black' : 'white'}`;
                key.dataset.note = keyData.note;
                key.dataset.octave = String(keyData.octave);
                key.tabIndex = index === 0 ? 0 : -1;
                if (kb.mode === 'hold') key.setAttribute('aria-pressed', 'false');
                if (keyData.isBlack) {
                    key.setAttribute(
                        'aria-label',
                        `${keyData.note}${keyData.octave}, ${keyData.note.replace('#', ' sharp ')}${keyData.octave}`
                    );
                }

                const label = document.createElement('span');
                label.className = 'piano-key-label';
                label.textContent = `${keyData.note}${keyData.octave}`;
                key.appendChild(label);

                key.style.left = `${whiteKeyIndex * whiteKeyWidth - (keyData.isBlack ? blackKeyWidth / 2 : 0)}px`;
                if (!keyData.isBlack) whiteKeyIndex++;
                kb.el.appendChild(key);
            });
        },

        attachEventListeners() {
            const updateWaveform = () => {
                const value = this.instrumentSelect.value;
                if (value === 'sine' || value === 'triangle' || value === 'square') {
                    this.waveform = value;
                }
                this.instrumentSelect.value = this.waveform;
                this.keyboards.forEach((kb) => {
                    kb.activeNotes.forEach((noteData) => {
                        if (noteData.voice && !noteData.audition) {
                            noteData.voice.oscillator.type = this.waveform;
                        }
                    });
                });
            };
            this.instrumentSelect.addEventListener('change', updateWaveform);
            updateWaveform();

            bindVolumeControl(this.volumeSlider, this.volumeDisplay, this.volume, (volume) => {
                this.volume = volume;
                this.keyboards.forEach((kb) => {
                    kb.activeNotes.forEach((noteData) => {
                        // Brief auditions keep their scheduled envelope; changes apply next time.
                        if (noteData.voice && !noteData.audition) {
                            AudioEngine.setVolume(noteData.voice, this.volume * 0.3, 0.01);
                        }
                    });
                });
            });

            this.keyboards.forEach((kb) => this.attachKeyboardEvents(kb));
            const stopNotesBtn = /** @type {HTMLButtonElement} */ (
                document.getElementById('stopNotesBtn')
            );
            stopNotesBtn.addEventListener('click', () => this.stopAll());
            stopNotesBtn.closest('section').addEventListener('keydown', (event) => {
                if (event.key !== 'Escape') return;
                event.preventDefault();
                stopNotesBtn.click();
            });
            window.addEventListener('pointerup', (event) => this.releasePointer(event.pointerId));
            window.addEventListener('pointercancel', (event) =>
                this.releasePointer(event.pointerId)
            );
            window.addEventListener('pointermove', (event) => {
                // Primary mouse release while another button is held produces a move, not up.
                if ((event.buttons & 1) === 0) this.releasePointer(event.pointerId);
            });
            window.addEventListener('blur', () => this.releaseMomentaryNotes());
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) this.releaseMomentaryNotes();
            });
        },

        /** @param {PracticeKeyboard} kb */
        attachKeyboardEvents(kb) {
            const keys = [...kb.el.querySelectorAll('button')];
            keys.forEach((key, index) => {
                key.addEventListener('focus', () => {
                    keys.forEach((button) => {
                        button.tabIndex = button === key ? 0 : -1;
                    });
                });
                key.addEventListener('blur', () => {
                    this.keyboardKeys.delete(key);
                    this.releaseMomentaryKey(key, kb);
                });
                key.addEventListener('keydown', (event) => {
                    let nextIndex;
                    switch (event.key) {
                        case 'ArrowLeft':
                            nextIndex = Math.max(0, index - 1);
                            break;
                        case 'ArrowRight':
                            nextIndex = Math.min(keys.length - 1, index + 1);
                            break;
                        case 'Home':
                            nextIndex = 0;
                            break;
                        case 'End':
                            nextIndex = keys.length - 1;
                            break;
                        default:
                            nextIndex = -1;
                    }
                    if (nextIndex !== -1) {
                        event.preventDefault();
                        keys[nextIndex].focus();
                        return;
                    }
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    const heldKeys = this.keyboardKeys.get(key) || new Set();
                    if (event.repeat || heldKeys.has(event.key)) {
                        event.preventDefault();
                        return;
                    }
                    heldKeys.add(event.key);
                    this.keyboardKeys.set(key, heldKeys);
                    if (kb.mode === 'momentary') {
                        event.preventDefault(); // Prevent a second, native button click.
                        this.handleKeyPress(key, kb);
                    }
                    // Hold buttons keep native Enter/Space click activation.
                });
                key.addEventListener('keyup', (event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    const heldKeys = this.keyboardKeys.get(key);
                    const owned = heldKeys?.delete(event.key);
                    if (!heldKeys?.size) this.keyboardKeys.delete(key);
                    if (kb.mode === 'momentary' || !owned) event.preventDefault();
                    if (owned) this.releaseMomentaryKey(key, kb);
                });
                key.addEventListener('click', (event) => {
                    if (event.button !== 0) return;
                    if (kb.mode === 'hold') {
                        this.handleKeyPress(key, kb);
                    } else if (event.detail === 0 && !this.hasMomentaryInput(key)) {
                        // Assistive tools may offer only click, without a press/release pair.
                        this.handleKeyPress(key, kb, true);
                    }
                });
                if (kb.mode !== 'momentary') return;
                key.addEventListener('pointerdown', (event) => {
                    if (event.button !== 0 || this.pointerKeys.has(event.pointerId)) return;
                    event.preventDefault();
                    key.focus({ preventScroll: true });
                    this.pointerKeys.set(event.pointerId, { keyEl: key, kb });
                    key.setPointerCapture?.(event.pointerId);
                    this.handleKeyPress(key, kb);
                });
                key.addEventListener('lostpointercapture', (event) => {
                    this.releasePointer(event.pointerId);
                });
            });
        },

        /** @param {HTMLButtonElement} keyEl */
        hasMomentaryInput(keyEl) {
            return (
                this.keyboardKeys.has(keyEl) ||
                [...this.pointerKeys.values()].some((pointer) => pointer.keyEl === keyEl)
            );
        },

        /** @param {number} pointerId */
        releasePointer(pointerId) {
            const pointer = this.pointerKeys.get(pointerId);
            if (!pointer) return;
            this.pointerKeys.delete(pointerId);
            const { keyEl, kb } = pointer;
            if (keyEl.hasPointerCapture?.(pointerId)) keyEl.releasePointerCapture(pointerId);
            this.releaseMomentaryKey(keyEl, kb);
        },

        /** @param {HTMLButtonElement} keyEl @param {PracticeKeyboard} kb */
        releaseMomentaryKey(keyEl, kb) {
            if (kb.mode === 'momentary' && !this.hasMomentaryInput(keyEl)) {
                this.handleKeyRelease(keyEl, kb);
            }
        },

        releaseMomentaryNotes() {
            this.keyboardKeys.clear();
            for (const pointerId of this.pointerKeys.keys()) this.releasePointer(pointerId);
            for (const kb of this.keyboards) {
                if (kb.mode !== 'momentary') continue;
                for (const [noteKey, noteData] of kb.activeNotes) {
                    this.stopNote(noteKey, noteData.keyEl, kb);
                }
            }
        },

        stopAll() {
            this.releaseMomentaryNotes();
            for (const kb of this.keyboards) {
                for (const [noteKey, noteData] of kb.activeNotes) {
                    this.stopNote(noteKey, noteData.keyEl, kb);
                }
            }
        },

        /** @param {HTMLButtonElement} keyEl @param {PracticeKeyboard} kb @param {boolean} active */
        setKeyActive(keyEl, kb, active) {
            keyEl.classList.toggle('active', active);
            if (kb.mode === 'hold') setAttribute(keyEl, 'aria-pressed', String(active));
        },

        /**
         * @param {HTMLButtonElement} keyEl
         * @param {PracticeKeyboard} kb
         * @param {boolean} audition
         */
        handleKeyPress(keyEl, kb, audition = false) {
            const note = /** @type {NoteName} */ (keyEl.dataset.note);
            const octave = Number(keyEl.dataset.octave);
            const noteKey = `${note}${octave}`;

            if (kb.mode === 'hold' && kb.activeNotes.has(noteKey)) {
                this.stopNote(noteKey, keyEl, kb);
            } else {
                this.playNote(noteKey, note, octave, keyEl, kb, audition);
            }
        },

        /** @param {HTMLButtonElement} keyEl @param {PracticeKeyboard} kb */
        handleKeyRelease(keyEl, kb) {
            this.stopNote(`${keyEl.dataset.note}${keyEl.dataset.octave}`, keyEl, kb);
        },

        /**
         * @param {string} noteKey
         * @param {NoteName} note
         * @param {number} octave
         * @param {HTMLButtonElement} keyEl
         * @param {PracticeKeyboard} kb
         * @param {boolean} audition
         */
        playNote(noteKey, note, octave, keyEl, kb, audition = false) {
            const previous = kb.activeNotes.get(noteKey);
            if (previous && !previous.audition) return;
            if (previous) this.stopNote(noteKey, keyEl, kb);
            /** @type {ActiveNote} */
            const noteData = { voice: null, keyEl, audition };
            kb.activeNotes.set(noteKey, noteData);
            this.setKeyActive(keyEl, kb, true);
            AudioEngine.startWhenReady(
                () => kb.activeNotes.get(noteKey) === noteData,
                (context) => {
                    const time = context.currentTime;
                    const volume = this.volume * 0.3;
                    const voice = AudioEngine.createVoice(context, {
                        frequency: NOTE_FREQUENCIES[note][octave],
                        type: this.waveform,
                        volume,
                        attackTime: 0.05,
                        time
                    });
                    noteData.voice = voice;
                    voice.oscillator.onended = () => {
                        AudioEngine.disconnectVoice(voice);
                        // An earlier release/audition must never clear a newer press.
                        if (kb.activeNotes.get(noteKey) === noteData) {
                            kb.activeNotes.delete(noteKey);
                            this.setKeyActive(keyEl, kb, false);
                        }
                    };
                    if (audition) {
                        voice.gainNode.gain.setValueAtTime(volume, time + 0.2);
                        voice.gainNode.gain.linearRampToValueAtTime(0, time + 0.3);
                        voice.oscillator.stop(time + 0.3);
                    }
                },
                () => this.stopNote(noteKey, keyEl, kb)
            );
        },

        /**
         * @param {string} noteKey
         * @param {HTMLButtonElement} keyEl
         * @param {PracticeKeyboard} kb
         */
        stopNote(noteKey, keyEl, kb) {
            const noteData = kb.activeNotes.get(noteKey);
            if (!noteData) return;

            kb.activeNotes.delete(noteKey);
            this.setKeyActive(keyEl, kb, false);
            if (noteData.voice) AudioEngine.releaseVoice(noteData.voice, 0.1);
        }
    };

    // Initialize all modules when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        checkBrowserSupport();
        StorageManager.init();

        PracticeHistory.init();
        Stopwatch.init();
        AudioEngine.init();
        Metronome.init();
        TuningTone.init();
        ChordalStudies.init();
    });
})();
