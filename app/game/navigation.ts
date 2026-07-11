import type { Cell, RoomDefinition } from "./contracts";
import {
  createInitialPuzzleState,
  keyOf,
  ringBell,
  rotateCrystal,
  sameCell,
  toggleTide,
  traceBeam,
} from "./puzzle";

export type InteractionTarget =
  | { kind: "source"; id: string }
  | { kind: "bell"; id: string }
  | { kind: "tide"; id: string }
  | { kind: "crystal"; id: string };

export type RoomPlayCommand =
  | { type: "move"; dx: -1 | 0 | 1; dy: -1 | 0 | 1 }
  | { type: "interact"; target: InteractionTarget };

export interface RoomPlaythroughResult {
  solved: boolean;
  seedCollected: boolean;
  player: Cell;
  moveCount: number;
  actionCount: number;
}

const WALK_DIRECTIONS = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
] as const;

function distance(a: Cell, b: Cell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function isBlockedCell(room: RoomDefinition, cell: Cell): boolean {
  if (cell.x < 1 || cell.x > 13 || cell.y < 1 || cell.y > 7) return true;
  if (room.walls.some((item) => sameCell(item, cell))) return true;
  if (room.crystals.some((item) => sameCell(item, cell))) return true;
  if (sameCell(room.source, cell) || sameCell(room.bloom, cell)) return true;
  if (room.bells?.some((item) => sameCell(item, cell))) return true;
  if (room.tideSwitch && sameCell(room.tideSwitch, cell)) return true;
  return false;
}

export function findWalkPath(
  room: RoomDefinition,
  start: Cell,
  goal: Cell,
): Cell[] | null {
  if (isBlockedCell(room, start) || isBlockedCell(room, goal)) return null;
  const startKey = keyOf(start);
  const goalKey = keyOf(goal);
  const parents = new Map<string, string | null>([[startKey, null]]);
  const cells = new Map<string, Cell>([[startKey, { ...start }]]);
  const queue = [{ ...start }];

  while (queue.length) {
    const current = queue.shift()!;
    if (sameCell(current, goal)) break;
    for (const { dx, dy } of WALK_DIRECTIONS) {
      const next = { x: current.x + dx, y: current.y + dy };
      const nextKey = keyOf(next);
      if (parents.has(nextKey) || isBlockedCell(room, next)) continue;
      parents.set(nextKey, keyOf(current));
      cells.set(nextKey, next);
      queue.push(next);
    }
  }

  if (!parents.has(goalKey)) return null;
  const path: Cell[] = [];
  let cursor: string | null = goalKey;
  while (cursor) {
    path.push(cells.get(cursor)!);
    cursor = parents.get(cursor) ?? null;
  }
  return path.reverse();
}

export function findWalkPathAdjacentTo(
  room: RoomDefinition,
  start: Cell,
  target: Cell,
  accepts: (cell: Cell) => boolean = () => true,
): Cell[] | null {
  const candidates = WALK_DIRECTIONS
    .map(({ dx, dy }) => ({ x: target.x + dx, y: target.y + dy }))
    .filter(accepts)
    .map((goal) => findWalkPath(room, start, goal))
    .filter((path): path is Cell[] => Boolean(path))
    .sort((a, b) => a.length - b.length);
  return candidates[0] ?? null;
}

function interactionOnCell(
  room: RoomDefinition,
  cell: Cell,
): InteractionTarget | null {
  if (room.requiresCharge && sameCell(cell, room.source)) {
    return { kind: "source", id: room.id };
  }
  const bell = room.bells?.find((candidate) => sameCell(cell, candidate));
  if (bell) return { kind: "bell", id: bell.id };
  if (room.tideSwitch && sameCell(cell, room.tideSwitch)) {
    return { kind: "tide", id: room.id };
  }
  const crystal = room.crystals.find((candidate) => sameCell(cell, candidate));
  return crystal ? { kind: "crystal", id: crystal.id } : null;
}

export function interactionTargetAt(
  room: RoomDefinition,
  player: Cell,
  preferredCell?: Cell,
): InteractionTarget | null {
  if (preferredCell && distance(player, preferredCell) === 1) {
    const preferred = interactionOnCell(room, preferredCell);
    if (preferred) return preferred;
  }
  if (room.requiresCharge && distance(player, room.source) <= 1) {
    return { kind: "source", id: room.id };
  }
  const bell = room.bells?.find((candidate) => distance(player, candidate) <= 1);
  if (bell) return { kind: "bell", id: bell.id };
  if (room.tideSwitch && distance(player, room.tideSwitch) <= 1) {
    return { kind: "tide", id: room.id };
  }
  const crystal = room.crystals.find(
    (candidate) => distance(player, candidate) <= 1,
  );
  return crystal ? { kind: "crystal", id: crystal.id } : null;
}

function appendPath(commands: RoomPlayCommand[], path: Cell[]): void {
  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1];
    const current = path[index];
    commands.push({
      type: "move",
      dx: (current.x - previous.x) as -1 | 0 | 1,
      dy: (current.y - previous.y) as -1 | 0 | 1,
    });
  }
}

export function buildRoomPlaythrough(room: RoomDefinition): RoomPlayCommand[] {
  const commands: RoomPlayCommand[] = [];
  let cursor = { ...room.start };

  const walkTo = (target: Cell, adjacent = false) => {
    const path = adjacent
      ? findWalkPathAdjacentTo(room, cursor, target)
      : findWalkPath(room, cursor, target);
    if (!path) {
      throw new Error(`${room.id} has no walk path to ${keyOf(target)}`);
    }
    appendPath(commands, path);
    cursor = { ...path.at(-1)! };
  };

  const interactAt = (target: Cell, interaction: InteractionTarget) => {
    const path = findWalkPathAdjacentTo(
      room,
      cursor,
      target,
      (cell) => {
        const actual = interactionTargetAt(room, cell);
        return actual?.kind === interaction.kind && actual.id === interaction.id;
      },
    );
    if (!path) {
      throw new Error(
        `${room.id} has no unambiguous approach to ${interaction.kind}:${interaction.id}`,
      );
    }
    appendPath(commands, path);
    cursor = { ...path.at(-1)! };
    commands.push({ type: "interact", target: interaction });
  };

  if (room.seed) walkTo(room.seed);
  if (room.requiresCharge) {
    if (!room.mote) throw new Error(`${room.id} requires a charge but has no mote`);
    walkTo(room.mote);
    interactAt(room.source, { kind: "source", id: room.id });
  }
  for (const bellId of room.bellSequence ?? []) {
    const bell = room.bells?.find((candidate) => candidate.id === bellId);
    if (!bell) throw new Error(`${room.id} references missing bell ${bellId}`);
    interactAt(bell, { kind: "bell", id: bell.id });
  }
  if (room.requiredTide && room.requiredTide !== (room.initialTide ?? "low")) {
    if (!room.tideSwitch) throw new Error(`${room.id} requires a tide without a switch`);
    interactAt(room.tideSwitch, { kind: "tide", id: room.id });
  }
  for (const crystal of room.crystals) {
    if (crystal.initial !== crystal.solution) {
      interactAt(crystal, { kind: "crystal", id: crystal.id });
    }
  }

  return commands;
}

export function simulateRoomPlaythrough(
  room: RoomDefinition,
  commands: readonly RoomPlayCommand[],
): RoomPlaythroughResult {
  let player = { ...room.start };
  let puzzle = createInitialPuzzleState(room);
  let carrying = false;
  let moteAvailable = Boolean(room.mote);
  let seedCollected = false;
  let solved = false;
  let moveCount = 0;
  let actionCount = 0;

  const land = () => {
    if (
      room.mote &&
      sameCell(player, room.mote) &&
      moteAvailable &&
      !carrying &&
      !puzzle.charged
    ) {
      carrying = true;
      moteAvailable = false;
    }
    if (room.seed && sameCell(player, room.seed)) seedCollected = true;
  };

  for (const command of commands) {
    if (solved) throw new Error(`${room.id} playthrough continues after solve`);
    if (command.type === "move") {
      if (Math.abs(command.dx) + Math.abs(command.dy) !== 1) {
        throw new Error(`${room.id} contains a diagonal or empty move`);
      }
      const next = { x: player.x + command.dx, y: player.y + command.dy };
      if (isBlockedCell(room, next)) {
        throw new Error(`${room.id} walks into blocked cell ${keyOf(next)}`);
      }
      player = next;
      moveCount += 1;
      land();
      continue;
    }

    actionCount += 1;
    const actual = interactionTargetAt(room, player);
    if (actual?.kind === "source") {
      if (carrying) {
        puzzle = { ...puzzle, charged: true };
        carrying = false;
      } else if (puzzle.charged) {
        puzzle = { ...puzzle, charged: false };
        carrying = true;
      }
    } else if (actual?.kind === "bell") {
      puzzle = ringBell(room, puzzle, actual.id).state;
    } else if (actual?.kind === "tide") {
      puzzle = toggleTide(puzzle);
    } else if (actual?.kind === "crystal") {
      puzzle = rotateCrystal(puzzle, actual.id);
    }

    if (!actual || actual.kind !== command.target.kind || actual.id !== command.target.id) {
      throw new Error(
        `${room.id} expected ${command.target.kind}:${command.target.id} but reached ${actual?.kind ?? "nothing"}:${actual?.id ?? "none"}`,
      );
    }
    solved = traceBeam(room, puzzle).solved;
  }

  return { solved, seedCollected, player, moveCount, actionCount };
}
