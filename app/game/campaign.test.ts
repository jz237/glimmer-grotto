import { describe, expect, it } from "vitest";
import { applyCampaignProgress } from "./campaign";
import { createFreshSave } from "./save";

describe("campaign progress transitions", () => {
  it("records a biome threshold only once", () => {
    const fresh = createFreshSave();
    const first = applyCampaignProgress(fresh, {
      type: "biomeSeen",
      biome: "prism-pools",
    });
    const duplicate = applyCampaignProgress(first, {
      type: "biomeSeen",
      biome: "prism-pools",
    });
    expect(duplicate.seenBiomes).toEqual(["prism-pools"]);
  });

  it("applies the exact progress reported by the game runtime", () => {
    const next = applyCampaignProgress(createFreshSave(), {
      type: "progress",
      currentRoom: 1,
      completedRooms: ["moss-01"],
      collectedSeeds: ["moss-01-seed"],
    });
    expect(next.currentRoom).toBe(1);
    expect(next.completedRooms).toEqual(["moss-01"]);
    expect(next.collectedSeeds).toEqual(["moss-01-seed"]);
  });

  it("places a completed journey at the final playable room", () => {
    const next = applyCampaignProgress(createFreshSave(), {
      type: "journeyComplete",
    });
    expect(next.journeyComplete).toBe(true);
    expect(next.currentRoom).toBe(19);
  });
});
