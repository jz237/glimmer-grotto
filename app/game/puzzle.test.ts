import { describe, expect, it } from "vitest";
import { ROOMS } from "./content";
import {
  createInitialPuzzleState,
  createSolvedPuzzleState,
  keyOf,
  ringBell,
  traceBeam,
} from "./puzzle";

describe("Glimmer Grotto room content", () => {
  it("contains a complete five-biome, twenty-room campaign", () => {
    expect(ROOMS).toHaveLength(20);
    expect(new Set(ROOMS.map((room) => room.biome)).size).toBe(5);
    expect(ROOMS.filter((room) => room.seed)).toHaveLength(15);
    expect(new Set(ROOMS.map((room) => room.id)).size).toBe(ROOMS.length);
  });

  it.each(ROOMS.map((room) => [room.id, room] as const))(
    "%s starts unsolved and has a verified solution",
    (_id, room) => {
      expect(traceBeam(room, createInitialPuzzleState(room)).solved).toBe(false);
      expect(traceBeam(room, createSolvedPuzzleState(room)).solved).toBe(true);
    },
  );

  it.each(ROOMS.map((room) => [room.id, room] as const))(
    "%s keeps critical cells clear of solid walls",
    (_id, room) => {
      const walls = new Set(room.walls.map(keyOf));
      expect(walls.has(keyOf(room.start))).toBe(false);
      expect(walls.has(keyOf(room.source))).toBe(false);
      expect(walls.has(keyOf(room.bloom))).toBe(false);
      room.crystals.forEach((crystal) =>
        expect(walls.has(keyOf(crystal))).toBe(false),
      );
    },
  );

  it.each(ROOMS.map((room) => [room.id, room] as const))(
    "%s keeps every required interaction reachable",
    (_id, room) => {
      const blocked = new Set([
        ...room.walls.map(keyOf),
        ...room.crystals.map(keyOf),
        ...(room.bells?.map(keyOf) ?? []),
        keyOf(room.source),
        keyOf(room.bloom),
        ...(room.tideSwitch ? [keyOf(room.tideSwitch)] : []),
      ]);
      const seen = new Set([keyOf(room.start)]);
      const queue = [{ ...room.start }];
      while (queue.length) {
        const current = queue.shift()!;
        for (const next of [
          { x: current.x + 1, y: current.y },
          { x: current.x - 1, y: current.y },
          { x: current.x, y: current.y + 1 },
          { x: current.x, y: current.y - 1 },
        ]) {
          const key = keyOf(next);
          if (
            next.x < 1 ||
            next.x > 13 ||
            next.y < 1 ||
            next.y > 7 ||
            blocked.has(key) ||
            seen.has(key)
          ) continue;
          seen.add(key);
          queue.push(next);
        }
      }

      const interactives = [
        ...room.crystals,
        ...(room.bells ?? []),
        ...(room.requiresCharge ? [room.source] : []),
        ...(room.tideSwitch ? [room.tideSwitch] : []),
      ];
      interactives.forEach((item) => {
        const hasReachableNeighbor = [
          { x: item.x + 1, y: item.y },
          { x: item.x - 1, y: item.y },
          { x: item.x, y: item.y + 1 },
          { x: item.x, y: item.y - 1 },
        ].some((cell) => seen.has(keyOf(cell)));
        expect(hasReachableNeighbor).toBe(true);
      });
      if (room.mote) expect(seen.has(keyOf(room.mote))).toBe(true);
      if (room.seed) expect(seen.has(keyOf(room.seed))).toBe(true);
    },
  );

  it("resets a rootsong after a wrong bell without locking the puzzle", () => {
    const room = ROOMS.find((candidate) => candidate.bellSequence?.length);
    expect(room).toBeDefined();
    const state = createInitialPuzzleState(room!);
    const first = room!.bellSequence![0];
    const wrong = room!.bells!.find((candidate) => candidate.id !== first)!;
    const failed = ringBell(room!, state, wrong.id);
    expect(failed.correct).toBe(false);
    expect(failed.state.bellProgress).toBe(0);

    const recovered = ringBell(room!, failed.state, first);
    expect(recovered.correct).toBe(true);
    expect(recovered.state.bellProgress).toBe(1);
  });
});
