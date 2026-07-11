import type {
  AccessibilitySettings,
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

export function createFreshSave(now = new Date()): SaveGameV1 {
  const timestamp = now.toISOString();
  return {
    schemaVersion: 1,
    currentRoom: 0,
    completedRooms: [],
    collectedSeeds: [],
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
      settings: { ...DEFAULT_SETTINGS, ...value.settings },
      playTimeMs: Math.max(0, Number(value.playTimeMs) || 0),
      journeyComplete: Boolean(value.journeyComplete),
    };
  } catch {
    return null;
  }
}

export function loadSave(storage: StorageLike): SaveGameV1 {
  const primary = storage.getItem(SAVE_KEY);
  if (primary) {
    const parsed = parseSave(primary);
    if (parsed) return parsed;
  }
  const backup = storage.getItem(BACKUP_KEY);
  if (backup) {
    const parsed = parseSave(backup);
    if (parsed) {
      storage.setItem(SAVE_KEY, JSON.stringify(parsed));
      return parsed;
    }
  }
  return createFreshSave();
}

export function persistSave(storage: StorageLike, save: SaveGameV1): SaveGameV1 {
  const next = { ...save, updatedAt: new Date().toISOString() };
  const current = storage.getItem(SAVE_KEY);
  if (current && parseSave(current)) {
    storage.setItem(BACKUP_KEY, current);
  }
  storage.setItem(SAVE_KEY, JSON.stringify(next));
  return next;
}

export function clearSave(storage: StorageLike): SaveGameV1 {
  storage.removeItem(SAVE_KEY);
  storage.removeItem(BACKUP_KEY);
  return createFreshSave();
}

export function exportSave(save: SaveGameV1): string {
  return JSON.stringify(save, null, 2);
}

export function importSave(raw: string): SaveGameV1 {
  const parsed = parseSave(raw);
  if (!parsed) throw new Error("That file is not a valid Glimmer Grotto save.");
  return parsed;
}

