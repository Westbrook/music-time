# Changelog

## Unreleased

This section describes the current maintenance work. It does not assign a new app
release number; storage schema version 2 is a data format, not a release label.

### Reliability and data

- Added a Still working? check after every active hour, with a 15-minute deadline.
  Unanswered checks end the session and save only through the triggering hour;
  the deadline survives reload and sleep, and failed saves keep that hour for retry.
- Preserved previously accrued time in older checkpoints, applying the first check
  at their next upcoming whole hour.
- Added deterministic regression tests, linting, JavaScript type checks, shared
  formatting, pinned development tools, and read-only CI checks.
- Validated and versioned stored data; preserved original records before upgrades
  or repairs and left unrecognized versions untouched.
- Expired successful recovery notices as affected dates leave the seven-day
  history window, with a seven-local-day limit; retained backups and unresolved
  recovery/save warnings.
- Corrected local-calendar/DST allocation, fractional totals, and midnight
  rollover. Running and paused sessions retain their distinct reload behavior.
- Made Done update completed totals and clear the active session in one write.
  Failed saves preserve a paused session for retry; detected cross-tab conflicts
  block stale writes without claiming simultaneous-writer support.

### Audio and rendering

- Linked timer Pause/Start to saved audio settings, active tools, and Hold chord
  notes. Pause stops every tool; Start restores the snapshot. Done stops audio and
  clears remembered playback even when saving fails. Momentary inputs stay released.
- Shared one lazy audio context across features; canceled released or superseded
  requests during resume and disconnected ended voices by identity.
- Prevented delayed metronome callbacks from replaying missed beats in a burst;
  Stop cancels queued sounds and indicators.
- Separated session/lifecycle state from snapshot rendering. Reused history rows
  and changed only necessary DOM values; hidden pages stop visual updates while
  running-session checkpoints continue.

### Controls and documentation

- Added a per-day **…** editor for recorded hours, minutes, and fractional seconds.
  Clear changes the draft until Save; corrections require a finished session and
  preserve other days, with errors and conflicts keeping unsaved changes visible.
- Unified whole-number tempo, meter, and volume handling, including editable
  invalid drafts and consistent commit behavior.
- Replaced piano key divs with named native buttons, chromatic focus navigation,
  pointer/keyboard ownership, safe cancellation, and a Stop chord notes action.
- Made Metronome and Tuning Tone named forms whose submit events toggle playback.
  Numeric Enter commits settings and toggles the metronome once. Escape anywhere
  in Chordal Studies activates Stop chord notes without resetting settings.
- Removed the timer days ring and capped its hours at 8. Today uses 60-minute and
  8-hour rings; the weekly total uses 60-minute, 24-hour, and 7-day rings. Smaller
  units repeat, outer rings cap, and duration text keeps counting. Ring scales
  are documented as display scales rather than practice goals.
- Consolidated CSS themes and controls, improved contrast/focus styling, and kept
  full-size piano keys scrollable on narrow screens.
- Consolidated current user/developer instructions, separated manual procedures
  from verification evidence, and added relative documentation-link checks.
  Preserved earlier notes in an explicitly historical archive.

### Upgrade and verification notes

Version 1 storage upgrades keep an exact original backup before the first
replacement write. Existing completed date keys are not shifted; legacy active
sessions lack day boundaries, so their prior elapsed time is assigned to their
checkpoint day. See [storage rules](CONTRIBUTING.md#session-and-storage-rules).

Run [automated checks](CONTRIBUTING.md#automated-checks) for the current test result.
Use the [manual checklist](TEST_CHECKLIST.md) for native keyboard, screen-reader,
touch, visual, and audio checks; automated tests are not proof of device support.

## Earlier history

The [original changelog](docs/archive/CHANGELOG.md) retains its original version
labels and dates below an archive banner. It contains superseded behavior and
unverified quality claims; it is not the current specification. Related original
design and implementation notes are listed in the [archive index](docs/archive/README.md).
