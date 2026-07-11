import type {
  AccessibilitySettings,
  BiomeId,
  SaveGameV1,
} from "./contracts";
import { JOURNEY_ROOMS } from "./journey";

export const SAVE_KEY = "glimmer-grotto.save.v1";
export const BACKUP_KEY = "glimmer-grotto.save.v1.backup";

export const DEFAULT_SETTINGS: AccessibilitySettings = {
  reducedMotion: false,
  highContrast: false,
  largeText: false,
  musicVolume: 0.35,
  effectsVolume: 0.65,
};

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

type OptionalStorage = StorageLike | null | undefined;

export type SaveRecovery =
  | "none"
  | "repaired"
  | "backup"
  | "reset"
  | "unavailable";

export interface SaveLoadResult {
  save: SaveGameV1;
  recovery: SaveRecovery;
  persistence: SavePersistence;
}

export interface SaveImportResult {
  save: SaveGameV1;
  repaired: boolean;
}

export type SavePersistence =
  | "saved"
  | "primary-only"
  | "backup-only"
  | "unavailable";

export interface SavePersistResult {
  save: SaveGameV1;
  persistence: SavePersistence;
}

const BIOME_IDS: readonly BiomeId[] = [
  "mosswake",
  "prism-pools",
  "hushroot",
  "tideglass",
  "heartbloom",
];
const ROOM_INDEX_BY_ID = new Map(
  JOURNEY_ROOMS.map((room) => [room.id, room.index]),
);
const SEED_INDEX_BY_ID = new Map(
  JOURNEY_ROOMS.flatMap((room) =>
    room.seedId ? [[room.seedId, room.index] as const] : [],
  ),
);
const BIOME_FIRST_ROOM = new Map<BiomeId, number>();
JOURNEY_ROOMS.forEach((room) => {
  if (!BIOME_FIRST_ROOM.has(room.biome)) {
    BIOME_FIRST_ROOM.set(room.biome, room.index);
  }
});

function safeRead(
  storage: OptionalStorage,
  key: string,
): { available: boolean; value: string | null } {
  try {
    if (!storage) return { available: false, value: null };
    return { available: true, value: storage.getItem(key) };
  } catch {
    return { available: false, value: null };
  }
}

function safeSet(storage: OptionalStorage, key: string, value: string): boolean {
  try {
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function verifiedSet(
  storage: OptionalStorage,
  key: string,
  value: string,
): boolean {
  if (!safeSet(storage, key, value)) return false;
  const read = safeRead(storage, key);
  return read.available && read.value === value;
}

function safeRemove(storage: OptionalStorage, key: string): boolean {
  try {
    if (!storage) return false;
    storage.removeItem(key);
    return storage.getItem(key) === null;
  } catch {
    // Storage can be unavailable in hardened or private browser contexts.
    return false;
  }
}

export function createFreshSave(now = new Date()): SaveGameV1 {
  const timestamp = now.toISOString();
  return {
    schemaVersion: 1,
    currentRoom: 0,
    completedRooms: [],
    collectedSeeds: [],
    seenBiomes: [],
    settings: { ...DEFAULT_SETTINGS },
    playTimeMs: 0,
    startedAt: timestamp,
    updatedAt: timestamp,
    journeyComplete: false,
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isBiomeId(value: string): value is BiomeId {
  return BIOME_IDS.includes(value as BiomeId);
}

function boundedRoom(value: number): number {
  return Math.max(
    0,
    Math.min(JOURNEY_ROOMS.length - 1, Math.floor(value)),
  );
}

function normalizedVolume(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

function normalizedTimestamp(value: string, fallback: string): string {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : fallback;
}

function normalizedSettings(value: unknown): AccessibilitySettings {
  const settings = value && typeof value === "object"
    ? value as Partial<AccessibilitySettings>
    : {};
  return {
    reducedMotion:
      typeof settings.reducedMotion === "boolean"
        ? settings.reducedMotion
        : DEFAULT_SETTINGS.reducedMotion,
    highContrast:
      typeof settings.highContrast === "boolean"
        ? settings.highContrast
        : DEFAULT_SETTINGS.highContrast,
    largeText:
      typeof settings.largeText === "boolean"
        ? settings.largeText
        : DEFAULT_SETTINGS.largeText,
    musicVolume: normalizedVolume(
      settings.musicVolume,
      DEFAULT_SETTINGS.musicVolume,
    ),
    effectsVolume: normalizedVolume(
      settings.effectsVolume,
      DEFAULT_SETTINGS.effectsVolume,
    ),
  };
}

export function reconcileSave(save: SaveGameV1): SaveGameV1 {
  const declaredRoom = boundedRoom(save.currentRoom);
  const completedIndexes = save.completedRooms.flatMap((roomId) => {
    const index = ROOM_INDEX_BY_ID.get(roomId);
    return index === undefined ? [] : [index];
  });
  const deepestCompleted = completedIndexes.length
    ? Math.max(...completedIndexes)
    : -1;
  const restoredCount = save.journeyComplete
    ? JOURNEY_ROOMS.length
    : Math.min(
        JOURNEY_ROOMS.length,
        Math.max(declaredRoom, deepestCompleted + 1),
      );
  const journeyComplete = restoredCount === JOURNEY_ROOMS.length;
  const currentRoom = journeyComplete
    ? JOURNEY_ROOMS.length - 1
    : Math.min(restoredCount, JOURNEY_ROOMS.length - 1);
  const seenSeeds = new Set<string>();
  const collectedSeeds = save.collectedSeeds.filter((seedId) => {
    const seedRoom = SEED_INDEX_BY_ID.get(seedId);
    if (
      seedRoom === undefined ||
      seedRoom > currentRoom ||
      seenSeeds.has(seedId)
    ) {
      return false;
    }
    seenSeeds.add(seedId);
    return true;
  });
  const seenBiomeIds = new Set<BiomeId>();
  const seenBiomes = save.seenBiomes.filter((biome) => {
    const firstRoom = BIOME_FIRST_ROOM.get(biome);
    if (
      firstRoom === undefined ||
      firstRoom > currentRoom ||
      seenBiomeIds.has(biome)
    ) {
      return false;
    }
    seenBiomeIds.add(biome);
    return true;
  });
  const fallbackTimestamp = new Date().toISOString();
  const playTimeMs = typeof save.playTimeMs === "number" && Number.isFinite(save.playTimeMs)
    ? Math.max(0, Math.floor(save.playTimeMs))
    : 0;

  return {
    schemaVersion: 1,
    currentRoom,
    completedRooms: JOURNEY_ROOMS
      .slice(0, restoredCount)
      .map((room) => room.id),
    collectedSeeds,
    seenBiomes,
    settings: normalizedSettings(save.settings),
    playTimeMs,
    startedAt: normalizedTimestamp(save.startedAt, fallbackTimestamp),
    updatedAt: normalizedTimestamp(save.updatedAt, fallbackTimestamp),
    journeyComplete,
  };
}

function parseSaveResult(raw: string): SaveImportResult | null {
  try {
    const value = JSON.parse(raw) as Partial<SaveGameV1>;
    if (
      value.schemaVersion !== 1 ||
      typeof value.currentRoom !== "number" ||
      !Number.isFinite(value.currentRoom) ||
      !isStringArray(value.completedRooms) ||
      !isStringArray(value.collectedSeeds) ||
      !value.settings ||
      typeof value.settings !== "object" ||
      Array.isArray(value.settings) ||
      typeof value.startedAt !== "string" ||
      typeof value.updatedAt !== "string"
    ) {
      return null;
    }
    const candidate: SaveGameV1 = {
      schemaVersion: 1,
      currentRoom: value.currentRoom,
      completedRooms: value.completedRooms,
      collectedSeeds: value.collectedSeeds,
      seenBiomes: isStringArray(value.seenBiomes)
        ? value.seenBiomes.filter(isBiomeId)
        : [],
      settings: value.settings as AccessibilitySettings,
      playTimeMs:
        typeof value.playTimeMs === "number" ? value.playTimeMs : 0,
      startedAt: value.startedAt,
      updatedAt: value.updatedAt,
      journeyComplete: value.journeyComplete === true,
    };
    const save = reconcileSave(candidate);
    return {
      save,
      repaired: JSON.stringify(value) !== JSON.stringify(save),
    };
  } catch {
    return null;
  }
}

export function parseSave(raw: string): SaveGameV1 | null {
  return parseSaveResult(raw)?.save ?? null;
}

export function loadSaveWithRecovery(storage: OptionalStorage): SaveLoadResult {
  const primaryRead = safeRead(storage, SAVE_KEY);
  if (!primaryRead.available) {
    return {
      save: createFreshSave(),
      recovery: "unavailable",
      persistence: "unavailable",
    };
  }
  const primary = primaryRead.value;
  if (primary) {
    const parsed = parseSaveResult(primary);
    if (parsed) {
      let persistence: SavePersistence = "saved";
      if (parsed.repaired) {
        const backupSaved = verifiedSet(storage, BACKUP_KEY, primary);
        const primarySaved = verifiedSet(
          storage,
          SAVE_KEY,
          JSON.stringify(parsed.save),
        );
        persistence = !primarySaved
          ? backupSaved
            ? "backup-only"
            : "unavailable"
          : backupSaved
            ? "saved"
            : "primary-only";
      }
      return {
        save: parsed.save,
        recovery: parsed.repaired ? "repaired" : "none",
        persistence,
      };
    }
  }
  const backupRead = safeRead(storage, BACKUP_KEY);
  if (!backupRead.available) {
    return {
      save: createFreshSave(),
      recovery: "unavailable",
      persistence: "unavailable",
    };
  }
  const backup = backupRead.value;
  if (backup) {
    const parsed = parseSaveResult(backup);
    if (parsed) {
      const primarySaved = verifiedSet(
        storage,
        SAVE_KEY,
        JSON.stringify(parsed.save),
      );
      return {
        save: parsed.save,
        recovery: "backup",
        persistence: primarySaved ? "saved" : "backup-only",
      };
    }
  }
  if (primary || backup) {
    const reset = clearSaveWithStatus(storage);
    return { ...reset, recovery: "reset" };
  }
  return {
    save: createFreshSave(),
    recovery: "none",
    persistence: "saved",
  };
}

export function loadSave(storage: OptionalStorage): SaveGameV1 {
  return loadSaveWithRecovery(storage).save;
}

export function persistSaveWithStatus(
  storage: OptionalStorage,
  save: SaveGameV1,
): SavePersistResult {
  const next = reconcileSave({
    ...save,
    updatedAt: new Date().toISOString(),
  });
  const current = safeRead(storage, SAVE_KEY);
  let backupSaved = current.available;
  if (current.value && parseSaveResult(current.value)) {
    backupSaved = verifiedSet(storage, BACKUP_KEY, current.value);
  }
  const primarySaved = verifiedSet(storage, SAVE_KEY, JSON.stringify(next));
  return {
    save: next,
    persistence: !primarySaved
      ? "unavailable"
      : backupSaved
        ? "saved"
        : "primary-only",
  };
}

export function persistSave(storage: OptionalStorage, save: SaveGameV1): SaveGameV1 {
  return persistSaveWithStatus(storage, save).save;
}

export function clearSaveWithStatus(
  storage: OptionalStorage,
): SavePersistResult {
  const save = createFreshSave();
  const serialized = JSON.stringify(save);
  const backupNeutralized =
    safeRemove(storage, BACKUP_KEY) ||
    verifiedSet(storage, BACKUP_KEY, serialized);
  const primarySaved = verifiedSet(storage, SAVE_KEY, serialized);
  return {
    save,
    persistence: !primarySaved
      ? backupNeutralized
        ? "backup-only"
        : "unavailable"
      : backupNeutralized
        ? "saved"
        : "primary-only",
  };
}

export function clearSave(storage: OptionalStorage): SaveGameV1 {
  return clearSaveWithStatus(storage).save;
}

export function exportSave(save: SaveGameV1): string {
  return JSON.stringify(reconcileSave(save), null, 2);
}

export function importSave(raw: string): SaveGameV1 {
  return importSaveWithRecovery(raw).save;
}

export function importSaveWithRecovery(raw: string): SaveImportResult {
  const parsed = parseSaveResult(raw);
  if (!parsed) throw new Error("That file is not a valid Glimmer Grotto save.");
  return parsed;
}
