import { describe, expect, it } from "vitest";
import {
  BACKUP_KEY,
  SAVE_KEY,
  clearSave,
  createFreshSave,
  importSave,
  loadSave,
  persistSave,
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

  it("rejects invalid imports and clears both save generations", () => {
    expect(() => importSave('{"schemaVersion":99}')).toThrow(/valid/i);
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, "primary");
    storage.setItem(BACKUP_KEY, "backup");
    const fresh = clearSave(storage);
    expect(fresh.currentRoom).toBe(0);
    expect(storage.values.size).toBe(0);
  });
});

