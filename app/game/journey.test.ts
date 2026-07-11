import { describe, expect, it } from "vitest";
import { ROOMS } from "./content";
import {
  JOURNEY_ROOMS,
  frontierAfterSolve,
  journeyMapGroups,
  roomVisitMode,
} from "./journey";

describe("grotto journey map", () => {
  it("stays aligned with every campaign room and optional seed", () => {
    expect(JOURNEY_ROOMS).toHaveLength(20);
    expect(
      JOURNEY_ROOMS.map(({ index, id, biome, biomeName, name, seedId }) => ({
        index,
        id,
        biome,
        biomeName,
        name,
        seedId,
      })),
    ).toEqual(
      ROOMS.map((room, index) => ({
        index,
        id: room.id,
        biome: room.biome,
        biomeName: room.biomeName,
        name: room.name,
        seedId: room.seed?.id,
      })),
    );
  });

  it("marks restored, current, and locked rooms without losing memory clues", () => {
    const completed = JOURNEY_ROOMS.slice(0, 9).map((room) => room.id);
    const collected = JOURNEY_ROOMS
      .slice(1, 9)
      .flatMap((room) => room.seedId ? [room.seedId] : []);
    const entries = journeyMapGroups(completed, collected, 9)
      .flatMap((group) => group.entries);

    expect(entries.filter((entry) => entry.status === "restored")).toHaveLength(9);
    expect(entries.filter((entry) => entry.status === "current")).toHaveLength(1);
    expect(entries.filter((entry) => entry.status === "locked")).toHaveLength(10);
    expect(entries[0]).toMatchObject({ status: "restored", memoryStatus: "waiting" });
    expect(entries[8]).toMatchObject({ status: "restored", memoryStatus: "found" });
    expect(entries[15].memoryStatus).toBe("none");
  });

  it("allows restored rooms and the frontier but rejects sleeping rooms", () => {
    const completed = JOURNEY_ROOMS.slice(0, 9).map((room) => room.id);
    expect(roomVisitMode(0, 9, completed)).toBe("revisit");
    expect(roomVisitMode(9, 9, completed)).toBe("continue");
    expect(roomVisitMode(10, 9, completed)).toBeNull();
    expect(roomVisitMode(-1, 9, completed)).toBeNull();
  });

  it("never regresses the campaign frontier during replay", () => {
    expect(frontierAfterSolve(0, 9, true)).toBe(9);
    expect(frontierAfterSolve(9, 9, false)).toBe(10);
    expect(frontierAfterSolve(2, 9, false)).toBe(9);
    expect(frontierAfterSolve(19, 19, false)).toBe(19);
  });
});
