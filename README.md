# Glimmer Grotto

A quiet, no-fail browser puzzle adventure about carrying light through five
sleeping cave gardens.

## Play locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by the development server. The game supports
keyboard, pointer, touch, and standard gamepads. A gamepad can operate the
title, ending, Lantern menu, dialogs, settings, map, journal, and every room
without requiring a second input device.

## Quality checks

```bash
npm test
```

This runs strict TypeScript checking, puzzle/content validation, save recovery
tests, accessibility-style guards, a production build, and server-rendered shell
tests. It also proves that distributed third-party versions, licenses, complete
notice text, and bundle evidence match the clean production artifact. Every
required room has a deterministic verified solution and a reachability check
for its interactive objects. The release also executes one continuous fresh
campaign through every room, memory, biome threshold, persistence boundary,
ending, and playable afterglow, then compares the result with the deployed
[clean-profile certificate](./public/release/clean-profile-certificate.json).

## Architecture

- React/Vinext renders the title, story, settings, accessibility, and PWA shell.
- Phaser renders the top-down cave rooms and handles game input.
- Puzzle state and player-facing mechanic status are deterministic and separate
  from rendering.
- Progress is stored only in versioned local browser storage, with
  campaign-aware repair, a preserved backup, and manual export/import.
- The Sites project is static from the player's perspective: no account,
  backend, analytics, advertising, or monetization.
- Shipped open-source components are recorded in
  [licenses/shipped-components.json](./licenses/shipped-components.json), with
  player-facing terms at `/third-party-notices.txt` in every production build.
- Auditable completion evidence ships at
  `/release/clean-profile-certificate.json` and remains available offline.

See [GAME_DESIGN.md](./GAME_DESIGN.md) for the product rules and
[ROADMAP.md](./ROADMAP.md) for the autonomous improvement cadence.
