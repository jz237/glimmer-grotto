import { describe, expect, it } from "vitest";
import { ROOMS } from "./content";
import {
  buildRoomPlaythrough,
  interactionTargetAt,
  isBlockedCell,
  simulateRoomPlaythrough,
} from "./navigation";

describe("complete player navigation traces", () => {
  it.each(ROOMS.map((room) => [room.id, room] as const))(
    "%s can be walked, interacted with, and solved from its real start cell",
    (_id, room) => {
      const commands = buildRoomPlaythrough(room);
      const result = simulateRoomPlaythrough(room, commands);
      expect(result.solved).toBe(true);
      expect(result.seedCollected).toBe(Boolean(room.seed));
      expect(result.moveCount).toBeGreaterThan(0);
      expect(result.actionCount).toBe(
        room.crystals.filter((crystal) => crystal.initial !== crystal.solution).length +
          (room.bellSequence?.length ?? 0) +
          Number(Boolean(room.requiresCharge)) +
          Number(
            Boolean(
              room.requiredTide &&
                room.requiredTide !== (room.initialTide ?? "low"),
            ),
          ),
      );
    },
  );

  it("keeps a verified completion route within an unhurried room-length budget", () => {
    const lengths = ROOMS.map((room) => buildRoomPlaythrough(room).length);
    expect(Math.max(...lengths)).toBeLessThanOrEqual(120);
    expect(Math.min(...lengths)).toBeGreaterThanOrEqual(8);
  });

  it("builds complexity by biome while Tideglass provides a deliberate breather", () => {
    const averageFor = (biome: (typeof ROOMS)[number]["biome"]) => {
      const lengths = ROOMS
        .filter((room) => room.biome === biome)
        .map((room) => buildRoomPlaythrough(room).length);
      return lengths.reduce((sum, length) => sum + length, 0) / lengths.length;
    };
    const mosswake = averageFor("mosswake");
    const prismPools = averageFor("prism-pools");
    const hushroot = averageFor("hushroot");
    const tideglass = averageFor("tideglass");
    const heartbloom = averageFor("heartbloom");

    expect(prismPools).toBeGreaterThan(mosswake);
    expect(hushroot).toBeGreaterThan(prismPools);
    expect(tideglass).toBeLessThan(hushroot);
    expect(heartbloom).toBeGreaterThan(hushroot);
  });

  it.each(ROOMS.map((room) => [room.id, room] as const))(
    "%s lets a directional or pointer action select every approachable object",
    (_id, room) => {
      const targets = [
        ...(room.requiresCharge
          ? [{ cell: room.source, kind: "source", id: room.id } as const]
          : []),
        ...(room.bells?.map((bell) => ({
          cell: bell,
          kind: "bell" as const,
          id: bell.id,
        })) ?? []),
        ...(room.tideSwitch
          ? [{ cell: room.tideSwitch, kind: "tide", id: room.id } as const]
          : []),
        ...room.crystals.map((crystal) => ({
          cell: crystal,
          kind: "crystal" as const,
          id: crystal.id,
        })),
      ];

      for (const target of targets) {
        const approaches = [
          { x: target.cell.x + 1, y: target.cell.y },
          { x: target.cell.x - 1, y: target.cell.y },
          { x: target.cell.x, y: target.cell.y + 1 },
          { x: target.cell.x, y: target.cell.y - 1 },
        ].filter((cell) => !isBlockedCell(room, cell));
        expect(approaches.length).toBeGreaterThan(0);
        for (const approach of approaches) {
          expect(interactionTargetAt(room, approach, target.cell)).toEqual({
            kind: target.kind,
            id: target.id,
          });
        }
      }
    },
  );
});
