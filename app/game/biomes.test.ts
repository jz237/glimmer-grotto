import { describe, expect, it } from "vitest";
import { BIOME_ARRIVALS, biomeArrivalForRoom } from "./biomes";
import { ROOMS } from "./content";

describe("biome arrivals", () => {
  it("introduces every biome after Mosswake exactly once", () => {
    const arrivals = ROOMS.map((_, index) => biomeArrivalForRoom(ROOMS, index));
    expect(arrivals.flatMap((arrival) => (arrival ? [arrival.biome] : []))).toEqual([
      "prism-pools",
      "hushroot",
      "tideglass",
      "heartbloom",
    ]);
    expect(arrivals.filter(Boolean)).toHaveLength(4);
  });

  it("keeps arrival names aligned with their first room and complete copy", () => {
    for (const [biome, arrival] of Object.entries(BIOME_ARRIVALS)) {
      expect(arrival).toBeDefined();
      const firstRoom = ROOMS.find((room) => room.biome === biome);
      expect(firstRoom?.biomeName).toBe(arrival?.name);
      expect(arrival?.eyebrow.length).toBeGreaterThan(8);
      expect(arrival?.title.length).toBeGreaterThan(12);
      expect(arrival?.story.length).toBeGreaterThan(40);
      expect(arrival?.buttonLabel.length).toBeGreaterThan(8);
    }
  });

  it("does not replay an arrival inside a biome", () => {
    for (let index = 1; index < ROOMS.length; index += 1) {
      if (ROOMS[index - 1].biome === ROOMS[index].biome) {
        expect(biomeArrivalForRoom(ROOMS, index)).toBeNull();
      }
    }
  });
});
