# Structured playtests

Playtests use a repeatable scenario, record the input and viewport, and turn
every observed defect into either a fix or a named follow-up. Agent-assisted
passes validate mechanics and instrumentation; external human observation is
still required before content freeze.

## 2026-07-11 — Reading every path

- **Build:** 0.14.0 release candidate
- **Scenario:** Enable Larger text and High contrast together on a completed
  afterglow, then inspect Settings, the ending, full journal, all-restored map,
  and the three-mechanic Heartbloom finale before repeating the critical states
  in phone landscape.
- **Inputs:** pointer activation and Escape.
- **Viewports:** 1280 × 720 desktop and 667 × 375 phone landscape.
- **Coverage:** persistent accessibility settings, headings, body copy,
  counters, controls, canvas labels, collection cards, map states, modal scroll,
  close controls, focus return, touch-control clearance, and mechanic-state
  legibility.

### Observations

- The initial implementation enlarged story copy but left dozens of explicit
  pixel-sized labels unchanged. Shared text and heading lifts now reach every
  fixed CSS label, while six Phaser label sites use the same saved setting.
- The desktop Settings dialog, ending, two-column journal, and map remained
  balanced with stronger borders and larger copy. All 15 stories and all 20 map
  rooms remained reachable through their contained scroll regions.
- At phone landscape size, the map and Settings dialog retained their heading,
  close control, summary or first toggle, and internal scrollbar without
  horizontal overflow. Escape closed Settings and returned focus correctly.
- The first enlarged finale pass ellipsized “Glimmer source,” “Needs a glimmer,”
  and “High · needs low.” The large-text-only status width now uses the safe
  center gap, and all three labels wrap in full while clearing the direction pad
  and Action control.
- Automated guards now reject newly introduced fixed CSS font sizes or literal
  Phaser font sizes that bypass the accessibility setting.

### Follow-up

- Repeat the opening guide and every biome arrival with Larger text enabled in
  the clean-profile completion pass.
- Continue the beta audit with screen-reader traversal and 200% browser zoom,
  then cover the same states in the current/previous browser matrix.

## 2026-07-11 — Keeping the lantern safe

- **Build:** 0.13.0 release candidate
- **Scenario:** Load the existing completed afterglow, then exercise repaired
  primary, backup recovery, invalid dual-generation, interrupted-ending, and
  inconsistent-import fixtures against the authored campaign directory.
- **Inputs:** browser reload plus deterministic save/storage fixtures.
- **Viewports:** 1280 × 720 desktop and 667 × 375 phone landscape for the
  recovery notice and completed-save migration.
- **Coverage:** canonical midgame and afterglow round trips, progress gaps,
  unknown room and seed IDs, future discoveries, duplicate entries, biome
  arrivals, settings bounds, timestamps, play time, repair backup preservation,
  corrupt-primary recovery, and unrecoverable reset.

### Observations

- The real 20/20, 15/15 afterglow save loaded unchanged, showed no repair
  notice, and retained both completed-journey actions.
- The recovery notice remained readable above the completed ending at both
  viewports, exposed an explicit dismiss control, and did not obscure the
  ending's collection state or actions.
- A room-four save with gaps was rebuilt as the first four authored rooms while
  retaining room four as its frontier. Unknown IDs and a Tideglass seed were
  removed; its reachable Mosswake seed and Prism arrival remained.
- Out-of-range audio levels were clamped, malformed toggles returned to safe
  defaults, and negative play time returned to zero.
- Twenty unknown room IDs no longer produce a false ending. Conversely, the
  explicit ending flag and the full authored room set each recover a complete,
  playable afterglow.
- A valid backup replaced a damaged primary. A repair preserved the original
  source as backup, while two unreadable generations produced a fresh canonical
  save and the correct recovery outcome for the player notice.

### Follow-up

- Repeat export/import through native file pickers in the beta browser matrix,
  including a manually edited but recoverable file.
- Exercise backup recovery alongside the offline and service-worker update
  matrix so storage repair and app-shell replacement are covered together.

## 2026-07-11 — Light after the ending

- **Build:** 0.12.0 release candidate
- **Scenario:** Resume at Rootsong with ten memories, restore the final eleven
  rooms while deliberately skipping The Sunken Lantern's seed, wake the
  Heartbloom at 14/15, enter the afterglow, recover that seed, and return to the
  Heartbloom and title without replaying the ending.
- **Inputs:** keyboard movement/action, pointer activation, and Escape.
- **Viewports:** 1280 × 720 desktop and 667 × 375 phone landscape.
- **Coverage:** full late-campaign navigation, two biome arrivals, every
  remaining rootsong/tide/charge mechanic, incomplete and complete ending copy,
  all-restored map state, postgame replay, final-memory persistence, title
  return, focus return, and short-landscape layout.

### Observations

- All eleven rooms restored through their real movement and interaction paths.
  The ending arrived at 20/20 and 14/15, explicitly named the one waiting
  memory, and made continued exploration the primary action.
- The afterglow reopened at the Heartbloom with all five map groups at 4/4,
  nineteen revisit choices, no locked rooms, and The Sunken Lantern correctly
  marked “Memory waiting.”
- Recovering the final seed changed the collection to 15/15. Solving that old
  room returned to the Heartbloom in afterglow instead of firing the ending,
  while a title round trip retained both completion and the full lantern.
- The first phone pass spent its entire opening viewport on the ending flower.
  A compact two-column ending now presents the flower, message, collection
  state, and all three actions together without document scrolling.
- The completed phone map remained internally scrollable with its heading,
  summary, close control, first room, and 4/4 biome state visible. Escape closed
  it and returned focus to Map.

### Follow-up

- Run the 1.0 clean-profile completion gate without imported or pre-seeded
  progress, then repeat with high contrast and larger text enabled.
- Observe whether a first-time human finisher chooses the afterglow naturally
  when one or more memories remain.

## 2026-07-10 — Returning for a missed light

- **Build:** 0.11.0 release candidate
- **Scenario:** Resume at Rootsong with nine restored rooms, revisit The First
  Warmth, recover its missed memory, return to Rootsong through the map, verify
  a title round trip, then replay and solve the old room once more.
- **Inputs:** pointer activation, keyboard movement/action, Space, and Escape.
- **Viewports:** 1280 × 720 desktop and 667 × 375 phone landscape.
- **Coverage:** all 20 map entries, restored/current/locked states, found/waiting
  memory states, revisit entry, seed persistence, map return, solved-room return,
  title resume, focus return, and progress-frontier preservation.

### Observations

- The map correctly exposed rooms 1–9, kept room 10 as the current path, and
  left rooms 11–20 locked. Only The First Warmth showed a recoverable missing
  memory among the restored rooms.
- Collecting that seed changed 9/15 to 10/15 while campaign progress remained
  9/20. The new “First Lantern” memory appeared immediately in the room card.
- Returning through the map restored Rootsong with its puzzle freshly reset.
  Returning to the title and resuming also reopened Rootsong at 9/20 and 10/15.
- Solving the replayed room produced revisit-specific continuation copy and
  Space returned directly to Rootsong. That covered all three runtime progress
  writes without a regression.
- The phone map remained a single-column, internally scrolling dialog with its
  summary, close control, room status, and memory state visible without
  horizontal overflow.

### Follow-up

- Use the now-safe replay route to complete a clean-profile 15-memory run and
  review the collection's full narrative cadence.
- Observe whether players understand “Memory waiting” without opening the
  journal first, and soften or expand the label only if needed.

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
