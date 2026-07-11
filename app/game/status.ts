import type {
  MechanicSequenceStep,
  MechanicStatusItem,
  PuzzleState,
  RoomDefinition,
} from "./contracts";

const BELL_GLYPHS = [
  { glyph: "○", name: "circle" },
  { glyph: "△", name: "triangle" },
  { glyph: "◇", name: "diamond" },
] as const;

function capitalized(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function rootsongSequence(
  room: RoomDefinition,
  progress: number,
): MechanicSequenceStep[] {
  return (room.bellSequence ?? []).map((bellId, index) => {
    const bell = room.bells?.find((candidate) => candidate.id === bellId);
    const symbol = BELL_GLYPHS[bell?.tone ?? -1] ?? {
      glyph: "?",
      name: "unknown note",
    };
    return {
      ...symbol,
      state:
        index < progress
          ? "complete"
          : index === progress
            ? "current"
            : "upcoming",
    };
  });
}

export function roomMechanicStatus(
  room: RoomDefinition,
  puzzle: PuzzleState,
  carrying: boolean,
): MechanicStatusItem[] {
  const items: MechanicStatusItem[] = [];

  if (room.requiresCharge) {
    items.push({
      kind: "charge",
      label: "Glimmer source",
      value: puzzle.charged
        ? "Awake"
        : carrying
          ? "Carrying light"
          : "Needs a glimmer",
      detail: puzzle.charged
        ? "The source is charged."
        : carrying
          ? "Bring the carried glimmer to the source."
          : "Find and collect the loose glimmer.",
    });
  }

  const totalNotes = room.bellSequence?.length ?? 0;
  if (totalNotes > 0) {
    const progress = Math.min(puzzle.bellProgress, totalNotes);
    const sequence = rootsongSequence(room, progress);
    const pattern = sequence.map((step) => step.name).join(", ");
    const complete = progress === totalNotes;
    items.push({
      kind: "rootsong",
      label: "Rootsong",
      value: complete ? "Song remembered" : `${progress} / ${totalNotes} notes`,
      detail: complete
        ? `Pattern complete: ${pattern}.`
        : `Pattern: ${pattern}. Next note: ${sequence[progress]?.name ?? "unknown"}.`,
      sequence,
    });
  }

  if (room.tideSwitch && room.requiredTide) {
    const aligned = puzzle.tide === room.requiredTide;
    items.push({
      kind: "tide",
      label: "Tide current",
      value: aligned
        ? `${capitalized(puzzle.tide)} · aligned`
        : `${capitalized(puzzle.tide)} · needs ${room.requiredTide}`,
      detail: aligned
        ? `The ${puzzle.tide} tide matches the source.`
        : `The tide is ${puzzle.tide}. The source needs ${room.requiredTide} tide.`,
    });
  }

  return items;
}
