import type {
  AccessibilitySettings,
  BiomeId,
  SaveGameV1,
} from "./contracts";

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

function safeGet(storage: OptionalStorage, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
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

function safeRemove(storage: OptionalStorage, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    // Storage can be unavailable in hardened or private browser contexts.
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
  return [
    "mosswake",
    "prism-pools",
    "hushroot",
    "tideglass",
    "heartbloom",
  ].includes(value);
}

export function parseSave(raw: string): SaveGameV1 | null {
  try {
    const value = JSON.parse(raw) as Partial<SaveGameV1>;
    if (
      value.schemaVersion !== 1 ||
      typeof value.currentRoom !== "number" ||
      !isStringArray(value.completedRooms) ||
      !isStringArray(value.collectedSeeds) ||
      !value.settings ||
      typeof value.startedAt !== "string" ||
      typeof value.updatedAt !== "string"
    ) {
      return null;
    }
    return {
      ...createFreshSave(),
      ...value,
      currentRoom: Math.max(0, Math.floor(value.currentRoom)),
      completedRooms: [...new Set(value.completedRooms)],
      collectedSeeds: [...new Set(value.collectedSeeds)],
      seenBiomes: isStringArray(value.seenBiomes)
        ? [...new Set(value.seenBiomes.filter(isBiomeId))]
        : [],
      settings: { ...DEFAULT_SETTINGS, ...value.settings },
      playTimeMs: Math.max(0, Number(value.playTimeMs) || 0),
      journeyComplete: Boolean(value.journeyComplete),
    };
  } catch {
    return null;
  }
}

export function loadSave(storage: OptionalStorage): SaveGameV1 {
  const primary = safeGet(storage, SAVE_KEY);
  if (primary) {
    const parsed = parseSave(primary);
    if (parsed) return parsed;
  }
  const backup = safeGet(storage, BACKUP_KEY);
  if (backup) {
    const parsed = parseSave(backup);
    if (parsed) {
      safeSet(storage, SAVE_KEY, JSON.stringify(parsed));
      return parsed;
    }
  }
  return createFreshSave();
}

export function persistSave(storage: OptionalStorage, save: SaveGameV1): SaveGameV1 {
  const next = { ...save, updatedAt: new Date().toISOString() };
  const current = safeGet(storage, SAVE_KEY);
  if (current && parseSave(current)) {
    safeSet(storage, BACKUP_KEY, current);
  }
  safeSet(storage, SAVE_KEY, JSON.stringify(next));
  return next;
}

export function clearSave(storage: OptionalStorage): SaveGameV1 {
  safeRemove(storage, SAVE_KEY);
  safeRemove(storage, BACKUP_KEY);
  return createFreshSave();
}

export function reconcileCompletion(
  save: SaveGameV1,
  totalRooms: number,
): SaveGameV1 {
  if (save.journeyComplete || save.completedRooms.length < totalRooms) {
    return save;
  }
  return {
    ...save,
    journeyComplete: true,
    currentRoom: Math.max(0, totalRooms - 1),
  };
}

export function exportSave(save: SaveGameV1): string {
  return JSON.stringify(save, null, 2);
}

export function importSave(raw: string): SaveGameV1 {
  const parsed = parseSave(raw);
  if (!parsed) throw new Error("That file is not a valid Glimmer Grotto save.");
  return parsed;
}
