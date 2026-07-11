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
  pass are complete. Structured human playthroughs and animation refinement
  remain.
- **Alpha:** refine all biome identities, improve narrative transitions, add
  full navigation/action playthrough traces, and tune room order from playtest
  observations.
- **Beta:** content freeze, accessibility audit, current/previous browser matrix,
  offline/update testing, performance profiling, and license review.
- **1.0:** zero severe defects, clean-profile completion, rollback rehearsal,
  final private release candidate, then an explicitly approved public launch.

## Guardrails

No multiplayer, accounts, cloud saves, backend, behavioral analytics,
monetization, native storefronts, custom domain, or public access change is
added without a new explicit decision. Dependency upgrades are reviewed
quarterly and must pass the complete test suite before release.
