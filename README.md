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
Fault-injected audio checks prove that unavailable sound cannot block gameplay
or survive beyond a destroyed game instance. Storage checks verify every write,
surface degraded redundancy during active play, and prove that a confirmed
restart cannot restore the prior journey. Export checks cover delayed download
cleanup and the manual copy fallback used when browser file APIs fail. Update
checks prove service-worker activation is bounded, cleans up late reload
listeners, remains explicitly retryable when a browser does not activate it,
and retains one complete predecessor asset graph for an already-open page while
keeping navigation and shared files pinned to the current release. Cache access
failures fall through to a healthy network, and activation prunes that bridge to
only unique old hashed assets so two-version safety stays storage-conscious.
Install checks fingerprint every stored response with SHA-256 and write the
completion manifest last, making partial or same-name stale caches retryable
without ever calling them complete. Manifest-backed responses are verified on
their first cached use per worker lifetime; corruption falls through to network
repair or is rejected offline instead of reaching the game runtime.

`npm run build:pages` also produces `dist-pages`, a self-contained static
release whose relative assets, manifest, and service-worker scope are safe to
place in the existing `/games/2026-06-10/glimmer-grotto/` arcade directory.
Deployable Sites builds use the normal Cloudflare adapter and include
`dist/server/wrangler.json`. Set `GLIMMER_RESTRICTED_BUILD=1` only in a local
environment that cannot launch the adapter's helper processes; that fallback is
for validation and is not a Sites release artifact.
Controller lifecycle checks prove disconnects, identity swaps, tab hiding, and
window blur cannot replay held input into a resumed puzzle or newly focused UI.
Touch lifecycle checks prove repeating movement stops on pointer, focus,
visibility, page, overlay, room, and session boundaries, including when a
browser fails to cancel a timer cleanly.
Keyboard checks separate browser shortcuts and text composition from game
commands, admit non-movement actions once per press, and reject repeat that
began outside the focused scene.
Pointer-grid checks reject secondary, stale, non-finite, and out-of-bounds
samples and prove a clicked wall cannot operate a different adjacent object.
Animation lifecycle checks prove redraw and teardown unlock motion, reject stale
callbacks, and preserve seed or mote landing at an interrupted destination.
Lazy-module checks prove failed imports can retry, stale attempts stay silent,
and recovery remains actionable by keyboard, pointer, touch, or controller.
Runtime-handle checks prove partial construction and teardown failures are
contained, destroy is idempotent, and detached scenes reject later commands.
Focus restoration checks prove modal close skips stale or blocked invokers and
returns to a safe current-screen target without throwing.
Dialog lifecycle checks prove missing or broken native modal methods retain a
visible inert-background fallback and always reach cleanup.
Dialog focus-cycle checks prove Tab and Shift-Tab wrap inside that boundary,
skip unsafe targets, and survive a rejected focus call without leaking focus.
Live-dialog checks prove removed or newly blocked focused controls recover after
the DOM commit, and programmatic outside focus returns without reaching play.
Modal-state checks prove rapid requests resolve to one surface and stale close
callbacks cannot dismiss it or resume the paused game underneath it.
Pause-policy checks prove modal, visibility, load, screen, and late-mount
transitions cannot resume play until every blocker is clear.
Runtime-transition checks prove repeated policy passes apply pause/resume once,
retry deferred boundaries, and preserve neutral keyboard/controller admission.
Audio-suspension checks prove a blocked context resumes silently, deduplicates
attempts, and requires a fresh action before creating an effect note.
Renderer-lifecycle checks prove a lost WebGL context explicitly permits browser
restoration, pauses invisible play, redraws from deterministic state, and
exposes an accessible restart fallback.
Renderer-fallback checks prove repeated GPU loss or redraw failure switches the
same saved journey to a bounded Canvas path instead of looping indefinitely.
Renderer-choice checks prove either backend failure offers the other path and
Settings can reset the session mode without changing portable save data.
Boot-readiness checks prove a mounted view must become ready within a bounded
attempt or yield to focused, save-preserving renderer recovery.
Engine-delivery checks prove a never-settling lazy import is invalidated after a
separate deadline, so retry starts a fresh generation and any late abandoned
promise stays unable to mount, replace the current cached module, or invalidate
the exact newer delivery owned by another attempt.

## Architecture

- React/Vinext renders the title, story, settings, accessibility, and PWA shell.
- Phaser renders the top-down cave rooms and handles game input.
- Puzzle state and player-facing mechanic status are deterministic and separate
  from rendering.
- One controller-session guard synchronizes active play and interface navigation
  after connection, focus, visibility, and scene transitions.
- Pointer-aware touch holds share one bounded scheduler with capture, timer,
  multi-touch, and transition cleanup.
- Keyboard mapping and pressed-key admission are deterministic and separate from
  Phaser rendering and browser shortcut behavior.
- Pointer coordinates cross one finite, primary-button, in-grid admission layer
  before exact-cell interaction or movement.
- Generation-scoped move and bump leases prevent callbacks from crossing redraw,
  room, settings, reduced-motion, or scene boundaries.
- The lazy Phaser module uses a shared retryable, generation-scoped loader with
  an exact-promise delivery lease and bounded deadline; fulfilled cache is
  separate from pending work. Each React mount attempt owns its game handle,
  readiness deadline, error publication, and teardown.
- A terminal runtime controller independently tears down the scene and renderer
  while blocking every operation after destroy.
- Dialog setup and restoration share one validated focus boundary with ordered
  current-screen fallbacks.
- Native dialog open/close uses a no-throw attribute fallback with owned sibling
  inertness, scroll lock, and full-screen styling.
- Native and fallback dialogs share one safe forward/reverse focus cycle, so the
  keyboard sequence wraps at each edge and cannot escape into the inert scene.
- Document-level focus and mutation guards recover the sequence after dynamic
  dialog content removes, blocks, or unexpectedly displaces the active control.
- One guarded modal identity atomically replaces dialog surfaces and validates
  ownership before any close callback may resume play or change rooms.
- One runtime pause policy combines modal, page, load, and screen ownership and
  is applied both to active handles and engines that finish mounting later.
- The terminal runtime handle applies each pause-state transition once, retries
  failed or pre-boot deferrals, and synchronizes held input only at real edges.
- Suspended Web Audio resumes through one retryable attempt without retaining an
  old action sound; effects are created only from a fresh action while running.
- WebGL loss joins the pause policy, redraws the room after Phaser restoration,
  and falls back to a save-preserving, controller-accessible renderer restart.
- One isolated loss can retry acceleration; repeated loss or redraw failure
  selects Canvas for the rest of the journey as a stable rendering fallback.
- Renderer mode is session-only environment state with an accessible Settings
  switch; failed mounts always offer the alternate mode and same-mode retry.
- An attempt-local watchdog requires each returned renderer to emit ready within
  12 seconds, then tears down only that stalled handle and exposes recovery.
- Procedural audio is lazy, optional, and fail-safe; sound-system failures
  degrade to silence without changing puzzle behavior.
- Progress is stored only in versioned local browser storage, with
  campaign-aware repair, verified primary/backup writes, visible failure
  status, and manual export/import with a selectable JSON fallback.
- The Sites project is static from the player's perspective: no account,
  backend, analytics, advertising, or monetization.
- Shipped open-source components are recorded in
  [licenses/shipped-components.json](./licenses/shipped-components.json), with
  player-facing terms at `/third-party-notices.txt` in every production build.
- Auditable completion evidence ships at
  `/release/clean-profile-certificate.json` and remains available offline.

See [GAME_DESIGN.md](./GAME_DESIGN.md) for the product rules and
[ROADMAP.md](./ROADMAP.md) for the autonomous improvement cadence. Release and
rollback evidence follows [RELEASE_RUNBOOK.md](./RELEASE_RUNBOOK.md).
