# 🎺 Trombone Practice Timer

A fully-featured, locally-hostable practice timer designed for trombone players (and any musician). Built with vanilla HTML, CSS, and JavaScript—no frameworks, no dependencies, no build step required.

## Features

### ⏱️ Practice Stopwatch
- Start, pause, resume, and reset controls
- Clear stopwatch-style display (HH:MM:SS)
- Automatic session persistence—survive page refreshes without losing your practice time
- Completed sessions are saved to local storage when stopped or reset

### 📊 Local Practice History
- Track daily practice totals using browser local storage
- Rolling 7-day history with daily breakdown
- Weekly total calculation
- Days defined by local midnight (handles timezone and DST transitions)
- Versioned storage format resilient to malformed data
- No server, no account, no tracking—all data stays on your device

### 🎵 Metronome
- Accurate Web Audio API-based timing (not relying on `setInterval` alone)
- BPM range: 40–240
- Synchronized slider and numeric input
- Configurable beats per measure (1–16)
- Visual beat indicators with accent on beat 1
- Audio accent on the first beat of each measure
- Designed to support future features: multiple tones, custom meters, subdivisions, polymeter

### 🎼 Tuning Tone Generator
- Default pitch: F3 (174.61 Hz)
- Note/octave selection (C2–B5)
- Adjustable volume
- Smooth envelope on start/stop to prevent clicks
- Displays current note name and frequency

## Browser Requirements

- **Modern browser** with:
  - Web Audio API support (Chrome, Firefox, Safari, Edge)
  - LocalStorage API
  - ES6 JavaScript support

Graceful degradation: if Web Audio or LocalStorage is unavailable, warnings are logged to the console.

## Installation & Usage

### Running Locally

1. **Clone or download** this repository
2. **Open `index.html`** in your browser:
   - Double-click the file, or
   - Drag it into a browser window, or
   - Serve it with a local web server (optional but recommended):
     ```bash
     # Python 3
     python -m http.server 8000

     # Node.js (with npx)
     npx serve .
     ```
3. **Start practicing!**

No installation, no dependencies, no internet connection required after loading.

### Files

- `index.html` — Main page structure
- `styles.css` — Responsive styling, accessibility features
- `script.js` — Application logic (stopwatch, storage, metronome, tuner)

## Technical Details

### Storage Behavior
- Practice data is stored in `localStorage` under the key `trombonePracticeData`
- Storage format is versioned (current version: 1)
- Records older than 7 days are automatically expired
- Daily totals are keyed by ISO date string (YYYY-MM-DD) derived from local midnight
- Active sessions are persisted before page unload to prevent accidental data loss

### Date & Time Handling
- Days begin at local midnight (`00:00:00`) in the user's current timezone
- Timezone changes and DST transitions are handled by browser `Date` APIs
- Weekly total = sum of the last 7 calendar days including today

### Metronome Timing
- Uses Web Audio API's precise scheduling (not `setInterval` for audio)
- Audio scheduled slightly ahead (100ms) using a 25ms lookahead interval
- Visual indicators update via `setTimeout` synchronized to audio schedule

### Tuning Tone
- Frequencies based on equal temperament, A4 = 440 Hz
- Sine wave oscillator
- Gain ramped over 15ms on start/stop to avoid clicks
- Volume control adjusts gain from 0–30% of full scale

### Accessibility
- Semantic HTML with ARIA where appropriate
- Keyboard accessible controls
- Visible focus states
- Sufficient color contrast (WCAG AA)
- Respects `prefers-reduced-motion` media query

### Performance & Offline
- Lightweight (no external dependencies)
- Fully functional offline after initial load
- Properly cleans up audio nodes, timers, and event listeners
- No autoplay—audio only starts on explicit user interaction

## Known Limitations & Assumptions

- **BPM Range**: 40–240 (common musical range)
- **Daily Rollover**: Midnight is determined by the browser's local timezone at the moment of calculation
- **Browser Support**: Designed for modern browsers; no polyfills for older environments
- **Storage Quota**: Uses browser localStorage (typically 5–10MB); practice history is small, but extreme edge cases (decades of daily data) are not tested
- **No Export**: Practice data is not exportable in this version (could be added as a future enhancement)

## Future Enhancements (Structured for Extension)

The metronome is architected to support:
- Multiple tone options (click, woodblock, beep, etc.)
- Custom time signatures and meters
- Subdivisions (eighth notes, triplets, etc.)
- Polymeter support

The codebase is modular and can be extended with:
- CSV/JSON export of practice history
- Practice goals and reminders
- Additional tuning reference tones
- Visual chromatic tuner

## License

This project is provided as-is for personal and educational use.

---

**Happy practicing! 🎺🎵**
