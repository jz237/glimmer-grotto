import { describe, expect, it } from "vitest";
import { ROOMS } from "./content";
import { createInitialPuzzleState, ringBell, toggleTide } from "./puzzle";
import { roomMechanicStatus } from "./status";

describe("persistent mechanic status", () => {
  it.each(ROOMS.map((room) => [room.id, room] as const))(
    "%s exposes every special requirement without leaking crystal solutions",
    (_id, room) => {
      const items = roomMechanicStatus(
        room,
        createInitialPuzzleState(room),
        false,
      );
      expect(items.map((item) => item.kind)).toEqual([
        ...(room.requiresCharge ? ["charge" as const] : []),
        ...(room.bellSequence?.length ? ["rootsong" as const] : []),
        ...(room.tideSwitch && room.requiredTide ? ["tide" as const] : []),
      ]);
      expect(JSON.stringify(items)).not.toMatch(/crystal|rotation|solution/i);
    },
  );

  it("tracks a glimmer from discovery through a charged source", () => {
    const room = ROOMS.find((candidate) => candidate.requiresCharge)!;
    const initial = createInitialPuzzleState(room);

    expect(roomMechanicStatus(room, initial, false)[0]).toMatchObject({
      value: "Needs a glimmer",
    });
    expect(roomMechanicStatus(room, initial, true)[0]).toMatchObject({
      value: "Carrying light",
    });
    expect(
      roomMechanicStatus(room, { ...initial, charged: true }, false)[0],
    ).toMatchObject({ value: "Awake" });
  });

  it("makes the rootsong pattern and current note visually readable", () => {
    const room = ROOMS.find((candidate) => candidate.id === "hush-01")!;
    const initial = createInitialPuzzleState(room);
    const first = roomMechanicStatus(room, initial, false)[0];

    expect(first).toMatchObject({
      kind: "rootsong",
      value: "0 / 3 notes",
    });
    expect(first.sequence?.map(({ glyph, name, state }) => ({ glyph, name, state }))).toEqual([
      { glyph: "○", name: "circle", state: "current" },
      { glyph: "△", name: "triangle", state: "upcoming" },
      { glyph: "◇", name: "diamond", state: "upcoming" },
    ]);

    const oneNote = ringBell(room, initial, room.bellSequence![0]).state;
    const progressed = roomMechanicStatus(room, oneNote, false)[0];
    expect(progressed.value).toBe("1 / 3 notes");
    expect(progressed.sequence?.map((step) => step.state)).toEqual([
      "complete",
      "current",
      "upcoming",
    ]);

    const complete = room.bellSequence!.reduce(
      (state, bellId) => ringBell(room, state, bellId).state,
      initial,
    );
    const remembered = roomMechanicStatus(room, complete, false)[0];
    expect(remembered.value).toBe("Song remembered");
    expect(remembered.sequence?.every((step) => step.state === "complete")).toBe(true);
  });

  it("shows the current tide and the source requirement", () => {
    const room = ROOMS.find((candidate) => candidate.tideSwitch)!;
    const initial = createInitialPuzzleState(room);
    const first = roomMechanicStatus(room, initial, false)[0];
    const toggled = roomMechanicStatus(room, toggleTide(initial), false)[0];

    expect(first.kind).toBe("tide");
    expect(first.value).toContain(`needs ${room.requiredTide}`);
    expect(toggled.value).toContain("aligned");
  });
});
