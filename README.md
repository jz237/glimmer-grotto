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
keyboard, pointer, touch, and standard gamepads.

## Quality checks

```bash
npm test
```

This runs strict TypeScript checking, puzzle/content validation, save recovery
tests, a production build, and server-rendered shell tests. Every required room
has a deterministic verified solution and a reachability check for its
interactive objects.

## Architecture

- React/Vinext renders the title, story, settings, accessibility, and PWA shell.
- Phaser renders the top-down cave rooms and handles game input.
- Puzzle state and player-facing mechanic status are deterministic and separate
  from rendering.
- Progress is stored only in versioned local browser storage, with a backup and
  manual export/import.
- The Sites project is static from the player's perspective: no account,
  backend, analytics, advertising, or monetization.

See [GAME_DESIGN.md](./GAME_DESIGN.md) for the product rules and
[ROADMAP.md](./ROADMAP.md) for the autonomous improvement cadence.
