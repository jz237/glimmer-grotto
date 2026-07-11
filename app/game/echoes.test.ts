import { describe, expect, it } from "vitest";
import { ROOMS } from "./content";
import {
  ECHO_MEMORIES,
  collectedMemoryCount,
  echoMemoryForSeed,
  echoMemoryGroups,
} from "./echoes";

describe("echo memories", () => {
  it("gives every optional seed exactly one ordered memory", () => {
    const seededRooms = ROOMS.filter((room) => room.seed);
    expect(ECHO_MEMORIES).toHaveLength(15);
    expect(ECHO_MEMORIES.map((memory) => memory.seedId)).toEqual(
      seededRooms.map((room) => room.seed!.id),
    );
    expect(ECHO_MEMORIES.map((memory) => memory.roomId)).toEqual(
      seededRooms.map((room) => room.id),
    );
    expect(ECHO_MEMORIES.map((memory) => memory.roomName)).toEqual(
      seededRooms.map((room) => room.name),
    );
  });

  it("keeps every memory distinct and substantial", () => {
    expect(new Set(ECHO_MEMORIES.map((memory) => memory.title)).size).toBe(15);
    expect(new Set(ECHO_MEMORIES.map((memory) => memory.text)).size).toBe(15);
    ECHO_MEMORIES.forEach((memory) => {
      expect(memory.title.length).toBeGreaterThan(8);
      expect(memory.text.length).toBeGreaterThan(80);
      expect(echoMemoryForSeed(memory.seedId)).toBe(memory);
    });
    expect(echoMemoryForSeed("unknown-seed")).toBeNull();
  });

  it("groups discoveries by biome and ignores unknown save entries", () => {
    const collected = [
      ECHO_MEMORIES[0].seedId,
      ECHO_MEMORIES[4].seedId,
      ECHO_MEMORIES[8].seedId,
      "future-seed",
    ];
    const groups = echoMemoryGroups(collected);

    expect(groups.map((group) => group.biome)).toEqual([
      "mosswake",
      "prism-pools",
      "hushroot",
      "tideglass",
    ]);
    expect(groups.map((group) => group.found)).toEqual([1, 1, 1, 0]);
    expect(groups.flatMap((group) => group.entries)).toHaveLength(15);
    expect(collectedMemoryCount(collected)).toBe(3);
  });

  it("recognizes a complete recovered collection", () => {
    const collected = ECHO_MEMORIES.map((memory) => memory.seedId);
    const groups = echoMemoryGroups(collected);

    expect(collectedMemoryCount(collected)).toBe(15);
    expect(groups.every((group) => group.found === group.entries.length)).toBe(true);
    expect(
      groups.flatMap((group) => group.entries).every((entry) => entry.discovered),
    ).toBe(true);
  });
});
