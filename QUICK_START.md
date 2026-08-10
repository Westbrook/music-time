# Quick Start Guide

## Running the Application

### Option 1: Direct File Open
1. Navigate to the project folder
2. Double-click `index.html`
3. Your default browser will open the application

### Option 2: Local Web Server (Recommended)

**Using Python 3:**
```bash
python3 -m http.server 8000
```
Then open: http://localhost:8000

**Using Node.js:**
```bash
npx serve .
```

**Using PHP:**
```bash
php -S localhost:8000
```

## Features Overview

### 🎯 Practice Timer
- **Start**: Begin timing your practice session
- **Pause**: Temporarily stop the timer (can be resumed)
- **Reset**: Stop the timer and save the session to history

**Tip**: The timer automatically saves your progress if you refresh the page!

### 📊 Practice History
- **Today**: Total practice time for the current day
- **7-Day Total**: Rolling week total
- **Last 7 Days**: Daily breakdown showing your practice consistency

**Note**: All data is stored locally in your browser. No account needed!

### 🎵 Metronome
- **BPM**: Adjust tempo from 40-240 using slider or number input
- **Beats per Measure**: Set time signature (1-16 beats)
- **Visual Indicator**: Watch the beat dots pulse in sync
- **Accent**: First beat of each measure has a higher pitch

**Tip**: The metronome uses Web Audio for precise timing!

### 🎼 Tuning Tone
- **Default**: F3 (174.61 Hz) - common trombone tuning note
- **Note Selection**: Choose any note from C to B
- **Octave Selection**: Octaves 2-5 available
- **Volume**: Adjustable from 0-100%

**Tip**: Use this as a reference pitch for tuning exercises!

## Browser Requirements

Works best with:
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

Requires:
- Web Audio API (for metronome and tone)
- LocalStorage (for practice history)
- JavaScript enabled

## Keyboard Shortcuts

Most controls are keyboard accessible:
- **Tab**: Navigate between controls
- **Space/Enter**: Activate buttons
- **Arrow Keys**: Adjust sliders and number inputs

## Mobile Usage

The interface is fully responsive and touch-friendly. All features work on:
- iOS Safari
- Chrome for Android
- Firefox Mobile

## Troubleshooting

### No sound from metronome or tone?
- Make sure your device isn't muted
- Check browser permissions for audio
- Try clicking the button again (some browsers require user interaction to start audio)

### Practice history not saving?
- Check if your browser allows localStorage
- Some private/incognito modes block localStorage
- Try a different browser or normal (non-private) window

### Timer doesn't resume after refresh?
- This is expected if you clicked Reset before refreshing
- Only actively running sessions are auto-restored
- Data is saved when you click Reset

### Metronome timing seems off?
- Close other audio-heavy tabs
- Check CPU usage (high load can affect timing)
- Try a lower BPM to verify accuracy

## Privacy & Data

- **No tracking**: No analytics, no cookies, no third-party scripts
- **Local-only**: All practice data stays on your device
- **No server**: No data is ever sent to a server
- **No account**: No sign-up, no email, no login required

## Tips for Best Results

1. **Practice Timer**: Start the timer when you begin, pause for breaks, reset when done
2. **Daily Goals**: Check the 7-day history to track consistency
3. **Metronome**: Start slow and gradually increase BPM as you improve
4. **Tuning Tone**: Use headphones for best reference pitch clarity

## File Structure

```
trombone-practice-timer/
├── index.html          # Main HTML structure
├── styles.css          # All styling and responsive design
├── script.js           # Application logic (stopwatch, metronome, etc.)
├── README.md           # Full documentation
├── QUICK_START.md      # This file
└── TEST_CHECKLIST.md   # Validation testing guide
```

## Customization

The application is built with vanilla JavaScript, so it's easy to customize:

- **Colors**: Edit CSS custom properties in `styles.css` (`:root` section)
- **BPM Range**: Change `MIN_BPM` and `MAX_BPM` in `script.js`
- **Storage Duration**: Modify `DAYS_TO_KEEP` constant in `script.js`
- **Default Settings**: Change initial values in HTML or JavaScript

## Next Steps

1. **Test the features**: Try each section to get familiar
2. **Set a practice goal**: Use the history to track progress
3. **Explore the code**: All code is commented and well-structured
4. **Report issues**: Check the implementation for any edge cases

---

**Happy practicing! 🎺**

For detailed documentation, see [README.md](README.md)
For testing validation, see [TEST_CHECKLIST.md](TEST_CHECKLIST.md)

