import type { BiomeId } from "./contracts";

export interface JourneyRoom {
  index: number;
  id: string;
  biome: BiomeId;
  biomeName: string;
  name: string;
  seedId?: string;
}

export type JourneyRoomStatus = "restored" | "current" | "locked";
export type JourneyMemoryStatus = "found" | "waiting" | "none";

export interface JourneyMapEntry extends JourneyRoom {
  status: JourneyRoomStatus;
  memoryStatus: JourneyMemoryStatus;
}

export interface JourneyMapGroup {
  biome: BiomeId;
  biomeName: string;
  restored: number;
  entries: JourneyMapEntry[];
}

export const JOURNEY_ROOMS: readonly JourneyRoom[] = [
  { index: 0, id: "moss-01", biome: "mosswake", biomeName: "Mosswake Entrance", name: "The First Warmth", seedId: "moss-01-seed" },
  { index: 1, id: "moss-02", biome: "mosswake", biomeName: "Mosswake Entrance", name: "Borrowed Spark", seedId: "moss-02-seed" },
  { index: 2, id: "moss-03", biome: "mosswake", biomeName: "Mosswake Entrance", name: "Fernway", seedId: "moss-03-seed" },
  { index: 3, id: "moss-04", biome: "mosswake", biomeName: "Mosswake Entrance", name: "The Green Door", seedId: "moss-04-seed" },
  { index: 4, id: "prism-01", biome: "prism-pools", biomeName: "Prism Pools", name: "Blue Below", seedId: "prism-01-seed" },
  { index: 5, id: "prism-02", biome: "prism-pools", biomeName: "Prism Pools", name: "An Arc of Rain", seedId: "prism-02-seed" },
  { index: 6, id: "prism-03", biome: "prism-pools", biomeName: "Prism Pools", name: "The Long Reflection", seedId: "prism-03-seed" },
  { index: 7, id: "prism-04", biome: "prism-pools", biomeName: "Prism Pools", name: "Glassgarden Gate", seedId: "prism-04-seed" },
  { index: 8, id: "hush-01", biome: "hushroot", biomeName: "Hushroot Hollows", name: "Three Soft Notes", seedId: "hush-01-seed" },
  { index: 9, id: "hush-02", biome: "hushroot", biomeName: "Hushroot Hollows", name: "Rootsong", seedId: "hush-02-seed" },
  { index: 10, id: "hush-03", biome: "hushroot", biomeName: "Hushroot Hollows", name: "The Listening Dark", seedId: "hush-03-seed" },
  { index: 11, id: "hush-04", biome: "hushroot", biomeName: "Hushroot Hollows", name: "Chorus Door", seedId: "hush-04-seed" },
  { index: 12, id: "tide-01", biome: "tideglass", biomeName: "Tideglass Deeps", name: "Low Water", seedId: "tide-01-seed" },
  { index: 13, id: "tide-02", biome: "tideglass", biomeName: "Tideglass Deeps", name: "A Rising Path", seedId: "tide-02-seed" },
  { index: 14, id: "tide-03", biome: "tideglass", biomeName: "Tideglass Deeps", name: "The Sunken Lantern", seedId: "tide-03-seed" },
  { index: 15, id: "tide-04", biome: "tideglass", biomeName: "Tideglass Deeps", name: "Current Gate" },
  { index: 16, id: "heart-01", biome: "heartbloom", biomeName: "Heartbloom Sanctum", name: "All the Ways Home" },
  { index: 17, id: "heart-02", biome: "heartbloom", biomeName: "Heartbloom Sanctum", name: "A Familiar Chorus" },
  { index: 18, id: "heart-03", biome: "heartbloom", biomeName: "Heartbloom Sanctum", name: "The Lantern Bridge" },
  { index: 19, id: "heart-04", biome: "heartbloom", biomeName: "Heartbloom Sanctum", name: "Glimmer Grotto" },
];

function boundedFrontier(frontierRoom: number): number {
  return Math.max(0, Math.min(JOURNEY_ROOMS.length - 1, Math.floor(frontierRoom)));
}

export function roomVisitMode(
  roomIndex: number,
  frontierRoom: number,
  completedRoomIds: readonly string[],
): "continue" | "revisit" | null {
  const room = JOURNEY_ROOMS[roomIndex];
  if (!room) return null;
  const completed = new Set(completedRoomIds);
  if (completed.has(room.id)) return "revisit";
  return roomIndex === boundedFrontier(frontierRoom) ? "continue" : null;
}

export function frontierAfterSolve(
  roomIndex: number,
  frontierRoom: number,
  isRevisit: boolean,
): number {
  const frontier = boundedFrontier(frontierRoom);
  if (isRevisit) return frontier;
  return Math.max(
    frontier,
    Math.min(JOURNEY_ROOMS.length - 1, Math.floor(roomIndex) + 1),
  );
}

export function journeyMapGroups(
  completedRoomIds: readonly string[],
  collectedSeedIds: readonly string[],
  frontierRoom: number,
): JourneyMapGroup[] {
  const completed = new Set(completedRoomIds);
  const collected = new Set(collectedSeedIds);
  const frontier = boundedFrontier(frontierRoom);
  const groups = new Map<BiomeId, JourneyMapGroup>();

  JOURNEY_ROOMS.forEach((room) => {
    const status: JourneyRoomStatus = completed.has(room.id)
      ? "restored"
      : room.index === frontier
        ? "current"
        : "locked";
    const memoryStatus: JourneyMemoryStatus = !room.seedId
      ? "none"
      : collected.has(room.seedId)
        ? "found"
        : "waiting";
    const group = groups.get(room.biome) ?? {
      biome: room.biome,
      biomeName: room.biomeName,
      restored: 0,
      entries: [],
    };
    group.entries.push({ ...room, status, memoryStatus });
    if (status === "restored") group.restored += 1;
    groups.set(room.biome, group);
  });

  return [...groups.values()];
}
