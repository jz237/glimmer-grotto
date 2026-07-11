export type Direction = "north" | "east" | "south" | "west";

export type BiomeId =
  | "mosswake"
  | "prism-pools"
  | "hushroot"
  | "tideglass"
  | "heartbloom";

export interface Cell {
  x: number;
  y: number;
}

export interface CrystalDefinition extends Cell {
  id: string;
  initial: 0 | 1;
  solution: 0 | 1;
}

export interface BellDefinition extends Cell {
  id: string;
  tone: number;
}

export interface RoomPalette {
  background: number;
  floor: number;
  floorAlt: number;
  accent: number;
  accentSoft: number;
  beam: number;
  stone: number;
}

export interface RoomDefinition {
  id: string;
  biome: BiomeId;
  biomeName: string;
  name: string;
  subtitle: string;
  story: string;
  start: Cell;
  source: Cell & { direction: Direction };
  bloom: Cell;
  crystals: CrystalDefinition[];
  walls: Cell[];
  hints: [string, string, string];
  palette: RoomPalette;
  seed?: Cell & { id: string };
  mote?: Cell;
  requiresCharge?: boolean;
  bells?: BellDefinition[];
  bellSequence?: string[];
  tideSwitch?: Cell;
  initialTide?: "low" | "high";
  requiredTide?: "low" | "high";
}

export interface PuzzleState {
  rotations: Record<string, 0 | 1>;
  charged: boolean;
  bellProgress: number;
  tide: "low" | "high";
}

export interface TraceResult {
  cells: Cell[];
  solved: boolean;
  stopReason:
    | "bloom"
    | "wall"
    | "boundary"
    | "inactive"
    | "loop";
}

export interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  musicVolume: number;
  effectsVolume: number;
}

export interface SaveGameV1 {
  schemaVersion: 1;
  currentRoom: number;
  completedRooms: string[];
  collectedSeeds: string[];
  seenBiomes: BiomeId[];
  settings: AccessibilitySettings;
  playTimeMs: number;
  startedAt: string;
  updatedAt: string;
  journeyComplete: boolean;
}

export type InputMethod = "keyboard" | "pointer" | "touch" | "gamepad";
export type TutorialStep = "move" | "interact" | "follow";

export interface BiomeArrival {
  biome: BiomeId;
  name: string;
  eyebrow: string;
  title: string;
  story: string;
  buttonLabel: string;
  glyph: string;
}

export type MechanicStatusKind = "charge" | "rootsong" | "tide";

export interface MechanicSequenceStep {
  glyph: string;
  name: string;
  state: "complete" | "current" | "upcoming";
}

export interface MechanicStatusItem {
  kind: MechanicStatusKind;
  label: string;
  value: string;
  detail: string;
  sequence?: MechanicSequenceStep[];
}

export type GameCommand =
  | { type: "move"; dx: -1 | 0 | 1; dy: -1 | 0 | 1 }
  | { type: "interact" }
  | { type: "continue" }
  | { type: "describe" }
  | { type: "hint" }
  | { type: "reset" }
  | { type: "visit"; roomIndex: number }
  | { type: "focus" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "settings"; settings: AccessibilitySettings };

export type GameEvent =
  | { type: "ready"; totalRooms: number }
  | {
      type: "room";
      index: number;
      id: string;
      biomeName: string;
      name: string;
      subtitle: string;
      story: string;
      hints: [string, string, string];
      isRevisit: boolean;
    }
  | { type: "announce"; message: string }
  | { type: "description"; message: string | null }
  | { type: "hint"; index: 1 | 2 | 3; hint: string }
  | { type: "inputMethod"; method: InputMethod }
  | { type: "tutorial"; step: TutorialStep | null }
  | { type: "biomeArrival"; arrival: BiomeArrival | null }
  | { type: "biomeSeen"; biome: BiomeId }
  | { type: "mechanicStatus"; items: MechanicStatusItem[] }
  | { type: "seedFound"; seedId: string }
  | {
      type: "progress";
      currentRoom: number;
      completedRooms: string[];
      collectedSeeds: string[];
    }
  | { type: "journeyComplete" }
  | { type: "error"; message: string };

export interface GameHandle {
  dispatch(command: GameCommand): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}
