import type { Cell, PuzzleState, RoomDefinition } from "./contracts";
import { isBlockedCell } from "./navigation";
import { GRID_HEIGHT, GRID_WIDTH, sameCell, traceBeam } from "./puzzle";

export interface RoomDescriptionState {
  player: Cell;
  facing: Cell;
  puzzle: PuzzleState;
  carrying: boolean;
  moteAvailable: boolean;
  seedCollected: boolean;
}

const CARDINALS = [
  { name: "north", dx: 0, dy: -1 },
  { name: "east", dx: 1, dy: 0 },
  { name: "south", dx: 0, dy: 1 },
  { name: "west", dx: -1, dy: 0 },
] as const;

const BELL_NAMES = ["circle bell", "triangle bell", "diamond bell"];

function facingName(facing: Cell): string {
  if (facing.x > 0) return "east";
  if (facing.x < 0) return "west";
  if (facing.y > 0) return "south";
  return "north";
}

function relativeDirection(from: Cell, to: Cell): string {
  const vertical = to.y < from.y ? "north" : to.y > from.y ? "south" : "";
  const horizontal = to.x < from.x ? "west" : to.x > from.x ? "east" : "";
  return `${vertical}${horizontal}` || "here";
}

function landmark(label: string, from: Cell, to: Cell): string {
  const distance = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
  if (distance === 0) return `${label} is here.`;
  return `${label} is ${distance} ${distance === 1 ? "tile" : "tiles"} ${relativeDirection(from, to)}.`;
}

function featureAt(
  room: RoomDefinition,
  cell: Cell,
  state: RoomDescriptionState,
  solved: boolean,
): string | null {
  if (
    room.seed &&
    !state.seedCollected &&
    sameCell(room.seed, cell)
  ) {
    return "an echo seed";
  }
  if (
    room.mote &&
    state.moteAvailable &&
    !state.carrying &&
    !state.puzzle.charged &&
    sameCell(room.mote, cell)
  ) {
    return "a loose glimmer";
  }
  const crystal = room.crystals.find((item) => sameCell(item, cell));
  if (crystal) return "a crystal";
  const bell = room.bells?.find((item) => sameCell(item, cell));
  if (bell) return BELL_NAMES[bell.tone] ?? "a root bell";
  if (room.tideSwitch && sameCell(room.tideSwitch, cell)) {
    return "the tide switch";
  }
  if (sameCell(room.source, cell)) return "the glimmer source";
  if (sameCell(room.bloom, cell)) {
    return solved ? "the restored bloom" : "the sleeping bloom";
  }
  return null;
}

function beamDescription(room: RoomDefinition, puzzle: PuzzleState): string {
  const trace = traceBeam(room, puzzle);
  if (trace.solved) return "The beam reaches the bloom.";
  if (trace.stopReason === "inactive") {
    const needs: string[] = [];
    if (!puzzle.charged) needs.push("a charged source");
    if (
      room.bellSequence &&
      puzzle.bellProgress < room.bellSequence.length
    ) {
      needs.push("the completed rootsong");
    }
    if (room.requiredTide && puzzle.tide !== room.requiredTide) {
      needs.push(`${room.requiredTide} tide`);
    }
    return `The beam is waiting for ${needs.join(", ") || "the room's condition"}.`;
  }
  const end = trace.cells.at(-1) ?? room.source;
  if (trace.stopReason === "boundary") {
    if (end.y === 0) {
      return `The beam leaves through the north edge at column ${end.x}.`;
    }
    if (end.y === GRID_HEIGHT - 1) {
      return `The beam leaves through the south edge at column ${end.x}.`;
    }
    if (end.x === 0) {
      return `The beam leaves through the west edge at row ${end.y}.`;
    }
    if (end.x === GRID_WIDTH - 1) {
      return `The beam leaves through the east edge at row ${end.y}.`;
    }
  }
  const reason = trace.stopReason === "wall"
    ? "against a wall"
    : trace.stopReason === "loop"
      ? "in a loop"
      : "at the room edge";
  return `The beam stops at column ${end.x}, row ${end.y} ${reason}.`;
}

export function describeRoomPosition(
  room: RoomDefinition,
  state: RoomDescriptionState,
): string {
  const solved = traceBeam(room, state.puzzle).solved;
  const surroundings = CARDINALS.map(({ name, dx, dy }) => {
    const cell = { x: state.player.x + dx, y: state.player.y + dy };
    const feature = featureAt(room, cell, state, solved);
    if (feature) return `${name} is ${feature}`;
    return `${name} is ${isBlockedCell(room, cell) ? "blocked" : "open"}`;
  }).join("; ");
  const details = [
    `Mica is at column ${state.player.x} of ${GRID_WIDTH - 2}, row ${state.player.y} of ${GRID_HEIGHT - 2}, facing ${facingName(state.facing)}.`,
    `Around Mica: ${surroundings}.`,
    landmark("The bloom", state.player, room.bloom),
  ];

  if (room.seed && !state.seedCollected) {
    details.push(landmark("An echo seed", state.player, room.seed));
  }
  if (
    room.mote &&
    state.moteAvailable &&
    !state.carrying &&
    !state.puzzle.charged
  ) {
    details.push(landmark("A loose glimmer", state.player, room.mote));
  }
  if (state.carrying) details.push("Mica is carrying a glimmer.");
  details.push(beamDescription(room, state.puzzle));
  return details.join(" ");
}
