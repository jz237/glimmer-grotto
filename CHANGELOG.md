# Changelog

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
