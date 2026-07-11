import { describe, expect, it } from "vitest";
import { JOURNEY_ROOMS } from "./journey";
import {
  BACKUP_KEY,
  SAVE_KEY,
  clearSave,
  clearSaveWithStatus,
  createFreshSave,
  importSave,
  importSaveWithRecovery,
  loadSave,
  loadSaveWithRecovery,
  persistSave,
  persistSaveWithStatus,
  reconcileSave,
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

class DroppingStorage implements StorageLike {
  getItem(): string | null {
    return null;
  }
  setItem(): void {
    // Simulates a storage facade that accepts a call but silently drops it.
  }
  removeItem(): void {
    // There is no retained value to remove.
  }
}

class BackupFailingStorage extends MemoryStorage {
  failBackup = false;

  override setItem(key: string, value: string): void {
    if (this.failBackup && key === BACKUP_KEY) {
      throw new Error("backup quota exceeded");
    }
    super.setItem(key, value);
  }

  override removeItem(key: string): void {
    if (this.failBackup && key === BACKUP_KEY) {
      throw new Error("backup removal blocked");
    }
    super.removeItem(key);
  }
}

class PrimaryFailingStorage extends MemoryStorage {
  failPrimary = false;

  override setItem(key: string, value: string): void {
    if (this.failPrimary && key === SAVE_KEY) {
      throw new Error("primary write blocked");
    }
    super.setItem(key, value);
  }
}

describe("local save safety", () => {
  it("creates, persists, and loads a versioned save", () => {
    const storage = new MemoryStorage();
    const fresh = createFreshSave(new Date("2026-07-10T00:00:00.000Z"));
    persistSave(storage, {
      ...fresh,
      currentRoom: 2,
      completedRooms: ["moss-01", "moss-02"],
    });
    const loaded = loadSave(storage);
    expect(loaded.schemaVersion).toBe(1);
    expect(loaded.currentRoom).toBe(2);
    expect(loaded.completedRooms).toEqual(["moss-01", "moss-02"]);
    expect(loadSaveWithRecovery(storage).recovery).toBe("none");
  });

  it("recovers the last-known-good backup when the primary is corrupt", () => {
    const storage = new MemoryStorage();
    const original = createFreshSave(new Date("2026-07-10T00:00:00.000Z"));
    storage.setItem(
      BACKUP_KEY,
      JSON.stringify({
        ...original,
        currentRoom: 7,
        completedRooms: JOURNEY_ROOMS.slice(0, 7).map((room) => room.id),
      }),
    );
    storage.setItem(SAVE_KEY, "not-json");
    const loaded = loadSaveWithRecovery(storage);
    expect(loaded.recovery).toBe("backup");
    expect(loaded.persistence).toBe("saved");
    expect(loaded.save.currentRoom).toBe(7);
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
        currentRoom: 4,
        completedRooms: JOURNEY_ROOMS.slice(0, 4).map((room) => room.id),
        seenBiomes: ["prism-pools", "unknown-cave", "prism-pools"],
      }),
    );
    expect(loadSave(storage).seenBiomes).toEqual(["prism-pools"]);
  });

  it("rejects invalid imports and replaces both save generations with a fresh start", () => {
    expect(() => importSave('{"schemaVersion":99}')).toThrow(/valid/i);
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, "primary");
    storage.setItem(BACKUP_KEY, "backup");
    const fresh = clearSave(storage);
    expect(fresh.currentRoom).toBe(0);
    expect(loadSaveWithRecovery(storage)).toMatchObject({
      save: { currentRoom: 0, completedRooms: [] },
      recovery: "none",
    });
    expect(storage.getItem(BACKUP_KEY)).toBeNull();
  });

  it("keeps the game playable when browser storage is unavailable", () => {
    const storage = new ThrowingStorage();
    const fresh = loadSave(storage);
    expect(fresh.currentRoom).toBe(0);
    expect(loadSaveWithRecovery(storage).recovery).toBe("unavailable");
    expect(loadSaveWithRecovery(storage).persistence).toBe("unavailable");
    expect(loadSaveWithRecovery(null).recovery).toBe("unavailable");
    expect(() => persistSave(storage, fresh)).not.toThrow();
    expect(() => clearSave(storage)).not.toThrow();
    expect(loadSave(null).currentRoom).toBe(0);
    expect(() => persistSave(null, fresh)).not.toThrow();
    expect(() => clearSave(null)).not.toThrow();
  });

  it("verifies every primary write instead of silently accepting data loss", () => {
    const fresh = createFreshSave(new Date("2026-07-10T00:00:00.000Z"));
    expect(persistSaveWithStatus(new ThrowingStorage(), fresh).persistence).toBe(
      "unavailable",
    );
    expect(persistSaveWithStatus(new DroppingStorage(), fresh).persistence).toBe(
      "unavailable",
    );
    expect(persistSaveWithStatus(null, fresh).persistence).toBe("unavailable");
  });

  it("reports a usable primary when only the recovery generation fails", () => {
    const storage = new BackupFailingStorage();
    const fresh = createFreshSave(new Date("2026-07-10T00:00:00.000Z"));
    persistSave(storage, fresh);
    storage.failBackup = true;
    const result = persistSaveWithStatus(storage, {
      ...fresh,
      currentRoom: 1,
      completedRooms: ["moss-01"],
    });

    expect(result.persistence).toBe("primary-only");
    expect(loadSave(storage).currentRoom).toBe(1);
  });

  it("reports degraded redundancy while recovering or repairing", () => {
    const backupOnly = new PrimaryFailingStorage();
    const save = {
      ...createFreshSave(new Date("2026-07-10T00:00:00.000Z")),
      currentRoom: 2,
      completedRooms: JOURNEY_ROOMS.slice(0, 2).map((room) => room.id),
    };
    backupOnly.setItem(SAVE_KEY, "broken-primary");
    backupOnly.setItem(BACKUP_KEY, JSON.stringify(save));
    backupOnly.failPrimary = true;
    expect(loadSaveWithRecovery(backupOnly)).toMatchObject({
      save: { currentRoom: 2 },
      recovery: "backup",
      persistence: "backup-only",
    });

    const primaryOnly = new BackupFailingStorage();
    primaryOnly.setItem(
      SAVE_KEY,
      JSON.stringify({
        ...createFreshSave(new Date("2026-07-10T00:00:00.000Z")),
        currentRoom: 3,
        completedRooms: ["moss-01"],
      }),
    );
    primaryOnly.failBackup = true;
    expect(loadSaveWithRecovery(primaryOnly)).toMatchObject({
      save: { currentRoom: 3 },
      recovery: "repaired",
      persistence: "primary-only",
    });
  });

  it("makes a confirmed restart durable and reports incomplete neutralization", () => {
    const storage = new MemoryStorage();
    persistSave(storage, {
      ...createFreshSave(),
      currentRoom: 3,
      completedRooms: JOURNEY_ROOMS.slice(0, 3).map((room) => room.id),
    });
    expect(clearSaveWithStatus(storage).persistence).toBe("saved");
    expect(loadSave(storage).currentRoom).toBe(0);

    const partial = new BackupFailingStorage();
    persistSave(partial, {
      ...createFreshSave(),
      currentRoom: 2,
      completedRooms: JOURNEY_ROOMS.slice(0, 2).map((room) => room.id),
    });
    partial.failBackup = true;
    const cleared = clearSaveWithStatus(partial);
    expect(cleared.persistence).toBe("primary-only");
    expect(loadSave(partial).currentRoom).toBe(0);
  });

  it("repairs a save that completed every room before the ending flag persisted", () => {
    const save = {
      ...createFreshSave(),
      currentRoom: 19,
      completedRooms: JOURNEY_ROOMS.map((room) => room.id),
    };
    const reconciled = reconcileSave(save);
    expect(reconciled.journeyComplete).toBe(true);
    expect(reconciled.currentRoom).toBe(19);
    expect(reconcileSave(createFreshSave()).journeyComplete).toBe(false);
  });

  it("repairs campaign gaps without discarding the furthest credible room", () => {
    const raw = JSON.stringify({
      ...createFreshSave(new Date("2026-07-10T00:00:00.000Z")),
      currentRoom: 4.9,
      completedRooms: ["moss-03", "unknown-room", "moss-03"],
      collectedSeeds: [
        "moss-01-seed",
        "tide-01-seed",
        "moss-01-seed",
        "unknown-seed",
      ],
      seenBiomes: ["heartbloom", "prism-pools", "prism-pools"],
      settings: {
        reducedMotion: "yes",
        highContrast: true,
        largeText: false,
        musicVolume: 2,
        effectsVolume: -0.5,
      },
      playTimeMs: -12,
      journeyComplete: "true",
    });

    const imported = importSaveWithRecovery(raw);
    expect(imported.repaired).toBe(true);
    expect(imported.save.currentRoom).toBe(4);
    expect(imported.save.completedRooms).toEqual(
      JOURNEY_ROOMS.slice(0, 4).map((room) => room.id),
    );
    expect(imported.save.collectedSeeds).toEqual(["moss-01-seed"]);
    expect(imported.save.seenBiomes).toEqual(["prism-pools"]);
    expect(imported.save.settings).toEqual({
      reducedMotion: false,
      highContrast: true,
      largeText: false,
      musicVolume: 1,
      effectsVolume: 0,
    });
    expect(imported.save.playTimeMs).toBe(0);
    expect(imported.save.journeyComplete).toBe(false);
  });

  it("does not mistake unknown room IDs for a completed campaign", () => {
    const imported = importSave(
      JSON.stringify({
        ...createFreshSave(),
        completedRooms: Array.from(
          { length: JOURNEY_ROOMS.length },
          (_, index) => `unknown-${index}`,
        ),
      }),
    );
    expect(imported.completedRooms).toEqual([]);
    expect(imported.currentRoom).toBe(0);
    expect(imported.journeyComplete).toBe(false);
  });

  it("trusts an explicit ending flag and restores a playable afterglow", () => {
    const repaired = reconcileSave({
      ...createFreshSave(),
      journeyComplete: true,
    });
    expect(repaired.completedRooms).toEqual(
      JOURNEY_ROOMS.map((room) => room.id),
    );
    expect(repaired.currentRoom).toBe(19);
    expect(repaired.journeyComplete).toBe(true);
  });

  it("round-trips a canonical afterglow without reporting a repair", () => {
    const afterglow = reconcileSave({
      ...createFreshSave(new Date("2026-07-10T00:00:00.000Z")),
      currentRoom: 19,
      completedRooms: JOURNEY_ROOMS.map((room) => room.id),
      collectedSeeds: JOURNEY_ROOMS.flatMap((room) =>
        room.seedId ? [room.seedId] : [],
      ),
      seenBiomes: [
        "prism-pools",
        "hushroot",
        "tideglass",
        "heartbloom",
      ],
      journeyComplete: true,
    });
    expect(importSaveWithRecovery(JSON.stringify(afterglow))).toEqual({
      save: afterglow,
      repaired: false,
    });
  });

  it("preserves a repair source and reports unrecoverable save generations", () => {
    const storage = new MemoryStorage();
    const inconsistent = JSON.stringify({
      ...createFreshSave(),
      currentRoom: 3,
      completedRooms: ["moss-01"],
    });
    storage.setItem(SAVE_KEY, inconsistent);

    const repaired = loadSaveWithRecovery(storage);
    expect(repaired.recovery).toBe("repaired");
    expect(repaired.save.completedRooms).toEqual(
      JOURNEY_ROOMS.slice(0, 3).map((room) => room.id),
    );
    expect(storage.getItem(BACKUP_KEY)).toBe(inconsistent);

    storage.setItem(SAVE_KEY, "broken-primary");
    storage.setItem(BACKUP_KEY, "broken-backup");
    const reset = loadSaveWithRecovery(storage);
    expect(reset.recovery).toBe("reset");
    expect(reset.save.currentRoom).toBe(0);
    expect(storage.getItem(SAVE_KEY)).toContain('"schemaVersion":1');
  });
});
