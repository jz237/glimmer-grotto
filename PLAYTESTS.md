# Structured playtests

Playtests use a repeatable scenario, record the input and viewport, and turn
every observed defect into either a fix or a named follow-up. Agent-assisted
passes validate mechanics and instrumentation; external human observation is
still required before content freeze.

## 2026-07-11 — Rolling the light safely backward

- **Build:** Sites version 17 / 0.20.0, rolled back to version 16 / 0.19.0 and
  restored to version 17
- **Scenario:** Republish the immediately prior owner-only production artifact,
  verify its identity from uncached edge responses, restore the certified
  release, and reverify source bytes and access policy.
- **Inputs:** private Sites deployment controls and direct authenticated HTTP
  artifact probes; no public access or player save mutation.
- **Viewport:** deployment-level pass, independent of interface geometry.
- **Coverage:** saved-version provenance, both terminal deployment states, both
  service-worker generations, both notice versions, current interface SHA-256,
  current completion certificate, production URL, and owner allowlist.

### Observations

- Version 16 resolved to commit `58df17a` and the 0.19.0 archive; version 17
  resolved to commit `051082d` and the 0.20.0 certified archive before either
  deployment began.
- The rollback control plane reached success before production edge responses
  changed. The first probe still returned v14 and 0.20.0; continued uncached
  probes then converged on v13 and 0.19.0 with v14 absent. A terminal deployment
  state alone is therefore not sufficient rollback evidence.
- Restoration showed the same propagation window: the current hashed interface
  was briefly absent after the publish job succeeded. Final probes matched its
  local SHA-256 exactly, returned v14 and 0.20.0, and returned the clean-profile
  certificate byte for byte with its 20-room afterglow result intact.
- Both deploy operations used the owner-only path. After restoration, access
  remained custom at revision 1 with one allowed user and zero allowed groups.
- Both artifacts use save schema 1, so the drill did not cross a migration
  boundary. The deployment itself did not read or write browser-local progress.

### Follow-up

- Repeat the drill for the final private release candidate, using the runbook's
  edge-convergence checks rather than control-plane status alone.
- Add interrupted-deployment and storage-pressure recovery to the physical
  installed-PWA matrix.

## 2026-07-11 — From first spark to afterglow

- **Build:** 0.20.0 release candidate
- **Scenario:** Begin with a fresh versioned save, follow the real player route
  through every authored room and memory detour, acknowledge every biome
  threshold, reload at each persistence boundary, reach the ending, export and
  import the canonical save, then reopen and solve the afterglow room.
- **Inputs:** 976 cardinal movement commands and 127 contextual interactions
  generated against the same collision and interaction rules as the runtime.
- **Viewport:** runtime-independent campaign pass; responsive interface geometry
  remains covered by the existing viewport matrix.
- **Coverage:** 20 rooms, 15 memories, five biome map groups, four threshold
  acknowledgements, 27 autosave reloads, one export/import round trip, ending
  persistence, map restoration, and a 90-command Heartbloom revisit.

### Observations

- Campaign events had previously been persisted by inline UI branches while
  navigation, save recovery, and afterglow were tested separately. The live
  interface now calls one pure campaign transition function that the continuous
  release pass exercises directly.
- All 1,103 campaign commands solved in canonical room order. Every optional
  memory was collected before its bloom restored, and the four authored arrival
  acknowledgements survived the same save reconciliation used in production.
- All 27 autosave reloads returned cleanly without repair, backup recovery, or
  reset. The completed save also exported and imported canonically without a
  migration or data change.
- Reopening selected Glimmer Grotto as a revisit. Its verified route solved a
  second time while the frontier remained room 20, all map groups remained
  restored, and all 15 memories stayed found.
- The exact per-room evidence now ships as JSON with the production build,
  matches the release version byte for byte, and is included in the first-load
  offline cache.

### Follow-up

- Rehearse a private rollback from this certified artifact and prove that the
  previous controller release can be restored without changing player access.
- Repeat a complete fresh journey with human players to evaluate memory
  discovery cadence and story comprehension rather than mechanical reachability.

## 2026-07-11 — Holding the whole path

- **Build:** 0.19.0 release candidate
- **Scenario:** Exercise the deterministic input model and audited UI transition
  graph for a controller-only route from title to play, Lantern menu, Settings,
  journal, map replay, completed ending, and back to play or title without a
  keyboard, pointer, or touchscreen.
- **Inputs:** standard-mapped left stick, D-pad, A, B, View/Back, and Menu/Start,
  plus deterministic held-button and held-direction transition frames.
- **Viewport:** interface-independent input pass; all controller focus targets
  retain the existing responsive and short-landscape dialog layouts.
- **Coverage:** title and ending focus, default actions, menu entry, map lock
  during biome arrivals, journal shortcut, settings/help reachability, modal
  focus wrapping and repeat cadence, checkbox activation, stepped sliders,
  long-panel scrolling, room selection, close behavior, and resume suppression.

### Observations

- The room itself had mature controller support, but the surrounding shell did
  not poll a gamepad. Starting the game, recovering a missed memory, changing
  accessibility settings, reading the journal, or leaving the ending still
  required a second device.
- Menu/Start now pauses into a focused Lantern menu. Its first movement lands
  on the map, while every other route—journal, Settings, How to Play, and title—
  is reachable through the same visible focus system. View/Back opens the echo
  journal directly.
- Title and ending screens now use the same dominant-axis dead zone and repeat
  cadence as room movement. A chooses the focused action, and the primary
  continue/explore action is the default when no page control was focused.
- Dialog D-pad movement wraps without a dead end. A activates buttons and
  toggles, left/right changes volume sliders by their declared 5% step, and
  up/down scrolls long panels that otherwise contain only a Close control.
- Closing with B or choosing with A previously risked becoming a fresh Compass
  or room action on resume. The scene now snapshots every held controller input
  at each handoff and requires neutral release before accepting another edge.
- Map travel remains unavailable during an unacknowledged biome arrival, so a
  controller cannot silently skip the threshold; journal, help, and settings
  remain available.

### Follow-up

- Repeat the complete flow on physical Xbox, PlayStation, Nintendo-layout, and
  generic controllers in the current/previous desktop browser matrix; confirm
  each browser's labels for View/Back and Menu/Start.
- Include controller reconnection, wireless sleep/wake, and browser focus loss
  in the installed-device PWA matrix.

## 2026-07-11 — Accounting for every shipped light

- **Build:** 0.18.0 release candidate
- **Scenario:** Rebuild from an empty distribution directory, identify every
  third-party runtime in the deployable client and server graphs, verify its
  installed metadata and complete upstream license, then load the notice from
  both the interface and the first-install offline cache.
- **Inputs:** deterministic build-manifest, bundle-source, package-metadata,
  notice-copy, service-worker install, and generated-asset checks.
- **Viewport:** server-rendered interface pass; footer and scrollable Settings
  provide equivalent notice access, including narrow layouts that hide the
  footer.
- **Coverage:** nine shipped packages in six notice groups, all four top-level
  production dependencies, exact version and SPDX drift, full license text,
  client/server runtime evidence, public-copy parity, offline MIME validation,
  stale build output, and unreferenced generated fonts.

### Observations

- The lockfile contains optional platform packages used by the build toolchain,
  including native image variants, but they are not present in the deployed
  bundle. The notice now follows production evidence instead of over-reporting
  everything installed in `node_modules`.
- Phaser and its EventEmitter3 dependency ship in the lazy game engine. React,
  React DOM, Scheduler, React Server DOM Webpack, Vinext, the Vite RSC runtime,
  and a generated Rolldown helper make up the remaining reviewed runtime groups.
- Next.js remains a source-level compatibility dependency, but its imports are
  resolved to Vinext shims and no Next.js module appears in the distribution;
  that exclusion is explicit and will fail closed if the graph changes.
- A clean Vinext build still emitted 11 Geist and Geist Mono files totaling
  146,464 bytes despite no font import or emitted reference. A guarded postbuild
  pass now removes them only while every emitted text asset remains unreferenced;
  a future real font use will instead stop the license gate.
- Complete upstream MIT texts now ship in one plain-text notice. Settings and
  the footer open it in a new tab, and service-worker installation caches it
  alongside the shell, icons, manifest, and lazy game engine.
- Four deterministic checks now force review when package versions, SPDX values,
  license sources, top-level dependency decisions, bundle evidence, or copied
  notices drift.

### Follow-up

- Repeat the artifact audit for every quarterly dependency upgrade and whenever
  a new production asset type is introduced.
- Include the notice link in physical installed-PWA testing and obtain the
  appropriate product/legal sign-off before any explicitly approved public or
  storefront distribution.

## 2026-07-11 — Keeping the lantern lit offline

- **Build:** 0.17.0 release candidate
- **Scenario:** Install from a fresh generated production shell, sever every
  network response, reload the root route, and request the lazy game engine;
  then repeat refreshes with successful sign-in HTML in place of the shell and
  a script.
- **Inputs:** deterministic install, fetch, message, and activation events
  against both synthetic fixtures and the real hashed production build.
- **Viewport:** runtime-independent worker pass; visible offline status retains
  the same responsive banner treatment as save recovery.
- **Coverage:** first-install app shell, module-preload discovery, recursive
  dynamic imports, CSS dependencies, manifest and icons, disconnected
  navigation, lazy Phaser startup, MIME validation, authentication cache
  poisoning, explicit skip-waiting, cache cleanup scope, and client claiming.

### Observations

- The old install cached only root HTML, the manifest, and icons. Because the
  first page loaded before its new worker controlled it, none of the hashed CSS
  or JavaScript was guaranteed to enter the cache before connectivity vanished.
- Caching the files named in HTML was still incomplete: the 1.4 MB Phaser engine
  is loaded dynamically only when play begins and is absent from the initial
  module-preload list. Recursive import discovery now includes it on install.
- Owner authentication can return a sign-in document with a successful status.
  Status-only checks could therefore overwrite a game script or the offline
  root with HTML. Shell identity and destination-specific MIME checks now reject
  those responses while still showing the live sign-in page when online.
- With all production asset requests changed to network failures, the cached
  root and complete lazy engine remained readable. Every generated client CSS
  and JavaScript asset was present in the first-install cache.
- Activation deleted only older Glimmer Grotto caches, preserved unrelated app
  caches, claimed open clients, and still required the explicit update message
  before a waiting worker skipped ahead.
- The interface now names offline mode and reassures players that their journey
  continues to save locally; reconnection immediately checks for an update.

### Follow-up

- Repeat installation, airplane-mode launch, and update acceptance on physical
  iOS, Android, Windows, and macOS devices in the current/previous browser
  matrix.
- Exercise an interrupted update and storage-pressure eviction on installed
  PWAs, then rehearse rollback from the final private release candidate.

## 2026-07-11 — Making room for every control

- **Build:** 0.16.0 release candidate
- **Scenario:** Inspect a completed Heartbloom save with Larger text and High
  contrast enabled, open Settings and the Lantern Compass, then repeat the
  narrowest pass on a clean profile in The First Warmth.
- **Inputs:** pointer activation and accessibility-tree inspection.
- **Viewports:** 640 × 360 for 200%-equivalent desktop reflow, plus 320 × 360
  and 320 × 180 for 400%-equivalent reflow geometry.
- **Coverage:** title and ending actions, modal scroll containment, fine-pointer
  touch detection, five-item puzzle toolbar, three-mechanic status, first-room
  guide, Compass wrapping, document width, and accessible grouping.

### Observations

- The initial 200% pass remained horizontally contained, but its reduced CSS
  width activated all five touch controls despite a fine pointer. At 400%, the
  direction pad overlapped a three-part status panel squeezed to roughly 35
  CSS pixels.
- Touch controls now depend on coarse-pointer capability instead of viewport
  width. They disappear visually and from the accessibility tree during
  fine-pointer reflow, removing five redundant tab stops.
- Mechanic status and opening guidance now move below the canvas at 480 CSS
  pixels or narrower. Heartbloom's source, rootsong, and tide states retained
  their full labels at 320 pixels; the clean-profile tutorial did the same.
- The first corrected landscape pass still clipped Focus and Map because the
  short-height canvas was narrower than its toolbar. A full-width zoomed canvas
  and compact toolbar now keep all five actions inside the frame.
- The Compass card wrapped to the available 289 CSS pixels, preserved its live
  coordinate and beam report, and introduced no horizontal document overflow.
- Puzzle tools now appear as a named toolbar in the accessibility tree. Hidden
  fine-pointer touch controls no longer appear as an extra generic group.

### Follow-up

- Repeat these states with native 200% and 400% zoom in the current/previous
  browser matrix; this pass validated equivalent CSS reflow dimensions.
- Run hands-on VoiceOver, NVDA, and TalkBack traversal, including the toolbar,
  reflowed status, and Compass announcement sequence.

## 2026-07-11 — Finding a path without the canvas

- **Build:** 0.15.0 release candidate
- **Scenario:** Open a completed afterglow, request a Lantern Compass report in
  the Heartbloom, move and refresh it with the keyboard, then revisit The First
  Warmth and rotate its first crystal to verify that both location and beam
  state change.
- **Inputs:** pointer activation, C, movement keys, E, and deterministic
  controller-button mapping.
- **Viewports:** desktop, 390 × 844 phone portrait, and 320 × 568 narrow phone
  with Larger text and High contrast already enabled.
- **Coverage:** live-region output, stale-state clearing, coordinate and facing
  changes, four-way surroundings, puzzle landmarks, inactive prerequisites,
  boundary exits, crystal-state updates, toolbar fit, card wrapping, and
  keyboard/pointer/controller parity.

### Observations

- The first report exposed Mica's coordinate and facing, all four adjacent
  paths, the bloom, a loose glimmer, and the finale's three inactive beam
  requirements without depending on the rendered canvas.
- Moving removed the visible report and replaced its old live-region content
  with an explicit refresh prompt. C immediately restored a current report.
- In The First Warmth, the reported beam changed from the south edge at column
  6 to the west edge at row 2 after the first crystal rotated, confirming that
  the Compass reads live puzzle state rather than cached room copy.
- The initial boundary wording exposed an impossible “row 8” on a seven-row
  playfield. Edge exits now name north, east, south, or west and only report the
  valid perpendicular coordinate.
- All five puzzle tools fit within a 320-pixel viewport, and the full Compass
  card wrapped without horizontal overflow at both phone sizes.
- Parameterized checks now exercise finite, bounded descriptions for every one
  of the 20 authored rooms.

### Follow-up

- Run hands-on traversal with current VoiceOver, NVDA, and TalkBack, including
  repeated movement and interaction announcements.
- Validate the B-button path on physical controller hardware and repeat the
  Compass card at 200% browser zoom in the beta browser matrix.

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
