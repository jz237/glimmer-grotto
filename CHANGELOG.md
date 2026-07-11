# Changelog

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
