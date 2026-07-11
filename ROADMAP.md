# Autonomous Improvement Roadmap

The game is maintained in two-week increments. Each increment ends with a
playable build, green checks, a changelog entry, and an owner-only deployment.
Priorities are player-blocking defects, accessibility and save safety, campaign
quality, performance, then cosmetic polish.

## Year-one milestones

- **Foundation — complete:** Sites/Vinext shell, Phaser integration, strict
  TypeScript, deterministic puzzle model, local save recovery, input
  abstraction, PWA shell, and automated validation.
- **Playable campaign — complete:** five biomes, 20 required rooms, 15 secrets,
  a 15-entry recovered-memory collection, progressive hints, environmental
  story, procedural sound, and ending.
- **Vertical-slice polish — active:** short-landscape and touch ergonomics,
  dialog accessibility, restart safety, campaign-aware save reconciliation,
  PWA update safety, recorded room traces, opening-room guidance, and the first
  controller-tuning and animation-feedback passes are complete. The
  controller-only shell, Lantern menu, dialog-navigation, replay, journal, and
  settings pass is also complete. Persistent
  special-mechanic feedback, the first cross-biome rootsong usability pass, and
  safe room replay with a non-regressing campaign frontier are also complete.
  Optional-audio fault containment and teardown safety are complete. Runtime
  autosave verification, degraded-redundancy warnings, and durable restart are
  complete. Fault-contained download activation and an accessible manual export
  fallback are complete. Service-worker activation is now bounded, cleans up
  stale reload listeners, and leaves the current version safely retryable after
  timeout or browser failure. A claimed older page now retains one complete
  predecessor asset graph without allowing its shell or shared files to roll
  the current offline release backward. Cache failures now degrade to network,
  and the retained bridge is pruned to unique old hashed assets after claim-safe
  activation cleanup. Current install completion is now byte-bound through a
  last-written SHA-256 manifest, with clean retry for partial or mismatched
  caches and non-destructive handling when state cannot be inspected. Cached
  responses now prove that digest before first use, reject offline corruption,
  and allow race-safe network repair.
  Controller disconnect, reconnect, identity-swap, focus-loss, and hidden-page
  input now share a neutral-release guard across the canvas and DOM interface.
  Repeating touch movement now ends across pointer, capture, visibility, page,
  overlay, room, and session boundaries with stale-callback suppression.
  Keyboard admission now isolates browser shortcuts and composition, limits
  actions to one edge, and invalidates repeat across focus and scene boundaries.
  Canvas pointer admission now validates primary finite in-grid coordinates and
  separates exact clicked objects from directional interaction fallback.
  Move and bump animations now use redraw-scoped leases, settle interrupted
  landing, and cannot keep input locked or mutate replacement room objects.
  Lazy engine imports now retry after transient failure, stale attempts stay
  silent, and an accessible recovery surface preserves the current journey.
  Runtime handles now contain partial construction and teardown, destroy once,
  and reject all commands after their scene is detached.
  Modal focus restoration now rejects stale/blocked invokers and finds a safe
  canvas, screen action, enabled control, or title fallback.
  Native dialog open/close now has a modal attribute fallback with inert
  background ownership and guaranteed cleanup on partial implementations.
  Native and fallback dialogs now share deterministic, failure-contained Tab
  and Shift-Tab wrapping across only eligible controls.
  Document-level focus and mutation guards now recover after live dialog
  content removes, blocks, or unexpectedly displaces the active control.
  Modal state is now exclusive, atomically hands off between surfaces, and
  rejects stale close callbacks before they can resume or mutate play.
  Runtime pause ownership now combines screen, modal, page visibility, load
  recovery, and late-mount state before any path may resume play.
  Applied pause state is now transition-aware, retryable across pre-boot or
  throwing boundaries, and neutralizes held input exactly once per real resume.
  Suspended audio now resumes silently through a deduplicated retry boundary and
  cannot replay an action effect after its original input moment has passed.
  WebGL context loss now explicitly permits browser restoration, pauses
  invisible play, restores deterministic room rendering, and exposes an
  accessible save-preserving renderer restart.
  Repeated context loss and failed redraw now cross a bounded threshold into a
  stable Canvas renderer for the remainder of the journey.
  Either renderer can now fail into an accessible alternate path, and Settings
  exposes a session-only reset without coupling device capability to save data.
  Returned renderer handles now have a bounded ready deadline with attempt-local
  teardown, stale-event suppression, and focused alternate recovery.
  Lazy engine delivery now has its own bounded deadline; a stalled loader
  generation is invalidated so retry starts fresh without allowing late work to
  replace the current module or mount attempt. Invalidation now requires the
  exact attempt-owned promise and cannot evict fulfilled cache or a newer retry.
  The afterglow preserves replay and missed-memory recovery after the ending.
  Structured human playthroughs remain.
- **Alpha:** full navigation/action traces and the automated pacing curve are
  complete, alongside the first biome-identity, narrative-transition, and
  non-audio mechanic-comprehension passes. The first room-to-room story-echo
  pass is complete through the seed-memory journal, and missed memories are now
  recoverable before and after the ending through the grotto map. A late-game
  15-memory completion pass is complete. The clean-profile completion gate now
  certifies all 20 rooms, 15 memories, four thresholds, persistence, ending, and
  afterglow in one continuous run; tune discovery pacing and room order from
  human playtest observations.
- **Beta:** the first comprehensive large-text/high-contrast interface pass and
  the first non-visual spatial-orientation pass are complete. The Lantern
  Compass now exposes position, paths, landmarks, objects, and beam state on
  demand. The first fine-pointer reflow pass is complete at 200%- and
  400%-equivalent CSS viewports. Content freeze, hands-on screen-reader and
  native browser-zoom audits, the current/previous browser and physical-gamepad
  matrix, installed-device PWA testing and performance profiling remain. The
  automated first-install, disconnected-shell, cache-integrity, explicit-update,
  and shipped-artifact license passes are complete against the real production
  graph. Third-party notices are player-visible, available offline, and guarded
  against dependency, license-text, and generated-asset drift.
- **1.0:** clean-profile completion is certified and published with the release,
  and the private version rollback/restore path has been rehearsed against live
  edge bytes. The zero-severe-defect review is active, with optional-audio input
  blocking, silent runtime save loss, and export dead ends closed. Final review,
  the final private release candidate, then an explicitly approved public
  launch remain.

## Guardrails

No multiplayer, accounts, cloud saves, backend, behavioral analytics,
monetization, native storefronts, custom domain, or public access change is
added without a new explicit decision. Dependency upgrades are reviewed
quarterly, must update the distribution ledger when their shipped footprint
changes, and must pass the complete test suite before release.
