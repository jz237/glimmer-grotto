import type { Cell } from "./contracts";

export type MoveDirection = "left" | "right" | "up" | "down";

export interface GamepadLike {
  axes: readonly number[];
  buttons: readonly { pressed: boolean }[];
}

export interface IndexedGamepadLike extends GamepadLike {
  readonly index: number;
  readonly connected?: boolean;
}

export interface GamepadFrame {
  direction: MoveDirection | null;
  action: boolean;
  describe: boolean;
  focus: boolean;
  hint: boolean;
  memories: boolean;
  menu: boolean;
}

export interface DirectionRepeatState {
  direction: MoveDirection | null;
  nextAt: number;
}

export type GamepadMenuRequest = "memories" | "menu";

export type KeyboardIntent =
  | { type: "move"; dx: -1 | 0 | 1; dy: -1 | 0 | 1 }
  | { type: "interact" }
  | { type: "reset" }
  | { type: "describe" }
  | { type: "focus" }
  | { type: "hint" }
  | { type: "openMenu" }
  | { type: "openMemories" }
  | { type: "openMap" };

export interface KeyboardInputLike {
  code: string;
  repeat: boolean;
  isComposing: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  defaultPrevented?: boolean;
  keyCode?: number;
}

export interface KeyboardInputDecision {
  intent: KeyboardIntent;
  preventDefault: boolean;
}

export interface PointerGridSample {
  worldX: number;
  worldY: number;
  button: number;
  primaryDown: boolean;
}

export interface PointerGridGeometry {
  left: number;
  top: number;
  cellSize: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const GAMEPAD_DEAD_ZONE = 0.55;
export const GAMEPAD_INITIAL_REPEAT_MS = 285;
export const GAMEPAD_REPEAT_MS = 135;

export class GamepadSessionGuard {
  private activeIndex: number | null = null;
  private synchronizationRequired = true;

  interrupt(): void {
    this.synchronizationRequired = true;
  }

  disconnect(): void {
    this.activeIndex = null;
    this.synchronizationRequired = true;
  }

  synchronize(index: number): void {
    this.activeIndex = index;
    this.synchronizationRequired = false;
  }

  shouldSuppressFrame(index: number): boolean {
    if (this.synchronizationRequired || this.activeIndex !== index) {
      this.synchronize(index);
      return true;
    }
    return false;
  }
}

export class KeyboardSessionGuard {
  private readonly pressedCodes = new Set<string>();

  admit(code: string, repeat: boolean, repeatable: boolean): boolean {
    if (repeat) return repeatable && this.pressedCodes.has(code);
    if (this.pressedCodes.has(code)) return false;
    this.pressedCodes.add(code);
    return true;
  }

  release(code: string): void {
    this.pressedCodes.delete(code);
  }

  interrupt(): void {
    this.pressedCodes.clear();
  }
}

export function firstConnectedGamepad<T extends IndexedGamepadLike>(
  candidates: ArrayLike<T | null>,
): T | undefined {
  return Array.from(candidates).find(
    (candidate): candidate is T => Boolean(candidate && candidate.connected !== false),
  );
}

export function keyboardInputDecision(
  input: KeyboardInputLike,
): KeyboardInputDecision | null {
  if (
    input.defaultPrevented ||
    input.isComposing ||
    input.keyCode === 229 ||
    input.altKey ||
    input.ctrlKey ||
    input.metaKey
  ) {
    return null;
  }

  const code = input.code;
  let intent: KeyboardIntent | null = null;
  if (code === "ArrowUp" || code === "KeyW") {
    intent = { type: "move", dx: 0, dy: -1 };
  } else if (code === "ArrowDown" || code === "KeyS") {
    intent = { type: "move", dx: 0, dy: 1 };
  } else if (code === "ArrowLeft" || code === "KeyA") {
    intent = { type: "move", dx: -1, dy: 0 };
  } else if (code === "ArrowRight" || code === "KeyD") {
    intent = { type: "move", dx: 1, dy: 0 };
  } else if (code === "Space" || code === "Enter" || code === "KeyE") {
    intent = { type: "interact" };
  } else if (code === "KeyR") intent = { type: "reset" };
  else if (code === "KeyC") intent = { type: "describe" };
  else if (code === "KeyF") intent = { type: "focus" };
  else if (code === "KeyH") intent = { type: "hint" };
  else if (code === "Escape") intent = { type: "openMenu" };
  else if (code === "KeyJ") intent = { type: "openMemories" };
  else if (code === "KeyM") intent = { type: "openMap" };

  if (!intent) return null;
  return {
    intent,
    preventDefault:
      code === "Space" ||
      code === "ArrowUp" ||
      code === "ArrowDown" ||
      code === "ArrowLeft" ||
      code === "ArrowRight",
  };
}

export function pointerGridCell(
  sample: PointerGridSample,
  geometry: PointerGridGeometry,
): Cell | null {
  if (!sample.primaryDown || sample.button !== 0) return null;
  if (
    !Number.isFinite(sample.worldX) ||
    !Number.isFinite(sample.worldY) ||
    !Number.isFinite(geometry.left) ||
    !Number.isFinite(geometry.top) ||
    !Number.isFinite(geometry.cellSize) ||
    geometry.cellSize <= 0 ||
    !Number.isInteger(geometry.minX) ||
    !Number.isInteger(geometry.maxX) ||
    !Number.isInteger(geometry.minY) ||
    !Number.isInteger(geometry.maxY) ||
    geometry.minX > geometry.maxX ||
    geometry.minY > geometry.maxY
  ) {
    return null;
  }

  const x = Math.floor((sample.worldX - geometry.left) / geometry.cellSize);
  const y = Math.floor((sample.worldY - geometry.top) / geometry.cellSize);
  if (
    x < geometry.minX ||
    x > geometry.maxX ||
    y < geometry.minY ||
    y > geometry.maxY
  ) {
    return null;
  }
  return { x, y };
}

function pressed(gamepad: GamepadLike, index: number): boolean {
  return Boolean(gamepad.buttons[index]?.pressed);
}

export function readGamepadFrame(
  gamepad: GamepadLike,
  deadZone = GAMEPAD_DEAD_ZONE,
): GamepadFrame {
  const dpadX = Number(pressed(gamepad, 15)) - Number(pressed(gamepad, 14));
  const dpadY = Number(pressed(gamepad, 13)) - Number(pressed(gamepad, 12));
  const x = dpadX || gamepad.axes[0] || 0;
  const y = dpadY || gamepad.axes[1] || 0;
  let direction: MoveDirection | null = null;

  if (Math.max(Math.abs(x), Math.abs(y)) >= deadZone) {
    if (Math.abs(x) >= Math.abs(y)) direction = x < 0 ? "left" : "right";
    else direction = y < 0 ? "up" : "down";
  }

  return {
    direction,
    action: pressed(gamepad, 0),
    describe: pressed(gamepad, 1),
    focus: pressed(gamepad, 2),
    hint: pressed(gamepad, 3),
    memories: pressed(gamepad, 8),
    menu: pressed(gamepad, 9),
  };
}

export function nextDialogFocusIndex(
  count: number,
  currentIndex: number,
  direction: MoveDirection,
): number {
  if (count <= 0) return -1;
  const delta = direction === "left" || direction === "up" ? -1 : 1;
  const start = currentIndex >= 0 && currentIndex < count
    ? currentIndex
    : delta > 0
      ? -1
      : 0;
  return (start + delta + count) % count;
}

export function adjustedRangeValue(
  value: number,
  min: number,
  max: number,
  step: number,
  direction: "left" | "right",
): number {
  const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
  const delta = direction === "left" ? -safeStep : safeStep;
  const clamped = Math.min(max, Math.max(min, value + delta));
  return Number(clamped.toFixed(10));
}

export function gamepadMenuRequest(
  frame: GamepadFrame,
  previous: Pick<GamepadFrame, "memories" | "menu">,
): GamepadMenuRequest | null {
  if (frame.menu && !previous.menu) return "menu";
  if (frame.memories && !previous.memories) return "memories";
  return null;
}

export function createDirectionRepeatState(): DirectionRepeatState {
  return { direction: null, nextAt: 0 };
}

export function createSuppressedDirectionRepeatState(
  direction: MoveDirection | null,
): DirectionRepeatState {
  return direction
    ? { direction, nextAt: Number.POSITIVE_INFINITY }
    : createDirectionRepeatState();
}

export function advanceDirectionRepeat(
  direction: MoveDirection | null,
  time: number,
  state: DirectionRepeatState,
): { move: MoveDirection | null; state: DirectionRepeatState } {
  if (!direction) {
    return { move: null, state: createDirectionRepeatState() };
  }
  if (direction !== state.direction) {
    return {
      move: direction,
      state: { direction, nextAt: time + GAMEPAD_INITIAL_REPEAT_MS },
    };
  }
  if (time < state.nextAt) return { move: null, state };
  return {
    move: direction,
    state: { direction, nextAt: time + GAMEPAD_REPEAT_MS },
  };
}
