// Trombone Practice Timer - Main Application
// Browser support: Modern browsers with Web Audio API and LocalStorage

(function() {
    'use strict';

    // ============================================================================
    // Constants and Configuration
    // ============================================================================

    const STORAGE_KEY = 'trombonePracticeData';
    const STORAGE_VERSION = 1;
    const MIN_BPM = 40;
    const MAX_BPM = 240;
    const DAYS_TO_KEEP = 7;
    const AUDIO_RAMP_TIME = 0.015; // Prevent clicks on tone start/stop

    // Note frequencies (A4 = 440 Hz)
    const NOTE_FREQUENCIES = {
        'C': [16.35, 32.70, 65.41, 130.81, 261.63, 523.25, 1046.50],
        'C#': [17.32, 34.65, 69.30, 138.59, 277.18, 554.37, 1108.73],
        'D': [18.35, 36.71, 73.42, 146.83, 293.66, 587.33, 1174.66],
        'D#': [19.45, 38.89, 77.78, 155.56, 311.13, 622.25, 1244.51],
        'E': [20.60, 41.20, 82.41, 164.81, 329.63, 659.25, 1318.51],
        'F': [21.83, 43.65, 87.31, 174.61, 349.23, 698.46, 1396.91],
        'F#': [23.12, 46.25, 92.50, 185.00, 369.99, 739.99, 1479.98],
        'G': [24.50, 49.00, 98.00, 196.00, 392.00, 783.99, 1567.98],
        'G#': [25.96, 51.91, 103.83, 207.65, 415.30, 830.61, 1661.22],
        'A': [27.50, 55.00, 110.00, 220.00, 440.00, 880.00, 1760.00],
        'A#': [29.14, 58.27, 116.54, 233.08, 466.16, 932.33, 1864.66],
        'B': [30.87, 61.74, 123.47, 246.94, 493.88, 987.77, 1975.53]
    };

    // ============================================================================
    // Utility Functions
    // ============================================================================

    function getLocalMidnight(date = new Date()) {
        const midnight = new Date(date);
        midnight.setHours(0, 0, 0, 0);
        return midnight;
    }

    function getDayKey(date = new Date()) {
        const midnight = getLocalMidnight(date);
        return midnight.toISOString().split('T')[0];
    }

    function formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function formatDurationShort(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    function formatDateDisplay(dateKey) {
        const date = new Date(dateKey + 'T00:00:00');
        const today = getDayKey();
        const yesterday = getDayKey(new Date(Date.now() - 86400000));
        
        if (dateKey === today) return 'Today';
        if (dateKey === yesterday) return 'Yesterday';
        
        return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }

    // ============================================================================
    // Storage Manager
    // ============================================================================

    const StorageManager = {
        load() {
            try {
                const data = localStorage.getItem(STORAGE_KEY);
                if (!data) return this.createEmpty();
                
                const parsed = JSON.parse(data);
                if (parsed.version !== STORAGE_VERSION) {
                    return this.createEmpty();
                }
                
                return parsed;
            } catch (e) {
                console.warn('Failed to load practice data:', e);
                return this.createEmpty();
            }
        },

        save(data) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch (e) {
                console.error('Failed to save practice data:', e);
            }
        },

        createEmpty() {
            return {
                version: STORAGE_VERSION,
                dailyData: {},
                activeSession: null
            };
        },

        cleanOldData(data) {
            const cutoffDate = new Date(Date.now() - (DAYS_TO_KEEP * 86400000));
            const cutoffKey = getDayKey(cutoffDate);
            
            for (const key in data.dailyData) {
                if (key < cutoffKey) {
                    delete data.dailyData[key];
                }
            }
        },

        addPracticeTime(seconds) {
            const data = this.load();
            const dayKey = getDayKey();
            
            if (!data.dailyData[dayKey]) {
                data.dailyData[dayKey] = 0;
            }
            
            data.dailyData[dayKey] += seconds;
            this.cleanOldData(data);
            this.save(data);
        },

        saveActiveSession(elapsed, running) {
            const data = this.load();
            data.activeSession = elapsed > 0 || running ? {
                elapsed,
                timestamp: Date.now(),
                running: running
            } : null;
            this.save(data);
        },

        getActiveSession() {
            const data = this.load();
            return data.activeSession;
        },

        getDailyData() {
            const data = this.load();
            return data.dailyData;
        }
    };

    // ============================================================================
    // Stopwatch Module
    // ============================================================================

    const Stopwatch = {
        elapsed: 0,
        running: false,
        startTime: null,
        intervalId: null,
        display: null,
        startBtn: null,
        pauseBtn: null,
        doneBtn: null,

        init() {
            this.display = document.getElementById('stopwatchDisplay');
            this.startBtn = document.getElementById('startBtn');
            this.pauseBtn = document.getElementById('pauseBtn');
            this.doneBtn = document.getElementById('doneBtn');

            if (!this.startBtn || !this.pauseBtn || !this.doneBtn) {
                console.error('Stopwatch: Required DOM elements not found');
                return;
            }

            this.startBtn.addEventListener('click', () => this.start());
            this.pauseBtn.addEventListener('click', () => this.pause());
            this.doneBtn.addEventListener('click', () => this.done());

            // Restore active session if exists
            const session = StorageManager.getActiveSession();
            if (session) {
                const timeSinceLastUpdate = (Date.now() - session.timestamp) / 1000;
                this.elapsed = session.elapsed;

                // If it was running, add elapsed time since last save and auto-resume
                if (session.running) {
                    this.elapsed += timeSinceLastUpdate;
                    this.start();
                } else {
                    // If it was paused, just restore the time
                    this.updateDisplay();
                    this.updateButtons();
                }
            }

            // Save state before page unload
            window.addEventListener('beforeunload', () => {
                if (this.running) {
                    StorageManager.saveActiveSession(this.elapsed, true);
                }
            });

            // Periodic save while running (every 5 seconds)
            setInterval(() => {
                if (this.running) {
                    StorageManager.saveActiveSession(this.elapsed, true);
                }
            }, 5000);

            this.updateDisplay();
        },

        start() {
            if (this.running) return;

            this.running = true;
            this.startTime = Date.now() - (this.elapsed * 1000);

            this.intervalId = setInterval(() => {
                this.elapsed = (Date.now() - this.startTime) / 1000;
                this.updateDisplay();
                this.updateButtons(); // Enable "Done" button as soon as elapsed > 0
                PracticeHistory.refresh(); // Live update practice history
            }, 100);

            this.updateButtons();
            PracticeHistory.refresh(); // Update immediately when starting
        },

        pause() {
            if (!this.running) return;

            this.running = false;
            clearInterval(this.intervalId);
            this.intervalId = null;

            // Save paused session (running: false)
            const data = StorageManager.load();
            data.activeSession = {
                elapsed: this.elapsed,
                timestamp: Date.now(),
                running: false
            };
            StorageManager.save(data);

            this.updateButtons();
            PracticeHistory.refresh(); // Update when pausing
        },

        done() {
            // Save the practice session and reset
            if (this.elapsed > 0) {
                StorageManager.addPracticeTime(Math.floor(this.elapsed));
            }

            this.elapsed = 0;
            this.running = false;

            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }

            StorageManager.saveActiveSession(0, false);
            this.updateDisplay();
            this.updateButtons();
            PracticeHistory.refresh(); // Update when done
        },

        updateDisplay() {
            this.display.textContent = formatDuration(this.elapsed);
        },

        updateButtons() {
            if (!this.startBtn || !this.pauseBtn || !this.doneBtn) return;

            this.startBtn.disabled = this.running;
            this.pauseBtn.disabled = !this.running;
            this.doneBtn.disabled = this.elapsed === 0;
        },

        getCurrentElapsed() {
            // Return active time only if timer is running
            // If paused, the elapsed time shouldn't count toward "active" time
            return this.running ? this.elapsed : 0;
        },

        getPausedElapsed() {
            // Return elapsed time even if paused (for restoring state)
            return this.elapsed;
        }
    };

    // ============================================================================
    // Practice History Module
    // ============================================================================

    const PracticeHistory = {
        todayDisplay: null,
        weekDisplay: null,
        dailyList: null,

        init() {
            this.todayDisplay = document.getElementById('todayTotal');
            this.weekDisplay = document.getElementById('weekTotal');
            this.dailyList = document.getElementById('dailyList');

            this.refresh();
        },

        refresh() {
            // Defensive check - don't run if not initialized
            if (!this.todayDisplay || !this.weekDisplay || !this.dailyList) return;

            const dailyData = StorageManager.getDailyData();
            const today = getDayKey();

            // Get active session time if timer is running
            const activeTime = Stopwatch.getCurrentElapsed ? Math.floor(Stopwatch.getCurrentElapsed()) : 0;

            // Calculate today's total (including active session)
            const todaySeconds = (dailyData[today] || 0) + activeTime;
            this.todayDisplay.textContent = formatDurationShort(todaySeconds);

            // Calculate 7-day total and build daily list
            const last7Days = [];
            let weekTotal = 0;

            for (let i = 0; i < DAYS_TO_KEEP; i++) {
                const date = new Date(Date.now() - (i * 86400000));
                const dayKey = getDayKey(date);
                let seconds = dailyData[dayKey] || 0;

                // Add active time to today's entry
                if (dayKey === today) {
                    seconds += activeTime;
                }

                weekTotal += seconds;
                last7Days.push({
                    key: dayKey,
                    seconds: seconds
                });
            }

            this.weekDisplay.textContent = formatDurationShort(weekTotal);

            // Render daily breakdown
            this.dailyList.innerHTML = '';
            last7Days.forEach(day => {
                const item = document.createElement('div');
                item.className = 'daily-item';

                const dateSpan = document.createElement('span');
                dateSpan.className = 'daily-date';
                dateSpan.textContent = formatDateDisplay(day.key);

                const durationSpan = document.createElement('span');
                durationSpan.className = 'daily-duration';
                durationSpan.textContent = formatDurationShort(day.seconds);

                item.appendChild(dateSpan);
                item.appendChild(durationSpan);
                this.dailyList.appendChild(item);
            });
        }
    };

    // ============================================================================
    // Metronome Module
    // ============================================================================

    const Metronome = {
        audioContext: null,
        running: false,
        bpm: 120,
        beatsPerMeasure: 4,
        currentBeat: 0,
        nextNoteTime: 0,
        scheduleAheadTime: 0.1,
        lookahead: 25.0,
        timerID: null,
        volume: 0.7,
        bpmSlider: null,
        bpmInput: null,
        bpmDisplay: null,
        beatsInput: null,
        metronomeBtn: null,
        beatIndicator: null,
        volumeSlider: null,
        volumeDisplay: null,

        init() {
            this.bpmSlider = document.getElementById('bpmSlider');
            this.bpmInput = document.getElementById('bpmInput');
            this.bpmDisplay = document.getElementById('bpmDisplay');
            this.beatsInput = document.getElementById('beatsPerMeasure');
            this.metronomeBtn = document.getElementById('metronomeBtn');
            this.beatIndicator = document.getElementById('beatIndicator');
            this.volumeSlider = document.getElementById('metronomeVolume');
            this.volumeDisplay = document.getElementById('metronomeVolumeDisplay');

            // Initialize Audio Context on user interaction
            this.metronomeBtn.addEventListener('click', () => {
                if (!this.audioContext) {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                }
                this.toggle();
            });

            this.bpmSlider.addEventListener('input', (e) => {
                this.bpm = parseInt(e.target.value);
                this.bpmInput.value = this.bpm;
                this.bpmDisplay.textContent = this.bpm;
            });

            this.bpmInput.addEventListener('input', (e) => {
                let value = parseInt(e.target.value);
                if (isNaN(value)) return;

                value = Math.max(MIN_BPM, Math.min(MAX_BPM, value));
                this.bpm = value;
                this.bpmSlider.value = value;
                this.bpmDisplay.textContent = value;
            });

            this.beatsInput.addEventListener('change', (e) => {
                this.beatsPerMeasure = Math.max(1, Math.min(16, parseInt(e.target.value) || 4));
                this.beatsInput.value = this.beatsPerMeasure;
                this.createBeatIndicators();
            });

            this.volumeSlider.addEventListener('input', (e) => {
                this.volume = parseInt(e.target.value) / 100;
                this.volumeDisplay.textContent = `${e.target.value}%`;
            });

            this.createBeatIndicators();
        },

        createBeatIndicators() {
            this.beatIndicator.innerHTML = '';
            for (let i = 0; i < this.beatsPerMeasure; i++) {
                const dot = document.createElement('div');
                dot.className = 'beat-dot';
                this.beatIndicator.appendChild(dot);
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
            if (!this.audioContext) return;

            this.running = true;
            this.currentBeat = 0;
            this.nextNoteTime = this.audioContext.currentTime;
            this.scheduler();
            this.metronomeBtn.textContent = 'Stop Metronome';
            this.metronomeBtn.classList.remove('btn-primary');
            this.metronomeBtn.classList.add('btn-danger');
        },

        stop() {
            this.running = false;
            if (this.timerID) {
                clearTimeout(this.timerID);
                this.timerID = null;
            }
            this.metronomeBtn.textContent = 'Start Metronome';
            this.metronomeBtn.classList.remove('btn-danger');
            this.metronomeBtn.classList.add('btn-primary');
            this.clearBeatIndicators();
        },

        scheduleNote(time, beatNumber) {
            const isAccent = beatNumber === 0;
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // Higher frequencies for crisper sound
            oscillator.frequency.value = isAccent ? 1200 : 800;
            oscillator.type = 'square'; // Square wave for sharper attack

            // Crisp attack: instant peak, then rapid decay
            const peakVolume = this.volume * (isAccent ? 0.5 : 0.35);
            gainNode.gain.setValueAtTime(0, time);
            gainNode.gain.linearRampToValueAtTime(peakVolume, time + 0.0005); // Very fast attack
            gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.04); // Quick decay

            oscillator.start(time);
            oscillator.stop(time + 0.04);

            // Update visual indicator
            setTimeout(() => {
                this.updateBeatIndicator(beatNumber);
            }, (time - this.audioContext.currentTime) * 1000);
        },

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
            dots.forEach(dot => dot.classList.remove('active', 'accent'));
        },

        nextNote() {
            const secondsPerBeat = 60.0 / this.bpm;
            this.nextNoteTime += secondsPerBeat;
            this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure;
        },

        scheduler() {
            while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
                this.scheduleNote(this.nextNoteTime, this.currentBeat);
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
        audioContext: null,
        oscillator: null,
        gainNode: null,
        running: false,
        currentNote: 'F',
        currentOctave: 3,
        currentFrequency: 174.61,
        volume: 0.5,
        noteSelect: null,
        octaveSelect: null,
        volumeSlider: null,
        volumeDisplay: null,
        noteDisplay: null,
        freqDisplay: null,
        toneBtn: null,

        init() {
            this.noteSelect = document.getElementById('noteSelect');
            this.octaveSelect = document.getElementById('octaveSelect');
            this.volumeSlider = document.getElementById('volumeSlider');
            this.volumeDisplay = document.getElementById('volumeDisplay');
            this.noteDisplay = document.getElementById('noteDisplay');
            this.freqDisplay = document.getElementById('freqDisplay');
            this.toneBtn = document.getElementById('toneBtn');

            this.noteSelect.addEventListener('change', () => this.updateFrequency());
            this.octaveSelect.addEventListener('change', () => this.updateFrequency());

            this.volumeSlider.addEventListener('input', (e) => {
                this.volume = parseInt(e.target.value) / 100;
                this.volumeDisplay.textContent = `${e.target.value}%`;

                if (this.gainNode) {
                    this.gainNode.gain.setTargetAtTime(
                        this.volume * 0.3,
                        this.audioContext.currentTime,
                        AUDIO_RAMP_TIME
                    );
                }
            });

            this.toneBtn.addEventListener('click', () => {
                if (!this.audioContext) {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                }
                this.toggle();
            });

            this.updateFrequency();
        },

        updateFrequency() {
            this.currentNote = this.noteSelect.value;
            this.currentOctave = parseInt(this.octaveSelect.value);

            const frequencies = NOTE_FREQUENCIES[this.currentNote];
            this.currentFrequency = frequencies[this.currentOctave];

            this.noteDisplay.textContent = `${this.currentNote}${this.currentOctave}`;
            this.freqDisplay.textContent = `${this.currentFrequency.toFixed(2)} Hz`;

            if (this.oscillator) {
                this.oscillator.frequency.setTargetAtTime(
                    this.currentFrequency,
                    this.audioContext.currentTime,
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
            if (!this.audioContext) return;

            this.oscillator = this.audioContext.createOscillator();
            this.gainNode = this.audioContext.createGain();

            this.oscillator.type = 'sine';
            this.oscillator.frequency.value = this.currentFrequency;

            this.oscillator.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);

            // Smooth ramp to avoid clicks
            this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            this.gainNode.gain.linearRampToValueAtTime(
                this.volume * 0.3,
                this.audioContext.currentTime + AUDIO_RAMP_TIME
            );

            this.oscillator.start();
            this.running = true;

            this.toneBtn.textContent = 'Stop Tone';
            this.toneBtn.classList.remove('btn-primary');
            this.toneBtn.classList.add('btn-danger');
        },

        stop() {
            if (!this.running) return;

            // Smooth ramp down to avoid clicks
            this.gainNode.gain.setTargetAtTime(
                0,
                this.audioContext.currentTime,
                AUDIO_RAMP_TIME
            );

            setTimeout(() => {
                if (this.oscillator) {
                    this.oscillator.stop();
                    this.oscillator.disconnect();
                    this.oscillator = null;
                }
                if (this.gainNode) {
                    this.gainNode.disconnect();
                    this.gainNode = null;
                }
            }, AUDIO_RAMP_TIME * 1000 * 5);

            this.running = false;

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

    // Initialize all modules when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        const support = checkBrowserSupport();

        Stopwatch.init();
        PracticeHistory.init();
        Metronome.init();
        TuningTone.init();
    });

})();

