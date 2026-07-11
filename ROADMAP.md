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
  The afterglow preserves replay and missed-memory recovery after the ending.
  Structured human playthroughs remain.
- **Alpha:** full navigation/action traces and the automated pacing curve are
  complete, alongside the first biome-identity, narrative-transition, and
  non-audio mechanic-comprehension passes. The first room-to-room story-echo
  pass is complete through the seed-memory journal, and missed memories are now
  recoverable before and after the ending through the grotto map. A late-game
  15-memory completion pass is complete; tune discovery pacing and room order
  from human playtest observations and retain the clean-profile completion gate.
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
- **1.0:** zero severe defects, clean-profile completion, rollback rehearsal,
  final private release candidate, then an explicitly approved public launch.

## Guardrails

No multiplayer, accounts, cloud saves, backend, behavioral analytics,
monetization, native storefronts, custom domain, or public access change is
added without a new explicit decision. Dependency upgrades are reviewed
quarterly, must update the distribution ledger when their shipped footprint
changes, and must pass the complete test suite before release.
