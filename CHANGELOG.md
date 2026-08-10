# Changelog

## Version 1.1.0 - Enhanced Features (2026-08-10)

### 🎯 Active Timer Resilience
**Problem Solved**: Active practice time was only saved on page unload, making it vulnerable to unexpected crashes or force-closes.

**Solution Implemented**:
- **Periodic auto-save**: Active session now saves every 5 seconds while running
- **Seamless recovery**: Page refresh instantly resumes your practice session with accurate time
- **No data loss**: Even if browser crashes, you lose at most 5 seconds of practice time

**Technical Details**:
- Added `setInterval` in `Stopwatch.init()` with 5-second interval
- Calls `StorageManager.saveActiveSession()` with current elapsed time
- Session restoration on page load now uses most recent saved state

---

### 📊 Live Practice History Updates
**Problem Solved**: "Today" totals only updated after stopping the timer, making it hard to track progress during long practice sessions.

**Solution Implemented**:
- **Real-time updates**: Today's total updates every 100ms while timer runs
- **Active session included**: Running timer time is automatically added to daily/weekly totals
- **Live daily breakdown**: The 7-day list shows today's active time as it accumulates

**Technical Details**:
- Added `getCurrentElapsed()` method to `Stopwatch` module
- Modified `PracticeHistory.refresh()` to query active timer state
- Active time added to `todaySeconds` and `weekTotal` calculations
- `PracticeHistory.refresh()` now called on every stopwatch update interval

**User Benefits**:
- See your progress in real-time as you practice
- Weekly goals visible during practice, not just after
- No need to stop timer to check how much you've practiced today

---

### 🎵 Metronome Volume Control
**Problem Solved**: Metronome volume was fixed, potentially too loud or too quiet depending on practice environment.

**Solution Implemented**:
- **Volume slider**: 0-100% adjustable volume control
- **Live adjustment**: Change volume while metronome is running
- **Visual feedback**: Percentage display shows current volume level
- **Sensible default**: 70% default volume (not too loud, not too quiet)

**Technical Details**:
- Added `volume` property to `Metronome` module (default: 0.7)
- New HTML input: `<input id="metronomeVolume">` with percentage display
- Modified `scheduleNote()` to scale gain by `this.volume`
- Volume event listener updates `this.volume` in real-time

---

### 🔊 Crisp Metronome Tones
**Problem Solved**: Original sine wave tones at 440Hz/880Hz were soft and lacked percussive clarity for precise timing.

**Solution Implemented**:
- **Square wave oscillator**: Sharp-edged waveform for percussive attack
- **Higher frequencies**: 800Hz (beat) / 1200Hz (accent) for brighter sound
- **Ultra-fast attack**: 0.5ms rise time creates crisp, click-like onset
- **Quick decay**: 40ms total duration prevents muddiness

**Technical Details**:
- Changed `oscillator.type` from `'sine'` to `'square'`
- Increased frequencies: 440→800Hz, 880→1200Hz
- Attack time: 1ms → 0.5ms
- Gain curve: instant → peak (0.5ms) → decay (40ms)
- Volume-aware: accent = 50% of volume, regular = 35% of volume

**User Benefits**:
- Clearer, more professional metronome sound
- Easier to hear precise beat placement
- Less fatigue during long practice sessions
- Better cut-through when practicing with instrument

---

## Code Quality Improvements

### Better Module Coupling
- `Stopwatch` and `PracticeHistory` now communicate bidirectionally
- `Stopwatch.getCurrentElapsed()` provides clean API for active time queries
- Practice history updates automatically without tight coupling

### Performance Optimization
- `PracticeHistory.refresh()` called efficiently (only when needed)
- No performance impact from live updates (100ms interval is low overhead)
- Metronome volume calculation adds negligible CPU load

### Maintainability
- Volume control pattern consistent between Metronome and TuningTone
- Active time logic centralized in `PracticeHistory.refresh()`
- Clear separation of concerns (storage, display, timing)

---

## Files Modified

### HTML
- `index.html`: Added metronome volume slider and percentage display

### JavaScript
- `script.js`:
  - `Stopwatch` module: Added periodic save, `getCurrentElapsed()` method
  - `PracticeHistory` module: Active time integration in `refresh()`
  - `Metronome` module: Volume control, crisp tone generation

### Documentation
- `README.md`: Updated feature descriptions
- `QUICK_START.md`: Added tips about live updates and crisp tones
- `IMPLEMENTATION_SUMMARY.md`: Documented new features and technical details
- `CHANGELOG.md`: This file

---

## Upgrade Notes

### For Existing Users
- **No action required**: Changes are backward compatible
- **Active sessions**: Will automatically benefit from new 5-second save interval
- **Practice history**: Will show live updates immediately
- **Metronome**: Default volume is 70% (adjust to preference)

### For Developers
- `Stopwatch.getCurrentElapsed()` is now the public API for active time
- `PracticeHistory.refresh()` is safe to call frequently (optimized)
- Metronome volume range: 0.0-1.0 (internally), 0-100 (UI)

---

## Testing Recommendations

1. **Timer Resilience**: Start timer, refresh page multiple times, verify time continues accurately
2. **Live Updates**: Start timer, watch "Today" total increment in real-time
3. **Volume Control**: Adjust metronome volume while running, verify smooth transitions
4. **Crisp Tones**: Compare old vs new metronome sound (if you have backup)
5. **Edge Cases**: Test midnight rollover with active timer

---

## Future Enhancements Enabled

These improvements lay groundwork for:
- **Practice streaks**: Live data makes streak detection more accurate
- **Session analytics**: Real-time statistics during practice
- **Practice goals**: Visual progress bars that update live
- **Multiple metronome sounds**: Volume control infrastructure supports sound switching
- **Metronome presets**: Save BPM + volume + beats-per-measure combinations

---

**Version 1.1.0 represents a significant UX improvement while maintaining the app's lightweight, dependency-free architecture.**

