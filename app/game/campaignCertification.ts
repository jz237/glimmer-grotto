import type { BiomeId, SaveGameV1 } from "./contracts";
import { applyCampaignProgress } from "./campaign";
import { biomeArrivalForRoom } from "./biomes";
import { ROOMS } from "./content";
import { collectedMemoryCount, ECHO_MEMORIES } from "./echoes";
import {
  frontierAfterSolve,
  JOURNEY_ROOMS,
  journeyMapGroups,
  journeyStart,
  roomVisitMode,
} from "./journey";
import {
  buildRoomPlaythrough,
  simulateRoomPlaythrough,
} from "./navigation";
import {
  createFreshSave,
  exportSave,
  importSaveWithRecovery,
  loadSaveWithRecovery,
  persistSave,
  type StorageLike,
} from "./save";

interface CertifiedRoomRoute {
  roomId: string;
  biome: BiomeId;
  commands: number;
  moves: number;
  interactions: number;
  memoryId: string | null;
}

interface CertifiedBiomeRoute {
  biome: BiomeId;
  rooms: number;
  commands: number;
}

export interface CleanProfileCertificate {
  schemaVersion: 1;
  release: string;
  certificate: "clean-profile-completion";
  campaign: {
    start: "fresh-save";
    roomsRestored: number;
    memoriesRecovered: number;
    biomeThresholdsAcknowledged: number;
    endingReached: true;
    roomOrder: string[];
    memoryOrder: string[];
    biomeThresholds: BiomeId[];
  };
  routes: {
    totalCommands: number;
    moveCommands: number;
    interactionCommands: number;
    longestRoomCommands: number;
    byBiome: CertifiedBiomeRoute[];
    rooms: CertifiedRoomRoute[];
  };
  persistence: {
    autosaveRoundTrips: number;
    cleanLoads: number;
    recoveryEvents: 0;
    exportImportRoundTrips: 1;
  };
  afterglow: {
    reopenedRoomId: string;
    visitMode: "revisit";
    replaySolved: true;
    replayCommands: number;
    frontierRoom: number;
    restoredRooms: number;
    foundMemories: number;
    mapGroups: Array<{
      biome: BiomeId;
      restoredRooms: number;
      foundMemories: number;
    }>;
  };
}

class CertificateStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function certify(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Clean-profile certification failed: ${message}`);
}

/**
 * Executes the release campaign from a fresh save, using the same room routes,
 * campaign transitions, reconciliation, autosave, import, and afterglow rules
 * as the shipped game. The returned object is deterministic and is compared
 * byte-for-data with the public release certificate during every quality run.
 */
export function certifyCleanProfile(release: string): CleanProfileCertificate {
  certify(release.length > 0, "release identifier is missing");
  certify(ROOMS.length === JOURNEY_ROOMS.length, "room catalogs disagree");

  const storage = new CertificateStorage();
  let autosaveRoundTrips = 0;
  let cleanLoads = 0;
  const roundTrip = (candidate: SaveGameV1): SaveGameV1 => {
    persistSave(storage, candidate);
    autosaveRoundTrips += 1;
    const loaded = loadSaveWithRecovery(storage);
    certify(loaded.recovery === "none", `autosave ${autosaveRoundTrips} was not clean`);
    cleanLoads += 1;
    return loaded.save;
  };

  let save = roundTrip(createFreshSave(new Date("2026-07-11T00:00:00.000Z")));
  const thresholdBiomes: BiomeId[] = [];
  const roomRoutes: CertifiedRoomRoute[] = [];

  for (const [index, room] of ROOMS.entries()) {
    const catalogRoom = JOURNEY_ROOMS[index];
    certify(catalogRoom?.id === room.id, `room ${index + 1} has conflicting IDs`);
    certify(catalogRoom.biome === room.biome, `${room.id} has conflicting biomes`);
    certify(
      catalogRoom.seedId === room.seed?.id,
      `${room.id} has conflicting memory IDs`,
    );

    const start = journeyStart(
      save.currentRoom,
      save.completedRooms,
      save.journeyComplete,
    );
    certify(start.roomIndex === index, `${room.id} was not the next frontier room`);
    certify(!start.isRevisit, `${room.id} unexpectedly opened as a revisit`);

    const arrival = biomeArrivalForRoom(ROOMS, index);
    if (arrival) {
      save = roundTrip(
        applyCampaignProgress(save, {
          type: "biomeSeen",
          biome: arrival.biome,
        }),
      );
      thresholdBiomes.push(arrival.biome);
    }

    const commands = buildRoomPlaythrough(room);
    const result = simulateRoomPlaythrough(room, commands);
    certify(result.solved, `${room.id} route did not restore its bloom`);
    certify(
      result.seedCollected === Boolean(room.seed),
      `${room.id} route did not preserve its memory detour`,
    );

    const completedRooms = [...save.completedRooms, room.id];
    const collectedSeeds = room.seed
      ? [...save.collectedSeeds, room.seed.id]
      : save.collectedSeeds;
    save = roundTrip(
      applyCampaignProgress(save, {
        type: "progress",
        currentRoom: frontierAfterSolve(index, save.currentRoom, false),
        completedRooms,
        collectedSeeds,
      }),
    );
    certify(
      save.completedRooms.length === index + 1,
      `${room.id} did not survive its autosave boundary`,
    );

    roomRoutes.push({
      roomId: room.id,
      biome: room.biome,
      commands: commands.length,
      moves: result.moveCount,
      interactions: result.actionCount,
      memoryId: room.seed?.id ?? null,
    });
  }

  save = roundTrip(
    applyCampaignProgress(save, { type: "journeyComplete" }),
  );
  certify(save.journeyComplete, "ending state did not persist");

  const imported = importSaveWithRecovery(exportSave(save));
  certify(!imported.repaired, "canonical completion export required repair");
  save = imported.save;

  const afterglowStart = journeyStart(
    save.currentRoom,
    save.completedRooms,
    save.journeyComplete,
  );
  certify(afterglowStart.isRevisit, "afterglow did not reopen as a revisit");
  const afterglowRoom = ROOMS[afterglowStart.roomIndex];
  certify(Boolean(afterglowRoom), "afterglow room is missing");
  const afterglowMode = roomVisitMode(
    afterglowStart.roomIndex,
    save.currentRoom,
    save.completedRooms,
  );
  certify(afterglowMode === "revisit", "afterglow room is not replayable");
  const afterglowCommands = buildRoomPlaythrough(afterglowRoom);
  const afterglowResult = simulateRoomPlaythrough(afterglowRoom, afterglowCommands);
  certify(afterglowResult.solved, "afterglow replay could not be solved");
  save = roundTrip(
    applyCampaignProgress(save, {
      type: "progress",
      currentRoom: frontierAfterSolve(
        afterglowStart.roomIndex,
        save.currentRoom,
        true,
      ),
      completedRooms: save.completedRooms,
      collectedSeeds: save.collectedSeeds,
    }),
  );

  const expectedRooms = JOURNEY_ROOMS.map((room) => room.id);
  const expectedMemories = ECHO_MEMORIES.map((memory) => memory.seedId);
  certify(
    JSON.stringify(save.completedRooms) === JSON.stringify(expectedRooms),
    "completed room order is not canonical",
  );
  certify(
    JSON.stringify(save.collectedSeeds) === JSON.stringify(expectedMemories),
    "recovered memory order is not canonical",
  );
  certify(
    JSON.stringify(save.seenBiomes) === JSON.stringify(thresholdBiomes),
    "biome threshold acknowledgements are incomplete",
  );
  certify(
    collectedMemoryCount(save.collectedSeeds) === ECHO_MEMORIES.length,
    "memory collection is incomplete",
  );

  const mapGroups = journeyMapGroups(
    save.completedRooms,
    save.collectedSeeds,
    save.currentRoom,
  );
  certify(
    mapGroups.every(
      (group) =>
        group.restored === group.entries.length &&
        group.entries.every((entry) => entry.status === "restored"),
    ),
    "afterglow map contains an unrestored room",
  );

  const biomeRoutes = new Map<BiomeId, CertifiedBiomeRoute>();
  for (const route of roomRoutes) {
    const summary = biomeRoutes.get(route.biome) ?? {
      biome: route.biome,
      rooms: 0,
      commands: 0,
    };
    summary.rooms += 1;
    summary.commands += route.commands;
    biomeRoutes.set(route.biome, summary);
  }

  return {
    schemaVersion: 1,
    release,
    certificate: "clean-profile-completion",
    campaign: {
      start: "fresh-save",
      roomsRestored: save.completedRooms.length,
      memoriesRecovered: collectedMemoryCount(save.collectedSeeds),
      biomeThresholdsAcknowledged: save.seenBiomes.length,
      endingReached: true,
      roomOrder: [...save.completedRooms],
      memoryOrder: [...save.collectedSeeds],
      biomeThresholds: [...save.seenBiomes],
    },
    routes: {
      totalCommands: roomRoutes.reduce((sum, route) => sum + route.commands, 0),
      moveCommands: roomRoutes.reduce((sum, route) => sum + route.moves, 0),
      interactionCommands: roomRoutes.reduce(
        (sum, route) => sum + route.interactions,
        0,
      ),
      longestRoomCommands: Math.max(...roomRoutes.map((route) => route.commands)),
      byBiome: [...biomeRoutes.values()],
      rooms: roomRoutes,
    },
    persistence: {
      autosaveRoundTrips,
      cleanLoads,
      recoveryEvents: 0,
      exportImportRoundTrips: 1,
    },
    afterglow: {
      reopenedRoomId: afterglowRoom.id,
      visitMode: afterglowMode,
      replaySolved: true,
      replayCommands: afterglowCommands.length,
      frontierRoom: save.currentRoom,
      restoredRooms: mapGroups.reduce((sum, group) => sum + group.restored, 0),
      foundMemories: collectedMemoryCount(save.collectedSeeds),
      mapGroups: mapGroups.map((group) => ({
        biome: group.biome,
        restoredRooms: group.restored,
        foundMemories: group.entries.filter(
          (entry) => entry.memoryStatus === "found",
        ).length,
      })),
    },
  };
}
