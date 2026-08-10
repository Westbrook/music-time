# Changelog

## Version 1.4.1 - Premium Button & Control Refinement (2026-08-10)

### ✨ Professional Button Design System

Elevated all interactive controls to match premium music app aesthetics.

### Button Transformations

**Primary Buttons** (Start, Metronome, Tone):
- ✅ Gradient fills (#007aff → #0051d5)
- ✅ Pill-shaped radius (20px)
- ✅ Enhanced shadows with dual layers
- ✅ Lift on hover (translateY -1px)
- ✅ Gradient shimmer overlay

**Secondary Buttons** (Pause):
- ✅ Glass morphism effect (frosted glass)
- ✅ Semi-transparent background with blur
- ✅ Subtle border with alpha channel
- ✅ Adapts to light/dark mode

**Success Buttons** (Done):
- ✅ Green gradient (#34c759 → #30b350)
- ✅ Animated checkmark appears on hover
- ✅ Lift animation on hover
- ✅ Enhanced glow shadows

**Danger Buttons** (formerly Reset):
- ✅ Minimal outline style
- ✅ Transparent with red border
- ✅ Fills red on hover (dramatic transition)
- ✅ Professional restraint

### Enhanced Form Controls

**Range Sliders**:
- ✅ Larger thumb (24px with 3px colored border)
- ✅ White thumb with primary color ring
- ✅ Smooth scale animation on hover (1.15x)
- ✅ Focus glow ring (4px blur)
- ✅ Progressive fill track (light mode)

**Number Inputs & Selects**:
- ✅ Pill-shaped borders (12px radius)
- ✅ Thicker borders (1.5px)
- ✅ Lift on focus (translateY -1px)
- ✅ Enhanced shadows (dual layer)
- ✅ Glass effect in dark mode
- ✅ Hover state transitions

### Beat Indicator Enhancements

**Container**:
- ✅ Subtle background panel
- ✅ Increased padding and height
- ✅ Glass effect in dark mode

**Beat Dots**:
- ✅ Ring glow when active (3-4px spread)
- ✅ Border transitions
- ✅ Bounce easing (cubic-bezier)
- ✅ Larger scale transforms (1.5x/1.7x)
- ✅ Enhanced shadow layers

### Timer Hint Refinement

- ✅ Contained in rounded panel
- ✅ Background with border
- ✅ Max-width constraint (320px)
- ✅ Glass effect in dark mode

### Design Principles

**Fashionable & Professional**:
```
❌ Flat, basic buttons
❌ Generic form controls
❌ Simple hover states

✅ Gradient-filled primaries
✅ Glass morphism effects
✅ Micro-interactions
✅ Multi-layer shadows
✅ Sophisticated animations
```

**Consistency with Impulse Pro Aesthetic**:
- Premium tactile feel
- Sophisticated color treatments
- Professional restraint
- Delightful micro-interactions

### Technical Details

**Button Gradients**:
```css
/* Primary */
background: linear-gradient(135deg, #007aff 0%, #0051d5 100%);

/* Success */
background: linear-gradient(135deg, #34c759 0%, #30b350 100%);

/* Secondary Glass */
background: rgba(142, 142, 147, 0.18);
backdrop-filter: blur(10px);
```

**Multi-Layer Shadows**:
```css
/* Light mode primary */
box-shadow:
  0 2px 8px rgba(0, 122, 255, 0.25),
  0 1px 2px rgba(0, 0, 0, 0.05);

/* Hover */
box-shadow:
  0 6px 20px rgba(0, 122, 255, 0.35),
  0 2px 4px rgba(0, 0, 0, 0.08);
```

**Animations**:
- Bounce easing for beat dots
- Cubic-bezier for all transitions
- Scale + translate combinations
- Gradient shimmer overlays

### Visual Comparison

**Before v1.4.1**:
- Basic rounded buttons
- Single shadows
- Simple hover states

**After v1.4.1**:
- Gradient-filled buttons
- Glass morphism effects
- Multi-layer shadows
- Sophisticated interactions
- Professional polish

---

## Version 1.4.0 - Premium Design Enhancements (2026-08-10)

### ✨ Distinctive Design Elements

Added unique, sophisticated design touches inspired by professional music apps while maintaining original identity.

### New Visual Features

**Custom App Icon**:
- ✅ Hand-crafted SVG trombone icon with gradient
- ✅ Subtle drop shadow and hover animation
- ✅ 72×72px professional sizing
- ✅ Unique identity (not generic)

**Branded Header**:
- ✅ Icon + Title + Subtitle layout
- ✅ "Professional Practice Companion" tagline
- ✅ Refined typography hierarchy
- ✅ Premium first impression

**Circular Progress Ring** (Timer):
- ✅ Animated SVG ring around stopwatch
- ✅ Fills clockwise every 60 seconds
- ✅ Smooth stroke animation
- ✅ Glowing effect in dark mode
- ✅ Professional music app aesthetic

**Featured BPM Display**:
- ✅ Gradient-filled container (blue gradient)
- ✅ Elevated card with colored shadow
- ✅ White text on blue in light mode
- ✅ Glowing blue in dark mode
- ✅ Premium focal point

**Segmented Stats Grid**:
- ✅ Unified container (iOS segmented control style)
- ✅ Gradient border on hover
- ✅ Tighter gaps, cleaner look
- ✅ Enhanced visual cohesion

**Section Headers**:
- ✅ Uppercase micro-typography
- ✅ Accent line decoration (gradient)
- ✅ Professional music software style
- ✅ Clear visual hierarchy

### Design Principles Applied

**Unique Identity**:
- 🎺 Custom trombone icon (not emoji)
- 🎨 Branded blue gradients
- ✨ Signature visual elements
- 🎵 Music-focused details

**Professional Polish**:
- Circular progress visualization
- Gradient-enhanced components
- Micro-animations and hover states
- Premium shadows and glows

**Sophisticated UI**:
- Not generic Bootstrap/Material
- Distinctive visual language
- Cohesive design system
- Memorable brand presence

### Technical Implementation

**SVG Graphics**:
- Custom app icon with gradient
- Animated progress ring
- Scalable and crisp

**CSS Gradients**:
```css
/* BPM Container */
background: linear-gradient(135deg, #007aff 0%, #0051d5 100%);

/* Stat Item Borders */
background: linear-gradient(135deg, primary-color, success-color);
```

**Animations**:
- Ring animates based on elapsed seconds (0-60)
- Icon hover scale with bounce easing
- Smooth gradient transitions

### What Makes It Unique

**vs Generic Apps**:
- ❌ No stock icons or emoji
- ❌ No flat, lifeless layouts
- ❌ No basic card grids
- ✅ Custom branded elements
- ✅ Thoughtful visual hierarchy
- ✅ Memorable design touches

**vs Impulse Pro** (respectful distance):
- Different icon design (trombone vs metronome)
- Different color scheme (blue vs their colors)
- Different layout structure
- Similar level of polish and sophistication

**Our Unique Position**:
- Trombone-focused branding
- Approachable yet professional
- Colorful yet refined
- Distinctive visual identity

### Files Modified

- `index.html` - App icon SVG, timer ring SVG, BPM container
- `styles.css` - Premium styling, gradients, animations
- `script.js` - Timer ring animation logic

---

## Version 1.3.1 - Automatic Dark Mode Support (2026-08-10)

### 🌓 Dark Mode Implementation

**Added automatic dark mode** that respects the user's system preference with no manual toggle required.

**How It Works**:
- Uses CSS `@media (prefers-color-scheme: dark)` to detect system preference
- Automatically switches colors, shadows, and borders
- Updates browser theme color meta tag based on mode
- Zero JavaScript - pure CSS solution

### Dark Mode Color Palette

**iOS Dark Mode Colors**:
```css
--primary-color: #0a84ff      /* Brighter blue for dark backgrounds */
--success-color: #32d74b      /* Brighter green */
--danger-color: #ff453a       /* Brighter red */
--bg-color: #000000           /* Pure black background */
--card-bg: #1c1c1e            /* Dark gray cards */
--text-color: #ffffff         /* White text */
--text-secondary: #98989d     /* Light gray secondary */
--border-color: #38383a       /* Dark borders */
```

**Enhanced Shadows**:
- Stronger opacity (0.3/0.5/0.7 vs 0.05/0.08/0.12)
- More pronounced depth in dark environments

### Component Adjustments

**Buttons**:
- ✅ Brighter shadow glows in dark mode
- ✅ Primary blue: #0a84ff (more visible on dark)
- ✅ Success green: #32d74b (brighter)

**Cards**:
- ✅ White border overlay (rgba(255,255,255,0.1))
- ✅ Stronger shadows for depth

**Inputs & Selects**:
- ✅ Dark background with light text
- ✅ Brighter focus rings
- ✅ Enhanced contrast

**Beat Indicators**:
- ✅ Stronger colored glows when active
- ✅ Better visibility on dark background

**Daily Items**:
- ✅ Subtle white border in dark mode
- ✅ Lighter hover state (white overlay)

### Meta Tags

**Dynamic Theme Color**:
```html
<meta name="theme-color" content="#f2f2f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
<meta name="color-scheme" content="light dark">
```

**Benefits**:
- iOS status bar matches app background
- System UI integrates seamlessly
- Proper contrast in both modes

### Technical Implementation

**No Toggle Required**:
- Respects OS/browser preference automatically
- Users already have dark mode settings in their OS
- Reduces UI complexity

**Performance**:
- Pure CSS solution (no JavaScript)
- Instant switching on preference change
- No flash of wrong theme

**Accessibility**:
- WCAG AA contrast maintained in both modes
- Better eye comfort in low-light environments
- Reduced eye strain during night practice

### Testing Dark Mode

**On macOS**:
- System Settings → Appearance → Dark

**On iOS**:
- Settings → Display & Brightness → Dark

**On Windows**:
- Settings → Personalization → Colors → Dark

**Browser DevTools**:
- Chrome: DevTools → Rendering → Emulate CSS media feature `prefers-color-scheme`
- Firefox: DevTools → Settings → Enable dark mode

**Instant Update**: No page refresh needed when switching modes!

---

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

