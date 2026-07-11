import type { BiomeId } from "./contracts";

export interface EchoMemory {
  seedId: string;
  roomId: string;
  roomName: string;
  biome: BiomeId;
  biomeName: string;
  title: string;
  text: string;
}

export interface EchoMemoryEntry extends EchoMemory {
  number: number;
  discovered: boolean;
}

export interface EchoMemoryGroup {
  biome: BiomeId;
  biomeName: string;
  found: number;
  entries: EchoMemoryEntry[];
}

export const ECHO_MEMORIES: readonly EchoMemory[] = [
  {
    seedId: "moss-01-seed",
    roomId: "moss-01",
    roomName: "The First Bend",
    biome: "mosswake",
    biomeName: "Mosswake Entrance",
    title: "The First Lantern",
    text: "Long before Mica arrived, someone set a thimble-sized lantern beside the moss. It went dark, but the moss remembered the shape of its warmth.",
  },
  {
    seedId: "moss-02-seed",
    roomId: "moss-02",
    roomName: "Borrowed Spark",
    biome: "mosswake",
    biomeName: "Mosswake Entrance",
    title: "A Spark Is Borrowed",
    text: "Glimmer was never meant to be owned. The old keepers carried it from source to source, leaving every chamber brighter than they found it.",
  },
  {
    seedId: "moss-03-seed",
    roomId: "moss-03",
    roomName: "Stone Ladder",
    biome: "mosswake",
    biomeName: "Mosswake Entrance",
    title: "Stone Takes Its Time",
    text: "The first gardeners learned that crystal and stone cannot be hurried. They listened for the angle that let both keep their nature.",
  },
  {
    seedId: "moss-04-seed",
    roomId: "moss-04",
    roomName: "The Green Door",
    biome: "mosswake",
    biomeName: "Mosswake Entrance",
    title: "The Door Below",
    text: "When the upper garden dimmed, the keepers followed a green pulse deeper. They promised the entrance would stay awake for anyone who returned.",
  },
  {
    seedId: "prism-01-seed",
    roomId: "prism-01",
    roomName: "Blue Below",
    biome: "prism-pools",
    biomeName: "Prism Pools",
    title: "A Sky Kept Safe",
    text: "The pools had never seen the open sky, so travelers brought them stories of stars. The water has guarded every one.",
  },
  {
    seedId: "prism-02-seed",
    roomId: "prism-02",
    roomName: "An Arc of Rain",
    biome: "prism-pools",
    biomeName: "Prism Pools",
    title: "Rain Without Clouds",
    text: "Crystal arches once scattered lantern light into rainbows for children who lived above. The colors still arrive when no one is watching.",
  },
  {
    seedId: "prism-03-seed",
    roomId: "prism-03",
    roomName: "The Long Reflection",
    biome: "prism-pools",
    biomeName: "Prism Pools",
    title: "Two Hands, One Spark",
    text: "No keeper crossed the long pool alone. One released the glimmer from the near shore; another received it beyond the reflection.",
  },
  {
    seedId: "prism-04-seed",
    roomId: "prism-04",
    roomName: "Glassgarden Gate",
    biome: "prism-pools",
    biomeName: "Prism Pools",
    title: "Constellations Underfoot",
    text: "On the night the grotto slept, each pool held one final star. Together they drew a path toward the listening roots.",
  },
  {
    seedId: "hush-01-seed",
    roomId: "hush-01",
    roomName: "Three Soft Notes",
    biome: "hushroot",
    biomeName: "Hushroot Hollows",
    title: "The First Three Notes",
    text: "The root-bells learned their opening song from rain tapping stone: a round note, a rising note, and one bright enough to linger.",
  },
  {
    seedId: "hush-02-seed",
    roomId: "hush-02",
    roomName: "Rootsong",
    biome: "hushroot",
    biomeName: "Hushroot Hollows",
    title: "A Melody Is a Map",
    text: "Keepers sang directions where ink would fade. Low, high, middle meant turn, climb, and return safely home.",
  },
  {
    seedId: "hush-03-seed",
    roomId: "hush-03",
    roomName: "The Listening Dark",
    biome: "hushroot",
    biomeName: "Hushroot Hollows",
    title: "The Slow Heartbeat",
    text: "Deep beneath every silence, the Heartbloom kept time. The roots did not fear the dark; they were counting until light came back.",
  },
  {
    seedId: "hush-04-seed",
    roomId: "hush-04",
    roomName: "Chorus Door",
    biome: "hushroot",
    biomeName: "Hushroot Hollows",
    title: "A Chorus Travels",
    text: "No root sang alone. Each passed the melody onward until even the smallest tendril knew the way to the sea-deep chambers.",
  },
  {
    seedId: "tide-01-seed",
    roomId: "tide-01",
    roomName: "Low Water",
    biome: "tideglass",
    biomeName: "Tideglass Deeps",
    title: "A Moonless Tide",
    text: "No moon reaches the Deeps, yet the water rises and falls. The keepers believed the Heartbloom was breathing below them.",
  },
  {
    seedId: "tide-02-seed",
    roomId: "tide-02",
    roomName: "A Rising Path",
    biome: "tideglass",
    biomeName: "Tideglass Deeps",
    title: "Lamps in the Silt",
    text: "When the tide climbed, seed-lamps rose from the floor like patient fireflies. Their glow marked water safe enough to cross.",
  },
  {
    seedId: "tide-03-seed",
    roomId: "tide-03",
    roomName: "The Sunken Lantern",
    biome: "tideglass",
    biomeName: "Tideglass Deeps",
    title: "The Sunken Keeper",
    text: "The last keeper lowered a lantern into the flood and left it burning. Its light waited under glassy water for another gentle hand.",
  },
];

const MEMORY_BY_SEED = new Map(
  ECHO_MEMORIES.map((memory) => [memory.seedId, memory]),
);

export function echoMemoryForSeed(seedId: string): EchoMemory | null {
  return MEMORY_BY_SEED.get(seedId) ?? null;
}

export function collectedMemoryCount(collectedSeedIds: readonly string[]): number {
  const collected = new Set(collectedSeedIds);
  return ECHO_MEMORIES.filter((memory) => collected.has(memory.seedId)).length;
}

export function echoMemoryGroups(
  collectedSeedIds: readonly string[],
): EchoMemoryGroup[] {
  const collected = new Set(collectedSeedIds);
  const groups = new Map<BiomeId, EchoMemoryGroup>();

  ECHO_MEMORIES.forEach((memory, index) => {
    const group = groups.get(memory.biome) ?? {
      biome: memory.biome,
      biomeName: memory.biomeName,
      found: 0,
      entries: [],
    };
    const discovered = collected.has(memory.seedId);
    group.entries.push({ ...memory, number: index + 1, discovered });
    if (discovered) group.found += 1;
    groups.set(memory.biome, group);
  });

  return [...groups.values()];
}
