# Structured playtests

Playtests use a repeatable scenario, record the input and viewport, and turn
every observed defect into either a fix or a named follow-up. Agent-assisted
passes validate mechanics and instrumentation; external human observation is
still required before content freeze.

## 2026-07-10 — Recovering the keeper stories

- **Build:** 0.10.0 release candidate
- **Scenario:** Open an eight-memory collection from the title, resume at
  Rootsong, recover its seed, review the ninth memory from the room and journal,
  then close the journal with Escape.
- **Inputs:** pointer activation, keyboard movement, and Escape.
- **Viewports:** 1280 × 720 desktop and 667 × 375 phone landscape.
- **Coverage:** existing-save reconstruction, four biome groups, discovered and
  sleeping entries, new-memory feedback, progress update, modal pause, focus
  return, and scroll containment.

### Observations

- The existing save immediately reconstructed eight correct stories without a
  schema change. Unknown or future seed IDs cannot inflate the visible 15-item
  collection count.
- Collecting Rootsong's seed changed the counter from 8/15 to 9/15 and surfaced
  “A Melody Is a Map” in the companion card before any journal interaction.
- The journal then showed Hushroot at 2/4 while keeping both undiscovered titles
  hidden. Escape returned focus to the exact control that opened it.
- The phone journal retained its heading, progress summary, close control, and
  single-column cards without horizontal overflow. Locking background scroll
  removed the competing page scrollbar while preserving the journal's own
  scroll region.
- The first phone pass exposed that short-landscape mode hides the play heading
  and its interactive seed counter. A compact top-bar journal control now keeps
  the collection reachable at that breakpoint.

### Follow-up

- Complete a clean-profile 15-seed run and review whether the full story arc
  rewards the optional detours at their actual campaign cadence.
- Observe whether first-time players discover the journal naturally from the
  interactive seed counter without additional tutorial copy.

## 2026-07-10 — Prism Pools to the first rootsong

- **Build:** 0.9.0 release candidate
- **Scenario:** Resume at Blue Below, restore all four Prism Pools rooms, cross
  the Hushroot threshold, ring the first rootsong note by note, restore the
  room, and reset it once.
- **Inputs:** keyboard navigation/action, E-key arrival continuation, and
  pointer activation of Reset.
- **Viewports:** 1280 × 720 desktop and 667 × 375 phone landscape.
- **Coverage:** five room restorations, 20 crystal turns, two glimmer-source
  deliveries, three rootsong notes, five optional seeds, biome arrival, and
  status reset.

### Observations

- The new source panel followed the full state change from “Needs a glimmer”
  through “Awake” without adding another instruction modal.
- Hushroot exposed the circle, triangle, diamond pattern before the first note,
  then advanced through 1/3, 2/3, and “Song remembered.” The equivalent
  accessible text always named the pattern and next note, so comprehension did
  not depend on procedural audio.
- Reset immediately returned the rootsong to 0/3 and selected the first glyph
  again. The Hushroot arrival hid the status until it was acknowledged and
  handed focus back to the game surface afterward.
- In phone landscape, the status panel measured about 276 × 60 pixels. Its
  188–464 horizontal span cleared the direction pad ending at 178 and the
  Action control beginning at 528, with no page-width overflow.

### Follow-up

- Observe first-time human players through the Hushroot introduction and note
  whether they infer that matching the song wakes the source.
- Exercise the three-status Heartbloom rooms with assistive technology and in
  short landscape before the beta accessibility audit.

## 2026-07-10 — Mosswake to Prism threshold

- **Build:** 0.8.0 release candidate
- **Scenario:** Resume at Borrowed Spark, restore the remaining three Mosswake
  rooms, cross into Prism Pools, return to the title, and resume again.
- **Inputs:** keyboard navigation/action, pointer activation, and touch-layout
  controls.
- **Viewports:** desktop and 667 × 375 phone landscape.
- **Coverage:** charge carrying, nine crystal actions, three optional seeds,
  three room continuations, biome arrival, focus handoff, and arrival memory.

### Observations

- The Mosswake difficulty ramp remained readable across three consecutive
  rooms and the Prism arrival appeared only at the actual biome boundary.
- The first pass relied on native button activation while promising E as an
  alternate key. The arrival now handles Space, Enter, and E explicitly.
- The arrival and its continuation button fit fully inside the phone playfield
  without overlapping the title bar or requiring document scroll.
- After acknowledgement, focus returns to the game surface and the arrival does
  not replay when the same local journey is resumed.

### Follow-up

- Observe first-time players through the Hushroot bell-sequence introduction.
- Compare room-order comprehension with and without optional seed detours.
