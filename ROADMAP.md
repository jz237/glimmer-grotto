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
  progressive hints, environmental story, procedural sound, and ending.
- **Vertical-slice polish — active:** short-landscape and touch ergonomics,
  dialog accessibility, restart safety, save reconciliation, PWA update safety,
  recorded room traces, opening-room guidance, and the first controller-tuning
  and animation-feedback passes are complete. Persistent special-mechanic
  feedback and the first cross-biome rootsong usability pass are also complete.
  Structured human playthroughs remain.
- **Alpha:** full navigation/action traces and the automated pacing curve are
  complete, alongside the first biome-identity, narrative-transition, and
  non-audio mechanic-comprehension passes. Refine room-to-room story echoes and
  tune room order from human playtest observations.
- **Beta:** content freeze, accessibility audit, current/previous browser matrix,
  offline/update testing, performance profiling, and license review.
- **1.0:** zero severe defects, clean-profile completion, rollback rehearsal,
  final private release candidate, then an explicitly approved public launch.

## Guardrails

No multiplayer, accounts, cloud saves, backend, behavioral analytics,
monetization, native storefronts, custom domain, or public access change is
added without a new explicit decision. Dependency upgrades are reviewed
quarterly and must pass the complete test suite before release.
