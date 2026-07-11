import { describe, expect, it } from "vitest";
import { ROOMS } from "./content";
import { describeRoomPosition } from "./description";
import {
  createInitialPuzzleState,
  createSolvedPuzzleState,
} from "./puzzle";

function initialDescription(roomIndex: number) {
  const room = ROOMS[roomIndex];
  return describeRoomPosition(room, {
    player: room.start,
    facing: { x: 0, y: -1 },
    puzzle: createInitialPuzzleState(room),
    carrying: false,
    moteAvailable: Boolean(room.mote),
    seedCollected: false,
  });
}

describe("lantern compass descriptions", () => {
  it("locates Mica, all four adjacent directions, and optional landmarks", () => {
    const description = initialDescription(0);
    expect(description).toContain(
      "Mica is at column 2 of 13, row 7 of 7, facing north.",
    );
    expect(description).toContain("north is open");
    expect(description).toContain("south is blocked");
    expect(description).toContain("The bloom is");
    expect(description).toContain("An echo seed is 10 tiles east.");
  });

  it("names adjacent puzzle objects instead of calling them blocked", () => {
    const room = ROOMS[0];
    const description = describeRoomPosition(room, {
      player: { x: 6, y: 7 },
      facing: { x: 0, y: -1 },
      puzzle: createInitialPuzzleState(room),
      carrying: false,
      moteAvailable: false,
      seedCollected: false,
    });
    expect(description).toContain("north is a crystal");
  });

  it("explains an inactive source, a loose glimmer, and carried light", () => {
    const room = ROOMS[1];
    const initial = initialDescription(1);
    expect(initial).toContain("A loose glimmer is");
    expect(initial).toContain("The beam is waiting for a charged source.");

    const carrying = describeRoomPosition(room, {
      player: room.mote!,
      facing: { x: 1, y: 0 },
      puzzle: createInitialPuzzleState(room),
      carrying: true,
      moteAvailable: false,
      seedCollected: true,
    });
    expect(carrying).toContain("Mica is carrying a glimmer.");
    expect(carrying).not.toContain("An echo seed is");
  });

  it("reports the beam endpoint and recognizes restoration", () => {
    const room = ROOMS[0];
    expect(initialDescription(0)).toContain(
      "The beam leaves through the south edge at column 6.",
    );
    const restored = describeRoomPosition(room, {
      player: room.start,
      facing: { x: 0, y: -1 },
      puzzle: createSolvedPuzzleState(room),
      carrying: false,
      moteAvailable: false,
      seedCollected: true,
    });
    expect(restored).toContain("The beam reaches the bloom.");
  });

  it.each(ROOMS.map((room, index) => [room.id, index] as const))(
    "%s always produces a complete finite description",
    (_id, index) => {
      const description = initialDescription(index);
      expect(description).toContain("Around Mica:");
      expect(description).not.toMatch(/undefined|NaN/);
      expect(description).not.toMatch(/column (?:0|14)|row (?:0|8)/);
      expect(description.length).toBeLessThan(650);
    },
  );
});
