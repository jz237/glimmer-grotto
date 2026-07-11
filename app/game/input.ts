export type MoveDirection = "left" | "right" | "up" | "down";

export interface GamepadLike {
  axes: readonly number[];
  buttons: readonly { pressed: boolean }[];
}

export interface GamepadFrame {
  direction: MoveDirection | null;
  action: boolean;
  describe: boolean;
  focus: boolean;
  hint: boolean;
}

export interface DirectionRepeatState {
  direction: MoveDirection | null;
  nextAt: number;
}

export const GAMEPAD_DEAD_ZONE = 0.55;
export const GAMEPAD_INITIAL_REPEAT_MS = 285;
export const GAMEPAD_REPEAT_MS = 135;

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
  };
}

export function createDirectionRepeatState(): DirectionRepeatState {
  return { direction: null, nextAt: 0 };
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
