# Changelog

## 0.50.0 — Trusting only the light we stored

- Validated every manifest-backed cached response against its recorded SHA-256
  digest before first use in a service-worker lifetime. Current shell, core,
  generated assets, and JSON-marked predecessor chunks now prove their bytes
  before they can be served offline or ahead of a network refresh.
- Treated a missing manifest entry, malformed marker, unreadable body, or digest
  mismatch as a cache miss. An offline corrupt script is removed rather than
  executed, while an online request transparently falls through to its already
  started network response.
- Made corrupt-entry cleanup race-safe: before deletion, the worker rechecks the
  latest stored response and preserves it when a concurrent healthy refresh has
  already restored the expected digest.
- Memoized only successful cache-name/URL/digest validations for the worker's
  lifetime, avoiding repeat hashing of the 1.4 MB Phaser bundle. Any successful
  background put invalidates that URL's memoized result so replacement bytes are
  checked again on their next cached read.
- Kept the one-transition plain-marker compatibility path for older predecessor
  caches, while current v44 and JSON-marked predecessors receive full response
  integrity validation.
- Added corrupted online asset, network repair, repaired-cache retention,
  corrupt offline script, deletion, manifest lookup, verification memoization,
  refresh invalidation, production Phaser hashing, offline, and build checks;
  retained 322 unit checks, expanded to 57 production-shell checks, and advanced
  the offline cache to v44.

## 0.49.0 — Every stored light has a fingerprint

- Replaced the current release's plain completion marker with a deterministic
  manifest of every cached URL and its SHA-256 response digest. Marker creation
  covers the shell, recursive generated asset graph, icons, notices, manifest,
  and clean-profile certificate using Web Crypto inside the worker.
- Reused an existing same-name current cache only when its complete manifest
  matches the newly fetched release byte for byte. Changed content under an
  accidentally reused cache name now forces a clean rebuild rather than serving
  a stale shell or shared document behind a misleading complete marker.
- Deleted an unmarked or manifest-mismatched current cache before retrying its
  writes, then wrote the new marker last. Mid-resource or marker-write failure
  therefore leaves an explicitly incomplete cache that the next install
  replaces, including any stale entries from the failed attempt.
- Made cache-state inspection tri-state. An unavailable read aborts installation
  without destructively treating an unknown active cache as incomplete, while
  an absent/corrupt marker remains safely replaceable.
- Preserved legacy plain predecessor markers for the v42 handoff while requiring
  the current worker's own expected JSON manifest for same-name reuse.
- Proved background cache-put failure cannot block a fresh network response or
  falsely create an entry, keeping opportunistic refresh independent from the
  stricter all-or-incomplete installation boundary.
- Added SHA-256 manifest shape, URL/digest count, changed-content collision,
  incomplete marker, failed marker write, stale partial cleanup, retry,
  background put failure, network continuity, offline, and production-build
  checks; retained 322 unit checks, expanded to 55 production-shell checks, and
  advanced the offline cache to v43.

## 0.48.0 — A bridge that travels light

- Contained CacheStorage read and key-enumeration failures inside the worker.
  A healthy network response now remains usable when cache access is unavailable
  or throws, instead of an optional offline layer breaking online scripts,
  styles, images, fonts, or core files.
- Kept worker activation progressing to `clients.claim()` when cache enumeration
  or individual old-cache deletion fails. Cleanup remains best effort while the
  newly active network path and explicit update retry stay available.
- Pruned the retained predecessor after activation to its completion marker and
  only content-hashed `/assets/` entries absent from the current cache. Old
  navigation, shared documents, and duplicate unchanged bundles no longer spend
  storage while unique chunks needed by an already-open page remain intact.
- Made pruning failure-contained and nonessential: any error stops the
  optimization without invalidating the complete predecessor or delaying client
  claim, preserving the safer full bridge over an incomplete one.
- Required marked v41-and-later predecessors in regression fixtures, proving the
  one-time unmarked v40 migration has ended and future selection cannot bless an
  incomplete cache merely because its version is adjacent.
- Added cache-read failure, network fallthrough, enumeration failure, client
  claim, duplicate asset, shared document, navigation, unique old chunk,
  completion-marker, pruning, offline, and production-build checks; retained
  322 unit checks, expanded to 52 production-shell checks, and advanced the
  offline cache to v42.

## 0.47.0 — A bridge between grotto versions

- Retained exactly one complete predecessor cache when a new service worker
  activates and claims an already-open page. That page can still request its
  old hashed Phaser engine after a delayed activation instead of falling into a
  permanent missing-chunk retry loop.
- Added a release-complete marker written only after the full shell, recursive
  asset graph, icons, notices, and completion certificate are stored. Future
  cleanup prefers marked predecessors, migrates safely from the unmarked v40
  cache, and rejects newer waiting or partial caches as backward fallbacks.
- Scoped navigation, shared core documents, and current hashed assets to the
  current cache first, preventing the retained predecessor from rolling an
  offline page, notice, certificate, or same-named resource backward.
- Allowed only a current-cache miss for a generated script, stylesheet, image,
  or font to consult the predecessor. Older release caches and unrelated app
  caches are still deleted or left untouched respectively, keeping storage
  bounded to two complete grotto versions.
- Kept late activation safe without reintroducing a surprise reload after the
  existing eight-second UI deadline: retry can request the reload again, while
  the current journey's old asset graph remains available in the meantime.
- Added completion-marker, legacy migration, current-core preference, current
  navigation, predecessor lazy-engine, future-cache rejection, bounded cleanup,
  claim, offline, and production-build checks; retained 322 unit checks,
  expanded to 49 production-shell checks, and advanced the offline cache to v41.

## 0.46.0 — Every retry keeps its own key

- Made lazy-engine invalidation require the exact delivery promise owned by the
  expiring attempt. A stale timeout or unrelated caller can no longer discard a
  newer in-flight retry.
- Separated the successfully delivered module cache from pending work. Once an
  import settles successfully it is no longer invalidatable, remains reusable
  across future sessions, and still avoids another Phaser download.
- Kept abandoned delivery results local to their original callers while the
  attempt number prevents either their success or rejection from clearing or
  replacing the current generation.
- Passed the attempt-owned promise through both delivery-timeout and timer-setup
  recovery, preserving shared concurrent preload only while it is the same
  healthy generation.
- Added exact-owner, unrelated-promise, old-generation, fulfilled-cache,
  no-pending, new-retry, source integration, shipped-interface, and
  production-build checks; expanded coverage to 322 unit checks and 46
  production-shell checks and advanced the offline cache to v40.

## 0.45.0 — The view knows how to return

- Cancelled each newly admitted `webglcontextlost` event as required by the
  WebGL restoration contract, allowing the browser to later deliver the
  `webglcontextrestored` event that the recovery flow already handles.
- Coupled cancellation to the renderer context guard: only the first loss owned
  by an available game opts into restoration, while duplicate and post-destroy
  events remain terminal no-ops.
- Kept the pause and visible save-preserving recovery surface active even if a
  partial event implementation throws during cancellation, so manual renderer
  restart and the bounded Canvas fallback remain available.
- Preserved deterministic redraw after restoration and the existing failure
  path when Phaser cannot rebuild resources, without resuming hidden input or
  altering the current journey.
- Added restoration opt-in, once-only cancellation, duplicate loss, throwing
  event, lifecycle transition, source integration, shipped-engine, and
  production-build checks; expanded coverage to 321 unit checks and 45
  production-shell checks and advanced the offline cache to v39.

## 0.44.0 — A fresh path for a stalled engine

- Added a separate 15-second delivery deadline around the shared lazy game
  import, before the renderer's existing 12-second ready deadline, so a network
  or browser loader that never settles can no longer leave the grotto loading
  forever.
- Invalidated only the stalled loader generation on timeout or timer setup
  failure. A player retry now begins a genuinely new dynamic import while a
  successful cached module and healthy concurrent preload remain shared.
- Isolated abandoned promises from their replacements: an old delivery may
  still settle for its original caller, but cannot clear, cache over, mount, or
  publish failure into the newer attempt.
- Cancelled delivery and readiness watchdogs together on cleanup and recovery,
  while invalidating shared import work only after an actual delivery failure.
- Routed a missing browser timer into immediate, focused engine-load recovery
  and kept every delivery timeout save-preserving and retryable from keyboard,
  pointer, touch, or controller.
- Added stalled import, invalidation, retry-generation, late resolution,
  successful-cache, timer, cleanup, stale-mount, recovery-copy, source,
  shipped-interface, and production-build checks; expanded coverage to 319 unit
  checks and 44 production-shell checks and advanced the offline cache to v38.

## 0.43.0 — The lantern will not wait forever

- Added a 12-second attempt-local readiness watchdog after the lazy engine loads
  and before renderer construction begins. A returned game handle must now emit
  its own `ready` event instead of leaving the loading surface indefinitely.
- Cancelled the watchdog on the exact attempt's ready event and ignored every
  later event after timeout or cleanup, preventing a stale renderer from
  publishing room, progress, focus, or recovery state into its replacement.
- On timeout, detached and destroyed only the stalled handle, cleared its canvas,
  identified the attempted renderer, and reused the accessible automatic/Canvas
  alternate, same-mode retry, and title recovery without changing the save.
- Contained invalid deadlines, timer setup/clear failures, throwing timeout
  callbacks, repeated arm/ready/cancel operations, and late callbacks from a
  browser that failed to cancel its timer.
- Moved keyboard focus to the correct default recovery action for engine-load,
  renderer-construction, and readiness-timeout failures; controller page
  navigation shares that same target.
- Added deadline, one-shot timeout, ready cancellation, cleanup cancellation,
  stale callback, timer failure, exact-handle destruction, attempt-event,
  recovery-focus, source, shipped-interface, and production-build checks;
  expanded coverage to 317 unit checks and 43 production-shell checks and
  advanced the offline cache to v37.

## 0.42.0 — A door out of every renderer

- Split lazy-engine import failure from renderer construction failure. Network
  or module errors keep the normal retry, while a failed automatic or Canvas
  mount now names the failed view and offers renderer-specific recovery.
- Made the alternate renderer the keyboard/controller-default action after a
  mount failure, while preserving same-mode retry and Return to title so no
  backend failure can create a one-way recovery loop.
- Added a Rendering control to Settings with the current session mode and a
  direct switch between automatic acceleration and stable Canvas. Switching
  during play remounts only the view behind the still-open modal; title and
  ending changes apply on the next journey entry.
- Defined renderer mode as environment-local session state rather than save
  data. Progress exports remain device-independent, a reload can reevaluate the
  browser, and explicitly returning to automatic rendering clears prior loss
  history before granting the normal bounded retry policy again.
- Kept repeated-loss history when automatic recovery itself retries, preserving
  the second-loss Canvas threshold introduced in 0.41.
- Added alternate-mode, module/mount phase, automatic/Canvas failure copy,
  default-action, same-mode retry, Settings switch, loss-history reset,
  responsive layout, shipped-interface, and production-build checks; expanded
  coverage to 312 unit checks and 42 production-shell checks and advanced the
  offline cache to v36.

## 0.41.0 — A steadier way to see

- Added a bounded renderer recovery policy: one isolated WebGL loss may retry
  the normal automatic renderer, while a second loss in the same app session
  switches recovery to Phaser's Canvas renderer.
- Made any post-restoration redraw failure recommend Canvas immediately instead
  of repeating the accelerated path that already failed to present the room.
- Passed the selected renderer mode into each attempt-local game mount and kept
  it for the remainder of the journey, so later room or session remounts do not
  silently return to an unstable GPU backend.
- Updated recovery copy and controller-default action to explain and offer the
  stable view while preserving the same local save, room frontier, settings,
  and retry/title choices.
- Rejected non-finite external loss counts rather than forcing fallback from
  corrupt state; duplicate events remain filtered by the context lifecycle guard
  before they can inflate the threshold.
- Added first-loss, threshold, repeated-loss, redraw-failure, invalid-count,
  renderer-config, attempt wiring, stable-copy, shipped-interface/lazy-bundle,
  and production-build checks; expanded coverage to 311 unit checks and 41
  production-shell checks and advanced the offline cache to v35.

## 0.40.0 — A view that finds its way back

- Added an explicit WebGL context lifecycle guard around the Phaser canvas.
  Duplicate loss/restoration events are ignored, and destruction makes late
  browser events terminal before renderer teardown.
- Paused the runtime synchronously when the drawing context is lost, added
  renderer availability to the shared pause policy, stopped held touch, hid the
  unavailable application surface, and disabled every puzzle control so a
  player cannot change an invisible room.
- After Phaser restores its own resources, redrew the current room from the
  deterministic puzzle model, settled any interrupted movement through the
  existing animation boundary, refreshed mechanic status, and resumed only when
  every other modal, page, screen, and load blocker is also clear.
- Added a visible, keyboard-, touch-, screen-reader-, and controller-operable
  recovery surface. Players can wait for automatic restoration, restart only
  the renderer from the same local journey, or return safely to the title.
- Kept failed redraws paused on the recovery surface and contained listener
  registration/removal failures so terminal renderer destruction and parent
  cleanup still run.
- Added loss/restore, duplicate/stale event, terminal destroy, pause-policy,
  listener cleanup, redraw failure, held-touch, disabled-control, focus,
  recovery UI, shipped lazy-bundle, and production-build checks; expanded
  coverage to 307 unit checks and 40 production-shell checks and advanced the
  offline cache to v34.

## 0.39.0 — No sound from an old step

- Changed optional audio wake-up so a suspended or interrupted Web Audio context
  requests resume but reports silence for the current action. A note can no
  longer be scheduled while time is frozen and become audible much later after
  the originating move, bump, crystal turn, seed, or solve.
- Allowed only one in-flight resume per audio context, preventing repeated game
  effects from issuing overlapping browser resume requests while permission,
  visibility, or device audio is still settling.
- Cleared the in-flight marker after either fulfillment or rejection so a fresh
  later player gesture can retry; synchronous partial-implementation failures
  remain contained and retryable as well.
- Kept the ambient drone graph available to begin when the browser successfully
  resumes, while requiring a fresh action after that transition for an action
  sound or delayed chime sequence.
- Detached pending resume ownership during disable or destroy, ensuring a late
  promise cannot revive or mutate an audio graph that has already been closed.
- Added rejected-resume retry, no-stale-note, fulfilled-resume fresh-edge,
  in-flight deduplication, synchronous rejection, graph teardown, source, and
  production-build checks; expanded coverage to 302 unit checks and 39
  production-shell checks and advanced the offline cache to v33.

## 0.38.0 — One pause, one return

- Made the terminal runtime handle track its applied pause state. Repeated pause
  or resume policy requests now succeed as idempotent no-ops instead of
  redispatching scene lifecycle and input synchronization work.
- Kept transition state unchanged when a dependency throws or explicitly
  defers, allowing the next policy pass to retry rather than falsely treating a
  failed pause or resume as complete.
- Made the scene adapter explicitly defer pause before Phaser reports the scene
  active. The subsequent ready event queues another policy synchronization, so
  a late engine still inherits an open modal or hidden-page blocker.
- Preserved neutral input exactly at real boundaries: pause clears pressed
  keyboard admission and disables scene keys; resume clears it again, snapshots
  current gamepad buttons/direction, then enables input and resumes the scene.
- Proved repeated keyboard and controller interruptions remain neutral until a
  release and fresh edge, without duplicate lifecycle application or stale
  direction repeat.
- Added initial-resume, repeated-transition, thrown/deferred pause, failed-
  resume retry, ready retry, lifecycle ordering, multi-blocker keyboard/gamepad,
  source, and production-build checks; expanded coverage to 300 unit checks and
  38 production-shell checks and advanced the offline cache to v32.

## 0.37.0 — Paused means paused

- Added one deterministic runtime pause policy for non-playing screens, open
  modals, hidden pages, and game-load recovery instead of letting each close or
  visibility callback decide independently when play should resume.
- Routed modal open and matched close through the policy. Closing a dialog while
  the page is hidden now remains paused until visibility actually returns, and a
  stale close remains unable to alter runtime state.
- Synchronized each newly mounted game handle immediately, preventing an engine
  that finishes loading after Settings or another dialog opened from starting
  behind that surface.
- Mirrored screen, load-failure, and page-visibility state at the runtime
  boundary and resynchronized on every relevant React commit and browser
  visibility event.
- Preserved an immediate pause on return-to-title while making the coordinator
  the only path that can resume a runtime; map visits and every dialog close now
  recompute all blockers before continuing.
- Added clear-run, non-playing, modal, hidden-page, load-failure, combined-
  blocker, mount-time, visibility, close-time, single-resume-path, and source
  checks; expanded coverage to 295 unit checks and 37 production-shell checks
  and advanced the offline cache to v31.

## 0.36.0 — One dialog at a time

- Replaced six independent modal booleans with one exclusive modal identity, so
  the Lantern menu, help, Settings, journal, map, and restart confirmation can
  no longer render as overlapping modal surfaces after rapid requests.
- Added pure activate, dismiss, and clear transitions. Activating a different
  modal replaces the current one atomically, while repeated opens and clears
  are idempotent.
- Mirrored the active identity in a synchronous ref so multiple requests in one
  event turn serialize against the newest state instead of stale React renders.
- Required every close, restart confirmation, and map visit to dismiss the exact
  modal it owns before resuming play or changing rooms; a late callback from a
  replaced dialog is ignored without disturbing the newer surface.
- Derived visibility resume, held-touch interruption, controller-page admission,
  and all six render branches from the single identity, eliminating divergent
  combinations and unrelated flag cleanup during save import.
- Added open, replacement, repeated-open, matched-dismiss, stale-dismiss, empty-
  dismiss, idempotent-clear, state-wiring, guarded-resume, and source checks;
  expanded coverage to 289 unit checks and 36 production-shell checks and
  advanced the offline cache to v30.

## 0.35.0 — Focus follows the changing light

- Moved the modal keyboard boundary from the dialog node to a document-scoped
  listener owned by the dialog effect, so Tab and Escape are still intercepted
  when removed content leaves the document body as the active target.
- Added a guarded `focusin` recovery path that immediately redirects accidental
  or programmatic outside focus to the first safe control in the open dialog.
- Observed live dialog content and focus-affecting attributes. Removing,
  disabling, hiding, inerting, untabbing, or ancestor-blocking the active target
  now schedules a post-commit eligibility check and repairs focus when needed.
- Kept ordinary keys on their normal target path before the document boundary,
  preserving text selection, checkboxes, ranges, and native control behavior
  while preventing paused game listeners from receiving modal keystrokes.
- Bounded reentrant focus events, detached containment methods, missing observer
  support, rejected focus calls, queued callbacks after cleanup, and observer
  disconnection so recovery cannot escape the dialog lifecycle.
- Added containment success/failure, outside-focus, document-listener, content-
  removal, blocked-active-target, observer, cleanup, source, and shipped-bundle
  guards; expanded coverage to 282 unit checks and 35 production-shell checks
  and advanced the offline cache to v29.

## 0.34.0 — Focus stays in the lantern light

- Added one deterministic Tab and Shift-Tab cycle shared by native dialogs and
  the attribute-based modal fallback, keeping keyboard focus inside every open
  Lantern menu, help, Settings, journal, map, and restart surface.
- Wrapped forward from the final eligible control and backward from the first;
  an unexpected outside focus target re-enters at the matching dialog edge.
- Reused the safe-focus boundary to exclude detached, hidden, disabled, inert,
  untabbable, aria-hidden, ancestor-blocked, and zero-layout candidates.
- Contained rejected focus calls and continued around the cycle, preventing one
  stale or browser-refused target from breaking all later keyboard navigation.
- Expanded the focusable selector across links, form controls, summaries,
  explicit tab stops, editable regions, frames, objects, and controlled media;
  initial focus now chooses the first eligible target rather than the first raw
  selector match.
- Added forward, reverse, edge-wrap, outside-entry, blocked-target, throwing-
  focus, empty-cycle, source-integration, and shipped-interface guards; expanded
  coverage to 281 unit checks and 33 production-shell checks and advanced the
  offline cache to v28.

## 0.33.0 — A dialog that still opens

- Moved native dialog open and close behind no-throw lifecycle helpers with
  explicit modal, existing, attribute-fallback, and failed outcomes.
- Fell back to the standard `open` attribute when `showModal()` is missing,
  throws, or returns without opening, retaining a visible Settings, help, map,
  journal, restart, or Lantern menu surface on partial implementations.
- Added a fixed, full-viewport fallback treatment and explicit `aria-modal`
  semantics while making every background sibling inert in both native and
  fallback modes.
- Preserved pre-existing inert state and removed only attributes owned by the
  dialog effect before restoring body overflow and safe return focus.
- Made native close failure fall back to attribute removal; a total open failure
  schedules the normal React close path so listeners, scroll lock, inert state,
  and focus still clean up.
- Added native/missing/throwing/partial open, close fallback, total-failure,
  modality, inert ownership, CSS, source, and production-interface guards;
  expanded coverage to 274 unit checks and 32 production-shell checks and
  advanced the offline cache to v27.

## 0.32.0 — Focus finds the path home

- Replaced unconditional modal focus restoration with a shared safe-focus
  boundary used for both initial dialog focus and return focus.
- Rejected disconnected, hidden, disabled, inert, untabbable, aria-hidden,
  ancestor-blocked, and zero-layout targets before calling `focus()`.
- Contained focus methods that throw because an element disappeared or a browser
  invalidated it during the dialog-to-screen transition.
- Added ordered fallback discovery across the active canvas, current screen's
  controller-default action, enabled main controls, and the title lockup instead
  of stopping at the first invalid matching element.
- Marked the puzzle canvas as an explicit return target, preserving keyboard and
  assistive-technology orientation when a modal was opened from game input.
- Added connectedness, visibility, disabled/inert, tabbability, ancestor,
  layout, throwing-focus, fallback-order, source, and production-interface
  guards; expanded coverage to 266 unit checks and 31 production-shell checks
  and advanced the offline cache to v26.

## 0.31.0 — A clean way out

- Added a terminal runtime-handle controller around the Phaser scene and
  renderer. Dispatch, pause, and resume are contained at their boundaries and
  are rejected after destruction instead of touching detached scene state.
- Made destroy idempotent and marked the handle dead before cleanup, preventing
  reentrant or repeated teardown from operating the same renderer twice.
- Guaranteed renderer destruction after a throwing or partial scene shutdown;
  a renderer cleanup failure is terminal but cannot reactivate the handle.
- Made scene shutdown safe before boot and after partial destruction, with
  independent best-effort cleanup for tweens, keyboard/pointer listeners,
  browser lifecycle listeners, and optional audio.
- Contained synchronous Phaser construction failure by shutting down the
  partially initialized scene, clearing any attached canvas surface, and
  rethrowing the original error into the existing retry UI.
- Added dispatch eligibility, operation failure, teardown ordering, idempotence,
  post-destroy, pre-boot source, partial-construction, and lazy-engine guards;
  expanded coverage to 255 unit checks and 30 production-shell checks and
  advanced the offline cache to v25.

## 0.30.0 — The lantern tries again

- Replaced the permanently cached dynamic-import promise with a retryable loader:
  concurrent preload and mount callers still share one attempt, successful
  modules remain cached, and a rejected or synchronous import clears itself for
  the next attempt.
- Contained speculative pointer/focus preload rejection instead of allowing an
  unhandled promise while preserving full error reporting for an active mount.
- Scoped each mounted game handle to its own React effect attempt. Cancelled
  loads cannot mount or announce later, cleanup destroys only its own handle,
  and teardown failure cannot block removal of the renderer surface.
- Replaced the indefinite loading overlay after failure with a visible alert
  that truthfully preserves the local journey and offers Try again or Return to
  title without requiring a page reload.
- Enabled controller navigation on the recovery surface and made Try again its
  default target; disabled all touch actions until a room has actually mounted.
- Added concurrent, rejected, synchronous-failure, successful-cache, stale-
  attempt, local-teardown, recovery UI, controller, CSS, and production-bundle
  guards; expanded coverage to 251 unit checks and 29 production-shell checks
  and advanced the offline cache to v24.

## 0.29.0 — Motion that knows its room

- Replaced the loose movement flag with a generation-scoped animation lifecycle
  that owns move and bump admission, completion, invalidation, and busy state.
- Fixed a permanent movement freeze when focus highlighting or accessibility
  settings redrew the room during Mica's movement tween: redraw now clears the
  active lease instead of killing its only unlock callback.
- Settled an interrupted move at its already-committed logical destination and
  applied seed or glimmer-mote landing once, preventing redraw from silently
  skipping collection behavior.
- Captured the exact player object in move and bump callbacks and required a
  current generation before mutation, so a late callback cannot reposition a
  replacement player or apply landing in another room.
- Prevented overlapping bump/move tweens, contained tween-construction failure,
  and invalidated all motion before scene teardown; decorative pulse callbacks
  destroy only their captured ring.
- Added move, bump, overlap, invalidation, stale-generation, interrupted-landing,
  source, and lazy-offline-engine guards; expanded coverage to 247 unit checks
  and 28 production-shell checks and advanced the offline cache to v23.

## 0.28.0 — Only the tile you touch

- Added a pure pointer-to-grid admission boundary that accepts only an active
  primary pointer with finite Phaser world coordinates and valid grid geometry.
- Rejected secondary buttons, released pointers, non-finite resize samples,
  invalid cell metrics, and positions outside the authored 13-by-7 play grid
  before waking audio, changing input mode, continuing, moving, or interacting.
- Separated exact clicked-cell interaction from directional action fallback.
  Clicking an adjacent wall, bloom, or other blocked non-control can no longer
  operate a different nearby crystal, bell, tide control, or charged source.
- Preserved intentional feedback for an adjacent blocked movement target while
  retaining exact pointer selection for every approachable interactive object.
- Required solved-room pointer continuation to originate from a valid primary
  in-grid press, preventing context clicks or stale resize coordinates from
  advancing the journey.
- Added finite-coordinate, button, grid-edge, invalid-geometry, exact-target,
  source, production-chunk, and offline-input guards; expanded coverage to 243
  unit checks and 27 production-shell checks and advanced the offline cache to
  v22.

## 0.27.0 — Keys with intention

- Moved keyboard mapping into a deterministic admission layer that rejects
  already-handled events, IME composition and key-code 229, plus Alt, Control,
  Command/Meta browser shortcuts before they can reach puzzle behavior.
- Prevented browser commands such as Control-R, Control-W, Command-W, and
  Alt-Arrow from simultaneously resetting or moving in the grotto.
- Added a pressed-key session guard: actions, focus, reset, description, hints,
  and menus fire once per physical press, while only movement may use browser
  repeat and only after an accepted initial keydown.
- Cleared pressed-key history on keyup, blur, page hide, visibility changes,
  scene pause, and resume, requiring a fresh press instead of replaying repeat
  events that began outside the active puzzle.
- Protected links, buttons, dialogs, form fields, content-editable regions, and
  textbox roles from canvas shortcuts while retaining scroll prevention for
  accepted arrows and Space.
- Added mapping, shortcut, composition, stale-repeat, focus-target, source,
  production-chunk, and lazy-offline-engine guards; expanded coverage to 240
  unit checks and 26 production-shell checks and advanced the offline cache to
  v21.

## 0.26.0 — A hold that lets go

- Replaced independent touch delay and interval refs with a pointer-aware held
  command controller that owns immediate movement, repeat cadence, pointer
  identity, capture release, and teardown in one lifecycle.
- Stopped held movement on pointer-up, pointer cancellation, lost capture,
  window blur, page hide, hidden-tab transitions, modal changes, biome arrivals,
  room changes, session replacement, and component teardown.
- Prevented an older finger's release from cancelling a newer touch while still
  making a second touch safely replace and release the first hold.
- Added generation checks so late timeout or interval callbacks remain inert
  even when browser timer cancellation throws or silently fails; dispatch,
  repeat construction, and pointer-capture failures degrade to one safe move.
- Reserved directional touch controls from browser panning and text selection,
  reducing avoidable gesture cancellation while retaining explicit cancellation
  handling at every browser boundary.
- Added deterministic cadence, multi-touch, failed-cleanup, late-callback,
  timer/dispatch failure, source, CSS, and production-bundle guards; expanded
  coverage to 237 unit checks and 25 production-shell checks and advanced the
  offline cache to v20.

## 0.25.0 — A quiet return

- Added one controller-session guard shared by active puzzle play, title and
  ending navigation, and every modal dialog, keeping reconnection behavior
  consistent across the whole experience.
- Suppressed the first sampled frame after tab hiding, window blur, page hide,
  gamepad connection changes, scene resume, and controller identity changes so
  input that began off-screen cannot move Mica or activate a focused control.
- Required held directions and buttons to return to neutral before producing a
  new edge or repeat after interruption, preserving deliberate input without
  creating a permanently dead controller.
- Ignored stale disconnected gamepad slots and safely synchronized a second
  connected controller even when browsers expose the identity swap without an
  empty polling frame.
- Removed visibility, lifecycle, and connection listeners with their React
  effects and Phaser scene teardown, preventing old sessions from observing a
  later journey.
- Added deterministic interruption, identity-swap, disconnected-slot, source,
  production-interface, and lazy-offline-engine guards; expanded coverage to
  231 unit checks and 24 production-shell checks and advanced the offline cache
  to v19.

## 0.24.0 — No surprise reloads

- Replaced the open-ended service-worker activation listener with a bounded
  update coordinator that times out after eight seconds and removes every
  listener and timer on success, failure, or timeout.
- Kept the current version playable when registration lookup, worker messaging,
  timer setup, or activation fails instead of leaving an indefinite update
  action or a stale listener that could reload the game later.
- Made update progress explicit and non-repeatable while activation is pending;
  a failed or timed-out attempt restores the Update ready action with clear,
  live-region guidance so the player can retry deliberately.
- Preserved the fast path for an update that has already activated by reloading
  directly when no waiting worker remains.
- Added deterministic activation, timeout, cleanup, late-event, registration,
  message-failure, accessibility, source, and production-bundle guards;
  expanded coverage to 229 unit checks and 24 production-shell checks and
  advanced the offline cache to v18.

## 0.23.0 — A copy in every browser

- Replaced the unguarded save-export click with a fault-contained download
  request that attaches its link before activation and delays blob URL cleanup,
  avoiding browsers that cancel detached or immediately revoked downloads.
- Changed success language from “exported” to “download requested,” reflecting
  the browser boundary instead of claiming a file was accepted without evidence.
- Exposed the complete importable save text whenever blob construction, object
  URLs, link activation, or cleanup scheduling fails, so recovery no longer
  depends on one browser API path.
- Added an accessible clipboard action with a focus-and-select fallback; the
  read-only JSON field selects on focus, remains controller-navigable, reflows
  within narrow Settings, and respects larger text and high contrast.
- Cleared stale fallback text after a successful download request or save import
  while retaining status feedback inside the existing live Settings region.
- Added deterministic construction, activation, cleanup, delayed revocation,
  clipboard, source, and production-bundle guards; expanded coverage to 224
  unit checks and 23 production-shell checks and advanced the cache to v17.

## 0.22.0 — A save that tells the truth

- Replaced fire-and-forget browser writes with verified write-back results that
  distinguish a fully redundant save, primary-only progress, backup-only
  recovery, and unavailable storage.
- Kept the in-memory journey playable when storage fails while showing an
  assertive, dismissible warning on title, ending, and active play; Settings
  retains the same export guidance for recovery.
- Carried persistence health through initial load repair, backup recovery, save
  import, settings changes, room progress, and ending persistence instead of
  claiming success after a swallowed quota or privacy error.
- Made confirmed restart durable immediately by writing a fresh primary and
  removing or neutralizing the previous backup generation, preventing an old
  journey from reappearing after reload.
- Moved storage side effects out of React state updater functions and made the
  synchronous save reference authoritative, preserving exact event order while
  avoiding duplicate development-mode writes.
- Added silent-drop, throwing-store, primary-only, backup-only, repaired-load,
  restart, and always-visible warning regressions; expanded coverage to 220 unit
  checks and 22 production-shell checks and advanced the offline cache to v16.

## 0.21.0 — When silence is safe

- Isolated procedural sound behind a fail-safe audio lifecycle so a missing or
  blocked Web Audio implementation cannot throw through movement, interaction,
  settings, pause, or room transitions.
- Contained context-construction, partial graph, node-creation, resume, volume,
  and teardown failures; a rejected resume can retry on the next gesture while
  a broken graph degrades permanently to silence for that session.
- Tracked and cancelled delayed collection and victory tones during teardown,
  preventing callbacks from touching a closed context after returning to the
  title, restarting, importing a save, or replacing the game instance.
- Added deterministic audio fault injection for unavailable contexts, partial
  graph construction, rejected resumes, idempotent destruction, and cancelled
  delayed notes; the lazy offline engine is also checked for the shipped
  fail-safe path.
- Made the full release gate runnable without child-process privileges by using
  native Vite configuration, an explicit Vinext Worker entry, thread-based unit
  isolation, and in-process artifact checks while preserving the normal
  Cloudflare development configuration.
- Expanded deterministic coverage to 216 unit checks and retained all 21
  production-shell checks; advanced the offline cache to v15.

## 0.20.0 — From first spark to afterglow

- Centralized biome, room, memory, and ending progress transitions so the live
  interface and release certification use the same campaign rules.
- Added a deterministic clean-profile campaign certificate that walks and
  solves all 20 authored rooms in order, takes every one of the 15 memory
  detours, acknowledges all four biome thresholds, and reaches the ending.
- Exercised 1,103 real movement and interaction commands across the campaign,
  with per-room and per-biome evidence that fails closed when authored content
  or its verified routes drift.
- Round-tripped the journey through 27 clean autosave reloads and one canonical
  export/import boundary, then reopened and solved the final room as a revisit
  without regressing the 20-room frontier or 15-memory collection.
- Published the exact certificate with the production artifact and first-load
  offline cache, guarded its release version and byte-identical deployed copy,
  and advanced the cache to v14.
- Expanded deterministic coverage to 211 unit checks and 21 production-shell
  checks.

## 0.19.0 — The whole path in hand

- Added controller navigation to the title and ending screens, with the left
  stick or D-pad moving visible focus and A activating the focused choice.
- Added an in-game Lantern menu on the standard Menu/Start button and Escape,
  giving controller players direct routes to the map, echo journal, Settings,
  How to Play, and the title without switching input devices.
- Mapped View/Back to the echo journal, J to memories, and M to the grotto map;
  exposed keyboard shortcuts through accessible button and game-surface
  metadata and documented every new binding in the lantern guide.
- Made native dialogs controller-operable: stick/D-pad focus cycling and held
  repeat, A activation and checkbox toggling, B close, range adjustment by
  declared step, and scrolling for long read-only journals and guides.
- Suppressed buttons and directions held across title/game/dialog transitions,
  preventing the A or B used to choose or close a screen from leaking into the
  newly resumed room.
- Kept room travel locked during a biome-arrival threshold while leaving help,
  settings, and recovered memories available from the Lantern menu.
- Expanded deterministic controller and accessibility coverage to 207 unit
  checks and 18 production-shell checks, and advanced the offline cache to v13.

## 0.18.0 — Every light accounted for

- Added a production-distribution ledger for Phaser, EventEmitter3, the React
  runtime family, Vinext, the Vite RSC plugin, and the Rolldown runtime, with
  exact installed versions, SPDX identifiers, upstream license sources, and
  bundle evidence.
- Shipped complete third-party notices as a public release asset and linked
  them from both Settings and the site footer without navigating players away
  from an active journey.
- Added four release checks that fail on dependency-version or license drift,
  an unreviewed top-level production dependency, missing runtime evidence,
  incomplete upstream license text, an uncopied notice, or an unexpected font
  payload.
- Made the third-party notice part of the first-install offline cache and
  tightened its response validation to plain text.
- Started every production build from a clean distribution directory and
  removed 11 Vinext-generated Geist font files only after proving that no
  emitted HTML, CSS, JavaScript, or manifest refers to them.
- Recorded why the Next.js compatibility package is not itself distributed:
  production imports resolve to reviewed Vinext shims and no Next.js module is
  present in the deployable bundle.

## 0.17.0 — The lantern stays lit

- Rebuilt first-install caching around the generated production shell instead
  of a short hard-coded file list, then recursively followed static and dynamic
  JavaScript and CSS dependencies.
- Included the lazy Phaser game engine in the initial offline cache, so entering
  the grotto no longer requires a second online visit after installation.
- Validated the game shell and every cached resource by content type, preventing
  successful owner sign-in pages from replacing cached HTML, scripts, styles,
  images, fonts, the manifest, or icons.
- Preserved network-first navigation without allowing an expired session to
  poison the last safe offline shell, while retaining explicit update approval
  and scoped old-cache cleanup.
- Added a visible, screen-reader-announced Offline notice that confirms local
  saves remain safe and checks for a fresh worker when connectivity returns.
- Enabled service-worker registration in local production builds and added six
  deterministic worker checks, including the real hashed build graph and a
  fully disconnected lazy-engine load.

## 0.16.0 — Room to breathe

- Stopped narrow fine-pointer layouts from enabling five redundant touch
  controls solely because browser zoom reduced the CSS viewport width.
- Introduced a shared game stage so opening-room guidance and multi-mechanic
  status can leave the canvas overlay and enter normal document flow at
  extreme fine-pointer reflow sizes.
- Expanded the zoomed canvas and compacted its five-item puzzle toolbar so
  Focus, Compass, Hint, Reset, and Map remain fully visible at 320 CSS pixels.
- Exposed puzzle tools as an accessibility toolbar and touch controls as a
  named group while keeping touch-only controls out of fine-pointer navigation.
- Verified the title, ending, Settings, first-room guide, three-mechanic
  Heartbloom status, and Lantern Compass at 640 × 360, 320 × 360, and
  320 × 180 equivalent CSS viewports without horizontal overflow.
- Added a stylesheet regression guard for pointer-capability detection and
  fine-pointer guidance reflow.

## 0.15.0 — A compass in the dark

- Added an on-demand Lantern Compass that describes Mica's grid position,
  facing direction, all four neighboring paths, puzzle objects, the bloom,
  optional memories and glimmers, carried light, and the current beam route.
- Gave the Compass equal pointer, C-key, and controller-B access, documented
  every binding in the lantern guide, and announced each report through the
  existing live region for assistive technology.
- Cleared spatial reports as soon as movement, interaction, reset, or hint
  state makes them stale, replacing them with a concise prompt to request the
  updated room description.
- Rephrased boundary exits as named room edges, avoiding impossible coordinates
  such as row 8 of 7 while retaining exact row or column orientation.
- Kept the fifth puzzle tool and long description card readable at 390 × 844
  and 320 × 568 with Larger text and High contrast enabled.
- Verified live movement and crystal-rotation updates and added description
  coverage for all 20 rooms, bringing the deterministic unit suite to 203
  checks.

## 0.14.0 — Every word clear

- Extended Larger text from two story fields to every fixed interface label,
  including title and ending copy, counters, controls, tutorials, biome
  arrivals, puzzle status, maps, memories, dialogs, settings, and save notices.
- Added shared text and heading scale variables so responsive overrides inherit
  the accessibility setting instead of silently reverting to smaller sizes.
- Made Phaser-rendered biome, room, bell, tide, restoration, and continuation
  labels scale by the saved setting and update immediately when it changes.
- Widened the phone-landscape center status only when Larger text is active and
  allowed its three mechanic labels to wrap, eliminating truncated finale
  requirements while keeping both touch zones clear.
- Verified Larger text together with High contrast across the completed ending,
  journal, map, settings, afterglow finale, and 667 × 375 phone layout.
- Added stylesheet and canvas-size regression guards, bringing the deterministic
  unit suite to 179 checks.

## 0.13.0 — Safe keeping

- Replaced count-based save repair with campaign-aware reconciliation against
  the exact 20 rooms, 15 memories, and five biome thresholds.
- Preserved the furthest credible progress while filling impossible room gaps,
  removing unknown IDs, and preventing future memories or arrivals from leaking
  into shallower journeys.
- Normalized accessibility toggles, audio levels, play time, timestamps, and
  ending state at every load, import, export, and autosave boundary.
- Kept the original pre-repair save as the backup, restored valid backups when
  the newest copy was damaged, and created a clean start only when neither
  generation could be read.
- Added distinct, dismissible player notices for automatic repair, backup
  recovery, reset, and unavailable storage without interrupting play.
- Verified an existing 20/20, 15/15 afterglow save migrates unchanged and
  expanded the deterministic suite to 177 checks.

## 0.12.0 — Afterglow

- Kept completed journeys explorable after the Heartbloom wakes, closing the
  last path by which a missed echo seed could become inaccessible.
- Added an afterglow state that opens every restored room, returns replayed
  rooms to the Heartbloom, and cannot retrigger or overwrite the ending.
- Reworked the ending to name outstanding memories, celebrate a complete
  lantern, and make continued exploration the primary next action without
  removing the confirmed fresh-journey option.
- Added completed-save title actions for exploring the afterglow or viewing the
  ending again, with clear afterglow language in the room story and grotto map.
- Compressed the ending into a polished two-column layout at short landscape
  sizes so its message, collection state, and all three choices fit at once.
- Completed an 11-room late-campaign playtest, intentionally left one Tideglass
  memory behind, recovered it after the ending, and brought the deterministic
  suite to 172 checks.

## 0.11.0 — Paths remembered

- Added a complete grotto map that distinguishes restored rooms, the current
  path, and still-sleeping chambers across all five biomes.
- Made every restored room replayable, so a missed echo seed can always be
  recovered without restarting the journey.
- Preserved one explicit campaign frontier through seed collection, replayed
  room completion, map travel, title returns, and normal continuation. Replay
  can no longer move save progress backward.
- Marked each mapped room's memory as found, waiting, or absent; the map draws
  attention to recoverable memories without unlocking future rooms.
- Added revisit copy in the room story and restoration screen, automatic return
  to the deeper path after a replayed solve, and an anytime Map control for
  keyboard, pointer, touch, and assistive-technology users.
- Verified missed-memory recovery and both return paths at desktop and
  667 × 375 phone-landscape sizes, bringing the deterministic suite to 169
  checks.

## 0.10.0 — Echoes kept

- Turned all 15 optional echo seeds into an original narrative collection
  spanning Mosswake, Prism Pools, Hushroot, and Tideglass.
- Added an accessible lantern journal with biome progress, discovered stories,
  gently obscured missing entries, and a distinct completion message when
  every memory returns.
- Reconstructed discoveries from the seed IDs already present in local saves,
  so existing journeys gain their full collection without a save migration.
- Made each new memory appear in the room's companion card, promoted the seed
  counter into a journal control, and added compact collection access wherever
  short layouts hide that counter.
- Contained background scrolling while dialogs are open, preserved Escape and
  focus-return behavior, and verified the journal at desktop and 667 × 375
  phone-landscape sizes.
- Added content-alignment, uniqueness, grouping, unknown-entry, and complete-
  collection coverage, bringing the deterministic suite to 165 checks.

## 0.9.0 — Remembered songs

- Added a persistent puzzle-status panel for every glimmer source, rootsong,
  and tide requirement, so special mechanics no longer depend on a fleeting
  announcement or sound cue.
- Made rootsongs readable note by note with their full glyph pattern,
  completed/current/upcoming states, exact progress, and screen-reader text
  naming both the pattern and next note.
- Kept status synchronized when light is collected or moved, bells are rung,
  tides change, rooms load, and puzzles reset, while keeping it hidden behind
  biome-arrival dialogs and omitting crystal solutions.
- Added compact high-contrast, large-text, reduced-motion, desktop, and touch
  layouts. At 667 × 375, the panel clears both the direction pad and Action
  control.
- Completed and recorded a five-room Prism-to-Hushroot playtest, including the
  first rootsong note by note, and expanded the deterministic suite from 138
  to 161 checks.

## 0.8.0 — Thresholds

- Added distinct arrival moments for Prism Pools, Hushroot Hollows, Tideglass
  Deeps, and Heartbloom Sanctum, giving each biome a narrative and visual
  threshold before its first puzzle.
- Made arrivals accessible status-bearing dialogs with deliberate focus, clear
  prose, and continuation through their button, Space, Enter, E, touch, or
  standard controller action.
- Locked movement and puzzle tools during each arrival, then restored focus to
  the game surface so transitions cannot consume or leak player input.
- Added additive save migration for acknowledged biomes. Unseen arrivals still
  appear for older saves, while acknowledged arrivals do not replay on resume.
- Completed and recorded a three-room cross-biome playtest at desktop and phone
  landscape sizes, bringing the unit suite to 138 checks.

## 0.7.0 — Living light

- Added full movement-and-action playthrough traces for all 20 rooms, including
  charge carrying, rootsongs, tide controls, every crystal, and all 15 optional
  echo seeds.
- Shared collision and interaction-selection rules between the runtime and
  playthrough verifier so tests exercise the same approach constraints players
  encounter.
- Made keyboard and controller action prefer the object Mica faces, while
  pointer input now honors the exact nearby object selected. This removes
  ambiguous bell, switch, source, and crystal interactions.
- Added verified room-length budgets and a biome pacing curve, including the
  intentional Tideglass breather before the Heartbloom finale.
- Added quiet visual feedback for blocked steps, collections, puzzle actions,
  resets, room entrances, and restoration without changing puzzle timing.
- Made Luma fully stationary in reduced-motion mode and added deterministic
  motion bounds, bringing the unit suite to 134 checks.

## 0.6.0 — First light

- Added a compact three-step guide to the opening room that follows the
  player from movement to the first crystal and disappears once the room is
  restored.
- Made guide copy adapt to keyboard, pointer, touch, and gamepad input without
  adding a permanent tutorial or blocking the playfield.
- Unified toolbar, keyboard, and controller hints so every input path updates
  the same visible, announced hint card.
- Tuned controllers with dominant-axis stick handling, drift protection,
  immediate direction changes, delayed hold repeat, and X/Y focus and hint
  shortcuts alongside standard A-button action.
- Focused the game surface when play begins, added a visible focus treatment,
  and isolated interface controls and dialogs from game keystrokes.
- Added deterministic controller mapping and repeat-cadence checks, bringing
  the unit suite to 90 checks.

## 0.5.0 — Lantern polish

- Reworked short-landscape layouts so the title call to action and playfield fit
  within a phone viewport, with 44-pixel touch controls and press-and-hold
  movement.
- Added focus-managed, Escape-closeable dialogs and a confirmation step before
  restarting a journey, while preserving progress when returning to the title.
- Hardened local saves against unavailable storage and repaired saves that had
  completed every room before the ending flag was written.
- Kept unrevealed hints out of the accessibility tree and improved hint and
  journey status announcements.
- Added an explicit PWA update flow, safer cache behavior, and standard 192- and
  512-pixel install icons. The first-paint icon is now about 97% smaller.
- Added recorded player-action completion traces for every room, bringing the
  deterministic unit suite to 87 checks.

## 0.4.0 — Playable campaign

- Built the complete five-biome, 20-room light-routing campaign.
- Added glimmer carrying, rootsong sequences, reversible tides, echo seeds,
  three-stage hints, focus mode, reset, and a finished ending.
- Added keyboard, pointer, touch, and gamepad input.
- Added local autosave, backup recovery, export/import, accessibility settings,
  installable PWA behavior, and offline caching.
- Added original key art and Heartbloom app artwork.
- Added strict type checking, 65 deterministic content/save checks, production
  build verification, and rendered-shell tests.
