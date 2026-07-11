# Glimmer Grotto — Product Bible

## Promise

Glimmer Grotto is a calm top-down puzzle adventure for a broad cozy audience.
The player guides Mica and the moth Luma through 20 handcrafted rooms across
five biomes. There is no combat, timer, death, or irreversible puzzle state.

## Core loop

1. Enter a room and read the visible beam or inactive source.
2. Walk to crystals, glimmer motes, bell-flowers, or tide controls.
3. Use one contextual action to turn, carry, ring, or toggle them.
4. Route light into the sleeping bloom.
5. Optionally collect an echo seed to return one keeper memory to the lantern,
   then continue deeper.

Every room offers reset, focus highlighting, and three progressively explicit
hints. Required information is never carried by color or sound alone.

The Lantern Compass provides an equivalent on-demand reading of the canvas:
Mica's position and facing, each adjacent path or object, important landmarks,
carried light, and the beam's current route. A report is cleared whenever the
described state changes so it cannot quietly become stale.

## Progression

- **Mosswake Entrance:** movement, mirror routing, and carried glimmer.
- **Prism Pools:** longer reflection paths and reverse-reading layouts.
- **Hushroot Hollows:** visual bell sequences layered with light routing.
- **Tideglass Deeps:** reversible tide conditions and charged sources.
- **Heartbloom Sanctum:** combinations of all established systems.

The campaign contains 20 required rooms and 15 optional echo seeds. Recovered
seeds reveal an ordered journal of stories left by the grotto's old keepers;
missing entries never expose their title. The ending records completion locally
and allows a fresh journey without an account.

Restored rooms remain available from the grotto map. Replaying a room resets
only its local puzzle, never the deepest unlocked chamber, restored-room set, or
collected memories. Optional discoveries are therefore never permanently
missable within a journey.

Waking the Heartbloom begins the afterglow rather than closing the save. The
ending remains viewable, while every restored room stays open for quiet replay
and missed-memory recovery. Replayed rooms return to the Heartbloom and never
fire the campaign ending a second time.

Local saves are reconciled against the authored campaign whenever they cross a
storage boundary. Repair preserves the furthest credible restored room, closes
impossible gaps, and never treats unknown room or memory IDs as progress. The
pre-repair copy remains available as the backup generation.

Every browser write is read back before the interface calls it saved. A failed
primary or backup never stops the current session, but its degraded status stays
visible during play and directs the player to export. Confirmed restart stores a
fresh primary immediately and cannot silently revive an older backup.

Manual recovery never depends solely on browser download support. Export names
only a requested download, delays object-URL cleanup, and exposes the complete
importable JSON for clipboard or selection when file activation cannot start.

An accepted offline update must activate within a bounded attempt. Timeout or
browser failure leaves the current version playable, removes any reload
listener, and restores an explicit retry action; a stale attempt must never
reload an active puzzle later without a new player request.
Activation may claim a page whose older code is still running, so one complete
predecessor asset graph remains available for its hashed subresources. Current
navigation and shared core files never fall back to that predecessor, and every
older, incomplete, or future release cache is excluded or removed.
After activation, the predecessor keeps only its marker and unique old hashed
assets; duplicate bundles and shared paths are pruned best-effort. Cache read or
enumeration failure must not block a healthy network response or client claim.
The current install becomes complete only after a sorted URL/SHA-256 manifest is
written last. Missing, corrupt, partial, or content-mismatched state is replaced
on retry; unreadable state is never deleted on an assumption.
Before a manifest-backed response is served from cache, its bytes must match the
recorded digest at least once in the current worker lifetime. Corruption becomes
a miss, permits online repair, and cannot execute as an offline game asset.

## Experience rules

- New mechanics receive a safe teaching room before combination puzzles.
- A wrong action may reset a local sequence but never loses broader progress.
- All text remains external to puzzle logic; version 1.0 is English-only.
- Mica's movement, Luma's motion, screen effects, text size, contrast, music,
  and effects must respect the accessibility settings.
- Procedural audio is optional enhancement. Missing, blocked, suspended, or
  failed audio must degrade to silence without interrupting movement, actions,
  saving, room transitions, or teardown.
- An action taken while Web Audio is suspended may request context resume but
  does not queue an effect to play later. Resume attempts are deduplicated and
  retryable; only a fresh action in a running context creates an action sound.
- An admitted WebGL context loss opts into browser restoration before pausing
  the scene. Duplicate or destroyed-context events cannot reopen ownership;
  failed cancellation or redraw still exposes save-preserving manual recovery.
- Larger text applies to all player-facing DOM and canvas labels. Responsive
  layouts may reflow or scroll, but must not hide a puzzle requirement or
  truncate the mechanic state needed to solve a room.
- Canvas spatial state must remain inspectable without sight through concise,
  current, keyboard-, pointer-, and controller-accessible descriptions.
- A standard gamepad alone must be sufficient to start or resume a journey,
  complete rooms, reach help and accessibility settings, read memories, revisit
  restored rooms, operate dialogs, view the ending, and return to the title.
  Buttons or directions held across screen transitions must not leak into the
  newly focused interface or resumed room. Connection changes, controller
  identity swaps, tab hiding, page hiding, and window blur likewise require a
  synchronized frame and neutral release before input resumes.
- Narrow fine-pointer reflow must preserve every puzzle tool and move guidance
  or mechanic state below the canvas when an overlay can no longer remain
  legible. Viewport width alone must never activate redundant touch controls.
- A held touch direction may repeat only while its own pointer remains active.
  Pointer cancellation, lost capture, focus or visibility loss, page hide,
  overlays, biome arrivals, room transitions, and session teardown must end the
  hold; an obsolete pointer or timer callback must not affect a newer gesture.
- Keyboard shortcuts with Alt, Control, or Command/Meta and text-composition
  events never become game commands. Non-movement actions fire once per press;
  movement repeat requires an accepted initial keydown and is invalidated by
  key release, focus or visibility loss, page hide, and scene pause/resume.
- Canvas input accepts only active primary presses with finite normalized world
  coordinates inside the authored play grid. A clicked blocked cell interacts
  only when that exact cell owns an approachable control; directional fallback
  must never substitute a different nearby object for a pointer selection.
- Room redraw and scene teardown invalidate every movement or bump callback.
  An interrupted move settles at its committed cell and applies landing once;
  no callback may keep input locked, move a replacement player, or collect from
  a later room after focus, settings, reduced-motion, reset, or visit changes.
- Lazy engine loading shares healthy in-flight work but never waits forever or
  caches a failed attempt. Delivery timeout abandons only that loader generation
  by presenting its exact promise, so retry starts a fresh import; its late
  result cannot replace newer cache, invalidate a newer delivery, or mount
  state. Fulfilled cache is no longer pending or invalidatable. Only the current
  mount may publish readiness or failure and
  teardown may destroy only its own game. An active failure keeps the journey
  safe and offers keyboard-, pointer-, touch-, and controller-accessible retry
  or title actions.
- A game handle becomes terminal before teardown begins. Scene and renderer
  cleanup are attempted independently and at most once; no dispatch, pause,
  resume, visit, or second destroy may reach detached state. Partial constructor
  failure clears its surface and enters the same save-preserving retry path.
- Modal close restores focus only to a connected, visible, enabled, non-inert,
  tabbable target outside hidden ancestors. If the invoker is no longer valid,
  restoration follows the current screen's canvas/default action, enabled main
  control, then title fallback without throwing or reviving a removed element.
- Native dialog failure must not strand scroll lock or background interaction.
  Missing, throwing, or partial `showModal()` falls back to a full-viewport open
  dialog with explicit modal semantics and inert siblings; close failure removes
  the owned open state before overflow, inertness, listeners, and focus restore.
- Tab and Shift-Tab remain inside every open dialog in native and attribute-
  fallback modes. The sequence wraps at both edges, excludes blocked or stale
  controls, re-enters from an unexpected outside target, and keeps moving when
  an individual focus call is rejected.
- If live dialog content removes or blocks the active control, focus returns to
  the first safe control after that DOM commit. Programmatic outside focus is
  redirected immediately, and queued recovery cannot outlive dialog cleanup.
- At most one modal identity is active. A new request replaces the prior surface
  atomically, and only a close callback that still owns that identity may clear
  it, resume play, confirm restart, or change rooms.
- Runtime play resumes only when the playing screen is active, no modal owns the
  interface, the page is visible, and no load recovery is active. The same rule
  applies immediately to a game handle that finishes mounting after a blocker.
- Repeated applications of the same pause policy do not redispatch scene state.
  Failed or pre-boot transitions remain retryable; each real resume clears stale
  keyboard admission and snapshots held controller input before play continues.
- A lost drawing context pauses the room before further input, disables every
  puzzle control, and stops held touch. Automatic restoration redraws from the
  deterministic room model; a stalled or failed redraw offers a view-only
  restart that preserves the local journey.
- Renderer recovery is bounded. One isolated WebGL loss may retry automatic
  rendering; the second loss in an app session or any failed redraw switches the
  journey to Canvas rather than repeating an unstable accelerated path.
- Automatic/Canvas mode belongs to the current app environment, not the portable
  save. Settings can switch either way; a renderer mount failure offers the
  alternate as its default action while retaining same-mode retry and title.
- After engine delivery, each renderer attempt must emit ready within 12 seconds.
  A stalled attempt is destroyed without touching the save and becomes a normal
  renderer-specific recovery with alternate, retry, and title actions.
- After one successful production load, the complete game—including its lazy
  engine—must remain available offline. Authentication or error pages must
  never replace the last valid cached shell, and progress continues to save on
  the device while disconnected.
- Player behavior is not transmitted or analyzed.

## Distribution rules

- Every third-party runtime or asset present in the deployable build must have
  an explicit distribution decision backed by production-bundle evidence.
- Player-visible third-party notices must identify exact shipped versions,
  preserve complete upstream license text, remain reachable from Settings, and
  stay available with the rest of the first-install offline shell.
- Production builds begin from an empty distribution directory. Generated
  assets that are not referenced by emitted HTML, CSS, JavaScript, or manifests
  are not carried into a release.
- A dependency upgrade, new production dependency, newly retained font, or
  missing license source stops the release until the ledger and notice are
  reviewed together.
- Every release candidate must reproduce its public clean-profile certificate
  from a fresh save by completing all authored rooms and memories, crossing
  every biome threshold, surviving autosave and export/import boundaries,
  reaching the ending, and reopening a non-regressing playable afterglow.
