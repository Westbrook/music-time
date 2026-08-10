# Changelog

## Version 1.3.0 - iOS-Inspired Design Refinement (2026-08-10)

### 🎨 Complete Aesthetic Overhaul

Inspired by **Impulse Pro Metronome** and modern iOS design language, this update creates a refined, professional aesthetic while maintaining approachability.

**Design Philosophy**: Find the middle ground between our original colorful gradient design and the polished minimalism of professional iOS apps.

### Visual Changes

**Color Palette**:
- ✅ iOS system colors (#007aff blue, #34c759 green, #ff3b30 red)
- ✅ Neutral light gray background (#f2f2f7) replacing purple gradient
- ✅ Professional black text on white cards
- ✅ Refined secondary text colors

**Typography**:
- ✅ Lighter font weights (300) for display numbers - elegant, refined
- ✅ Improved letter spacing (-2px on large numbers)
- ✅ Better font hierarchy (300/500/600 weight system)
- ✅ Uppercase labels with increased letter-spacing

**Cards & Shadows**:
- ✅ Subtle shadow system (0.05/0.08/0.12 opacity)
- ✅ Refined border radius (8px/12px/16px system)
- ✅ Thin 1px borders for definition
- ✅ Hover elevation effects

**Buttons**:
- ✅ Refined padding and touch targets
- ✅ Color-matched shadows (blue/green tint)
- ✅ Smooth hover overlays with pseudo-elements
- ✅ Scale-down on press (0.98x) for tactile feedback
- ✅ Cubic-bezier easing for professional motion

**Form Controls**:
- ✅ Custom range slider thumbs (20px, shadowed)
- ✅ Refined input borders and focus states
- ✅ Focus glow effects (colored shadow rings)
- ✅ Better touch targets

**Micro-interactions**:
- ✅ Beat dots with colored shadows when active
- ✅ Card hover effects
- ✅ Smooth transitions throughout
- ✅ Professional cubic-bezier easing

### Benefits

**User Experience**:
- 📱 More iOS-native feel (especially on iPhone/iPad)
- 👁️ Easier on eyes during long practice sessions
- 🎯 Better focus on content vs. decoration
- ✨ Professional, polished appearance

**Accessibility**:
- ✅ Maintained WCAG AA contrast ratios
- ✅ Larger, clearer touch targets
- ✅ Better visual hierarchy
- ✅ Improved readability

**Performance**:
- ⚡ Removed gradient rendering overhead
- ⚡ Simpler CSS = faster paint times
- ⚡ Smoother animations

### Technical Details

**Files Modified**:
- `styles.css` - ~450 lines updated
- No HTML changes
- No JavaScript changes
- 100% backward compatible

**Design System**:
```css
/* Color Tokens */
--primary-color: #007aff (iOS Blue)
--success-color: #34c759 (iOS Green)
--danger-color: #ff3b30 (iOS Red)

/* Typography Scale */
Font weights: 300, 500, 600
Letter spacing: -2px to +1px

/* Shadow Scale */
sm: 0 1px 2px rgba(0,0,0,0.05)
md: 0 2px 8px rgba(0,0,0,0.08)
lg: 0 8px 24px rgba(0,0,0,0.12)

/* Radius Scale */
sm: 8px, md: 12px, lg: 16px
```

**Inspiration**: Impulse Pro Metronome aesthetic - clean, professional, musician-focused
**Position**: Middle ground - professional yet approachable

See `DESIGN_UPDATES.md` for full design rationale and comparison matrix.

---

## Version 1.2.2 - "Done" Button UX Fix (2026-08-10)

### 🐛 Bug Fix

**Fixed: "Done" Button Not Enabling While Timer Runs**
- **Problem**: After clicking "Start", the "Done" button remained disabled even though time was accumulating
- **Expected**: "Done" button should become enabled as soon as `elapsed > 0`, regardless of running/paused state
- **Root Cause**: `updateButtons()` was only called on Start/Pause/Done actions, not during the running interval
- **Solution**: Added `updateButtons()` call inside the 100ms timer interval

**Technical Details**:
```javascript
// Now updates button states every 100ms while running
this.intervalId = setInterval(() => {
    this.elapsed = (Date.now() - this.startTime) / 1000;
    this.updateDisplay();
    this.updateButtons(); // NEW: Enable "Done" as soon as elapsed > 0
    PracticeHistory.refresh();
}, 100);
```

**Benefits**:
- ✅ "Done" button becomes clickable within 100ms of starting
- ✅ Can click "Done" directly from running state (no need to pause first)
- ✅ More intuitive workflow: Start → Practice → Done (skip pause step)
- ✅ Button state always reflects actual timer state

---

## Version 1.2.1 - iOS Safe Area Support (2026-08-10)

### 📱 Mobile Improvements

**Added iOS Dynamic Island & Notch Protection**
- **Problem**: On iPhone 14 Pro and newer, content was hidden behind the Dynamic Island at page load
- **Solution**: Implemented proper safe area insets using CSS environment variables

**Technical Implementation**:
```html
<!-- viewport-fit=cover allows full-screen layout -->
<meta name="viewport" content="... viewport-fit=cover">
```

```css
/* Respects iOS safe areas (notch, Dynamic Island, home indicator) */
@supports (padding: max(0px)) {
    body {
        padding-top: max(1rem, env(safe-area-inset-top));
        padding-right: max(1rem, env(safe-area-inset-right));
        padding-bottom: max(1rem, env(safe-area-inset-bottom));
        padding-left: max(1rem, env(safe-area-inset-left));
    }
}
```

**Additional iOS Meta Tags**:
- `apple-mobile-web-app-capable` - Enables full-screen mode when added to home screen
- `apple-mobile-web-app-status-bar-style` - Black translucent status bar for immersive experience
- `theme-color` - Matches app gradient color for better integration

**Benefits**:
- ✅ Header never hidden behind Dynamic Island or notch
- ✅ Content properly inset on all iOS devices (iPhone X and newer)
- ✅ Works seamlessly on non-iOS devices (safe area = 0)
- ✅ Better experience when saved to home screen
- ✅ Proper spacing around rounded corners and home indicator

---

## Version 1.2.0 - Bug Fixes & UX Improvements (2026-08-10)

### 🐛 Bug Fixes

**Fixed: 7-Day View Corruption on Page Refresh**
- **Problem**: When refreshing the page with timer running, the 7-day history would show incorrect values
- **Root Cause**: Initialization order issue - `PracticeHistory` tried to access `Stopwatch.getCurrentElapsed()` before Stopwatch was fully initialized
- **Solution**: Added defensive check and improved session restoration logic

**Fixed: Paused Sessions Not Restored**
- **Problem**: Only running sessions were restored on page refresh; paused sessions lost their time
- **Root Cause**: Storage only saved sessions when `running === true`, discarded paused state
- **Solution**: Modified storage to save both running and paused sessions with a `running` flag

### ✨ UX Improvements

**Replaced "Reset" Button with "Done" Button**
- **Rationale**: "Reset" was confusing - users weren't sure if it saved their practice time
- **New Flow**:
  - **Start** → Begin practice session
  - **Pause** → Temporarily stop (can resume with Start)
  - **Done** → Save session to history and reset timer to 00:00:00
- **Benefits**:
  - Clear intent: "Done" means "I'm finished, save my practice"
  - Pause/Resume flow is more intuitive
  - No ambiguity about whether time is saved

**Added Helpful Hint**
- New tip under timer controls: _"Tip: Click 'Done' to save your practice session"_
- Subtle, italic styling in secondary color
- Guides users to the correct workflow

### 🔧 Technical Improvements

**Enhanced Session Storage**
```javascript
activeSession: {
  elapsed: 1234,
  timestamp: 1723301234000,
  running: true  // NEW: Track whether session was running or paused
}
```

**Improved Restoration Logic**
- Running sessions: Restore time + add elapsed time since last save, auto-resume
- Paused sessions: Restore time, stay paused
- No session: Start fresh at 00:00:00

**Button State Logic**
- **Start**: Disabled when running
- **Pause**: Disabled when not running
- **Done**: Disabled when elapsed === 0 (nothing to save)

---

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

