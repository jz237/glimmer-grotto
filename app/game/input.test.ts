import { describe, expect, it } from "vitest";
import {
  GAMEPAD_INITIAL_REPEAT_MS,
  GAMEPAD_REPEAT_MS,
  adjustedRangeValue,
  advanceDirectionRepeat,
  createDirectionRepeatState,
  createSuppressedDirectionRepeatState,
  gamepadMenuRequest,
  nextDialogFocusIndex,
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

  it("maps play controls plus the standard View and Menu buttons", () => {
    const frame = readGamepadFrame(gamepad([0, 0], [0, 1, 2, 3, 8, 9, 15]));
    expect(frame).toEqual({
      direction: "right",
      action: true,
      describe: true,
      focus: true,
      hint: true,
      memories: true,
      menu: true,
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

  it("cycles modal focus in either direction without dead ends", () => {
    expect(nextDialogFocusIndex(4, 0, "right")).toBe(1);
    expect(nextDialogFocusIndex(4, 3, "down")).toBe(0);
    expect(nextDialogFocusIndex(4, 0, "left")).toBe(3);
    expect(nextDialogFocusIndex(4, -1, "down")).toBe(0);
    expect(nextDialogFocusIndex(4, -1, "up")).toBe(3);
    expect(nextDialogFocusIndex(0, 0, "right")).toBe(-1);
  });

  it("opens controller menus only on a fresh press and prioritizes Menu", () => {
    const idle = readGamepadFrame(gamepad());
    const view = readGamepadFrame(gamepad([0, 0], [8]));
    const menu = readGamepadFrame(gamepad([0, 0], [9]));
    const both = readGamepadFrame(gamepad([0, 0], [8, 9]));

    expect(gamepadMenuRequest(view, idle)).toBe("memories");
    expect(gamepadMenuRequest(menu, idle)).toBe("menu");
    expect(gamepadMenuRequest(both, idle)).toBe("menu");
    expect(gamepadMenuRequest(menu, menu)).toBeNull();
  });

  it("requires held dialog input to return to neutral after resume", () => {
    const suppressed = createSuppressedDirectionRepeatState("down");
    expect(advanceDirectionRepeat("down", 10_000, suppressed).move).toBeNull();
    const released = advanceDirectionRepeat(null, 10_001, suppressed);
    expect(released.state).toEqual(createDirectionRepeatState());
    expect(advanceDirectionRepeat("down", 10_002, released.state).move).toBe("down");
  });

  it("adjusts controller-operated ranges by their declared step and clamps", () => {
    expect(adjustedRangeValue(0.5, 0, 1, 0.05, "right")).toBe(0.55);
    expect(adjustedRangeValue(0.5, 0, 1, 0.05, "left")).toBe(0.45);
    expect(adjustedRangeValue(1, 0, 1, 0.05, "right")).toBe(1);
    expect(adjustedRangeValue(0, 0, 1, 0.05, "left")).toBe(0);
    expect(adjustedRangeValue(3, 0, 10, Number.NaN, "right")).toBe(4);
  });
});
