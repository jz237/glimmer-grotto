import type {
  Cell,
  Direction,
  PuzzleState,
  RoomDefinition,
  TraceResult,
} from "./contracts";

export const GRID_WIDTH = 15;
export const GRID_HEIGHT = 9;

const DELTA: Record<Direction, Cell> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};

const SLASH: Record<Direction, Direction> = {
  north: "east",
  east: "north",
  south: "west",
  west: "south",
};

const BACKSLASH: Record<Direction, Direction> = {
  north: "west",
  west: "north",
  south: "east",
  east: "south",
};

export function keyOf(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y;
}

export function directionBetween(a: Cell, b: Cell): Direction {
  if (a.x === b.x && a.y !== b.y) {
    return b.y < a.y ? "north" : "south";
  }
  if (a.y === b.y && a.x !== b.x) {
    return b.x < a.x ? "west" : "east";
  }
  throw new Error(`Cells ${keyOf(a)} and ${keyOf(b)} are not axis-aligned`);
}

export function mirrorOrientation(
  incoming: Direction,
  outgoing: Direction,
): 0 | 1 {
  if (SLASH[incoming] === outgoing) return 0;
  if (BACKSLASH[incoming] === outgoing) return 1;
  throw new Error(`Invalid mirror turn ${incoming} -> ${outgoing}`);
}

export function createInitialPuzzleState(room: RoomDefinition): PuzzleState {
  return {
    rotations: Object.fromEntries(
      room.crystals.map((crystal) => [crystal.id, crystal.initial]),
    ),
    charged: !room.requiresCharge,
    bellProgress: 0,
    tide: room.initialTide ?? "low",
  };
}

export function createSolvedPuzzleState(room: RoomDefinition): PuzzleState {
  return {
    rotations: Object.fromEntries(
      room.crystals.map((crystal) => [crystal.id, crystal.solution]),
    ),
    charged: true,
    bellProgress: room.bellSequence?.length ?? 0,
    tide: room.requiredTide ?? room.initialTide ?? "low",
  };
}

export function reflect(
  direction: Direction,
  orientation: 0 | 1,
): Direction {
  return orientation === 0 ? SLASH[direction] : BACKSLASH[direction];
}

export function traceBeam(
  room: RoomDefinition,
  state: PuzzleState,
): TraceResult {
  const bellsReady =
    !room.bellSequence || state.bellProgress >= room.bellSequence.length;
  const tideReady = !room.requiredTide || state.tide === room.requiredTide;

  if (!state.charged || !bellsReady || !tideReady) {
    return { cells: [room.source], solved: false, stopReason: "inactive" };
  }

  const crystals = new Map(room.crystals.map((item) => [keyOf(item), item]));
  const walls = new Set(room.walls.map(keyOf));
  const visited = new Set<string>();
  const cells: Cell[] = [room.source];
  let position = { x: room.source.x, y: room.source.y };
  let direction = room.source.direction;

  for (let step = 0; step < GRID_WIDTH * GRID_HEIGHT * 4; step += 1) {
    const delta = DELTA[direction];
    position = { x: position.x + delta.x, y: position.y + delta.y };

    if (
      position.x < 0 ||
      position.x >= GRID_WIDTH ||
      position.y < 0 ||
      position.y >= GRID_HEIGHT
    ) {
      return { cells, solved: false, stopReason: "boundary" };
    }

    cells.push(position);
    if (sameCell(position, room.bloom)) {
      return { cells, solved: true, stopReason: "bloom" };
    }
    if (walls.has(keyOf(position))) {
      return { cells, solved: false, stopReason: "wall" };
    }

    const loopKey = `${keyOf(position)}:${direction}`;
    if (visited.has(loopKey)) {
      return { cells, solved: false, stopReason: "loop" };
    }
    visited.add(loopKey);

    const crystal = crystals.get(keyOf(position));
    if (crystal) {
      direction = reflect(direction, state.rotations[crystal.id] ?? 0);
    }
  }

  return { cells, solved: false, stopReason: "loop" };
}

export function rotateCrystal(
  state: PuzzleState,
  crystalId: string,
): PuzzleState {
  const current = state.rotations[crystalId] ?? 0;
  return {
    ...state,
    rotations: {
      ...state.rotations,
      [crystalId]: current === 0 ? 1 : 0,
    },
  };
}

export function ringBell(
  room: RoomDefinition,
  state: PuzzleState,
  bellId: string,
): { state: PuzzleState; correct: boolean; complete: boolean } {
  const sequence = room.bellSequence ?? [];
  const expected = sequence[state.bellProgress];
  const correct = expected === bellId;
  const bellProgress = correct ? state.bellProgress + 1 : 0;
  return {
    state: { ...state, bellProgress },
    correct,
    complete: bellProgress >= sequence.length,
  };
}

export function toggleTide(state: PuzzleState): PuzzleState {
  return { ...state, tide: state.tide === "low" ? "high" : "low" };
}

