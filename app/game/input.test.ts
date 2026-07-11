import { describe, expect, it } from "vitest";
import {
  GAMEPAD_INITIAL_REPEAT_MS,
  GAMEPAD_REPEAT_MS,
  advanceDirectionRepeat,
  createDirectionRepeatState,
  readGamepadFrame,
  type GamepadLike,
} from "./input";

function gamepad(
  axes: readonly number[] = [0, 0],
  pressedButtons: readonly number[] = [],
): GamepadLike {
  return {
    axes,
    buttons: Array.from({ length: 16 }, (_, index) => ({
      pressed: pressedButtons.includes(index),
    })),
  };
}

describe("controller input", () => {
  it("ignores stick drift and chooses the dominant axis", () => {
    expect(readGamepadFrame(gamepad([0.34, -0.2])).direction).toBeNull();
    expect(readGamepadFrame(gamepad([0.72, -0.91])).direction).toBe("up");
    expect(readGamepadFrame(gamepad([-0.88, 0.61])).direction).toBe("left");
  });

  it("maps the standard D-pad and A, X, and Y buttons", () => {
    const frame = readGamepadFrame(gamepad([0, 0], [0, 2, 3, 15]));
    expect(frame).toEqual({
      direction: "right",
      action: true,
      focus: true,
      hint: true,
    });
  });

  it("moves immediately, pauses, then repeats at the tuned cadence", () => {
    let state = createDirectionRepeatState();
    let result = advanceDirectionRepeat("right", 1000, state);
    expect(result.move).toBe("right");
    expect(result.state.nextAt).toBe(1000 + GAMEPAD_INITIAL_REPEAT_MS);

    state = result.state;
    result = advanceDirectionRepeat("right", 1100, state);
    expect(result.move).toBeNull();

    result = advanceDirectionRepeat("right", 1285, result.state);
    expect(result.move).toBe("right");
    expect(result.state.nextAt).toBe(1285 + GAMEPAD_REPEAT_MS);

    result = advanceDirectionRepeat("up", 1290, result.state);
    expect(result.move).toBe("up");
    result = advanceDirectionRepeat(null, 1300, result.state);
    expect(result.state).toEqual(createDirectionRepeatState());
  });
});
