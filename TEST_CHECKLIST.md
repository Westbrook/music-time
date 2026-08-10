# Testing Checklist for Trombone Practice Timer

## Pre-Flight Check
- [ ] Open `index.html` in a modern browser (Chrome, Firefox, Safari, Edge)
- [ ] Open browser console (F12) and check for any errors
- [ ] Verify no warnings about missing files or resources

## 1. Practice Stopwatch Tests

### Basic Functionality
- [ ] Click **Start** → stopwatch begins counting
- [ ] Verify **Start** button is disabled when running
- [ ] Click **Pause** → stopwatch pauses at current time
- [ ] Verify **Pause** button is disabled when paused
- [ ] Click **Start** again → stopwatch resumes from paused time
- [ ] Click **Reset** → stopwatch returns to 00:00:00
- [ ] Verify **Reset** is disabled when stopwatch is at 00:00:00

### Persistence
- [ ] Start the stopwatch and let it run for ~10 seconds
- [ ] Refresh the page (F5) → stopwatch should resume automatically
- [ ] Click **Reset** → verify completed time is added to practice history
- [ ] Start stopwatch, close tab, reopen `index.html` → session should be restored

### Display Format
- [ ] Verify time displays as HH:MM:SS (e.g., 00:15:30)
- [ ] Let run for over 1 minute → verify minutes increment
- [ ] Let run for over 1 hour → verify hours increment

## 2. Practice History Tests

### Daily Totals
- [ ] After resetting stopwatch, verify "Today" total updates
- [ ] Verify "7-Day Total" includes today's practice
- [ ] Check "Last 7 Days" list shows today with correct duration

### Data Persistence
- [ ] Reset stopwatch after 30 seconds of practice
- [ ] Refresh page → verify today's total persists
- [ ] Close and reopen browser → verify data still exists

### Daily Breakdown
- [ ] Verify "Last 7 Days" shows all 7 days (even if 0 minutes)
- [ ] Verify "Today" appears at the top of the list
- [ ] Verify each day shows date label (Today, Yesterday, or weekday/date)

### Edge Cases
- [ ] Practice across midnight (if testing spans two days) → verify new day starts fresh
- [ ] Check that days older than 7 days would be expired (can simulate by manually editing localStorage)

## 3. Metronome Tests

### Basic Functionality
- [ ] Click **Start Metronome** → hear audible clicks
- [ ] Verify button changes to **Stop Metronome** (red)
- [ ] Verify beat indicators appear and pulse with each beat
- [ ] Verify first beat (beat 1) has a higher pitch accent
- [ ] Click **Stop Metronome** → clicks stop, indicators clear

### BPM Control
- [ ] Drag BPM slider → verify display updates in real-time
- [ ] Type a value in BPM input → verify slider and display update
- [ ] Try BPM = 40 (slowest) → verify tempo is slow
- [ ] Try BPM = 240 (fastest) → verify tempo is fast
- [ ] Try entering 300 in input → verify it clamps to 240
- [ ] Try entering 20 in input → verify it clamps to 40

### Beats Per Measure
- [ ] Change "Beats per measure" to 3 → verify 3 beat indicators appear
- [ ] Start metronome → verify accent on beat 1 every 3 beats
- [ ] Change to 6 → verify 6 indicators and pattern updates
- [ ] Try 1 → single beat with accent every time
- [ ] Try 16 → verify 16 beats display

### Timing Accuracy
- [ ] Set BPM to 60 (1 beat per second)
- [ ] Start metronome and count along for 10 seconds
- [ ] Verify timing is consistent and doesn't drift

## 4. Tuning Tone Generator Tests

### Basic Functionality
- [ ] Click **Start Tone** → hear a steady tone
- [ ] Verify button changes to **Stop Tone** (red)
- [ ] Click **Stop Tone** → tone stops smoothly (no click/pop)

### Note Selection
- [ ] Default should be **F3** at **174.61 Hz**
- [ ] Change note to **A** → verify display updates to A3 and ~220.00 Hz
- [ ] Change octave to **4** → verify display updates to A4 and 440.00 Hz
- [ ] Try different note/octave combinations → verify frequency updates
- [ ] While tone is playing, change note → verify frequency changes smoothly

### Volume Control
- [ ] Start tone at default volume (50%)
- [ ] Drag volume slider to 100% → tone gets louder
- [ ] Drag to 0% → tone becomes silent
- [ ] Verify volume display shows correct percentage

### Audio Quality
- [ ] Listen for smooth start (no click or pop)
- [ ] Listen for smooth stop (no click or pop)
- [ ] Verify tone is a clean sine wave (smooth, not buzzy)

## 5. User Interface & Experience Tests

### Responsive Design
- [ ] Resize browser window to mobile width (~375px) → verify layout adapts
- [ ] Verify all controls are still accessible and readable
- [ ] Check that cards stack vertically on narrow screens
- [ ] Resize to tablet width (~768px) → verify grid layout
- [ ] Resize to desktop width (>1200px) → verify cards spread across screen

### Touch & Keyboard Accessibility
- [ ] Tab through all controls → verify logical tab order
- [ ] Verify visible focus indicators on all interactive elements
- [ ] Press Enter/Space on focused buttons → verify they activate
- [ ] Use arrow keys on sliders → verify they adjust values
- [ ] Test on touch device (if available) → verify all controls are touch-friendly

### Visual Design
- [ ] Verify color scheme is aesthetically pleasing
- [ ] Check that text is readable against backgrounds (sufficient contrast)
- [ ] Verify focus states are clearly visible
- [ ] Check that disabled buttons appear visually distinct

### Reduced Motion
- [ ] Enable "Reduce motion" in OS settings
- [ ] Reload page → verify animations are minimal/disabled
- [ ] Verify functionality still works without animations

## 6. Performance & Offline Tests

### Performance
- [ ] Monitor CPU usage (Task Manager / Activity Monitor) while metronome runs
- [ ] Verify no significant performance degradation over 5+ minutes
- [ ] Check browser console for memory leaks or warnings

### Offline Functionality
- [ ] With page loaded, disconnect from internet (or stop local server)
- [ ] Verify all features still work (stopwatch, metronome, tone, history)
- [ ] Close and reopen browser (cache should serve files)

## 7. Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (macOS/iOS)
- [ ] Edge

Verify in each:
- Web Audio works (metronome and tone)
- LocalStorage works (practice history persists)
- UI renders correctly

## 8. Error Handling & Edge Cases

### Browser Feature Detection
- [ ] Open browser console
- [ ] Check for appropriate warnings if features are unavailable
- [ ] Verify app doesn't crash if localStorage is blocked

### Invalid Input
- [ ] Try entering non-numeric values in BPM input → verify graceful handling
- [ ] Try negative numbers in beats per measure → verify clamping
- [ ] Try very large numbers → verify limits are enforced

### Concurrent Audio
- [ ] Start metronome, then start tone → both should play simultaneously
- [ ] Stop metronome while tone is playing → tone continues
- [ ] Start multiple instances in different tabs → verify independent operation

## Success Criteria

All checkboxes should be ticked (✓) for a successful validation.

If any feature fails, note the issue and browser/OS details for debugging.

