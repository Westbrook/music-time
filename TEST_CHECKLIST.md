# Manual verification checklist

This is a procedure, not proof of completed validation. Begin with unchecked
items and record **Pass**, **Fail**, or **Not run** for each section, noting
individual exceptions. Repeat for each browser/OS/device combination evaluated;
unavailable or unchecked tests are not passes.

Serve the app using [Run locally](README.md#run-locally), and run the separate
[automated checks](CONTRIBUTING.md#automated-checks). Synthetic events and audio
doubles cannot certify native key defaults, screen readers, audible quality,
touch hardware, or browser/OS suspension.

## Results record

Copy for each environment; attach observations or issue links.

| Field                                               | Result |
| --------------------------------------------------- | ------ |
| Revision, including uncommitted changes             |        |
| Date, time, and timezone                            |        |
| Browser and version / OS and version                |        |
| Device, input devices, audio output                 |        |
| Assistive technology and version / enabled settings |        |
| Section or check / Pass, Fail, or Not run           |        |
| Notes, reproduction steps, evidence or issue links  |        |

## 1. Safe setup

- [ ] Use a disposable browser profile and isolated local origin for storage
      failure, conflict, or destructive experiments. Never clear or edit real
      practice history. Keep the same origin for persistence checks: a different
      host or port has separate storage.
- [ ] Load the app. All five feature sections and their assets load, with no
      audio on load or unexpected runtime errors. Set a comfortable audio level.

## 2. Practice and persistence

- [ ] Start, Pause, wait, and Start again. Only running time accrues. Start is
      disabled while running, Pause while paused, and Done until positive elapsed
      time exists.
- [ ] Accumulate at least 60 seconds of running time. Today and the seven-day
      total include the active session, even while paused. History displays whole
      minutes, so shorter practice need not visibly add a minute.
- [ ] Choose Done: history retains the saved total, the timer returns to
      `00:00:00`, and Done disables. This is **Done**, not discard/reset.
- [ ] Reload a running session after a short wait: it resumes and includes time
      since its checkpoint, including time away. Finish it, then separately reload
      a paused session: its time stays unchanged until Start. Finish that session.
- [ ] Hide/restore a running page and navigate away/back. The clock catches up
      without appearing to accelerate. Completed totals survive reload on the
      same origin when storage is available.
- [ ] At a full active hour, Still working? appears with a 15:00 countdown. Confirm
      before expiry: elapsed time stays intact and the next check is at the next
      session hour. Pause acknowledges a check; Done/Done for now before expiry
      saves actual elapsed time.
- [ ] Leave a check unanswered: the timer and audio stop, and history keeps only
      time through the triggering hour. Reload during grace and reopen after
      expiry: the original deadline holds. A closed/suspended page catches expiry
      when it runs again. Use [check-in fixtures](tests/check-in.test.mjs) for
      accelerated deadline, midnight, and DST checks; record real suspension
      behavior separately rather than treating fixtures as browser evidence.

## 3. History and rings

- [ ] Seven local calendar dates appear, newest first, including zero totals;
      Today and Yesterday labels match the local date.
- [ ] Hover or keyboard-focus a day's **…** control (always visible on touch).
      Open it: the dialog identifies the date and recorded hours/minutes/seconds.
      Save a correction including fractional seconds; only that day's total
      changes and survives reload. Other days retain their recorded values.
- [ ] Clear day sets the draft to zero without saving. Cancel or Escape preserves
      recorded time; Clear then Save removes it. Empty fields count as zero on
      Save; leaving all fields empty clears the selected day. Invalid or negative
      drafts show an error without closing. While a session is running or paused,
      the editor requests Done before enabling corrections.
- [ ] Check the seconds ring and minute rollover during a short run. The legend
      describes seconds/minutes/hours from inside out: 60 seconds, 60 minutes,
      and 8 hours. There is no days ring. Hours stay full at 8 while smaller units
      repeat; elapsed text never caps.
- [ ] Today's history has minutes (60) and hours (8); the seven-day total has
      minutes (60), hours (24), and completed 24-hour days (7), from inside out.
      Minutes and weekly hours repeat; Today hours and weekly days stay full at
      their limits. Text totals remain uncapped. These are display scales, not
      practice goals or counts of dates practiced.
- [ ] If a real local-midnight run is available, check idle/paused date rollover
      and running allocation to both days. Otherwise record Not run. Use
      [calendar](tests/calendar.test.mjs), [rendering](tests/rendering.test.mjs),
      and [control](tests/controls.test.mjs) test fixtures for midnight, DST,
      multi-day, and ring boundaries; do not wait 24 hours or alter real history.

## 4. Numeric controls and tuning

- [ ] Move the tempo slider and enter whole BPM values from 40–240. Slider,
      number field, displayed BPM, and audible tempo agree.
- [ ] While playing, leave blank, fractional, or out-of-range BPM/meter drafts
      uncommitted: the prior valid setting stays active. Enter, blur, or change
      commits by rounding/clamping finite numbers; blank/invalid text restores the
      last valid value. Try BPM `123.6` → `124`, `999` → `240`, `1` → `40`;
      meter `2.6` → `3`, `0` → `1`, `99` → `16`.
- [ ] Enter in either tempo/meter field commits both drafts and toggles the
      metronome once without reloading. Holding Enter does not toggle repeatedly.
      Stop still works with an invalid draft. Activate both audio forms' Start/Stop
      buttons with Enter/Space and confirm they toggle only their own sound.
- [ ] Try meters 1, 3, and 16. Dots match and beat one is accented. A changed
      meter restarts on a downbeat; committing the same value again does not.
- [ ] Start/stop the tuning tone and change notes/octaves. Labels and frequency
      agree (A4 is 440 Hz). Adjust all three volumes: whole-percentage labels
      agree, and 0% is silent. Try each chord waveform on sustained and new notes.

## 5. Piano input and cancellation

Use a physical keyboard and real pointer/touch devices for native behavior.

- [ ] Tab/Shift+Tab pass through one note per keyboard, not all 24. Left/Right
      move chromatically; Home/End reach C3/B4 without sound. Focused keys scroll
      into view on narrow keyboards.
- [ ] Hold: click/tap or Enter/Space toggles once; key repeat does not repeatedly
      toggle. Multiple notes can stay on, and toggling one off leaves others on.
- [ ] Momentary: Enter/Space or primary pointer press plays until release. Repeat
      and the pointer's following click do not restart it. Releasing outside the
      key ends its captured press.
- [ ] Use pointer plus keyboard or two touches on one Momentary note: it plays
      until the last owner releases. Try separate notes with multiple touches.
      Secondary mouse buttons do not start notes; primary release while another
      mouse button stays down still stops its note.
- [ ] Move keyboard focus, switch windows, and hide the page during Momentary
      playback. Key-focus loss releases that key's keyboard press but preserves
      a separate pointer owner; window blur/hiding clears all Momentary notes.
      Intentional Hold notes remain unless audio is interrupted.
- [ ] Pan a narrow keyboard horizontally and pinch to zoom on touch hardware.
      Gesture cancellation must not leave a stuck note or accidentally latch Hold.
- [ ] Click-only assistive activation of Momentary plays a brief audition (about
      300 ms). A normal press replacing it is not cut off by the old audition.
- [ ] Escape from either piano group, waveform selector, chord volume, or Stop
      button clears both keyboards without stopping timer, tuner, or metronome.
      Waveform/volume and focus stay unchanged. Escape in other cards leaves chord
      notes playing. Stop chord notes remains usable when silent.

## 6. Real-device audio and lifecycle

- [ ] Start each audio feature by user action and play them together. Stopping
      one leaves the others playing. Listen for metronome accents, a steady tone,
      and clean attacks/releases; record audible defects rather than inferring
      quality or timing accuracy from automated tests.
- [ ] With the timer running and audio active, Pause silences all tools and clears
      active keys/beat indicators. Start restores only the previously active
      tools and Hold notes, with their saved settings, replacing edits made during
      the break. Momentary keys/auditions stay released; the metronome starts on a
      downbeat. Repeat with only some tools active and with a quick Pause/Start.
- [ ] Done from running or paused stops all sound and clears chord selection and
      remembered playback. Start a new session: it stays silent and selected
      settings remain unchanged. A failed Done save must also leave audio stopped.
- [ ] Rapidly start/stop/restart tones and notes, including an immediate release
      on first activation. Cancelled starts must not play later; old releases must
      not cut off new presses. Metronome Stop clears queued beats/indicators.
      Returning from delayed/background activity must not burst overdue clicks.
- [ ] Try available device interruptions, such as lock/unlock or an audio-route
      change, and record actual behavior. If the context is interrupted, sound
      stops, controls reset, and a notice requests explicit restart. The timer
      remains independent; background audio is browser-dependent, not guaranteed.
- [ ] Navigate away/back with audio playing: it stops and does not restart until
      another user action. If startup is blocked/unavailable, a notice explains
      the failure and the timer stays usable. Record unreproducible failure paths
      as Not run; [audio tests](tests/audio.test.mjs) cover deterministic failures.

## 7. Layout and accessibility

- [ ] Check light/dark appearance at 320px, tablet, and desktop widths. The page
      has no horizontal overflow; narrow piano containers scroll. Labels, hints,
      notices, controls, and 16 beat dots remain readable.
- [ ] Check reflow and control access at 200% zoom; check reduced motion and
      forced colors using browser/OS settings. Focus and active states remain
      usable. Record unavailable modes as Not run.
- [ ] Tab through every control. Focus is visible on sliders, fields, buttons,
      and white/black piano keys, active or inactive. Native button/slider
      keyboard actions work. The day editor keeps modal focus within its controls;
      Cancel/Escape and Save return focus to the opening day's button.
- [ ] With a screen reader, check named sections, distinct field/volume labels,
      input hints/invalid drafts, the seven-item history list, and both piano
      groups. Hold names stay stable while pressed state changes.
- [ ] Confirm timer start, pause, successful Done, and error notices are announced
      appropriately; seconds, rings, and beats do not chatter. Failed Done never
      announces success. Record assistive technology and interaction mode;
      DOM inspection alone does not complete this check.
- [ ] The hourly banner and timeout result are announced without reading every
      countdown tick. Its buttons and the day editor remain usable at narrow
      widths, 200% zoom, and in light/dark and forced-color modes.

## 8. Storage safety and offline boundaries

Use disposable data only. Prefer deterministic storage tests when failures cannot
be reproduced safely; do not inject arbitrary storage values or fill a real
profile's quota.

- [ ] Where settings allow temporary storage blocking, attempt Done: a visible
      notice preserves the paused, unsaved session. Restore access and retry:
      it saves once, without double-counting. Keep the page open while unsaved;
      browser unload warnings are not guaranteed.
- [ ] Repeat a blocked save for check-in expiry and a day correction: the expired
      hour stays paused for Done retry; the correction draft stays open for Save
      retry. Restoring storage saves each once. Use [editor tests](tests/daily-editor.test.mjs)
      for deterministic invalid drafts, failed writes, and missed cross-tab changes.
- [ ] On an isolated origin, start a session in one tab, open another, and pause
      it there. The stale tab pauses, reports a conflict, and blocks Start/Done
      instead of overwriting the other tab. Record unsaved local time before
      reloading: reload replaces this tab's state with the saved record and can
      discard that unsaved time. Competing sessions are not merged. This is
      defensive detection, not concurrent-writer support; normal use is one timer
      tab.
- [ ] Consult [practice tests](tests/practice.test.mjs) for malformed records,
      migrations/backups, unsupported versions, read/write failures, and missed
      conflicts. Do not claim these were manually verified without a separate
      disposable-data run and recorded evidence.
- [ ] After loading completes, disconnect the network or stop the local server.
      Timer, local history, and audio controls remain usable subject to browser
      storage/audio policies. There is no service worker or offline reload
      guarantee; cached reopening is not a required pass condition.

After testing, stop audio, finish disposable sessions, close extra test tabs, and
restore changed settings. Attach results and explicitly report remaining Not run
items instead of claiming blanket browser or accessibility coverage.

## Focused verification — 2026-09-11

Codex in-app browser on macOS, desktop dark appearance: the check-in banner and
native editor rendered correctly. A disposable origin verified confirmation,
countdown expiry (one hour saved, 15-minute grace excluded), daily correction,
and persistence after navigation. Editor opening focused Hours; Escape and Save
returned focus to the day's ellipsis. The Progress Report link appeared only on
the flagged preview. Existing practice history was not edited during verification.

`npm run check` passed, including all 311 automated tests. Mobile devices,
screen-reader speech, forced colors, zoom, and real-device audio were not rerun
for this change; the broader checklist above remains available for those checks.
