import type {
  BellDefinition,
  BiomeId,
  Cell,
  RoomDefinition,
  RoomPalette,
} from "./contracts";
import { directionBetween, mirrorOrientation } from "./puzzle";

const PALETTES: Record<BiomeId, RoomPalette> = {
  mosswake: {
    background: 0x071a1a,
    floor: 0x15332c,
    floorAlt: 0x1b4035,
    accent: 0x95f9b2,
    accentSoft: 0x4cc88a,
    beam: 0xd8ffd1,
    stone: 0x26433c,
  },
  "prism-pools": {
    background: 0x0b1730,
    floor: 0x17294b,
    floorAlt: 0x20375f,
    accent: 0x9ee7ff,
    accentSoft: 0x6c85ff,
    beam: 0xe1fbff,
    stone: 0x2c3d63,
  },
  hushroot: {
    background: 0x171125,
    floor: 0x30203d,
    floorAlt: 0x3b294a,
    accent: 0xf5b8ff,
    accentSoft: 0xb66be0,
    beam: 0xffe0fb,
    stone: 0x4a3657,
  },
  tideglass: {
    background: 0x061a2a,
    floor: 0x0e3445,
    floorAlt: 0x16465a,
    accent: 0x79f3e6,
    accentSoft: 0x2bb7c3,
    beam: 0xd2fff7,
    stone: 0x245164,
  },
  heartbloom: {
    background: 0x1a1020,
    floor: 0x3b2039,
    floorAlt: 0x4b2a46,
    accent: 0xffd58b,
    accentSoft: 0xf37f8f,
    beam: 0xfff4c4,
    stone: 0x5a3b50,
  },
};

interface RoomSpec {
  id: string;
  biome: BiomeId;
  biomeName: string;
  name: string;
  subtitle: string;
  story: string;
  start: Cell;
  route: Cell[];
  hints: [string, string, string];
  walls?: Cell[];
  seed?: Cell;
  mote?: Cell;
  requiresCharge?: boolean;
  bells?: BellDefinition[];
  bellSequence?: string[];
  tideSwitch?: Cell;
  initialTide?: "low" | "high";
  requiredTide?: "low" | "high";
}

function buildRoom(spec: RoomSpec): RoomDefinition {
  if (spec.route.length < 3) {
    throw new Error(`${spec.id} needs a source, a corner, and a bloom`);
  }
  const crystals = spec.route.slice(1, -1).map((cell, index) => {
    const incoming = directionBetween(spec.route[index], cell);
    const outgoing = directionBetween(cell, spec.route[index + 2]);
    const solution = mirrorOrientation(incoming, outgoing);
    return {
      ...cell,
      id: `${spec.id}-crystal-${index + 1}`,
      solution,
      initial: (solution === 0 ? 1 : 0) as 0 | 1,
    };
  });

  return {
    ...spec,
    palette: PALETTES[spec.biome],
    source: {
      ...spec.route[0],
      direction: directionBetween(spec.route[0], spec.route[1]),
    },
    bloom: spec.route.at(-1)!,
    crystals,
    walls: spec.walls ?? [],
    seed: spec.seed ? { ...spec.seed, id: `${spec.id}-seed` } : undefined,
  };
}

const MOSS_WALLS: Cell[] = [
  { x: 3, y: 3 },
  { x: 4, y: 3 },
  { x: 10, y: 6 },
  { x: 11, y: 6 },
];

const POOL_WALLS: Cell[] = [
  { x: 2, y: 2 },
  { x: 3, y: 2 },
  { x: 11, y: 5 },
  { x: 12, y: 5 },
];

const ROOT_WALLS: Cell[] = [
  { x: 5, y: 4 },
  { x: 9, y: 4 },
  { x: 5, y: 5 },
  { x: 9, y: 5 },
];

const TIDE_WALLS: Cell[] = [
  { x: 3, y: 4 },
  { x: 4, y: 4 },
  { x: 11, y: 3 },
  { x: 12, y: 3 },
];

const bell = (id: string, x: number, y: number, tone: number): BellDefinition => ({
  id,
  x,
  y,
  tone,
});

export const ROOMS: RoomDefinition[] = [
  buildRoom({
    id: "moss-01",
    biome: "mosswake",
    biomeName: "Mosswake Entrance",
    name: "The First Warmth",
    subtitle: "A small light remembers the way.",
    story: "Mica lifts the lantern. Somewhere ahead, a sleeping bloom answers.",
    start: { x: 2, y: 7 },
    route: [{ x: 1, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 2 }, { x: 13, y: 2 }],
    hints: [
      "Follow the pale beam to the first crystal.",
      "Stand beside a crystal and turn it toward the next one.",
      "Both crystals should bend the beam around the stone shelf.",
    ],
    walls: MOSS_WALLS,
    seed: { x: 12, y: 7 },
  }),
  buildRoom({
    id: "moss-02",
    biome: "mosswake",
    biomeName: "Mosswake Entrance",
    name: "Borrowed Spark",
    subtitle: "Light can be carried, if held gently.",
    story: "A loose glimmer waits in the moss, bright as a held breath.",
    start: { x: 3, y: 7 },
    route: [{ x: 2, y: 5 }, { x: 7, y: 5 }, { x: 7, y: 1 }, { x: 12, y: 1 }],
    hints: [
      "Walk over the loose glimmer to carry it.",
      "Bring the glimmer to the dark source and press the action button.",
      "Charge the source, then turn both crystals until the bloom opens.",
    ],
    walls: [{ x: 5, y: 2 }, { x: 5, y: 3 }, { x: 10, y: 6 }],
    mote: { x: 12, y: 7 },
    requiresCharge: true,
    seed: { x: 1, y: 1 },
  }),
  buildRoom({
    id: "moss-03",
    biome: "mosswake",
    biomeName: "Mosswake Entrance",
    name: "Fernway",
    subtitle: "The cave unfolds one quiet corner at a time.",
    story: "New fronds rise wherever the beam has passed.",
    start: { x: 2, y: 7 },
    route: [{ x: 1, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 1 }, { x: 10, y: 1 }, { x: 10, y: 6 }, { x: 13, y: 6 }],
    hints: [
      "Turn only the crystal currently touched by the beam.",
      "The route climbs, crosses the ceiling, then descends.",
      "Set the crystals to bend north, east, south, then east.",
    ],
    walls: [{ x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }],
    seed: { x: 7, y: 7 },
  }),
  buildRoom({
    id: "moss-04",
    biome: "mosswake",
    biomeName: "Mosswake Entrance",
    name: "The Green Door",
    subtitle: "A whole garden leans toward the deep.",
    story: "The entrance breathes again. Luma circles the newly opened path.",
    start: { x: 7, y: 7 },
    route: [{ x: 1, y: 7 }, { x: 1, y: 2 }, { x: 5, y: 2 }, { x: 5, y: 6 }, { x: 11, y: 6 }, { x: 11, y: 2 }, { x: 13, y: 2 }],
    hints: [
      "This beam makes a long zigzag through the grove.",
      "Work outward from the source; each correct turn reveals the next.",
      "Route north, east, south, east, north, then east.",
    ],
    walls: [{ x: 3, y: 4 }, { x: 7, y: 3 }, { x: 8, y: 3 }],
    mote: { x: 13, y: 7 },
    requiresCharge: true,
    seed: { x: 7, y: 1 },
  }),

  buildRoom({
    id: "prism-01",
    biome: "prism-pools",
    biomeName: "Prism Pools",
    name: "Blue Below",
    subtitle: "Still water keeps every star it sees.",
    story: "The stone gives way to glassy pools and patient crystal arches.",
    start: { x: 2, y: 7 },
    route: [{ x: 1, y: 6 }, { x: 5, y: 6 }, { x: 5, y: 2 }, { x: 9, y: 2 }, { x: 9, y: 6 }, { x: 13, y: 6 }],
    hints: [
      "Reflections are easiest to read from the source outward.",
      "The beam crosses the room twice at different heights.",
      "Bend north, east, south, and east.",
    ],
    walls: POOL_WALLS,
    seed: { x: 13, y: 1 },
  }),
  buildRoom({
    id: "prism-02",
    biome: "prism-pools",
    biomeName: "Prism Pools",
    name: "An Arc of Rain",
    subtitle: "Every angle carries a different promise.",
    story: "Luma paints brief rainbows on the cavern roof.",
    start: { x: 12, y: 7 },
    route: [{ x: 13, y: 7 }, { x: 9, y: 7 }, { x: 9, y: 3 }, { x: 4, y: 3 }, { x: 4, y: 1 }, { x: 1, y: 1 }],
    hints: [
      "This path travels from right to left.",
      "Watch the small glyph on each crystal, not only its color.",
      "Turn the beam north, west, north, and west.",
    ],
    walls: [{ x: 6, y: 5 }, { x: 7, y: 5 }, { x: 11, y: 1 }],
    seed: { x: 2, y: 7 },
  }),
  buildRoom({
    id: "prism-03",
    biome: "prism-pools",
    biomeName: "Prism Pools",
    name: "The Long Reflection",
    subtitle: "Some answers return by another shore.",
    story: "An old inscription shows two hands passing a single spark.",
    start: { x: 7, y: 7 },
    route: [{ x: 2, y: 7 }, { x: 2, y: 1 }, { x: 6, y: 1 }, { x: 6, y: 5 }, { x: 11, y: 5 }, { x: 11, y: 2 }, { x: 13, y: 2 }],
    hints: [
      "The route begins by climbing the far-left channel.",
      "Correct crystals form a stair-step across the pools.",
      "Send the beam north, east, south, east, north, east.",
    ],
    walls: [{ x: 4, y: 4 }, { x: 8, y: 3 }, { x: 9, y: 3 }],
    mote: { x: 13, y: 7 },
    requiresCharge: true,
    seed: { x: 1, y: 4 },
  }),
  buildRoom({
    id: "prism-04",
    biome: "prism-pools",
    biomeName: "Prism Pools",
    name: "Glassgarden Gate",
    subtitle: "The pools shine back at the waking world.",
    story: "Behind Mica, every pool now holds a moving constellation.",
    start: { x: 2, y: 7 },
    route: [{ x: 1, y: 5 }, { x: 4, y: 5 }, { x: 4, y: 2 }, { x: 8, y: 2 }, { x: 8, y: 7 }, { x: 12, y: 7 }, { x: 12, y: 4 }, { x: 13, y: 4 }],
    hints: [
      "The glassgarden path crosses three different depths.",
      "A correct turn always sends the beam toward an untouched crystal.",
      "Route north, east, south, east, north, then east.",
    ],
    walls: [{ x: 2, y: 2 }, { x: 6, y: 5 }, { x: 10, y: 4 }],
    seed: { x: 7, y: 4 },
  }),

  buildRoom({
    id: "hush-01",
    biome: "hushroot",
    biomeName: "Hushroot Hollows",
    name: "Three Soft Notes",
    subtitle: "The roots listen before they glow.",
    story: "Bell-flowers wait in a patient row, each marked with a distinct glyph.",
    start: { x: 2, y: 7 },
    route: [{ x: 1, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 2 }, { x: 13, y: 2 }],
    hints: [
      "Wake the bell-flowers before routing the light.",
      "Their glyphs show the order: circle, triangle, diamond.",
      "Ring the bells from left to right, then turn both crystals.",
    ],
    walls: ROOT_WALLS,
    bells: [bell("hush-01-a", 3, 2, 0), bell("hush-01-b", 7, 7, 1), bell("hush-01-c", 11, 5, 2)],
    bellSequence: ["hush-01-a", "hush-01-b", "hush-01-c"],
    seed: { x: 13, y: 7 },
  }),
  buildRoom({
    id: "hush-02",
    biome: "hushroot",
    biomeName: "Hushroot Hollows",
    name: "Rootsong",
    subtitle: "A melody can be a map.",
    story: "The cave repeats Luma's wingbeats in warm violet pulses.",
    start: { x: 12, y: 7 },
    route: [{ x: 13, y: 6 }, { x: 10, y: 6 }, { x: 10, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 5 }, { x: 1, y: 5 }],
    hints: [
      "The bell sequence follows low, high, middle.",
      "Use the glyph shapes: circle, diamond, triangle.",
      "Ring A, C, B; then route west, north, west, south, west.",
    ],
    walls: [{ x: 7, y: 3 }, { x: 8, y: 3 }],
    bells: [bell("hush-02-a", 2, 2, 0), bell("hush-02-b", 7, 7, 1), bell("hush-02-c", 12, 3, 2)],
    bellSequence: ["hush-02-a", "hush-02-c", "hush-02-b"],
    seed: { x: 1, y: 7 },
  }),
  buildRoom({
    id: "hush-03",
    biome: "hushroot",
    biomeName: "Hushroot Hollows",
    name: "The Listening Dark",
    subtitle: "Silence is not emptiness.",
    story: "Mica pauses. Beneath the roots, the Heartbloom keeps a very slow time.",
    start: { x: 7, y: 7 },
    route: [{ x: 1, y: 7 }, { x: 1, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 6 }, { x: 9, y: 6 }, { x: 9, y: 1 }, { x: 13, y: 1 }],
    hints: [
      "Listen with your eyes: each bell flashes its glyph when touched.",
      "The sequence alternates the outer bells, then ends in the center.",
      "Ring circle, diamond, circle, triangle; then follow the zigzag beam.",
    ],
    walls: [{ x: 6, y: 3 }, { x: 6, y: 4 }, { x: 11, y: 5 }],
    bells: [bell("hush-03-a", 2, 4, 0), bell("hush-03-b", 7, 2, 1), bell("hush-03-c", 12, 5, 2)],
    bellSequence: ["hush-03-a", "hush-03-c", "hush-03-a", "hush-03-b"],
    mote: { x: 13, y: 7 },
    requiresCharge: true,
    seed: { x: 7, y: 4 },
  }),
  buildRoom({
    id: "hush-04",
    biome: "hushroot",
    biomeName: "Hushroot Hollows",
    name: "Chorus Door",
    subtitle: "The roots carry the song onward.",
    story: "All around them, sleeping tendrils unfurl into a luminous arch.",
    start: { x: 2, y: 7 },
    route: [{ x: 1, y: 4 }, { x: 3, y: 4 }, { x: 3, y: 1 }, { x: 8, y: 1 }, { x: 8, y: 6 }, { x: 12, y: 6 }, { x: 12, y: 3 }, { x: 13, y: 3 }],
    hints: [
      "The chorus begins and ends on the middle bell.",
      "Watch the glyph pulse: triangle, circle, diamond, triangle.",
      "Ring B, A, C, B; then solve the six-turn route.",
    ],
    walls: [{ x: 5, y: 4 }, { x: 10, y: 3 }],
    bells: [bell("hush-04-a", 2, 2, 0), bell("hush-04-b", 7, 7, 1), bell("hush-04-c", 11, 1, 2)],
    bellSequence: ["hush-04-b", "hush-04-a", "hush-04-c", "hush-04-b"],
    seed: { x: 6, y: 5 },
  }),

  buildRoom({
    id: "tide-01",
    biome: "tideglass",
    biomeName: "Tideglass Deeps",
    name: "Low Water",
    subtitle: "The grotto has tides, though no moon reaches here.",
    story: "A stone lever hums beside a channel of turquoise water.",
    start: { x: 2, y: 7 },
    route: [{ x: 1, y: 6 }, { x: 5, y: 6 }, { x: 5, y: 2 }, { x: 10, y: 2 }, { x: 10, y: 6 }, { x: 13, y: 6 }],
    hints: [
      "The source wakes only when the tide matches its carved wave.",
      "Use the tide lever, then follow the beam from left to right.",
      "Set the tide low and route north, east, south, east.",
    ],
    walls: TIDE_WALLS,
    tideSwitch: { x: 7, y: 7 },
    initialTide: "high",
    requiredTide: "low",
    seed: { x: 13, y: 1 },
  }),
  buildRoom({
    id: "tide-02",
    biome: "tideglass",
    biomeName: "Tideglass Deeps",
    name: "A Rising Path",
    subtitle: "What sinks may also reveal.",
    story: "The water rises without hurry, lifting tiny lamps from the silt.",
    start: { x: 12, y: 7 },
    route: [{ x: 13, y: 7 }, { x: 9, y: 7 }, { x: 9, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 6 }, { x: 1, y: 6 }],
    hints: [
      "This source bears the high-tide glyph.",
      "Raise the tide before adjusting the reflections.",
      "Set the tide high and route north, west, south, west.",
    ],
    walls: [{ x: 6, y: 4 }, { x: 7, y: 4 }],
    tideSwitch: { x: 7, y: 7 },
    initialTide: "low",
    requiredTide: "high",
    seed: { x: 1, y: 1 },
  }),
  buildRoom({
    id: "tide-03",
    biome: "tideglass",
    biomeName: "Tideglass Deeps",
    name: "The Sunken Lantern",
    subtitle: "Even deep water can carry fire.",
    story: "Mica finds an old lantern beneath the surface and lends it a glimmer.",
    start: { x: 7, y: 7 },
    route: [{ x: 1, y: 5 }, { x: 4, y: 5 }, { x: 4, y: 1 }, { x: 9, y: 1 }, { x: 9, y: 6 }, { x: 13, y: 6 }],
    hints: [
      "The lantern needs both a glimmer and the correct tide.",
      "Carry the mote, lower the tide, then charge the source.",
      "At low tide, route north, east, south, east.",
    ],
    walls: [{ x: 6, y: 3 }, { x: 11, y: 3 }],
    mote: { x: 13, y: 2 },
    requiresCharge: true,
    tideSwitch: { x: 2, y: 7 },
    initialTide: "high",
    requiredTide: "low",
    seed: { x: 1, y: 1 },
  }),
  buildRoom({
    id: "tide-04",
    biome: "tideglass",
    biomeName: "Tideglass Deeps",
    name: "Current Gate",
    subtitle: "The last channel opens toward a warmer dark.",
    story: "The tide settles. Ahead, a golden pulse moves through the stone.",
    start: { x: 2, y: 7 },
    route: [{ x: 1, y: 7 }, { x: 1, y: 2 }, { x: 5, y: 2 }, { x: 5, y: 6 }, { x: 10, y: 6 }, { x: 10, y: 1 }, { x: 13, y: 1 }],
    hints: [
      "The gate opens at high tide.",
      "Set the water first, then solve from the source outward.",
      "At high tide, route north, east, south, east, north, east.",
    ],
    walls: [{ x: 3, y: 4 }, { x: 7, y: 3 }, { x: 12, y: 5 }],
    tideSwitch: { x: 13, y: 7 },
    initialTide: "low",
    requiredTide: "high",
  }),

  buildRoom({
    id: "heart-01",
    biome: "heartbloom",
    biomeName: "Heartbloom Sanctum",
    name: "All the Ways Home",
    subtitle: "Moss, crystal, root, and tide meet again.",
    story: "Every restored chamber sends a thread of light toward the center.",
    start: { x: 7, y: 7 },
    route: [{ x: 1, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 2 }, { x: 8, y: 2 }, { x: 8, y: 6 }, { x: 12, y: 6 }, { x: 12, y: 3 }, { x: 13, y: 3 }],
    hints: [
      "The old systems now answer one another.",
      "Charge the source, set the low tide, then follow the beam.",
      "At low tide, route north, east, south, east, north, east.",
    ],
    walls: [{ x: 2, y: 2 }, { x: 6, y: 4 }, { x: 10, y: 3 }],
    mote: { x: 13, y: 7 },
    requiresCharge: true,
    tideSwitch: { x: 2, y: 7 },
    initialTide: "high",
    requiredTide: "low",
  }),
  buildRoom({
    id: "heart-02",
    biome: "heartbloom",
    biomeName: "Heartbloom Sanctum",
    name: "A Familiar Chorus",
    subtitle: "The grotto remembers every kindness.",
    story: "The bell-flowers repeat the first notes Mica heard in the Hushroot.",
    start: { x: 2, y: 7 },
    route: [{ x: 1, y: 4 }, { x: 5, y: 4 }, { x: 5, y: 1 }, { x: 10, y: 1 }, { x: 10, y: 6 }, { x: 13, y: 6 }],
    hints: [
      "The melody mirrors the three glyphs from the first chorus.",
      "Ring diamond, triangle, circle.",
      "Ring C, B, A, then route north, east, south, east.",
    ],
    walls: [{ x: 3, y: 2 }, { x: 7, y: 5 }, { x: 12, y: 2 }],
    bells: [bell("heart-02-a", 2, 1, 0), bell("heart-02-b", 7, 7, 1), bell("heart-02-c", 12, 3, 2)],
    bellSequence: ["heart-02-c", "heart-02-b", "heart-02-a"],
  }),
  buildRoom({
    id: "heart-03",
    biome: "heartbloom",
    biomeName: "Heartbloom Sanctum",
    name: "The Lantern Bridge",
    subtitle: "One last crossing remains.",
    story: "Luma settles on Mica's lantern. Together, they make enough light.",
    start: { x: 7, y: 7 },
    route: [{ x: 1, y: 7 }, { x: 1, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 5 }, { x: 8, y: 5 }, { x: 8, y: 2 }, { x: 12, y: 2 }, { x: 12, y: 6 }, { x: 13, y: 6 }],
    hints: [
      "Every chamber's lesson is present here.",
      "Carry the mote, raise the tide, and ring circle, triangle, diamond.",
      "Prepare all three systems before solving the seven-turn beam.",
    ],
    walls: [{ x: 3, y: 7 }, { x: 6, y: 3 }, { x: 10, y: 5 }],
    mote: { x: 13, y: 4 },
    requiresCharge: true,
    bells: [bell("heart-03-a", 2, 4, 0), bell("heart-03-b", 7, 1, 1), bell("heart-03-c", 11, 7, 2)],
    bellSequence: ["heart-03-a", "heart-03-b", "heart-03-c"],
    tideSwitch: { x: 7, y: 6 },
    initialTide: "low",
    requiredTide: "high",
  }),
  buildRoom({
    id: "heart-04",
    biome: "heartbloom",
    biomeName: "Heartbloom Sanctum",
    name: "Glimmer Grotto",
    subtitle: "A light shared is a light that grows.",
    story: "At the center of the dark, the Heartbloom waits for one gentle answer.",
    start: { x: 2, y: 7 },
    route: [{ x: 1, y: 6 }, { x: 3, y: 6 }, { x: 3, y: 2 }, { x: 6, y: 2 }, { x: 6, y: 7 }, { x: 10, y: 7 }, { x: 10, y: 3 }, { x: 13, y: 3 }],
    hints: [
      "Nothing new is asked of you here—only everything learned together.",
      "Charge the lantern, lower the tide, and ring the bells from low to high.",
      "Prepare mote, low tide, A-B-C; then follow the final six turns.",
    ],
    walls: [{ x: 5, y: 4 }, { x: 8, y: 4 }, { x: 12, y: 6 }],
    mote: { x: 13, y: 7 },
    requiresCharge: true,
    bells: [bell("heart-04-a", 2, 1, 0), bell("heart-04-b", 7, 5, 1), bell("heart-04-c", 12, 1, 2)],
    bellSequence: ["heart-04-a", "heart-04-b", "heart-04-c"],
    tideSwitch: { x: 7, y: 7 },
    initialTide: "high",
    requiredTide: "low",
  }),
];
