import type { GameEvent, SaveGameV1 } from "./contracts";
import { JOURNEY_ROOMS } from "./journey";

export type CampaignProgressEvent =
  | Extract<GameEvent, { type: "biomeSeen" }>
  | Extract<GameEvent, { type: "progress" }>
  | Extract<GameEvent, { type: "journeyComplete" }>;

/**
 * Applies the small subset of game events that are allowed to change campaign
 * progress. Keeping this pure lets the live UI and release certification use
 * exactly the same transition rules before the save layer reconciles them.
 */
export function applyCampaignProgress(
  save: SaveGameV1,
  event: CampaignProgressEvent,
): SaveGameV1 {
  switch (event.type) {
    case "biomeSeen":
      return {
        ...save,
        seenBiomes: save.seenBiomes.includes(event.biome)
          ? save.seenBiomes
          : [...save.seenBiomes, event.biome],
      };
    case "progress":
      return {
        ...save,
        currentRoom: event.currentRoom,
        completedRooms: event.completedRooms,
        collectedSeeds: event.collectedSeeds,
      };
    case "journeyComplete":
      return {
        ...save,
        journeyComplete: true,
        currentRoom: JOURNEY_ROOMS.length - 1,
      };
  }
}
