# Trombone Practice Timer

A local practice timer with seven-day history, a metronome, tuning tones, and chord
keyboards. The app uses plain HTML, CSS, and JavaScript: no build step, runtime
dependencies, account, or backend service.

## Run locally

From the project directory, start a static server with Python 3:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [the practice timer](http://127.0.0.1:8000/). Keep the server running while
loading or reloading the page; stop it with Ctrl+C. Any static server can serve
these files. Node and npm are only needed for [development checks](CONTRIBUTING.md#automated-checks).

For a quick try, you can open [index.html](index.html) directly. Use the server
for regular practice: browser storage behavior for `file:` URLs is not guaranteed.
See [MDN's localStorage guidance](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

Use a current browser with JavaScript and Pointer Events. Audio requires Web
Audio; saving requires localStorage. Audio restrictions do not disable the timer,
and storage problems are reported separately on the page. There are no polyfills;
older-version compatibility has not been verified.

## Publish to GitHub Pages

Use Node 24.16.0 and install development tools with `npm ci --ignore-scripts`.
`npm run build` creates a ready-to-publish `dist/` folder containing only
`index.html`, `styles.css`, `script.js`, and `.nojekyll`. It packages the static
files without compilation. Preview it with:

```sh
npm run build
python3 -m http.server 8001 --bind 127.0.0.1 --directory dist
```

Open [the packaged app](http://127.0.0.1:8001/). When ready to publish, run:

```sh
npm run deploy
```

This runs all quality checks, rebuilds `dist/`, and commits and pushes its contents
to the `gh-pages` branch of `origin` (`Westbrook/music-time`). It uses your existing
Git credentials and commit identity. The source checkout stays on its current
branch; the deployed files reflect the current working tree, including uncommitted
changes. Commit source changes separately to preserve their history.

After the first deployment creates the branch, open the repository's
[Pages settings](https://github.com/Westbrook/music-time/settings/pages) and choose
**Deploy from a branch → gh-pages → / (root)**, then **Save**. These are GitHub's
[branch publishing settings](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
The expected site address is [westbrook.github.io/music-time](https://westbrook.github.io/music-time/).
Later `npm run deploy` runs update that branch and trigger publication.

The build excludes development tools, documentation, and progress-report data.
Practice history stays in each browser: localhost history does not transfer to
the GitHub Pages address. See [saved data and recovery](#saved-data-and-recovery).

## Practice workflow

1. Choose **Start** to begin.
2. Choose **Pause** for a break; it stops the timer and all audio. **Start** resumes
   the same session and restores the remembered sounds.
3. Choose **Done** to save the session, stop all audio, clear remembered playback,
   and return the display to `00:00:00`.

There is no separate Reset button. Done becomes available for any positive
duration, including a session shorter than one displayed second.

When you switch to another browser tab, the page title shows elapsed session time,
such as `00:24:30 | Trombone Practice Timer`. Returning to the tab restores the
normal title. Paused time stays fixed; Done resets it to zero.

After each hour of active practice, a **Still working?** banner gives you 15 minutes
to choose **Yes, still practicing**. Confirming keeps the elapsed time; the next
check is at the next session hour. If time runs out, the session ends, all audio
stops, and only practice through the hour that triggered the banner is saved.
For example, an unanswered check at `01:00:00` saves one hour, excluding the
15-minute grace period. **Pause**, **Done**, or **Done for now** before the deadline
keeps the actual elapsed time; Pause also acknowledges that check.

Running sessions catch up on return, subject to that same deadline. A closed or
suspended page cannot finish until the browser runs it again, but reopening does
not restart the grace period. Paused sessions restore without accruing more time.

History includes the accrued active session, even while paused. It shows today
and the previous six local calendar days, splitting practice at local midnight.
History displays whole minutes: less than a minute appears as `0m`, without
discarding the saved seconds. The seven-day total is calculated before rounding
down, so it can exceed the sum of the individually rounded daily labels.

To correct a recorded day, finish the current session with Done, then use the
day's **…** button. It appears on hover or keyboard focus and stays visible on
touch devices. Edit hours, minutes, and seconds (up to three decimal places), then
choose **Save**. Empty fields count as zero. **Clear day** sets the draft to zero;
Save applies it. Cancel or Escape discards the draft. Only the selected day's
recorded total changes.

## Audio tools

- **Metronome:** 40–240 BPM, initially 120, with 1–16 beats per measure. The first
  beat is accented. Changing the meter restarts on a downbeat; Stop cancels queued
  clicks. Late callbacks skip missed beats instead of playing a catch-up burst.
- **Tuning Tone:** select C2–B5; the default is F3 at 174.61 Hz. The reference uses
  A4 = 440 Hz. Note changes and volume adjustments apply to a playing tone.
- **Chordal Studies:** two independent keyboards cover C3–B4, with sine, triangle,
  or square waveforms and a shared chord volume.

Start at a comfortable, low volume. Each audio tool has its own controls. The
timer's initial **Start** leaves those tools as they are. **Pause** remembers
which tools are playing, their tempo, meter, note, octave, waveform, volumes, and
the selected Hold chord notes, then stops all sound. **Start** restores that
snapshot, replacing any audio changes made during the break; the metronome
restarts on a downbeat. Momentary keys and brief auditions stay released.

**Done** stops all sound, clears selected chord notes, and discards the pause
snapshot, even if saving practice time fails. Chosen tempo, tuning, waveform, and
volume settings stay in place, but starting another session does not restart
audio. Audio snapshots are kept only in memory on this page; reloading does not
restore audio settings or playback.

### Chord keyboards

**Hold** toggles a note on or off when clicked, tapped, or activated.
**Momentary** plays while a pointer, Enter, or Space is held; releasing the last
input holding that note stops it.

| Control                       | Action                                                     |
| ----------------------------- | ---------------------------------------------------------- |
| Tab / Shift+Tab               | Move between page controls; each keyboard has one Tab stop |
| Left / Right                  | Move to the adjacent note without playing it               |
| Home / End                    | Move to the first / last note without playing it           |
| Enter / Space                 | Toggle a Hold note, or press/release a Momentary note      |
| Escape within Chordal Studies | Stop all chord notes, including pending starts             |

**Stop chord notes** also silences both keyboards without affecting the timer,
tuning tone, or metronome. Escape works from the waveform selector, chord volume,
and Stop button as well as either keyboard, without resetting settings. Outside
Chordal Studies, Escape keeps its normal meaning.

Click-only assistive activation of a Momentary key plays a brief 300ms audition.
That audition keeps its starting volume and waveform; the next note uses the
latest settings. A physical press can replace an audition and sustain the note.

Momentary notes release when the window loses focus or the page is hidden. Hold,
tuning, and metronome sound may continue in the background, subject to browser
policy. A browser audio interruption stops playback; start it again explicitly.
Leaving the page stops all audio, and returning does not automatically restart it.

## Inputs and ring displays

- Tempo and meter use whole numbers. Valid edits apply immediately. Blank,
  fractional, or out-of-range drafts leave the previous setting active until you
  press Enter or leave the field. Committing rounds and clamps a finite number;
  blank or invalid text restores the last valid setting.
- Metronome and Tuning Tone use forms: submitting starts or stops that sound
  without reloading the page. Enter in either tempo/meter number field commits
  both values and starts or stops the metronome once.
- All three volume controls use whole percentages from 0–100.
- Timer rings, inside out, show seconds out of 60, minutes out of 60, and whole
  hours out of 8. Seconds and minutes repeat; hours stay full at 8. There is no
  days ring, and elapsed-time text continues counting.
- Today's history has two rings: minutes out of 60 and whole hours out of 8.
  Minutes repeat each hour; the hours ring stays full at 8.
- The seven-day total has three rings: minutes out of 60, whole hours out of 24,
  and completed 24-hour days out of 7. Minutes and hours repeat at their limits;
  days stay full at 7. Text totals remain uncapped. These are duration display
  scales, not practice goals, counts of dates practiced, or streak indicators.

The interface follows light/dark preferences and includes visible keyboard focus,
reduced-motion styles, and forced-colors support. Narrow piano containers scroll
sideways while their keys retain their size. Timer announcements describe state
changes, not every tick. Device and assistive-technology checks are documented in
the [manual checklist](TEST_CHECKLIST.md), not implied by these features.

## Saved data and recovery

Practice data stays in browser localStorage; the app does not send it to a
service or include analytics, third-party scripts, or account sync.

Keep using the same browser profile and address. Storage is scoped to an
[origin](https://developer.mozilla.org/en-US/docs/Glossary/Origin)—scheme, host, and
port—so `localhost`, `127.0.0.1`, different ports, and HTTP/HTTPS do not share
history. Private-session data can disappear when that session ends, and clearing
site data removes saved practice.
[Browser storage behavior](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

The app checkpoints an active session periodically and on lifecycle events.
Saving is not guaranteed if the browser blocks storage or a write fails.

- **Save failed:** keep the page open. Done leaves the unsaved session paused and
  available for retry. Retry Done when storage works again; do not clear site
  data or reload as a first troubleshooting step. A failed automatic completion
  similarly keeps only the hour snapshot paused for retry. A failed day correction
  keeps its dialog open; retry Save.
- **Data changed in another tab:** this tab pauses and blocks stale writes.
  Record any unsaved local time outside the app and review both tabs before
  reloading. Reload replaces this tab's state with the saved record and can
  discard unsaved local time; the app does not merge competing sessions. Use one
  timer tab at a time; simultaneous writers are not supported.
- **Unrecognized saved-data version:** the app leaves it untouched and disables
  practice writes. Use a compatible app version rather than overwriting it.
- **Recovery notice:** upgrades or repairs retain a backup of the original saved
  record before replacing it. Existing history dates are not shifted. The
  successful confirmation clears on reload or when the affected dates leave the
  seven-day history window, no later than seven local calendar days after recovery
  is detected. Pending recovery warnings and save errors remain until resolved.

On successful completion, completed records older than the visible seven-day
window expire. Valid future-dated entries remain stored but hidden, since clock
or timezone changes can put an existing record in the future. Recovery backups
are not automatically expired. There is no export/import or backup-management UI;
local recovery copies are not a substitute for an independent backup. Developers
can find the exact schema and write rules in
[session and storage rules](CONTRIBUTING.md#session-and-storage-rules).

## Offline and troubleshooting

After its three local assets load, the page makes no further network requests
for practice features. An already loaded page can keep working without internet
access. There is no service worker or offline-cache guarantee: reloading or
reopening a served URL still requires the files to be available.

If sound does not start, check the tool's volume, device output, and visible audio
notice, then try its Start control again. Browser autoplay and background-audio
policies vary. If history looks empty, check the exact browser profile/address
before changing data, and remember that sub-minute totals display as `0m`.

## Development and documentation

The browser loads [index.html](index.html), [styles.css](styles.css), and
[script.js](script.js) directly. Development tools are separate from that runtime.

| Document                                     | Purpose                                                            |
| -------------------------------------------- | ------------------------------------------------------------------ |
| [CONTRIBUTING.md](CONTRIBUTING.md)           | Setup, automated checks, architecture, and maintenance contracts   |
| [TEST_CHECKLIST.md](TEST_CHECKLIST.md)       | Manual browser/device procedures and a results record              |
| [CHANGELOG.md](CHANGELOG.md)                 | Current unreleased changes and history navigation                  |
| [Historical archive](docs/archive/README.md) | Preserved older notes, not current specifications or test evidence |

## Use notice

This project is provided as-is for personal and educational use.
