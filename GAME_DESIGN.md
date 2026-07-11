# Glimmer Grotto — Product Bible

## Promise

Glimmer Grotto is a calm top-down puzzle adventure for a broad cozy audience.
The player guides Mica and the moth Luma through 20 handcrafted rooms across
five biomes. There is no combat, timer, death, or irreversible puzzle state.

## Core loop

1. Enter a room and read the visible beam or inactive source.
2. Walk to crystals, glimmer motes, bell-flowers, or tide controls.
3. Use one contextual action to turn, carry, ring, or toggle them.
4. Route light into the sleeping bloom.
5. Optionally collect an echo seed to return one keeper memory to the lantern,
   then continue deeper.

Every room offers reset, focus highlighting, and three progressively explicit
hints. Required information is never carried by color or sound alone.

The Lantern Compass provides an equivalent on-demand reading of the canvas:
Mica's position and facing, each adjacent path or object, important landmarks,
carried light, and the beam's current route. A report is cleared whenever the
described state changes so it cannot quietly become stale.

## Progression

- **Mosswake Entrance:** movement, mirror routing, and carried glimmer.
- **Prism Pools:** longer reflection paths and reverse-reading layouts.
- **Hushroot Hollows:** visual bell sequences layered with light routing.
- **Tideglass Deeps:** reversible tide conditions and charged sources.
- **Heartbloom Sanctum:** combinations of all established systems.

The campaign contains 20 required rooms and 15 optional echo seeds. Recovered
seeds reveal an ordered journal of stories left by the grotto's old keepers;
missing entries never expose their title. The ending records completion locally
and allows a fresh journey without an account.

Restored rooms remain available from the grotto map. Replaying a room resets
only its local puzzle, never the deepest unlocked chamber, restored-room set, or
collected memories. Optional discoveries are therefore never permanently
missable within a journey.

Waking the Heartbloom begins the afterglow rather than closing the save. The
ending remains viewable, while every restored room stays open for quiet replay
and missed-memory recovery. Replayed rooms return to the Heartbloom and never
fire the campaign ending a second time.

Local saves are reconciled against the authored campaign whenever they cross a
storage boundary. Repair preserves the furthest credible restored room, closes
impossible gaps, and never treats unknown room or memory IDs as progress. The
pre-repair copy remains available as the backup generation.

## Experience rules

- New mechanics receive a safe teaching room before combination puzzles.
- A wrong action may reset a local sequence but never loses broader progress.
- All text remains external to puzzle logic; version 1.0 is English-only.
- Mica's movement, Luma's motion, screen effects, text size, contrast, music,
  and effects must respect the accessibility settings.
- Larger text applies to all player-facing DOM and canvas labels. Responsive
  layouts may reflow or scroll, but must not hide a puzzle requirement or
  truncate the mechanic state needed to solve a room.
- Canvas spatial state must remain inspectable without sight through concise,
  current, keyboard-, pointer-, and controller-accessible descriptions.
- Narrow fine-pointer reflow must preserve every puzzle tool and move guidance
  or mechanic state below the canvas when an overlay can no longer remain
  legible. Viewport width alone must never activate redundant touch controls.
- After one successful production load, the complete game—including its lazy
  engine—must remain available offline. Authentication or error pages must
  never replace the last valid cached shell, and progress continues to save on
  the device while disconnected.
- Player behavior is not transmitted or analyzed.

## Distribution rules

- Every third-party runtime or asset present in the deployable build must have
  an explicit distribution decision backed by production-bundle evidence.
- Player-visible third-party notices must identify exact shipped versions,
  preserve complete upstream license text, remain reachable from Settings, and
  stay available with the rest of the first-install offline shell.
- Production builds begin from an empty distribution directory. Generated
  assets that are not referenced by emitted HTML, CSS, JavaScript, or manifests
  are not carried into a release.
- A dependency upgrade, new production dependency, newly retained font, or
  missing license source stops the release until the ledger and notice are
  reviewed together.
