import type { BiomeArrival, BiomeId, RoomDefinition } from "./contracts";

export const BIOME_ARRIVALS: Partial<Record<BiomeId, BiomeArrival>> = {
  "prism-pools": {
    biome: "prism-pools",
    name: "Prism Pools",
    eyebrow: "Beyond the green door",
    title: "Still water keeps every color it sees.",
    story:
      "Moss gives way to glassy pools. Luma's light splits across the ceiling, and each reflection points farther below.",
    buttonLabel: "Step into the pools",
    glyph: "◇",
  },
  hushroot: {
    biome: "hushroot",
    name: "Hushroot Hollows",
    eyebrow: "Under the last reflection",
    title: "The roots have been listening.",
    story:
      "Below the pools, ancient roots hold songs without singers. Their bells answer only in remembered order.",
    buttonLabel: "Follow the rootsong",
    glyph: "◌",
  },
  tideglass: {
    biome: "tideglass",
    name: "Tideglass Deeps",
    eyebrow: "Where the choir thins",
    title: "The cave begins to breathe with the sea.",
    story:
      "Cold water rises and falls through blue stone. Here, even the path of light waits on the tide.",
    buttonLabel: "Descend with the tide",
    glyph: "≈",
  },
  heartbloom: {
    biome: "heartbloom",
    name: "Heartbloom Sanctum",
    eyebrow: "At the oldest chamber",
    title: "Every restored light has come home.",
    story:
      "Moss, prism, song, and tide gather in one warm pulse. The Heartbloom is close enough to hear.",
    buttonLabel: "Enter the sanctum",
    glyph: "✦",
  },
};

export function biomeArrivalForRoom(
  rooms: readonly RoomDefinition[],
  index: number,
): BiomeArrival | null {
  const room = rooms[index];
  if (!room || index <= 0 || rooms[index - 1]?.biome === room.biome) return null;
  return BIOME_ARRIVALS[room.biome] ?? null;
}
