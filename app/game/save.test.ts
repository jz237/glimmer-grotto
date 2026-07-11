import { describe, expect, it } from "vitest";
import {
  BACKUP_KEY,
  SAVE_KEY,
  clearSave,
  createFreshSave,
  importSave,
  loadSave,
  persistSave,
  reconcileCompletion,
  type StorageLike,
} from "./save";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

class ThrowingStorage implements StorageLike {
  getItem(): string | null {
    throw new Error("storage blocked");
  }
  setItem(): void {
    throw new Error("storage blocked");
  }
  removeItem(): void {
    throw new Error("storage blocked");
  }
}

describe("local save safety", () => {
  it("creates, persists, and loads a versioned save", () => {
    const storage = new MemoryStorage();
    const fresh = createFreshSave(new Date("2026-07-10T00:00:00.000Z"));
    persistSave(storage, {
      ...fresh,
      currentRoom: 4,
      completedRooms: ["moss-01", "moss-02"],
    });
    const loaded = loadSave(storage);
    expect(loaded.schemaVersion).toBe(1);
    expect(loaded.currentRoom).toBe(4);
    expect(loaded.completedRooms).toEqual(["moss-01", "moss-02"]);
  });

  it("recovers the last-known-good backup when the primary is corrupt", () => {
    const storage = new MemoryStorage();
    const original = createFreshSave(new Date("2026-07-10T00:00:00.000Z"));
    storage.setItem(BACKUP_KEY, JSON.stringify({ ...original, currentRoom: 7 }));
    storage.setItem(SAVE_KEY, "not-json");
    expect(loadSave(storage).currentRoom).toBe(7);
    expect(storage.getItem(SAVE_KEY)).toContain('"currentRoom":7');
  });

  it("migrates older saves and keeps only known biome arrivals", () => {
    const storage = new MemoryStorage();
    const legacy = { ...createFreshSave() };
    Reflect.deleteProperty(legacy, "seenBiomes");
    storage.setItem(SAVE_KEY, JSON.stringify(legacy));
    expect(loadSave(storage).seenBiomes).toEqual([]);

    storage.setItem(
      SAVE_KEY,
      JSON.stringify({
        ...createFreshSave(),
        seenBiomes: ["prism-pools", "unknown-cave", "prism-pools"],
      }),
    );
    expect(loadSave(storage).seenBiomes).toEqual(["prism-pools"]);
  });

  it("rejects invalid imports and clears both save generations", () => {
    expect(() => importSave('{"schemaVersion":99}')).toThrow(/valid/i);
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, "primary");
    storage.setItem(BACKUP_KEY, "backup");
    const fresh = clearSave(storage);
    expect(fresh.currentRoom).toBe(0);
    expect(storage.values.size).toBe(0);
  });

  it("keeps the game playable when browser storage is unavailable", () => {
    const storage = new ThrowingStorage();
    const fresh = loadSave(storage);
    expect(fresh.currentRoom).toBe(0);
    expect(() => persistSave(storage, fresh)).not.toThrow();
    expect(() => clearSave(storage)).not.toThrow();
    expect(loadSave(null).currentRoom).toBe(0);
    expect(() => persistSave(null, fresh)).not.toThrow();
    expect(() => clearSave(null)).not.toThrow();
  });

  it("repairs a save that completed every room before the ending flag persisted", () => {
    const save = {
      ...createFreshSave(),
      currentRoom: 19,
      completedRooms: Array.from({ length: 20 }, (_, index) => `room-${index}`),
    };
    const reconciled = reconcileCompletion(save, 20);
    expect(reconciled.journeyComplete).toBe(true);
    expect(reconciled.currentRoom).toBe(19);
    expect(reconcileCompletion(createFreshSave(), 20).journeyComplete).toBe(false);
  });
});
