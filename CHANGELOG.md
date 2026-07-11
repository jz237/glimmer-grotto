# Changelog

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
