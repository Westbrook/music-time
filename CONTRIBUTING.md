# Development and verification

This is the developer guide for the current application. For setup without
development tools and everyday use, see the [user guide](README.md). For physical
browser/device checks, use the [manual checklist](TEST_CHECKLIST.md).

Node and npm are needed only for development checks; no dependency, compiler, or
bundler is loaded by the browser.

## Automated checks

Use Node 24.16.0, recorded in [.nvmrc](.nvmrc), then install the locked development
tools from the project directory:

```sh
npm ci --ignore-scripts
npm run check
```

`npm run check` runs ESLint, TypeScript's JavaScript checks, Prettier, and the test
suite. The same command runs on pushes and pull requests in the
[quality workflow](.github/workflows/quality.yml). The workflow has read-only repository permissions
and does not deploy the application.

Other useful commands:

| Command                | Purpose                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| `npm test`             | Run the deterministic application tests                          |
| `npm run lint`         | Check JavaScript and test code                                   |
| `npm run typecheck`    | Check browser API and application types without generating files |
| `npm run format:check` | Check formatting without modifying files                         |
| `npm run format`       | Apply the shared formatting rules                                |

To run one area, use a test file directly, for example
`node --test tests/controls.test.mjs`. The commands and locked development
dependencies are defined in [package.json](package.json) and
[package-lock.json](package-lock.json).

## Application structure

[index.html](index.html) owns semantic markup and user-visible labels.
[styles.css](styles.css) owns theme tokens, shared controls/card layouts, responsive
rules, and preference overrides. [script.js](script.js) is one private IIFE,
initialized on `DOMContentLoaded`; it does not expose its modules as public APIs.

| Component in `script.js`                      | Responsibility                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| Calendar and formatting helpers               | Local date keys, bounded day allocation, exact duration arithmetic, display strings |
| `StorageManager`                              | Validate/migrate data, preserve originals, detect conflicts, and commit writes      |
| `Stopwatch`                                   | Own session transitions, capture time, checkpoint data, and schedule lifecycle work |
| `StopwatchView` / `PracticeHistory`           | Render a shared snapshot through cached elements and date-keyed rows                |
| `PracticeCheckInView` / `DailyTimeEditor`     | Render hourly check-ins and validate selected-day correction drafts                 |
| `AudioEngine`                                 | Own shared audio readiness, voice cleanup, interruptions, and teardown              |
| `PracticeAudio`                               | Capture and restore paused audio settings and playback; clear playback on Done      |
| `Metronome` / `TuningTone` / `ChordalStudies` | Own feature controls, playback intent, and scheduling/input state                   |
| `bindIntegerControl` / `bindVolumeControl`    | Apply one numeric-input policy across features                                      |

Keep feature changes within these boundaries. Changes to ranges, labels, storage
policy, or ring meaning also need the corresponding HTML, regression test, and
canonical documentation updates; changing a JavaScript constant alone is not a
complete feature change. Use shared CSS tokens/selectors rather than adding a
second competing theme or control rule.

## Test boundaries

The tests use Node's built-in test runner. `tests/helpers/app.mjs` loads the actual
[index.html](index.html) and [script.js](script.js) into an isolated jsdom window. It does not rewrite the
application source, export private objects, or add test hooks to production code.
Tests exercise controls and inspect rendered values, saved records, and audio
operations.

Each test owns its DOM, clock, storage, and audio contexts. Fake timers control
elapsed time and delayed callbacks; storage can reject reads/writes and simulate
changes from another tab; audio doubles model suspended/resumed contexts, a
monotonic audio clock, oscillator scheduling, and cleanup without producing sound.
The DOM starts visible and tests explicitly simulate hiding and restoring it.
Calendar tests set and restore the process timezone and run sequentially within their test file.
Keep Node's default process isolation between test files.

These are application behavior tests, not real-browser rendering or audio-quality
tests. They do not verify layout, actual audio envelopes, browser suspension,
screen readers, or touch hardware. Those require browser/device checks when the
corresponding UI and audio changes are made.

The helper does not synthesize native button activation: tests explicitly emulate
the default click only when key events are not prevented. Automation that sends
untrusted key events likewise cannot establish native Enter/Space behavior.
Keep that distinction when reporting verification results.

| Test file                                                | Coverage                                                                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------- |
| [practice.test.mjs](tests/practice.test.mjs)             | Sessions, validated storage, migration, failures, and conflicts             |
| [check-in.test.mjs](tests/check-in.test.mjs)             | Hourly deadlines, sleep/reload, rollback, audio cleanup, and failed saves   |
| [daily-editor.test.mjs](tests/daily-editor.test.mjs)     | Selected-day corrections, draft validation, session guards, and save safety |
| [calendar.test.mjs](tests/calendar.test.mjs)             | Local dates, midnight allocation, DST, and retained windows                 |
| [audio.test.mjs](tests/audio.test.mjs)                   | Shared readiness, timing, cancellation, and voice cleanup                   |
| [practice-audio.test.mjs](tests/practice-audio.test.mjs) | Timer/audio coordination, pause restoration, and completion cleanup         |
| [rendering.test.mjs](tests/rendering.test.mjs)           | DOM reuse, exact minute totals, and page lifecycle scheduling               |
| [controls.test.mjs](tests/controls.test.mjs)             | Numeric input, semantic controls, piano ownership, status, and rings        |
| [docs.test.mjs](tests/docs.test.mjs)                     | Relative documentation links and Markdown heading anchors                   |

## Regression expectations

Calendar, session, migration, persistence, audio, rendering, and control regressions
are enforced tests. No tests are skipped or marked TODO. Semantic accessibility
checks cover labels, native buttons, toggled states, quiet status messages, and
keyboard navigation; passing tests are not an accessibility certification or a
browser-support matrix. Treat the test runner's result as the current test count
rather than keeping a second count in documentation.

Rendering tests check observable work: retained node identities, DOM mutations,
element lookups, and checkpoint counts. They avoid machine-dependent runtime
thresholds. Extend behavior coverage when fixing a regression; do not convert a
failing test to TODO to make CI pass. Running-session reload behavior is a product
policy, so change its expectations only with an explicit policy decision.

## Session and storage rules

- The primary key is `trombonePracticeData`; the current schema version is 2.
  An empty record has this shape (not a command to replace existing data):

  ```json
  { "version": 2, "dailyData": {}, "activeSession": null }
  ```

- `activeSession: null` means idle. Otherwise the session has an explicit
  `running` or `paused` status, integer `elapsedMs`, per-date `dailyMs`, and a
  wall-clock checkpoint `timestamp`. Completed `dailyData` remains in seconds,
  including fractions; each day's fraction is preserved when a session finishes.
- Optional v2 fields `nextCheckInMs` and `checkIn` preserve hourly protection.
  `nextCheckInMs` is the next whole elapsed-hour threshold; the default is one hour.
  Pending `checkIn: { elapsedMs, dailyMs, timestamp }` freezes the exact hour's
  duration, allocations, and wall-clock trigger. Validate this metadata on restore.
  Older checkpoints already at or beyond one hour retain their accrued time and
  start checks at their next upcoming whole hour.
- Each active hour requires confirmation within 15 wall-clock minutes. Confirmation
  and Pause before expiry retain actual elapsed time and acknowledge the check;
  Done before expiry also retains actual elapsed time. At expiry, save only the
  frozen hour snapshot and stop audio. A failed save leaves that snapshot paused
  for retry without adding the grace period or double-counting.
- Running sessions catch up across a closed page or reload subject to the original
  check-in deadline. Closed/suspended pages enforce expiry when execution resumes;
  a late confirmation must not revive the session. Paused sessions do not accrue
  time, but their accrued practice remains visible in history.
  Actions and lifecycle checkpoints capture current time independently of the
  display interval. Backwards clock adjustments never subtract accrued time;
  forward wall-clock adjustments count as elapsed time.
- Calendar keys use local year/month/day. Allocation splits at actual local
  midnights, including 23- and 25-hour DST days. Only today and the prior six
  calendar dates are shown. Finalization expires older completed data; valid
  future-dated records are preserved but hidden, since timezone/clock changes can
  make an existing date temporarily appear to be in the future. Active allocation
  is bounded to the recent window while the total session duration is retained.
- Version 1 upgrades and malformed-record repairs preserve the exact original
  string under `trombonePracticeData.backup.<timestamp>` before replacing the main
  record. Colliding backup names get a suffix; existing backups are not replaced.
  Backup failure prevents the primary write. Unsupported schema versions are
  read-only. Backups are not automatically expired.
- Migration preserves existing completed date keys without guessing timezone
  corrections. Version 1 active sessions lack day/pause boundaries, so their
  existing elapsed time is assigned to the local date of their checkpoint; any
  running gap since that checkpoint is allocated normally. The recovery notice
  and original backup make this limitation explicit.
- Successful recovery confirmations are kept only in memory, so reload dismisses
  them. On an open page they expire when the latest recovered completed/session
  date leaves the seven-day history window, capped at seven local calendar days
  from decoding the original. Empty/unreadable repairs use that cap. The existing
  refresh schedule checks expiry without extra storage work or timers. Pending
  recovery warnings and errors do not expire, and backups remain untouched.
- Done pauses and snapshots the session, then writes completed totals and clears
  the checkpoint together in one primary-record write. The in-memory committed
  totals and timer reset change only after that write succeeds. Failure leaves a
  paused session available for retry, so repeated Done does not double-count it.
  Dirty paused checkpoints also retry on page hiding/unload. A failed unload save
  requests a browser warning, but browsers may suppress it; keep the page open
  when the storage notice reports unsaved practice.
- Day correction requires no running or paused session. On Save, normalize empty
  fields to zero; incomplete numeric input remains invalid. Validate nonnegative
  whole hours, minutes 0–59, seconds 0–59.999, and a safe integer-millisecond total. Clear
  changes the draft only; Save commits only the selected date (zero removes its
  record), retaining all other dates. Cancel/Escape never write. Save failures keep
  the draft open, and the usual backup/conflict/read-only rules still apply.
- Use one timer tab at a time. Storage events and comparison with the last
  observed raw record detect stale data, pause the local timer, and block further
  writes until reload. Unsaved local time stays visible for review. These checks
  are defensive conflict detection, not a guarantee for simultaneous writers.
  Reload replaces local state with the stored record and can discard unsaved
  time; there is no merge UI. Record that time before reloading, as described in
  [saved data and recovery](README.md#saved-data-and-recovery).

## Rendering and page lifecycle rules

- The stopwatch controller owns session transitions, clock capture, persistence,
  and lifecycle events. It captures one current time for each refresh and passes
  the same session/history snapshot to both views. Views neither advance the
  session nor read/write storage. Actions render the resulting state after the
  save attempt, including a synchronous conflict or failed completion.
- Timer elements and ring nodes are cached. The seconds ring retains its 100ms
  updates; the duration label changes only on whole seconds. Buttons update only
  when their enabled state changes, including Done for positive subsecond time.
  Progress circles use SVG `pathLength="1"`, so the shared renderer writes a
  clamped 0–1 dash offset without duplicating circle circumferences in JavaScript.
- Timer rings cycle seconds and minutes out of 60; whole hours fill to 8 and stay
  full. There is no timer days ring. Today's history cycles minutes out of 60 and
  caps whole hours at 8. The weekly total cycles minutes out of 60 and whole hours
  out of 24, with an outer ring for completed 24-hour days capped at 7. These days
  measure accrued duration, not dates with practice. Text totals never cap, and
  the visible legends explain that these scales are not practice goals.
- History rows are keyed by local date and reused, including overlapping dates
  after midnight. Date windows and localized labels rebuild only when the local
  day changes. Date-only labels use a cached UTC formatter so a changed system
  timezone cannot shift a label away from its date key.
- History sums seven integer-millisecond values on each visible snapshot. Only
  changed minute totals update duration text and statistic rings. Sum completed
  and active time before flooring minutes, and sum daily milliseconds before
  flooring the weekly total; fractions must not delay a minute boundary.
- Hidden pages stop painting but retain five-second running-session checkpoints.
  Those checkpoints also enforce check-in expiry.
  Visible idle/paused pages check the calendar at the next local midnight, with
  a maximum one-minute recheck interval for clock/timezone changes. These checks
  do not accrue paused time or write storage.
- Focus and visibility restoration ordinarily refresh without saving; crossing a
  check-in boundary persists its snapshot, and an expired deadline finalizes it.
  Actions check expiry before applying their own state change. Page hiding for
  navigation (`pagehide`) checkpoints and cancels timer/calendar callbacks;
  `pageshow` catches up and restores only the required timers, without duplicates.
  Reload preserves pending deadlines, and audio does not auto-restart.

## Audio lifecycle and timing rules

- Timer Pause captures feature settings, playback intent, and Hold pitches before
  stopping all tools with their normal short releases. Start consumes that
  in-memory snapshot only if the timer remains running after its storage check;
  a synchronous conflict must not restart sound. A fresh Start leaves independent
  audio untouched. Done and check-in expiry stop all tools and discard the snapshot before saving,
  including on save failure; it preserves selected settings. No audio state is
  persisted with practice history.
- Restoring a pause replaces changes made during the break and starts the
  metronome on a downbeat. Hold notes restart through the normal voice lifecycle.
  Momentary notes and auditions remain released; their pointer/keyboard ownership
  must never be recreated from a saved snapshot.
- All audio features share one lazily created context. A user action creates or
  resumes it; no voices are allocated until it is running. Concurrent starts
  share one resume request. Button generations and per-key request identities
  prevent stopped, released, or superseded requests from playing later.
- Startup failures and audio interruptions appear in the page's audio status
  notice. An interrupted context stops all voices and resets controls; playback
  requires another user action. The practice timer and storage remain independent.
- Every voice owns its oscillator and gain. Releases cancel/hold pending gain
  automation, ramp to zero, and schedule oscillator stop on the audio clock.
  The ended callback disconnects that exact voice, never a replacement voice.
  Browsers without `cancelAndHoldAtTime` use cancellation plus the current gain.
  See the [Web Audio stop contract](https://www.w3.org/TR/webaudio-1.0/#dom-audioscheduledsourcenode-stop)
  and [gain automation cancellation](https://www.w3.org/TR/webaudio-1.0/#dom-audioparam-cancelandholdattime).
- Metronome Stop cancels the scheduling timer, queued clicks, and indicator
  callbacks. Delayed callbacks skip overdue beats arithmetically while preserving
  the beat phase; they never replay missed beats in a burst. Meter edits restart
  on the new downbeat. Zero-volume clicks schedule no positive gain.
- Momentary notes track independent pointer IDs and Enter/Space ownership; only
  the last owner releasing a note stops it. Pointer capture retains the press
  outside the key; pointer-up/cancel, lost capture, and primary-button release
  during a multi-button mouse gesture all clean up. Keyboard focus loss releases
  that key's keyboard ownership, while window blur or a hidden page clears all
  momentary notes. Hold keys remain toggled until activated again or explicitly
  stopped. Blur/hiding does not stop intentional hold, tuning, or metronome
  playback unless the browser also interrupts audio.
- Leaving the page (`pagehide`) cancels all pending starts, immediately silences
  and disconnects all voices, and closes the context. Returning from browser
  history does not restart sound; another user action creates a fresh context.
- Automated tests verify scheduling and lifecycle contracts, not audible quality
  or every browser's autoplay/background policy. Use a real device to check
  attack/release sound, mobile touch cancellation, and operating-system audio
  interruptions before claiming cross-browser or hardware coverage.

## Control and accessibility rules

- `bindIntegerControl` is the shared tempo/meter policy. In-range integers apply
  on input without rewriting the draft. Other drafts set `aria-invalid` and leave
  playback unchanged. Change, blur, and Enter round/clamp a finite number or
  restore the last valid setting, then synchronize the displayed value. Parse the
  complete number (`valueAsNumber`), not an integer prefix. Unchanged meter commits
  must not rebuild beat dots or restart the scheduler.
- Metronome and Tuning Tone cards are named forms with submit buttons. Their
  submit handlers prevent navigation and toggle playback once. Metronome uses
  `novalidate` so submission can apply the shared numeric normalization policy to
  both drafts; Stop silences playback before committing a changed meter. Numeric
  Enter requests submission once, ignoring repeat and composition. Other form
  controls retain native keyboard behavior.
- `bindVolumeControl` normalizes all three sliders to whole percentages, keeps
  their labels and `aria-valuetext` synchronized, and skips duplicate audio
  updates. Tuning and waveform selections are validated before reaching audio
  nodes; unsupported values restore the last valid selection.
- Render note keys as native buttons in chromatic order. A roving Tab stop keeps
  each keyboard one stop in the page; arrows/Home/End move focus without sound.
  Pointer focus does not scroll the page, while keyboard focus brings off-screen
  keys into view. CSS keeps keys at their natural size with horizontal scrolling,
  rather than JavaScript resize listeners or transforms.
- Hold uses native click activation and a stable name with `aria-pressed`.
  Enter/Space repeat cannot toggle it repeatedly. Momentary handles keydown/up
  explicitly and prevents the duplicate native click. Pointer-origin clicks do
  not replay a released note; click-only assistive activation gets a 300ms
  audio-clock audition. Its captured ended callback cannot clear a newer press.
  Auditions snapshot settings to preserve their scheduled release envelope.
- Escape is scoped to the Chordal Studies card, including both keyboards, waveform
  selector, volume slider, and Stop button. It activates the always-enabled Stop
  chord notes button to cancel both keyboards and pending starts without changing
  settings or affecting practice, tuning, or metronome. It uses an explicit key
  handler, not form reset; do not intercept Escape outside this card.
- Decorative SVGs and beat indicators are hidden from assistive technology. The
  timer has `aria-live="off"`; only state transitions update its separate status
  region. A failed Done must never announce a successful save. Actions whose
  names change between Start and Stop do not also need toggle semantics; see the
  [WAI button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/).
- Touch panning is controlled by CSS `touch-action: pan-x pinch-zoom`, not legacy
  touch handlers. Pointer cancellation must release sound when the browser takes
  over a gesture; see the [Pointer Events contract](https://www.w3.org/TR/pointerevents3/).

The [manual checklist](TEST_CHECKLIST.md) owns browser, physical-keyboard, audio,
touch, and screen-reader procedures. Record the environment and actual result;
an unchecked procedure is not evidence of a pass. Use disposable profiles/origins
for failure and multi-tab experiments, never a user's real saved practice.

## Type and formatting scope

JSDoc types in `script.js` describe storage, DOM elements, audio nodes, and keyboard
state. `types/browser.d.ts` declares the existing WebKit audio fallback. TypeScript
checks this browser code with no output and no Node globals. Strict mode is not
enabled; further type hardening is separate from these behavior changes. Types
do not replace runtime validation of saved data.

Prettier covers application code, tests, configuration, and all maintained
documentation. [.prettierignore](.prettierignore) excludes only generated/vendor
directories and the three preserved historical record files described below.

## Documentation maintenance

- [README.md](README.md) is the user-facing source for running the app, control
  behavior, storage precautions, and troubleshooting.
- This guide owns developer setup and invariants. [TEST_CHECKLIST.md](TEST_CHECKLIST.md)
  owns manual procedures and the results template; do not copy checkboxes into
  implementation summaries as proof of validation.
- [CHANGELOG.md](CHANGELOG.md) records concise user/maintainer-visible changes.
  Keep unshipped work under Unreleased; an app release label and a storage schema
  version are different things.
- The [historical archive](docs/archive/README.md) preserves earlier notes below
  explicit archive banners. Its code examples, version labels, checked boxes,
  and quality claims are not current contracts. Keep those bodies unchanged;
  put corrections and current behavior in the maintained guides instead.
- The old Quick Start, Design Updates, and Implementation Summary entry points
  link to the maintained guides and archive. Keep these paths as pointers, not
  parallel copies of the instructions.
- `tests/docs.test.mjs` checks relative inline Markdown file links and heading
  fragments in root Markdown and `docs/`. Use standard ATX (`#`) headings and
  inline links; fenced examples are ignored. External URLs are not checked by CI
  and should be reviewed when their associated guidance changes.
