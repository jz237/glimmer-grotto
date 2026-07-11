# Structured playtests

Playtests use a repeatable scenario, record the input and viewport, and turn
every observed defect into either a fix or a named follow-up. Agent-assisted
passes validate mechanics and instrumentation; external human observation is
still required before content freeze.

## 2026-07-11 — Trusting only the stored light we can prove

- **Build:** 0.50.0 release candidate
- **Scenario:** Complete installation, replace a cached generated script with
  same-MIME corrupt bytes, request it online while refresh races validation,
  then repeat corruption offline; exercise valid shell, core, production Phaser,
  JSON predecessor, and legacy predecessor reads.
- **Inputs:** cached Response clone, marker manifest, URL digest lookup, SHA-256,
  validation memo, cache delete, concurrent network put, memo invalidation,
  offline rejection, current and predecessor cache selection.
- **Viewport:** first offline load, active journey, engine loading recovery,
  update bridge, installed PWA, and background state across desktop, narrow,
  touch, keyboard, large text, high contrast, and controller-only input.
- **Coverage:** valid current response, corrupt current response, online repair,
  repair/delete race, repaired cache retention, corrupt offline script rejection,
  corrupt entry deletion, production engine digest, one-use memoization,
  background-put invalidation, legacy handoff, offline shell, and build.

### Observations

- The v43 marker proved what installation intended to store, but fetch handling
  still trusted whatever body CacheStorage later returned. Browser eviction or
  corruption after completion could therefore bypass the manifest entirely.
- Manifest-backed cache matches now resolve the expected digest and hash the
  stored clone before returning it. Successful URL/digest pairs are memoized for
  that worker lifetime, bounding the cost to one pass per unchanged response.
- A mismatch is a cache miss. Online, the concurrent refresh supplies and stores
  the healthy response; offline, the corrupt script is deleted and the request
  fails safely instead of executing unknown bytes.
- Validation re-reads before deletion. If the refresh won the race and already
  stored the expected bytes, cleanup preserves that repair rather than deleting
  it based on the stale corrupt clone.
- Every successful background put clears the affected verification memo. The
  next cached use must therefore prove the replacement body against the release
  manifest again.

### Follow-up

- Profile first-use digest latency for the production Phaser chunk on low-end
  phones and installed PWAs, then consider idle-time verification if needed.
- Continue the zero-severe-defect review through network responses whose MIME is
  valid but whose hashed asset URL and body do not belong to the same release.

## 2026-07-11 — Fingerprinting every stored light

- **Build:** 0.49.0 release candidate
- **Scenario:** Install every release response, fail the final marker write,
  inject an extra partial asset, retry, then rerun installation with the same
  cache name but changed notice bytes; separately fail a background asset put.
- **Inputs:** response clones, ArrayBuffer bytes, Web Crypto SHA-256, sorted URL
  manifest, cache state, current cache deletion/reopen, resource puts, marker
  put, same-name reuse, network refresh, predecessor compatibility.
- **Viewport:** first install, update, active journey, loading recovery, offline,
  private and installed PWA states across desktop, narrow, touch, keyboard, and
  controller-only input; the defect is storage-temporal rather than geometric.
- **Coverage:** ten-resource manifest, 64-digit SHA-256 entries, deterministic
  marker, failed marker write, incomplete state, stale-entry deletion, clean
  retry, changed same-name content, rebuilt notice, failed background put,
  network response, predecessor marker compatibility, and production build.

### Observations

- A last-written plain marker proved that all puts had completed, but not which
  bytes they represented. Reusing the same cache name after source changed could
  accept a stale complete cache solely because its marker text still matched.
- Installation now hashes every fetched response and records sorted URL/digest
  pairs beside the cache name. Existing state is reusable only when the entire
  serialized manifest equals the newly computed expectation.
- A marker or resource put that fails leaves no matching manifest. Retry deletes
  that incomplete cache before writing, removing stale extras as well as partial
  responses, and writes completion only after every new response succeeds.
- State inspection distinguishes incomplete from unavailable. A transient read
  failure stops the new install but does not delete a possibly active complete
  cache; the prior worker remains available.
- Background refresh stays intentionally looser: a failed opportunistic put is
  swallowed after the fresh network response is secured, so online play does
  not depend on cache quota.

### Follow-up

- Measure digest/install time and memory on low-end mobile hardware with the
  production Phaser chunk and two-version bridge under CPU throttling.
- Continue the zero-severe-defect review through corrupt cached response bodies
  after completion and integrity validation when serving offline entries.

## 2026-07-11 — Making the update bridge travel light

- **Build:** 0.48.0 release candidate
- **Scenario:** Activate with current, marked predecessor, older, and future
  caches; throw current cache reads and cache enumeration independently; then
  compare duplicate assets, unique old chunks, navigation, shared documents,
  client claim, and healthy network delivery before and after pruning.
- **Inputs:** CacheStorage match/keys failures, network refresh, complete marker,
  current cache, predecessor cache, request paths, cache entry deletion,
  `clients.claim()`, late old import, offline navigation, update retry.
- **Viewport:** active journey, title, update notice, engine loading recovery,
  installed PWA, offline, and background-tab states across desktop, narrow,
  large text, high contrast, reduced motion, touch, and controller-only input.
- **Coverage:** failed cache read, online fallthrough, failed enumeration,
  claim continuity, current-core lookup, duplicate asset pruning, non-asset
  pruning, unique old asset retention, marker retention, cleanup containment,
  offline bridge, and production build.

### Observations

- Cache matching previously sat in front of a healthy network refresh without a
  failure boundary. If CacheStorage rejected, `respondWith` rejected too even
  when the requested script or shared file was available online.
- Current and predecessor lookup now returns a cache miss on any storage error,
  allowing the already-started network request to supply the response. Offline
  behavior remains unchanged when neither source is available.
- Activation cleanup now treats failed enumeration and deletion as optional and
  proceeds to claim clients. A storage fault cannot keep a fully installed
  worker from owning its network-capable page.
- Once the current cache is active, the predecessor needs only its completion
  marker and asset URLs absent from current. Pruning removes root, notices,
  certificate, icons, and duplicate bundles while preserving every unique old
  chunk an open page can still name.

### Follow-up

- Measure real CacheStorage quota and eviction behavior with two consecutive
  production-sized Phaser releases on private and installed browser profiles.
- Continue the zero-severe-defect review through failed cache writes during
  install and background refresh, including quota exhaustion and partial puts.

## 2026-07-11 — Bridging an already-open page across updates

- **Build:** 0.47.0 release candidate
- **Scenario:** Install a complete new worker, time out its requested activation,
  let it claim an older page later, remove that page's hashed engine from the
  network, then navigate offline and request shared core files; also seed older,
  unrelated, incomplete, and future caches before activation.
- **Inputs:** complete-release marker, current and predecessor cache names,
  recursive asset graph, late `clients.claim()`, old hashed import, current
  navigation, notices, cleanup, activation retry, keyboard, touch, controller.
- **Viewport:** active journey, title, update notice, loading recovery, and
  installed PWA at desktop, narrow, large text, high contrast, reduced motion,
  controller-only, offline, and background-tab states.
- **Coverage:** marker written last, legacy v40 migration, one retained
  predecessor, old lazy-engine fallback, current-shell preference, current-core
  preference, future-cache rejection, older-cache deletion, unrelated-cache
  isolation, client claim, offline recovery, and production build.

### Observations

- The activation timeout correctly removed its reload listener, but the worker
  had already received `SKIP_WAITING` and could still activate later. Its prior
  cleanup deleted every old grotto cache before claiming the still-running old
  page, so that page could no longer fetch an old lazy chunk removed by deploy.
- A cache marker is now stored only after the entire discovered asset graph and
  fixed release files succeed. Activation retains the newest valid predecessor
  below the current cache version and removes every older or future candidate.
- Generated assets resolve from current cache, then the retained predecessor.
  This is narrow enough to support an old page's content-hashed imports without
  making a new page depend on old navigation or shared release documents.
- Navigation and core lookups name the current cache explicitly. Cache creation
  order therefore cannot silently return an older shell, notice, certificate,
  or same-named resource after activation.

### Follow-up

- Exercise the full waiting-worker, timeout, late-claim, old-chunk, retry, and
  reload sequence in physical installed PWAs across the supported browser set.
- Continue the zero-severe-defect review through cache-quota eviction and
  transactional install writes that fail while the completion marker is stored.

## 2026-07-11 — Giving every engine retry its own key

- **Build:** 0.46.0 release candidate
- **Scenario:** Stall one lazy import, invalidate it, begin a replacement, then
  invoke the old invalidator and settle both deliveries in either order; also
  attempt to invalidate an unrelated promise and a fulfilled cached module.
- **Inputs:** exact delivery promise, loader attempt number, pending work,
  fulfilled cache, timeout, failed timer setup, retry, late resolution/rejection,
  concurrent preload, React attempt ownership, keyboard, touch, and controller.
- **Viewport:** loading and recovery at desktop, narrow, large text, high
  contrast, reduced motion, controller-only, hidden page, and installed PWA.
- **Coverage:** exact-owner invalidation, unrelated owner rejection, obsolete
  generation rejection, new delivery retention, old-caller settlement,
  fulfilled-cache retention, failed-import retry, no-pending no-op, source
  integration, shipped interface, and production build.

### Observations

- The generation counter already stopped a late import result from replacing a
  newer cache, but invalidation itself targeted whichever promise happened to be
  globally pending. Correctness therefore still relied on every obsolete timer
  being perfectly suppressed before it reached the loader.
- Invalidation now accepts the exact promise returned to the watching attempt.
  If that promise no longer owns pending delivery, the request is a no-op and
  the current retry continues untouched.
- Successful delivery now moves the module into a distinct cache value and
  clears pending ownership. A late timeout cannot evict already delivered
  Phaser, while later sessions still reuse it without another import.
- Rejected and explicitly abandoned generations remain retryable. Their callers
  may observe their own result, but attempt numbers isolate every cache and
  cleanup decision from the current generation.

### Follow-up

- Exercise real offline-to-online retry while a service worker replaces the
  hashed engine asset and an older network request finishes late.
- Continue the zero-severe-defect review through update-era chunk mismatch and
  an activation that completes after the current page's asset graph changed.

## 2026-07-11 — Letting the cave view return

- **Build:** 0.45.0 release candidate
- **Scenario:** Lose a WebGL context once, deliver duplicate loss events, restore
  it, fail deterministic redraw, destroy before a late loss, and make the event
  cancellation boundary throw.
- **Inputs:** context guard, `webglcontextlost`, event cancellation, runtime
  pause, `webglcontextrestored`, deterministic redraw, manual restart, Canvas
  fallback, title escape, keyboard focus, touch, and controller navigation.
- **Viewport:** active play and renderer recovery at desktop, narrow, large text,
  high contrast, reduced motion, controller-only, hidden page, and installed
  PWA.
- **Coverage:** first loss, once-only `preventDefault`, duplicate loss, throwing
  cancellation, restoration admission, redraw failure, destroyed-context no-op,
  listener integration, shipped engine, and production build.

### Observations

- The app already listened for context restoration and could redraw the room,
  but its loss listener did not cancel the default event behavior. Under the
  WebGL contract, that leaves the context non-restorable and makes waiting for
  automatic recovery ineffective.
- The renderer guard now cancels the event only after it owns the first loss.
  Play pauses and the accessible recovery surface appears immediately, while
  the browser is permitted to restore the same drawing context.
- Duplicate loss events cannot increment policy or repeat cancellation. A loss
  after destroy remains ignored, preserving terminal renderer ownership.
- Cancellation failure is contained after the guard records loss. The player
  still gets manual restart, alternate rendering, and title escape rather than
  invisible input or a crashed recovery handler.

### Follow-up

- Exercise real and `WEBGL_lose_context`-simulated restoration across the
  physical browser/GPU matrix, including installed PWAs and background tabs.
- Continue the zero-severe-defect review through repeated recovery requests and
  generation-specific lazy-import invalidation.

## 2026-07-11 — Giving a stalled engine a fresh path

- **Build:** 0.44.0 release candidate
- **Scenario:** Leave the lazy engine import pending past its deadline, retry
  before the old promise settles, then resolve or reject both generations in
  either order; also exercise cached success, concurrent preload, cleanup, and
  unavailable timer infrastructure.
- **Inputs:** 15-second delivery watchdog, loader generation, invalidation,
  retry, late resolution/rejection, React attempt ownership, cleanup, loading
  recovery, title escape, keyboard focus, touch, and controller navigation.
- **Viewport:** loading and recovery at desktop, narrow, large text, high
  contrast, reduced motion, controller-only, hidden page, and installed PWA.
- **Coverage:** stalled delivery, successful invalidation, no-pending no-op,
  genuinely new import, old-caller settlement, new-cache ownership, stale mount
  suppression, cleanup cancellation, timer failure, recovery copy, source
  integration, shipped interface, and production build.

### Observations

- The retryable loader previously cleared rejected imports, but a promise that
  never resolved or rejected remained the shared pending value forever. Every
  recovery attempt therefore joined the same stalled delivery.
- Engine delivery now has a deadline distinct from renderer readiness. Timeout
  invalidates the pending generation before publishing normal load recovery, so
  the next player request starts a new dynamic import.
- Attempt numbers keep an abandoned promise from clearing or replacing its
  successor. The old caller may observe its own result, but React has already
  ended that attempt and cannot mount or publish it.
- Cleanup cancels its watchdog without invalidating otherwise healthy shared
  work. Only delivery timeout or failed timer setup abandons the shared import;
  a successfully cached module remains immediately reusable.

### Follow-up

- Exercise slow/offline dynamic-chunk delivery with real service workers and
  background-tab timer clamping before tuning the 15-second deadline.
- Continue the zero-severe-defect review through repeated recovery requests,
  retry pacing, and asset-integrity mismatch after an offline update.

## 2026-07-11 — Bounding a view that never becomes ready

- **Build:** 0.43.0 release candidate
- **Scenario:** Return a game handle that emits ready immediately, just before
  deadline, never, or after timeout; fail timer setup/clear, throw timeout
  recovery, change sessions before deadline, and stall automatic and Canvas
  attempts independently.
- **Inputs:** 12-second watchdog, attempt event wrapper, ready, timeout, cleanup,
  stale callback, renderer identity, handle destroy, parent cleanup, alternate
  and same-mode retry, title, keyboard focus, touch, and controller navigation.
- **Viewport:** loading and recovery at desktop, narrow, large text, high
  contrast, reduced motion, controller-only, hidden page, and installed PWA.
- **Coverage:** valid/invalid deadline, one arm, one timeout, exact ready cancel,
  cleanup cancel, late callback suppression, setup/clear/callback failure,
  exact-handle destruction, automatic/Canvas timeout copy, recovery focus,
  session preservation, source integration, shipped interface, production build.

### Observations

- Renderer construction can return a handle before Phaser boots the scene. If
  that scene never emitted ready, the loading overlay had no terminal state even
  though import and synchronous construction had both appeared successful.
- Each attempt now arms its watchdog before calling `mountGame`. A synchronous
  or later ready event cancels the same watchdog; cleanup does likewise before
  destroying the attempt.
- Timeout marks the attempt ended before destruction, so teardown events cannot
  publish into React. Only that handle and canvas are removed; local progress,
  renderer-mode policy, and all recovery choices remain available.
- If timer infrastructure itself fails, construction enters immediate renderer
  recovery rather than pretending an unbounded attempt is safe. Focus lands on
  the alternate renderer when one was attempted, or normal retry for delivery.

### Follow-up

- Bound the lazy engine import itself so a never-settling module delivery cannot
  remain on the loading surface before renderer construction begins.
- Exercise readiness timing under CPU throttling and background-tab timer
  clamping to tune the deadline from real-device evidence without false timeouts.

## 2026-07-11 — Keeping an exit from either rendering path

- **Build:** 0.42.0 release candidate
- **Scenario:** Fail module import, automatic renderer construction, and Canvas
  construction independently; retry the same mode, choose the alternate, return
  to title, switch both ways in Settings from title and active play, and verify
  loss-threshold behavior before and after an explicit automatic reset.
- **Inputs:** import/mount phase boundary, automatic/Canvas failure identity,
  default and secondary recovery actions, Settings switch, modal-held remount,
  session counter, loss history, save export/import, keyboard, touch, controller.
- **Viewport:** load recovery and Settings at desktop, narrow, large text, high
  contrast, reduced motion, controller-only, and installed-PWA layouts.
- **Coverage:** module-only retry, automatic failure to Canvas, Canvas failure to
  automatic, same-mode retries, title escape, session-only mode, in-play remount,
  Settings copy, explicit loss reset, retained automatic retry history,
  responsive control layout, shipped interface, and production build.

### Observations

- Load recovery previously treated import and renderer construction as one
  failure. Once Canvas was selected, a Canvas construction failure could only
  retry Canvas or abandon play, even if automatic rendering was now viable.
- Attempt-local phase tracking now identifies whether mounting actually began.
  Only renderer failures offer the alternate view; engine delivery failures keep
  a focused connection/retry message without implying a GPU problem.
- The alternate renderer is the default recovery target, followed by retrying
  the same mode and returning to title. Controller and keyboard users therefore
  encounter the most useful escape first without losing other choices.
- Rendering mode is intentionally session-only and absent from save/export. A
  Settings switch remounts the view in play or applies on next entry elsewhere;
  explicitly choosing automatic clears loss history and starts its bounded
  policy fresh.

### Follow-up

- Profile both renderers across the device matrix and tune which mode is
  recommended from measured frame pacing, battery, and construction evidence.
- Continue the zero-severe-defect review through automatic mount timeouts and
  synchronous hangs that neither resolve nor reject the lazy mount attempt.

## 2026-07-11 — Taking the stable view after repeated loss

- **Build:** 0.41.0 release candidate
- **Scenario:** Lose and restore WebGL once, restart the normal view, lose it a
  second time, fail redraw after a first loss, inject duplicate events and
  invalid counters, then continue several rooms and remount sessions in Canvas.
- **Inputs:** unique/duplicate context events, loss counter, redraw result,
  automatic/Canvas renderer selection, recovery action, room transitions,
  session remount, return to title, keyboard, touch, and controller navigation.
- **Viewport:** every biome on accelerated and Canvas rendering at desktop,
  narrow touch, large text, high contrast, reduced motion, and installed PWA.
- **Coverage:** first-loss automatic retry, second-loss threshold, immediate
  failed-redraw fallback, invalid counter, duplicate filtering, Phaser renderer
  config, attempt-local mount mode, journey retention, stable recovery copy,
  controller-default action, shipped interface/lazy bundle, and production build.

### Observations

- Restart view previously used `Phaser.AUTO` every time. On a device with an
  unstable WebGL path, the player could cycle indefinitely through loss,
  recovery, restart, and the same failing renderer.
- The first isolated loss still permits normal recovery. The second unique loss
  crosses a fixed threshold; a failed redraw crosses it immediately because the
  restored accelerated surface has already proven unusable.
- Recovery then remounts with `Phaser.CANVAS` and retains that mode for later
  room/session mounts. Puzzle state remains deterministic and local save data is
  unchanged because only renderer construction differs.
- Duplicate browser notifications cannot advance the counter, and non-finite
  counts conservatively keep automatic mode rather than forcing an unexplained
  fallback.

### Follow-up

- Profile Canvas frame pacing, battery use, high-contrast rendering, and 400%
  equivalent reflow on representative low-power and mobile devices.
- Continue the zero-severe-defect review through Canvas construction failure,
  explicit player reset to acceleration, and renderer-mode persistence policy.

## 2026-07-11 — Finding the cave view after context loss

- **Build:** 0.40.0 release candidate
- **Scenario:** Lose WebGL before boot, at rest, during movement, under a modal,
  while hidden, and during held touch; repeat loss/restoration events, fail room
  redraw, restore automatically, restart only the view, and destroy before a
  late browser event.
- **Inputs:** webglcontextlost/restored, renderer guard transitions, active and
  pre-boot runtime pause, animation settlement, keyboard, held touch, controller
  navigation, modal/visibility blockers, redraw failure, retry, and teardown.
- **Viewport:** loading, every biome, narrow touch, keyboard focus, controller-
  only, large-text, high-contrast, hidden/visible page, and installed PWA.
- **Coverage:** first/duplicate loss, matching/stray restore, terminal destroy,
  immediate pause, shared policy, held-touch stop, all disabled controls,
  application hiding, deterministic redraw, failed redraw, automatic focus,
  accessible recovery, view-only restart, listener cleanup, shipped lazy bundle,
  and production build.

### Observations

- Phaser restores WebGL resources, but the game loop continues during context
  loss. Without an application boundary, keyboard, controller, or repeating
  touch could mutate a room the player could no longer see.
- Context loss now owns a runtime blocker immediately. The DOM follows with a
  visible recovery surface, disabled puzzle controls, stopped touch scheduling,
  hidden canvas semantics, and focusable keyboard/controller actions.
- Once Phaser's restoration handler has rebuilt GPU resources, the scene redraws
  from deterministic puzzle state. Existing movement settlement prevents an
  interrupted tween from leaving the logical and visible player positions apart.
- If the browser never restores or redraw throws, Restart view replaces only the
  renderer session. The current local save and campaign frontier remain intact;
  returning to title is also always available.

### Follow-up

- Force real GPU resets and repeated context loss across integrated/discrete
  GPUs, Safari, Chromium, Firefox, Android WebView, and installed PWAs.
- Continue the zero-severe-defect review through repeated renderer-loss backoff,
  Canvas fallback, and avoiding recovery loops on unstable devices.

## 2026-07-11 — Leaving old action sounds behind

- **Build:** 0.39.0 release candidate
- **Scenario:** Suspend or interrupt Web Audio before movement bumps, crystal
  turns, seed collection, and room completion; reject, throw, delay, or fulfill
  context resume while repeating effects, then destroy during an in-flight
  attempt and act again after a successful fresh resume.
- **Inputs:** suspended/running/closed context states, synchronous and async
  resume failure, deferred fulfillment, repeated note/collect/solve calls,
  delayed tone timers, settings changes, and audio teardown.
- **Viewport:** active play, hidden/visible page, modal pause, installed-PWA
  return, and device-audio interruption with music/effects at zero and nonzero.
- **Coverage:** silent suspended action, rejected retry, synchronous retry,
  one in-flight resume, no stale oscillator, fresh post-resume note, ambient
  graph continuity, pending-owner release, idempotent destroy, source
  integration, and production build.

### Observations

- Web Audio time can remain frozen while suspended. Creating an effect oscillator
  in that state allowed it to become audible only when the context resumed,
  detached from the move or puzzle action that originally caused it.
- Suspended wake-up now starts one resume attempt and returns false. Callers stop
  before creating the action oscillator or scheduling follow-up tones, so the
  blocked action remains silent rather than replaying later.
- Repeated effects share the same in-flight attempt. Fulfillment or rejection
  clears its owner, allowing a later gesture to retry; a successful resume still
  requires that fresh gesture before an effect note is created.
- Destroy and failure clear pending ownership before closing the context. Late
  promise settlement has no graph to revive and cannot affect gameplay.

### Follow-up

- Exercise autoplay, Bluetooth route changes, phone-call interruptions, screen
  lock, and installed-PWA return on iOS, Android, Safari, and Chromium devices.
- Continue the zero-severe-defect review through renderer context loss and
  visible recovery when the canvas can no longer present a frame.

## 2026-07-11 — Applying each pause boundary once

- **Build:** 0.38.0 release candidate
- **Scenario:** Repeat every pause and resume policy request, throw or defer the
  first scene transition, finish scene boot under a modal, and churn modal plus
  visibility blockers while holding keyboard movement, controller direction,
  action, journal, and menu controls.
- **Inputs:** repeated policy synchronization, pre-boot inactive scene, ready
  retry, throwing/deferred dependencies, keyboard down/repeat/up, gamepad held
  frames, neutral release, controller identity, and runtime destruction.
- **Viewport:** loading, active play, modal handoff, hidden/visible page, load
  recovery, and return-to-title on keyboard and controller layouts.
- **Coverage:** initial resume no-op, one pause per edge, one resume per edge,
  failed pause retry, deferred pause retry, failed resume retry, post-destroy
  rejection, ready synchronization, keyboard clearing, controller snapshot,
  direction neutral release, source integration, and production build.

### Observations

- The policy can legitimately synchronize twice around one React handoff: once
  from the event and again after the committed state. Pause happened to avoid a
  duplicate because Phaser was already inactive, but resume redispatched both
  times and repeatedly reset input admission.
- The first late-mount pause could also run before the Phaser scene became
  active. Treating that no-op as success latched the handle as paused even
  though the newly booted scene would then run behind the modal.
- The runtime handle now records only successfully applied transitions. A
  repeated desired state is a no-op; throws and explicit pre-boot deferrals keep
  the prior state so a later pass can retry.
- Scene ready schedules that retry against the current handle and policy. A real
  resume still snapshots held gamepad state and clears keyboard admission before
  enabling the scene, so blocker churn cannot replay an old edge.

### Follow-up

- Exercise combined blocker churn under installed-PWA background throttling and
  physical controller reconnects on the current/previous browser matrix.
- Continue the zero-severe-defect review through lifecycle state after renderer
  loss, browser context restoration, and audio-context suspension.

## 2026-07-11 — Keeping every pause reason intact

- **Build:** 0.37.0 release candidate
- **Scenario:** Open and close each modal while visible and hidden, return to the
  page with and without a modal, finish a delayed game mount under each blocker,
  trigger and retry load recovery, visit a map room, and move between playing,
  title, and ending screens.
- **Inputs:** modal activate/dismiss, visibilitychange, delayed mount completion,
  load failure/retry, map visit, return to title, page gamepad navigation, and
  combined blocker transitions in every ordering.
- **Viewport:** title, loading, load recovery, active play, hidden/visible page,
  ending, and every dialog at desktop, narrow, touch, and controller layouts.
- **Coverage:** runnable baseline, each independent blocker, blocker precedence,
  modal close while hidden, visible return under a modal, late mount, load error,
  screen transition, guarded map visit, one resume path, source integration, and
  full production build.

### Observations

- Dialog close callbacks previously called `resume()` directly. If a dialog was
  closed programmatically while the page was hidden, that callback discarded
  the visibility pause before the page had actually returned.
- A modal could also open while the lazy engine was still loading. Its immediate
  pause saw no handle, and the later mount started without inheriting the open
  dialog or hidden-page blocker.
- One policy now decides between pause and resume from screen, modal, page, and
  load state. Every close and visibility event recomputes the whole policy rather
  than undoing only the reason it happens to know about.
- A new handle is synchronized as soon as it becomes current. Repeated policy
  applications are safe, and only the coordinator contains a resume call.

### Follow-up

- Exercise pause/resume ownership under background throttling, installed-PWA
  lifecycle events, screen readers, and physical gamepads on real devices.
- Continue the zero-severe-defect review through idempotent scene pause/resume
  application and neutral input after combined blocker churn.

## 2026-07-11 — Handing one dialog to the next

- **Build:** 0.36.0 release candidate
- **Scenario:** Issue menu, journal, map, Settings, help, and restart requests in
  rapid pairs and repeated batches; transition from the Lantern menu into every
  child surface, then invoke late close, gamepad cancel, map-visit, restart, and
  failed-open callbacks from the replaced surface.
- **Inputs:** batched activate/dismiss/clear transitions, menu action handoffs,
  queued callbacks, game events, gamepad B, Escape, backdrop close, map visits,
  restart confirmation, visibility return, and save import.
- **Viewport:** title, active play, game-load recovery, ending, and every modal at
  desktop, narrow, large-text, high-contrast, and controller-only layouts.
- **Coverage:** clear-state open, atomic replacement, repeated open, matched and
  stale dismiss, empty dismiss, idempotent clear, synchronous request ordering,
  guarded resume/visit/restart, page-controller gating, source integration, and
  all six exclusive render branches.

### Observations

- Independent booleans allowed queued events to make two dialogs true in one
  render. Both effects could then own document keys, body overflow, inert state,
  focus recovery, and controller polling at the same time.
- One modal identity now makes overlap unrepresentable. A new request replaces
  the old identity in the same state slot, including when several requests are
  batched before React renders.
- A synchronous mirror orders callbacks against the newest requested identity.
  Closing `menu` after it has handed off to `settings`, for example, is a no-op
  and cannot resume the paused puzzle underneath Settings.
- Closing, visiting from the map, and confirming restart all require a matched
  dismissal first. Repeated or delayed actions therefore cannot execute twice
  or mutate the replacement surface.

### Follow-up

- Exercise rapid dialog handoff with screen readers and physical gamepads on the
  current/previous browser matrix, watching top-layer, inert, and announcement
  continuity between effect cleanup and setup.
- Continue the zero-severe-defect review through pause ownership across modal,
  page visibility, game-load recovery, and title transitions.

## 2026-07-11 — Recovering focus as a dialog changes

- **Build:** 0.35.0 release candidate
- **Scenario:** Focus each dynamic Settings control, then insert or remove the
  manual-export surface and disable, hide, inert, untab, ancestor-block, or
  detach the active target. Programmatically move focus outside, remove focus
  without firing `focusin`, and close during a queued recovery callback.
- **Inputs:** focusin, Tab, Shift-Tab, Escape, Space, arrow keys, range controls,
  checkboxes, manual-export text selection, content/attribute mutations,
  detached containment methods, throwing focus, and dialog cleanup.
- **Viewport:** Settings and every other modal at desktop, narrow, large-text,
  high-contrast, and reduced-motion settings in both dialog rendering modes.
- **Coverage:** inside/outside containment, throwing containment, immediate
  outside recovery, document-level key handling, removed active content,
  blocked active attributes, mutation batching, reentrancy, cancelled queued
  repair, observer failure/disconnect, source wiring, and shipped bundle.

### Observations

- A listener attached only to the dialog cannot see the next key after its
  focused descendant is removed: browsers commonly leave `body` active, which
  sits outside the event path that previously owned Tab and Escape.
- The active dialog now owns document-level key and `focusin` listeners for its
  exact lifetime. Normal controls receive ordinary keys first, while modal keys
  and paused-game propagation remain contained even after focus displacement.
- A bounded observer watches dialog content and focus-affecting attributes. Its
  post-commit check leaves a still-valid target untouched and redirects only
  when the active target is outside, removed, or no longer eligible.
- Recovery is reentrancy-safe and best effort. A detached containment method or
  rejected focus cannot throw into React, and queued work becomes inert as soon
  as cleanup starts.

### Follow-up

- Exercise live insertion and removal with NVDA, JAWS, VoiceOver, TalkBack,
  Safari, and embedded WebViews on the physical browser matrix.
- Continue the zero-severe-defect review through rapid dialog-to-dialog handoff
  and protection against overlapping modal state.

## 2026-07-11 — Keeping keyboard focus in the dialog

- **Build:** 0.34.0 release candidate
- **Scenario:** Open every modal in native and attribute-fallback modes, then
  traverse each eligible control forward and backward from both edges. Disable,
  hide, inert, detach, or untab intermediate controls; start focus outside the
  surface and make individual focus methods throw.
- **Inputs:** Tab, Shift-Tab, Escape, links, buttons, checkboxes, ranges, file
  import, manual-export text, explicit tab stops, editable regions, disabled and
  hidden candidates, unexpected active targets, and throwing focus methods.
- **Viewport:** every modal at desktop, narrow, large-text, high-contrast, and
  reduced-motion settings in native and attribute-fallback rendering.
- **Coverage:** forward movement, reverse movement, both edge wraps, outside
  re-entry, blocked-target filtering, throwing-focus continuation, empty and
  fully failed cycles, initial eligible focus, source wiring, and shipped bundle.

### Observations

- Native modal focus behavior could not protect the attribute fallback, where
  Tab previously depended on the surrounding browser's partial dialog support.
- The dialog now owns one explicit sequence in both modes. Every Tab edge wraps
  to the opposite eligible control, and Shift-Tab follows the same order in
  reverse without exposing the inert game surface.
- Eligibility uses the same structural boundary as close-time focus restore, so
  a stale, disabled, hidden, inert, untabbable, aria-hidden, ancestor-blocked, or
  zero-layout target is never selected merely because it matched a CSS selector.
- A focus method that throws is contained and the cycle continues in the same
  direction. If no target can receive focus, the key is still consumed instead
  of entering the background interface.

### Follow-up

- Exercise the sequence with NVDA, JAWS, VoiceOver, TalkBack, Safari, and
  embedded WebViews on the physical browser matrix.
- Continue the zero-severe-defect review through focus changes caused by live
  dialog content insertion and removal, especially manual export and notices.

## 2026-07-11 — Opening a dialog without native help

- **Build:** 0.33.0 release candidate
- **Scenario:** Open and close every modal while `showModal` or `close` succeeds,
  is missing, throws, or returns without changing `open`; then fail attribute
  mutation and transition between dialogs.
- **Inputs:** structural dialog targets, existing/native/attribute/failed modes,
  throwing open and close methods, sibling inert ownership, body overflow,
  fallback classes, queued failure close, and focus restoration.
- **Viewport:** every modal at desktop, narrow, large-text, high-contrast, and
  reduced-motion settings with native and attribute fallback styling.
- **Coverage:** native open, existing open, missing/throwing/partial showModal,
  attribute fallback, total open failure, native and fallback close, inert
  siblings, pre-existing inert preservation, scroll cleanup, aria-modal, CSS,
  source integration, and shipped client bundle.

### Observations

- `showModal()` previously ran before the effect returned its cleanup function.
  If it threw, React never received listener, body-overflow, or focus cleanup and
  the requested dialog remained unavailable.
- Open now returns an explicit mode. Missing, throwing, or no-op native methods
  receive the `open` attribute; CSS supplies the full viewport/backdrop while
  sibling inertness and `aria-modal` preserve the interaction boundary.
- Siblings that were already inert are recorded as external state and left
  untouched. Only attributes added by this dialog effect are removed on cleanup.
- Native close is attempted first. A throw or missing method removes the open
  attribute without escaping cleanup; fallback classes, owned inertness, body
  overflow, listeners, and safe focus restoration then unwind in order.
- If even attribute open fails, a microtask invokes the normal close callback.
  The invisible broken surface cannot leave the scene paused indefinitely.

### Follow-up

- Exercise Safari and embedded WebView dialog top-layer, backdrop, inert, cancel,
  and focus behavior on the physical browser matrix.
- Continue the zero-severe-defect review through focus trapping and Tab/Shift-Tab
  wrap in both native and attribute-fallback dialogs.

## 2026-07-11 — Letting focus find a safe return

- **Build:** 0.32.0 release candidate
- **Scenario:** Open every modal from canvas, title, ending, toolbar, and another
  modal; remove, disable, hide, inert, untab, or ancestor-hide the invoking
  element before close, then make its focus method throw.
- **Inputs:** structural focus targets, connectedness, hidden/disabled/inert and
  tab-index state, aria-hidden attributes and ancestors, client rects, throwing
  focus, ordered fallback candidates, and current-screen DOM transitions.
- **Viewport:** all modal families at desktop, narrow, large-text, high-contrast,
  and controller navigation states.
- **Coverage:** initial focus, valid invoker return, every invalid-target class,
  focus exception, ordered fallback skipping, canvas return marker, title and
  screen defaults, source integration, and shipped client interface.

### Observations

- Modal cleanup previously called `focus()` directly on the element active
  before `showModal()`. React transitions can remove that element, disable it,
  hide its ancestor, or replace the whole screen before passive cleanup runs.
- Browsers differ in whether invalid focus silently fails or throws. Either path
  could leave focus on the closing dialog/body with no useful orientation.
- Both entry and return now use the same structural validator. A target must be
  connected, laid out, enabled, non-inert, non-hidden, tabbable, and outside
  inert or aria-hidden ancestry before the call is attempted.
- A failed previous target no longer ends restoration. All matching fallback
  candidates are evaluated in document order until the active canvas, current
  default action, enabled main control, or title lockup can safely receive focus.
- Focus exceptions are contained and the next fallback is attempted; the helper
  never asks a removed or blocked element to become active again.

### Follow-up

- Verify VoiceOver, NVDA, JAWS, TalkBack, and browser native dialog focus events
  across modal-to-modal and modal-to-screen transitions.
- Continue the zero-severe-defect review through dialog `showModal()` failure and
  unsupported/partially implemented native dialog behavior.

## 2026-07-11 — Leaving no old grotto running

- **Build:** 0.31.0 release candidate
- **Scenario:** Fail before and during Phaser construction, dispatch eligibility,
  command execution, pause/resume, scene shutdown, renderer destruction, and
  parent cleanup; then repeat destroy and invoke every handle operation late.
- **Inputs:** deterministic runtime dependencies, throwing can-dispatch and
  operation boundaries, pre-boot scene properties, partial constructor failure,
  reentrant/repeated destroy, and post-destroy move/visit/pause/resume attempts.
- **Viewport:** canvas mount and retry frame; no layout change beyond guaranteed
  removal of a partial renderer surface.
- **Coverage:** active dispatch, paused rejection, boundary containment,
  scene-before-renderer teardown, renderer attempt after scene failure,
  idempotence, terminal operations, pre-boot cleanup, original-error preservation,
  source integration, and the shipped lazy engine.

### Observations

- The original handle called scene shutdown and renderer destruction directly.
  If scene shutdown threw, Phaser cleanup never ran; repeated destroy or a late
  resume/visit could then reach partially detached objects.
- The runtime controller marks itself destroyed before the first cleanup call.
  Scene and renderer teardown are separate guarded boundaries, so both are
  attempted exactly once and no reentrant operation can revive the handle.
- Dispatch eligibility and command execution are independently contained. A
  paused scene still rejects ordinary commands while the supported visit path
  remains available only before terminal destruction.
- Scene shutdown now tolerates a constructor failure before tween or input
  managers exist and continues through browser listener and audio cleanup when
  one subsystem is already damaged.
- A synchronous Phaser constructor exception preserves the original error for
  the recovery UI after best-effort scene shutdown and removal of any canvas
  nodes attached before the throw.

### Follow-up

- Fault-inject Phaser boot events that fail asynchronously after constructor
  return and verify they can route into the same terminal recovery boundary.
- Continue the zero-severe-defect review through modal focus restoration when
  the invoking element disappears or becomes disabled.

## 2026-07-11 — Waking the lantern a second time

- **Build:** 0.30.0 release candidate
- **Scenario:** Preload and mount the lazy game module concurrently, reject or
  throw from import, leave the playing route before resolution, retry after
  recovery, fail mount construction, and tear down current and stale attempts.
- **Inputs:** deferred and shared promises, rejected and synchronous importers,
  successful cached modules, cancellation flags, attempt-local game handles,
  throwing destroy boundaries, controller navigation, and retry/title actions.
- **Viewport:** full game-frame failure surface at desktop, narrow, portrait,
  short-landscape, large-text, and high-contrast layouts.
- **Coverage:** shared in-flight import, rejection reset, success cache, hover/
  focus preload containment, stale load/failure silence, local teardown, visible
  alert, retry session, title escape, controller default, touch disablement, CSS,
  and shipped production copy.

### Observations

- The first dynamic-import promise was cached at module scope forever. A
  transient disconnected or browser failure therefore made every later journey
  attempt reject immediately even after connectivity recovered.
- Hover and focus started the same import without a rejection handler. A failure
  before entering play could surface as an unhandled promise rather than a
  controlled preload miss.
- Mount cleanup used the global game ref. React normally orders effects, but an
  attempt-local handle is the stronger invariant: an older cleanup can never
  destroy a newer game, and an older rejection cannot announce on another screen.
- Rejected import or mount now replaces the endless waking indicator with a
  concise alert. Try again starts a new session without discarding the save;
  Return to title remains available when the engine cannot run.
- The retry button is the controller-default target while this playing-route
  recovery screen is open, and all touch play controls stay disabled until the
  room-ready event proves a game actually mounted.

### Follow-up

- Exercise real offline-to-online recovery and cache eviction during hover,
  entry, retry, and rapid title/play transitions in installed PWAs.
- Continue the zero-severe-defect review through Phaser constructor and destroy
  failures that occur after partial browser listener or canvas setup.

## 2026-07-11 — Keeping motion in its own room

- **Build:** 0.29.0 release candidate
- **Scenario:** Interrupt movement and blocked-cell bump tweens with focus mode,
  settings and reduced-motion changes, room reset, map visit, seed/mote landing,
  and scene destruction; then invoke captured completion callbacks late.
- **Inputs:** deterministic move and bump leases, overlapping admission attempts,
  lifecycle invalidation, current and stale tokens, captured player identity,
  tween construction failure, redraw, and teardown.
- **Viewport:** active canvas under existing desktop, touch, zoom, and
  short-landscape layouts; the defect is temporal rather than geometric.
- **Coverage:** exclusive move/bump admission, once-only completion, redraw
  unlock, interrupted landing, generation change, replacement-player safety,
  failed tween setup, scene teardown, source integration, and lazy offline engine.

### Observations

- Room redraw called `killAll()` while motion tracked a separate boolean. If a
  focus or settings command arrived during movement, Phaser removed the tween's
  completion callback and nothing cleared the boolean; all later movement was
  rejected for the rest of the scene.
- Because logical `playerCell` advances before the visual tween, that redraw also
  rendered Mica at the destination but skipped the killed completion's landing
  handler. A seed or loose glimmer could be visually occupied but not collected.
- Move and bump now receive tokens from one lifecycle generation. Redraw first
  invalidates the generation and clears busy state, then rebuilds from logical
  state. If a move was active, landing is applied once after the rebuild.
- Completion closes its own lease before invoking game behavior and checks the
  captured player is still current and active. Old callbacks become no-ops after
  redraw, room replacement, failure recovery, or teardown.
- Bumps no longer overlap each other or movement, eliminating competing tweens
  that could reset a newer player position to an older origin.

### Follow-up

- Exercise real-frame focus/settings interruptions at 30, 60, and 120 Hz with
  Reduced motion toggled mid-step on desktop and mobile GPUs.
- Continue the zero-severe-defect review through asynchronous game-module mount,
  teardown, and retry races.

## 2026-07-11 — Touching only the intended tile

- **Build:** 0.28.0 release candidate
- **Scenario:** Press every grid edge and approachable object with primary,
  secondary, released, non-finite, and out-of-grid pointer samples while the
  fitted canvas changes size, then continue a solved room.
- **Inputs:** normalized Phaser world coordinates, button and primary-down state,
  exact cell boundaries and just-outside values, NaN/infinity, invalid cell
  geometry, walls, blooms, crystals, bells, tide controls, and charged sources.
- **Viewport:** fitted canvas at desktop, narrow, portrait, short-landscape, and
  zoom-equivalent layouts; coordinates are validated after Phaser normalization.
- **Coverage:** primary admission, finite coordinates, geometry validity, 13-by-7
  bounds, exact edge flooring, exact-object selection, blocked-cell behavior,
  solved continuation, production input chunk, and first-install offline cache.

### Observations

- The scene previously accepted every Phaser pointer-down. A right click could
  move, interact, or continue, and a non-finite or stale world sample crossed no
  explicit validation boundary before grid conversion.
- Blocked clicks called the general directional interaction method. That method
  intentionally falls back to another adjacent object for keyboard/action use;
  for pointers, a clicked wall could therefore operate a different nearby object.
- Pointer samples now cross one pure boundary: active primary button, finite
  world and geometry values, positive cell size, ordered integer bounds, and an
  authored-grid result are all required before the scene reacts.
- Exact clicked-cell lookup handles object presses. A non-object blocked cell may
  still produce the normal movement bump, but can never select another control.
- Phaser continues to own CSS-to-world normalization for its fitted canvas; the
  game now validates that normalized result and rejects resize-race sentinels.

### Follow-up

- Exercise rapid orientation changes, fractional device-pixel ratios, stylus
  primary/eraser buttons, and browser zoom on the physical device matrix.
- Continue the zero-severe-defect review through animation callbacks that outlive
  room, scene, or reduced-motion transitions.

## 2026-07-11 — Giving every key one intention

- **Build:** 0.27.0 release candidate
- **Scenario:** Exercise every gameplay key as a fresh press and repeat while
  composing text, holding Alt/Control/Command, moving focus through interactive
  DOM controls, hiding or blurring the page, and pausing/resuming the scene.
- **Inputs:** Arrow/WASD movement, Space/Enter/E action, R reset, C Compass, F
  focus, H hint, Escape menu, J memories, M map, native repeat flags, keyup,
  composition and key-code 229, default-prevented events, and browser modifiers.
- **Viewport:** focused canvas plus title tools and all dialog controls; this pass
  changes keyboard admission without changing layout.
- **Coverage:** complete mapping, scroll prevention, shortcut rejection,
  composition rejection, once-per-press actions, admitted movement repeat,
  interruption reset, protected focus targets, production input chunk, and lazy
  offline engine integration.

### Observations

- The scene previously matched only `event.code`. Control-R could reset the room
  while reloading the browser, Control-W or Command-W could move Mica before the
  tab closed, and Alt-Arrow could move while invoking browser history.
- Native repeat reached every command. Holding action, reset, focus, hint, or a
  menu key could retrigger state changes instead of behaving as one deliberate
  press.
- Mapping now rejects handled, composing, legacy composition, and browser-
  modified events before admission. Protected links, controls, dialogs, editable
  regions, and textbox roles continue to own their keyboard interaction.
- The pressed-key session records accepted first edges. Movement alone may
  repeat while that code remains pressed; every other intent waits for keyup.
  Focus, page, visibility, pause, and resume boundaries clear the session so a
  returning repeat cannot impersonate a new press.
- Arrow and Space defaults are prevented only for recognized game input, keeping
  the focused application stable without taking over unrelated browser keys.

### Follow-up

- Exercise international layouts, dead keys, screen-reader browse/application
  modes, and OS-level Sticky Keys on the physical browser matrix.
- Continue the zero-severe-defect review through pointer-to-canvas coordinate
  transforms and resize races.

## 2026-07-11 — Letting every touch hold end

- **Build:** 0.26.0 release candidate
- **Scenario:** Hold each touch direction while releasing inside and outside the
  control, losing capture, adding a second finger, hiding or leaving the page,
  opening every overlay, crossing a biome or room boundary, and replacing the
  running game session.
- **Inputs:** controlled delay and interval callbacks, matching and stale pointer
  IDs, pointer-up/cancel/lost-capture events, refused pointer capture, blur,
  visibility and page-hide events, throwing timer cleanup, and failed dispatch.
- **Viewport:** coarse-pointer portrait and landscape controls at existing narrow,
  short-landscape, large-text, and high-contrast breakpoints.
- **Coverage:** immediate move, 285 ms initial delay, 135 ms repeat, capture
  release, multi-touch replacement, late callbacks, global interruption, room
  and overlay transitions, touch-action CSS, and the shipped client bundle.

### Observations

- Directional buttons previously cleared their raw timers on local pointer-up,
  cancellation, lost capture, and component teardown. Blur, hidden pages, page
  hide, room transitions, and overlays could leave a repeat scheduled; paused
  commands were ignored but could resume against the next active room.
- A release from an older finger also had no identity check and could cancel a
  newer hold. The new controller makes pointer ownership explicit: a new touch
  safely replaces the old one, while stale releases cannot stop the owner.
- Every stop increments a generation before timer cleanup. A browser that throws
  or silently leaves a callback queued can therefore invoke only an inert
  closure, never a move in a later room or session.
- Pointer capture is attempted but no longer required for safe operation. Global
  pointer-up/cancel listeners bound the hold when capture is refused, and every
  stop best-effort releases capture without throwing into play.
- Directional controls now opt out of native panning and selection, while all
  browser cancellation paths remain handled instead of assumed away.

### Follow-up

- Exercise long holds, two-finger swaps, OS gesture interception, and app
  backgrounding on iOS/iPadOS Safari and Android Chromium installed PWAs.
- Continue the zero-severe-defect review through keyboard repeat and composition
  edge cases.

## 2026-07-11 — Returning with quiet controls

- **Build:** 0.25.0 release candidate
- **Scenario:** Hold every controller direction and action while disconnecting,
  swapping controller identity, hiding the tab, blurring the window, opening a
  dialog, and resuming the puzzle; then release and press again deliberately.
- **Inputs:** indexed connected and stale-disconnected gamepad slots, held D-pad
  and stick directions, held action/menu/view buttons, visibility and page-hide
  events, window blur, modal transitions, and scene pause/resume.
- **Viewport:** title, ending, each dialog family, and the canvas at existing
  desktop and responsive layouts; this pass changes input lifecycle, not layout.
- **Coverage:** first-frame synchronization, neutral-release requirement,
  controller identity swap, stale-slot filtering, listener teardown, DOM bundle,
  lazy engine bundle, and first-install offline retention.

### Observations

- A controller that replaced another between animation frames could previously
  inherit the old controller's held-button history, turning an already-held
  button into a fresh action or an immediate menu request.
- Animation polling pauses in hidden tabs. Input that began while hidden could
  therefore appear as a new edge on return, while a held direction could resume
  against an expired repeat timestamp.
- One shared session guard now marks every focus, visibility, page, connection,
  identity, and scene boundary. The next frame captures current controls without
  acting; held input remains suppressed until neutral, then works normally.
- Disconnected slots are ignored even if a browser leaves their objects in the
  gamepad array. A different connected index is treated as a new session without
  requiring an observable empty frame.
- Every browser listener is paired with effect or scene cleanup, so destroyed
  games and closed dialogs cannot respond to future lifecycle events.

### Follow-up

- Verify device-specific connection events and index reuse with Xbox, PlayStation,
  Switch Pro, and generic USB/Bluetooth controllers in the browser matrix.
- Continue the zero-severe-defect review through pointer cancellation and
  interrupted touch gestures.

## 2026-07-11 — Updating without a surprise reload

- **Build:** 0.24.0 release candidate
- **Scenario:** Accept a waiting offline update while registration lookup,
  activation messaging, controller replacement, timeout, or reload succeeds or
  fails, then retry from the still-running version.
- **Inputs:** deterministic waiting workers, controller-change listeners,
  controlled timers, throwing browser boundaries, repeated activation events,
  and the production client bundle.
- **Viewport:** existing title and game toolbars at desktop, narrow, large-text,
  and high-contrast breakpoints; the compact update action retains its geometry.
- **Coverage:** direct reload, pending state, duplicate-click prevention,
  activation reload, eight-second timeout, listener and timer cleanup, late
  events, registration/message failure, retry copy, and shipped artifact text.

### Observations

- Update activation previously installed an unbounded controller-change
  listener. If a browser failed to activate promptly, the interface offered no
  result and that stale listener could reload a later active puzzle.
- Activation now has one cleanup path for success, timeout, and failure. It
  removes the listener, clears the timer, and ignores all later events after the
  attempt settles.
- The update action exposes a busy state and cannot start competing attempts.
  Timeout or failure keeps the current build playable, announces what happened,
  and restores the same action for an intentional retry.
- If the waiting worker already disappeared, the coordinator retains the safe
  direct-reload path rather than reporting a false failure.

### Follow-up

- Exercise delayed activation, background-tab throttling, and installed-PWA
  update prompts across Safari, Firefox, Chromium, iOS, and Android.
- Continue the zero-severe-defect review through controller disconnect and
  interrupted visibility transitions.

## 2026-07-11 — Keeping a copy without a download

- **Build:** 0.23.0 release candidate
- **Scenario:** Request a save export while blob creation, object URL creation,
  link activation, delayed cleanup, or clipboard access succeeds or fails, then
  preserve and re-import the resulting exact JSON text.
- **Inputs:** deterministic download links and URL factories, controlled cleanup
  callbacks, throwing browser boundaries, clipboard rejection, keyboard focus,
  and controller dialog navigation.
- **Viewport:** Settings at existing desktop, narrow, large-text, and
  high-contrast breakpoints; the fallback remains inside the dialog scroll area.
- **Coverage:** attached activation, truthful status copy, one-second URL
  lifetime, immediate failure cleanup, complete read-only JSON, focus selection,
  clipboard success/fallback, import reset, offline bundle, and CSS containment.

### Observations

- Export previously clicked a detached link, revoked its object URL immediately,
  and announced success unconditionally. Browsers that require attachment or
  defer consuming the URL could receive no file while the interface said the
  save was exported.
- The link is now attached before activation and removed with its URL after a
  one-second grace period. The interface says the download was requested because
  browsers do not expose reliable evidence that the user retained the file.
- Any setup, activation, or cleanup-scheduling failure immediately cleans up and
  reveals the same canonical JSON used by import. No alternate serialization or
  lossy recovery format was introduced.
- The manual field selects all text on focus. A dedicated Copy action uses the
  secure Clipboard API when available and otherwise focuses and selects the
  field with explicit device-copy guidance.
- The fallback uses the existing Settings status region and dialog navigation,
  fits its container at narrow widths, scales with Larger text, and receives the
  stronger High contrast border.

### Follow-up

- Exercise actual file acceptance and clipboard permission prompts on Safari,
  Firefox, Chromium, iOS, and Android installed PWAs.
- Continue the zero-severe-defect review through service-worker update timeout,
  controller disconnect, and interrupted visibility transitions.

## 2026-07-11 — Making autosave tell the truth

- **Build:** 0.22.0 release candidate
- **Scenario:** Load valid, repairable, corrupt, and absent saves; then make
  primary writes, backup writes, removals, or read-back verification fail while
  progressing, importing, and confirming a fresh journey.
- **Inputs:** deterministic storage implementations that persist, throw,
  silently drop writes, reject only the primary, or reject only the backup,
  plus source-level interface visibility checks.
- **Viewport:** existing responsive banner geometry; the failure notice uses the
  same tested title, play, ending, narrow, large-text, and high-contrast surface.
- **Coverage:** normal save, read-back verification, primary-only and backup-only
  redundancy, unavailable storage, repaired primary, recovered backup, corrupt
  reset, durable restart, import messaging, offline copy, and live-play warning.

### Observations

- Storage calls previously swallowed every exception and returned only the
  reconciled in-memory save. A browser could start normally, later reject quota
  or privacy writes, and still announce “Journey saved” while new progress
  existed only until the tab closed.
- Primary and backup writes are now read back synchronously. Silent drops are
  treated the same as thrown failures, while a surviving generation is named
  accurately rather than collapsing every degraded state into “unavailable.”
- Confirming restart previously removed both generations best-effort and kept a
  fresh save only in memory. If removal failed, the old journey could return on
  reload. Restart now writes a verified fresh primary and neutralizes the old
  backup before play resumes.
- Initial repair, backup recovery, room progress, settings, ending, and import
  all carry persistence health to the interface. The warning is available
  during active play, remains dismissible, and directs the player to export
  without blocking movement or puzzle state.
- Save writes no longer run inside a React state updater. The synchronous save
  reference advances before the next game event, so back-to-back room and
  memory events remain ordered without duplicate strict-mode side effects.

### Follow-up

- Fault-inject object-URL creation and download activation so manual export
  failures receive equally truthful recovery guidance.
- Exercise storage eviction, private browsing, and quota transition behavior on
  physical installed PWAs in the current/previous browser matrix.

## 2026-07-11 — Letting sound fail quietly

- **Build:** 0.21.0 release candidate
- **Scenario:** Inject failures at every optional-audio lifecycle boundary,
  continue issuing game sounds and teardown calls, then build and inspect the
  exact lazy engine under restricted release automation.
- **Inputs:** direct audio wake, note, bump, collect, settings, and destroy
  operations with fake contexts, gains, oscillators, rejected promises, and
  controlled timers.
- **Viewport:** runtime-independent reliability pass; no interface geometry or
  visual behavior changed.
- **Coverage:** unavailable context, partial graph, suspended/rejected resume,
  transient note creation, delayed collection tail, drone shutdown, repeated
  destruction, lazy-engine bundling, and first-install offline caching.

### Observations

- Every game command previously woke audio before dispatching its puzzle action.
  An `AudioContext` constructor or node operation could therefore throw before
  movement or interaction reached the game, turning optional sound into a
  player-blocking dependency.
- Audio now owns all context, graph, timer, and teardown risk. Construction or
  graph failure disables only sound, resume rejection is contained for a later
  gesture, and settings or repeated destruction remain safe.
- Collection and victory sequences previously left untracked timers. Returning
  to the title or replacing the scene could close the context before a delayed
  note fired. Destruction now cancels every pending tail before releasing nodes
  and closing the context.
- Restricted Windows automation also denied the subprocesses used by Vite's
  default config loader, Vitest forks, Node test isolation, and the Cloudflare
  development plugin. The production gate now compiles the same Vinext graph
  and explicit Worker entry in-process, while its artifact tests still prove
  server rendering, runtime licenses, manifests, offline caching, and the lazy
  engine.

### Follow-up

- Exercise audio unlock, output-device changes, Bluetooth interruption, and
  page suspension on the physical current/previous browser matrix.
- Continue the zero-severe-defect review through save export/download failure,
  update activation, and interrupted installed-PWA transitions.

## 2026-07-11 — Rolling the light safely backward

- **Build:** Sites version 17 / 0.20.0, rolled back to version 16 / 0.19.0 and
  restored to version 17
- **Scenario:** Republish the immediately prior owner-only production artifact,
  verify its identity from uncached edge responses, restore the certified
  release, and reverify source bytes and access policy.
- **Inputs:** private Sites deployment controls and direct authenticated HTTP
  artifact probes; no public access or player save mutation.
- **Viewport:** deployment-level pass, independent of interface geometry.
- **Coverage:** saved-version provenance, both terminal deployment states, both
  service-worker generations, both notice versions, current interface SHA-256,
  current completion certificate, production URL, and owner allowlist.

### Observations

- Version 16 resolved to commit `58df17a` and the 0.19.0 archive; version 17
  resolved to commit `051082d` and the 0.20.0 certified archive before either
  deployment began.
- The rollback control plane reached success before production edge responses
  changed. The first probe still returned v14 and 0.20.0; continued uncached
  probes then converged on v13 and 0.19.0 with v14 absent. A terminal deployment
  state alone is therefore not sufficient rollback evidence.
- Restoration showed the same propagation window: the current hashed interface
  was briefly absent after the publish job succeeded. Final probes matched its
  local SHA-256 exactly, returned v14 and 0.20.0, and returned the clean-profile
  certificate byte for byte with its 20-room afterglow result intact.
- Both deploy operations used the owner-only path. After restoration, access
  remained custom at revision 1 with one allowed user and zero allowed groups.
- Both artifacts use save schema 1, so the drill did not cross a migration
  boundary. The deployment itself did not read or write browser-local progress.

### Follow-up

- Repeat the drill for the final private release candidate, using the runbook's
  edge-convergence checks rather than control-plane status alone.
- Add interrupted-deployment and storage-pressure recovery to the physical
  installed-PWA matrix.

## 2026-07-11 — From first spark to afterglow

- **Build:** 0.20.0 release candidate
- **Scenario:** Begin with a fresh versioned save, follow the real player route
  through every authored room and memory detour, acknowledge every biome
  threshold, reload at each persistence boundary, reach the ending, export and
  import the canonical save, then reopen and solve the afterglow room.
- **Inputs:** 976 cardinal movement commands and 127 contextual interactions
  generated against the same collision and interaction rules as the runtime.
- **Viewport:** runtime-independent campaign pass; responsive interface geometry
  remains covered by the existing viewport matrix.
- **Coverage:** 20 rooms, 15 memories, five biome map groups, four threshold
  acknowledgements, 27 autosave reloads, one export/import round trip, ending
  persistence, map restoration, and a 90-command Heartbloom revisit.

### Observations

- Campaign events had previously been persisted by inline UI branches while
  navigation, save recovery, and afterglow were tested separately. The live
  interface now calls one pure campaign transition function that the continuous
  release pass exercises directly.
- All 1,103 campaign commands solved in canonical room order. Every optional
  memory was collected before its bloom restored, and the four authored arrival
  acknowledgements survived the same save reconciliation used in production.
- All 27 autosave reloads returned cleanly without repair, backup recovery, or
  reset. The completed save also exported and imported canonically without a
  migration or data change.
- Reopening selected Glimmer Grotto as a revisit. Its verified route solved a
  second time while the frontier remained room 20, all map groups remained
  restored, and all 15 memories stayed found.
- The exact per-room evidence now ships as JSON with the production build,
  matches the release version byte for byte, and is included in the first-load
  offline cache.

### Follow-up

- Rehearse a private rollback from this certified artifact and prove that the
  previous controller release can be restored without changing player access.
- Repeat a complete fresh journey with human players to evaluate memory
  discovery cadence and story comprehension rather than mechanical reachability.

## 2026-07-11 — Holding the whole path

- **Build:** 0.19.0 release candidate
- **Scenario:** Exercise the deterministic input model and audited UI transition
  graph for a controller-only route from title to play, Lantern menu, Settings,
  journal, map replay, completed ending, and back to play or title without a
  keyboard, pointer, or touchscreen.
- **Inputs:** standard-mapped left stick, D-pad, A, B, View/Back, and Menu/Start,
  plus deterministic held-button and held-direction transition frames.
- **Viewport:** interface-independent input pass; all controller focus targets
  retain the existing responsive and short-landscape dialog layouts.
- **Coverage:** title and ending focus, default actions, menu entry, map lock
  during biome arrivals, journal shortcut, settings/help reachability, modal
  focus wrapping and repeat cadence, checkbox activation, stepped sliders,
  long-panel scrolling, room selection, close behavior, and resume suppression.

### Observations

- The room itself had mature controller support, but the surrounding shell did
  not poll a gamepad. Starting the game, recovering a missed memory, changing
  accessibility settings, reading the journal, or leaving the ending still
  required a second device.
- Menu/Start now pauses into a focused Lantern menu. Its first movement lands
  on the map, while every other route—journal, Settings, How to Play, and title—
  is reachable through the same visible focus system. View/Back opens the echo
  journal directly.
- Title and ending screens now use the same dominant-axis dead zone and repeat
  cadence as room movement. A chooses the focused action, and the primary
  continue/explore action is the default when no page control was focused.
- Dialog D-pad movement wraps without a dead end. A activates buttons and
  toggles, left/right changes volume sliders by their declared 5% step, and
  up/down scrolls long panels that otherwise contain only a Close control.
- Closing with B or choosing with A previously risked becoming a fresh Compass
  or room action on resume. The scene now snapshots every held controller input
  at each handoff and requires neutral release before accepting another edge.
- Map travel remains unavailable during an unacknowledged biome arrival, so a
  controller cannot silently skip the threshold; journal, help, and settings
  remain available.

### Follow-up

- Repeat the complete flow on physical Xbox, PlayStation, Nintendo-layout, and
  generic controllers in the current/previous desktop browser matrix; confirm
  each browser's labels for View/Back and Menu/Start.
- Include controller reconnection, wireless sleep/wake, and browser focus loss
  in the installed-device PWA matrix.

## 2026-07-11 — Accounting for every shipped light

- **Build:** 0.18.0 release candidate
- **Scenario:** Rebuild from an empty distribution directory, identify every
  third-party runtime in the deployable client and server graphs, verify its
  installed metadata and complete upstream license, then load the notice from
  both the interface and the first-install offline cache.
- **Inputs:** deterministic build-manifest, bundle-source, package-metadata,
  notice-copy, service-worker install, and generated-asset checks.
- **Viewport:** server-rendered interface pass; footer and scrollable Settings
  provide equivalent notice access, including narrow layouts that hide the
  footer.
- **Coverage:** nine shipped packages in six notice groups, all four top-level
  production dependencies, exact version and SPDX drift, full license text,
  client/server runtime evidence, public-copy parity, offline MIME validation,
  stale build output, and unreferenced generated fonts.

### Observations

- The lockfile contains optional platform packages used by the build toolchain,
  including native image variants, but they are not present in the deployed
  bundle. The notice now follows production evidence instead of over-reporting
  everything installed in `node_modules`.
- Phaser and its EventEmitter3 dependency ship in the lazy game engine. React,
  React DOM, Scheduler, React Server DOM Webpack, Vinext, the Vite RSC runtime,
  and a generated Rolldown helper make up the remaining reviewed runtime groups.
- Next.js remains a source-level compatibility dependency, but its imports are
  resolved to Vinext shims and no Next.js module appears in the distribution;
  that exclusion is explicit and will fail closed if the graph changes.
- A clean Vinext build still emitted 11 Geist and Geist Mono files totaling
  146,464 bytes despite no font import or emitted reference. A guarded postbuild
  pass now removes them only while every emitted text asset remains unreferenced;
  a future real font use will instead stop the license gate.
- Complete upstream MIT texts now ship in one plain-text notice. Settings and
  the footer open it in a new tab, and service-worker installation caches it
  alongside the shell, icons, manifest, and lazy game engine.
- Four deterministic checks now force review when package versions, SPDX values,
  license sources, top-level dependency decisions, bundle evidence, or copied
  notices drift.

### Follow-up

- Repeat the artifact audit for every quarterly dependency upgrade and whenever
  a new production asset type is introduced.
- Include the notice link in physical installed-PWA testing and obtain the
  appropriate product/legal sign-off before any explicitly approved public or
  storefront distribution.

## 2026-07-11 — Keeping the lantern lit offline

- **Build:** 0.17.0 release candidate
- **Scenario:** Install from a fresh generated production shell, sever every
  network response, reload the root route, and request the lazy game engine;
  then repeat refreshes with successful sign-in HTML in place of the shell and
  a script.
- **Inputs:** deterministic install, fetch, message, and activation events
  against both synthetic fixtures and the real hashed production build.
- **Viewport:** runtime-independent worker pass; visible offline status retains
  the same responsive banner treatment as save recovery.
- **Coverage:** first-install app shell, module-preload discovery, recursive
  dynamic imports, CSS dependencies, manifest and icons, disconnected
  navigation, lazy Phaser startup, MIME validation, authentication cache
  poisoning, explicit skip-waiting, cache cleanup scope, and client claiming.

### Observations

- The old install cached only root HTML, the manifest, and icons. Because the
  first page loaded before its new worker controlled it, none of the hashed CSS
  or JavaScript was guaranteed to enter the cache before connectivity vanished.
- Caching the files named in HTML was still incomplete: the 1.4 MB Phaser engine
  is loaded dynamically only when play begins and is absent from the initial
  module-preload list. Recursive import discovery now includes it on install.
- Owner authentication can return a sign-in document with a successful status.
  Status-only checks could therefore overwrite a game script or the offline
  root with HTML. Shell identity and destination-specific MIME checks now reject
  those responses while still showing the live sign-in page when online.
- With all production asset requests changed to network failures, the cached
  root and complete lazy engine remained readable. Every generated client CSS
  and JavaScript asset was present in the first-install cache.
- Activation deleted only older Glimmer Grotto caches, preserved unrelated app
  caches, claimed open clients, and still required the explicit update message
  before a waiting worker skipped ahead.
- The interface now names offline mode and reassures players that their journey
  continues to save locally; reconnection immediately checks for an update.

### Follow-up

- Repeat installation, airplane-mode launch, and update acceptance on physical
  iOS, Android, Windows, and macOS devices in the current/previous browser
  matrix.
- Exercise an interrupted update and storage-pressure eviction on installed
  PWAs, then rehearse rollback from the final private release candidate.

## 2026-07-11 — Making room for every control

- **Build:** 0.16.0 release candidate
- **Scenario:** Inspect a completed Heartbloom save with Larger text and High
  contrast enabled, open Settings and the Lantern Compass, then repeat the
  narrowest pass on a clean profile in The First Warmth.
- **Inputs:** pointer activation and accessibility-tree inspection.
- **Viewports:** 640 × 360 for 200%-equivalent desktop reflow, plus 320 × 360
  and 320 × 180 for 400%-equivalent reflow geometry.
- **Coverage:** title and ending actions, modal scroll containment, fine-pointer
  touch detection, five-item puzzle toolbar, three-mechanic status, first-room
  guide, Compass wrapping, document width, and accessible grouping.

### Observations

- The initial 200% pass remained horizontally contained, but its reduced CSS
  width activated all five touch controls despite a fine pointer. At 400%, the
  direction pad overlapped a three-part status panel squeezed to roughly 35
  CSS pixels.
- Touch controls now depend on coarse-pointer capability instead of viewport
  width. They disappear visually and from the accessibility tree during
  fine-pointer reflow, removing five redundant tab stops.
- Mechanic status and opening guidance now move below the canvas at 480 CSS
  pixels or narrower. Heartbloom's source, rootsong, and tide states retained
  their full labels at 320 pixels; the clean-profile tutorial did the same.
- The first corrected landscape pass still clipped Focus and Map because the
  short-height canvas was narrower than its toolbar. A full-width zoomed canvas
  and compact toolbar now keep all five actions inside the frame.
- The Compass card wrapped to the available 289 CSS pixels, preserved its live
  coordinate and beam report, and introduced no horizontal document overflow.
- Puzzle tools now appear as a named toolbar in the accessibility tree. Hidden
  fine-pointer touch controls no longer appear as an extra generic group.

### Follow-up

- Repeat these states with native 200% and 400% zoom in the current/previous
  browser matrix; this pass validated equivalent CSS reflow dimensions.
- Run hands-on VoiceOver, NVDA, and TalkBack traversal, including the toolbar,
  reflowed status, and Compass announcement sequence.

## 2026-07-11 — Finding a path without the canvas

- **Build:** 0.15.0 release candidate
- **Scenario:** Open a completed afterglow, request a Lantern Compass report in
  the Heartbloom, move and refresh it with the keyboard, then revisit The First
  Warmth and rotate its first crystal to verify that both location and beam
  state change.
- **Inputs:** pointer activation, C, movement keys, E, and deterministic
  controller-button mapping.
- **Viewports:** desktop, 390 × 844 phone portrait, and 320 × 568 narrow phone
  with Larger text and High contrast already enabled.
- **Coverage:** live-region output, stale-state clearing, coordinate and facing
  changes, four-way surroundings, puzzle landmarks, inactive prerequisites,
  boundary exits, crystal-state updates, toolbar fit, card wrapping, and
  keyboard/pointer/controller parity.

### Observations

- The first report exposed Mica's coordinate and facing, all four adjacent
  paths, the bloom, a loose glimmer, and the finale's three inactive beam
  requirements without depending on the rendered canvas.
- Moving removed the visible report and replaced its old live-region content
  with an explicit refresh prompt. C immediately restored a current report.
- In The First Warmth, the reported beam changed from the south edge at column
  6 to the west edge at row 2 after the first crystal rotated, confirming that
  the Compass reads live puzzle state rather than cached room copy.
- The initial boundary wording exposed an impossible “row 8” on a seven-row
  playfield. Edge exits now name north, east, south, or west and only report the
  valid perpendicular coordinate.
- All five puzzle tools fit within a 320-pixel viewport, and the full Compass
  card wrapped without horizontal overflow at both phone sizes.
- Parameterized checks now exercise finite, bounded descriptions for every one
  of the 20 authored rooms.

### Follow-up

- Run hands-on traversal with current VoiceOver, NVDA, and TalkBack, including
  repeated movement and interaction announcements.
- Validate the B-button path on physical controller hardware and repeat the
  Compass card at 200% browser zoom in the beta browser matrix.

## 2026-07-11 — Reading every path

- **Build:** 0.14.0 release candidate
- **Scenario:** Enable Larger text and High contrast together on a completed
  afterglow, then inspect Settings, the ending, full journal, all-restored map,
  and the three-mechanic Heartbloom finale before repeating the critical states
  in phone landscape.
- **Inputs:** pointer activation and Escape.
- **Viewports:** 1280 × 720 desktop and 667 × 375 phone landscape.
- **Coverage:** persistent accessibility settings, headings, body copy,
  counters, controls, canvas labels, collection cards, map states, modal scroll,
  close controls, focus return, touch-control clearance, and mechanic-state
  legibility.

### Observations

- The initial implementation enlarged story copy but left dozens of explicit
  pixel-sized labels unchanged. Shared text and heading lifts now reach every
  fixed CSS label, while six Phaser label sites use the same saved setting.
- The desktop Settings dialog, ending, two-column journal, and map remained
  balanced with stronger borders and larger copy. All 15 stories and all 20 map
  rooms remained reachable through their contained scroll regions.
- At phone landscape size, the map and Settings dialog retained their heading,
  close control, summary or first toggle, and internal scrollbar without
  horizontal overflow. Escape closed Settings and returned focus correctly.
- The first enlarged finale pass ellipsized “Glimmer source,” “Needs a glimmer,”
  and “High · needs low.” The large-text-only status width now uses the safe
  center gap, and all three labels wrap in full while clearing the direction pad
  and Action control.
- Automated guards now reject newly introduced fixed CSS font sizes or literal
  Phaser font sizes that bypass the accessibility setting.

### Follow-up

- Repeat the opening guide and every biome arrival with Larger text enabled in
  the clean-profile completion pass.
- Continue the beta audit with screen-reader traversal and 200% browser zoom,
  then cover the same states in the current/previous browser matrix.

## 2026-07-11 — Keeping the lantern safe

- **Build:** 0.13.0 release candidate
- **Scenario:** Load the existing completed afterglow, then exercise repaired
  primary, backup recovery, invalid dual-generation, interrupted-ending, and
  inconsistent-import fixtures against the authored campaign directory.
- **Inputs:** browser reload plus deterministic save/storage fixtures.
- **Viewports:** 1280 × 720 desktop and 667 × 375 phone landscape for the
  recovery notice and completed-save migration.
- **Coverage:** canonical midgame and afterglow round trips, progress gaps,
  unknown room and seed IDs, future discoveries, duplicate entries, biome
  arrivals, settings bounds, timestamps, play time, repair backup preservation,
  corrupt-primary recovery, and unrecoverable reset.

### Observations

- The real 20/20, 15/15 afterglow save loaded unchanged, showed no repair
  notice, and retained both completed-journey actions.
- The recovery notice remained readable above the completed ending at both
  viewports, exposed an explicit dismiss control, and did not obscure the
  ending's collection state or actions.
- A room-four save with gaps was rebuilt as the first four authored rooms while
  retaining room four as its frontier. Unknown IDs and a Tideglass seed were
  removed; its reachable Mosswake seed and Prism arrival remained.
- Out-of-range audio levels were clamped, malformed toggles returned to safe
  defaults, and negative play time returned to zero.
- Twenty unknown room IDs no longer produce a false ending. Conversely, the
  explicit ending flag and the full authored room set each recover a complete,
  playable afterglow.
- A valid backup replaced a damaged primary. A repair preserved the original
  source as backup, while two unreadable generations produced a fresh canonical
  save and the correct recovery outcome for the player notice.

### Follow-up

- Repeat export/import through native file pickers in the beta browser matrix,
  including a manually edited but recoverable file.
- Exercise backup recovery alongside the offline and service-worker update
  matrix so storage repair and app-shell replacement are covered together.

## 2026-07-11 — Light after the ending

- **Build:** 0.12.0 release candidate
- **Scenario:** Resume at Rootsong with ten memories, restore the final eleven
  rooms while deliberately skipping The Sunken Lantern's seed, wake the
  Heartbloom at 14/15, enter the afterglow, recover that seed, and return to the
  Heartbloom and title without replaying the ending.
- **Inputs:** keyboard movement/action, pointer activation, and Escape.
- **Viewports:** 1280 × 720 desktop and 667 × 375 phone landscape.
- **Coverage:** full late-campaign navigation, two biome arrivals, every
  remaining rootsong/tide/charge mechanic, incomplete and complete ending copy,
  all-restored map state, postgame replay, final-memory persistence, title
  return, focus return, and short-landscape layout.

### Observations

- All eleven rooms restored through their real movement and interaction paths.
  The ending arrived at 20/20 and 14/15, explicitly named the one waiting
  memory, and made continued exploration the primary action.
- The afterglow reopened at the Heartbloom with all five map groups at 4/4,
  nineteen revisit choices, no locked rooms, and The Sunken Lantern correctly
  marked “Memory waiting.”
- Recovering the final seed changed the collection to 15/15. Solving that old
  room returned to the Heartbloom in afterglow instead of firing the ending,
  while a title round trip retained both completion and the full lantern.
- The first phone pass spent its entire opening viewport on the ending flower.
  A compact two-column ending now presents the flower, message, collection
  state, and all three actions together without document scrolling.
- The completed phone map remained internally scrollable with its heading,
  summary, close control, first room, and 4/4 biome state visible. Escape closed
  it and returned focus to Map.

### Follow-up

- Run the 1.0 clean-profile completion gate without imported or pre-seeded
  progress, then repeat with high contrast and larger text enabled.
- Observe whether a first-time human finisher chooses the afterglow naturally
  when one or more memories remain.

## 2026-07-10 — Returning for a missed light

- **Build:** 0.11.0 release candidate
- **Scenario:** Resume at Rootsong with nine restored rooms, revisit The First
  Warmth, recover its missed memory, return to Rootsong through the map, verify
  a title round trip, then replay and solve the old room once more.
- **Inputs:** pointer activation, keyboard movement/action, Space, and Escape.
- **Viewports:** 1280 × 720 desktop and 667 × 375 phone landscape.
- **Coverage:** all 20 map entries, restored/current/locked states, found/waiting
  memory states, revisit entry, seed persistence, map return, solved-room return,
  title resume, focus return, and progress-frontier preservation.

### Observations

- The map correctly exposed rooms 1–9, kept room 10 as the current path, and
  left rooms 11–20 locked. Only The First Warmth showed a recoverable missing
  memory among the restored rooms.
- Collecting that seed changed 9/15 to 10/15 while campaign progress remained
  9/20. The new “First Lantern” memory appeared immediately in the room card.
- Returning through the map restored Rootsong with its puzzle freshly reset.
  Returning to the title and resuming also reopened Rootsong at 9/20 and 10/15.
- Solving the replayed room produced revisit-specific continuation copy and
  Space returned directly to Rootsong. That covered all three runtime progress
  writes without a regression.
- The phone map remained a single-column, internally scrolling dialog with its
  summary, close control, room status, and memory state visible without
  horizontal overflow.

### Follow-up

- Use the now-safe replay route to complete a clean-profile 15-memory run and
  review the collection's full narrative cadence.
- Observe whether players understand “Memory waiting” without opening the
  journal first, and soften or expand the label only if needed.

## 2026-07-10 — Recovering the keeper stories

- **Build:** 0.10.0 release candidate
- **Scenario:** Open an eight-memory collection from the title, resume at
  Rootsong, recover its seed, review the ninth memory from the room and journal,
  then close the journal with Escape.
- **Inputs:** pointer activation, keyboard movement, and Escape.
- **Viewports:** 1280 × 720 desktop and 667 × 375 phone landscape.
- **Coverage:** existing-save reconstruction, four biome groups, discovered and
  sleeping entries, new-memory feedback, progress update, modal pause, focus
  return, and scroll containment.

### Observations

- The existing save immediately reconstructed eight correct stories without a
  schema change. Unknown or future seed IDs cannot inflate the visible 15-item
  collection count.
- Collecting Rootsong's seed changed the counter from 8/15 to 9/15 and surfaced
  “A Melody Is a Map” in the companion card before any journal interaction.
- The journal then showed Hushroot at 2/4 while keeping both undiscovered titles
  hidden. Escape returned focus to the exact control that opened it.
- The phone journal retained its heading, progress summary, close control, and
  single-column cards without horizontal overflow. Locking background scroll
  removed the competing page scrollbar while preserving the journal's own
  scroll region.
- The first phone pass exposed that short-landscape mode hides the play heading
  and its interactive seed counter. A compact top-bar journal control now keeps
  the collection reachable at that breakpoint.

### Follow-up

- Complete a clean-profile 15-seed run and review whether the full story arc
  rewards the optional detours at their actual campaign cadence.
- Observe whether first-time players discover the journal naturally from the
  interactive seed counter without additional tutorial copy.

## 2026-07-10 — Prism Pools to the first rootsong

- **Build:** 0.9.0 release candidate
- **Scenario:** Resume at Blue Below, restore all four Prism Pools rooms, cross
  the Hushroot threshold, ring the first rootsong note by note, restore the
  room, and reset it once.
- **Inputs:** keyboard navigation/action, E-key arrival continuation, and
  pointer activation of Reset.
- **Viewports:** 1280 × 720 desktop and 667 × 375 phone landscape.
- **Coverage:** five room restorations, 20 crystal turns, two glimmer-source
  deliveries, three rootsong notes, five optional seeds, biome arrival, and
  status reset.

### Observations

- The new source panel followed the full state change from “Needs a glimmer”
  through “Awake” without adding another instruction modal.
- Hushroot exposed the circle, triangle, diamond pattern before the first note,
  then advanced through 1/3, 2/3, and “Song remembered.” The equivalent
  accessible text always named the pattern and next note, so comprehension did
  not depend on procedural audio.
- Reset immediately returned the rootsong to 0/3 and selected the first glyph
  again. The Hushroot arrival hid the status until it was acknowledged and
  handed focus back to the game surface afterward.
- In phone landscape, the status panel measured about 276 × 60 pixels. Its
  188–464 horizontal span cleared the direction pad ending at 178 and the
  Action control beginning at 528, with no page-width overflow.

### Follow-up

- Observe first-time human players through the Hushroot introduction and note
  whether they infer that matching the song wakes the source.
- Exercise the three-status Heartbloom rooms with assistive technology and in
  short landscape before the beta accessibility audit.

## 2026-07-10 — Mosswake to Prism threshold

- **Build:** 0.8.0 release candidate
- **Scenario:** Resume at Borrowed Spark, restore the remaining three Mosswake
  rooms, cross into Prism Pools, return to the title, and resume again.
- **Inputs:** keyboard navigation/action, pointer activation, and touch-layout
  controls.
- **Viewports:** desktop and 667 × 375 phone landscape.
- **Coverage:** charge carrying, nine crystal actions, three optional seeds,
  three room continuations, biome arrival, focus handoff, and arrival memory.

### Observations

- The Mosswake difficulty ramp remained readable across three consecutive
  rooms and the Prism arrival appeared only at the actual biome boundary.
- The first pass relied on native button activation while promising E as an
  alternate key. The arrival now handles Space, Enter, and E explicitly.
- The arrival and its continuation button fit fully inside the phone playfield
  without overlapping the title bar or requiring document scroll.
- After acknowledgement, focus returns to the game surface and the arrival does
  not replay when the same local journey is resumed.

### Follow-up

- Observe first-time players through the Hushroot bell-sequence introduction.
- Compare room-order comprehension with and without optional seed detours.
