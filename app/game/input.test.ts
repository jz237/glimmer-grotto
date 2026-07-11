import { describe, expect, it } from "vitest";
import {
  GAMEPAD_INITIAL_REPEAT_MS,
  GAMEPAD_REPEAT_MS,
  GamepadSessionGuard,
  KeyboardSessionGuard,
  adjustedRangeValue,
  advanceDirectionRepeat,
  createDirectionRepeatState,
  createSuppressedDirectionRepeatState,
  firstConnectedGamepad,
  gamepadMenuRequest,
  keyboardInputDecision,
  nextDialogFocusIndex,
  pointerGridCell,
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

function keyboard(
  code: string,
  overrides: Partial<Parameters<typeof keyboardInputDecision>[0]> = {},
) {
  return {
    code,
    repeat: false,
    isComposing: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    ...overrides,
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

  it("suppresses the first frame after interruption or controller identity changes", () => {
    const guard = new GamepadSessionGuard();
    expect(guard.shouldSuppressFrame(0)).toBe(true);
    expect(guard.shouldSuppressFrame(0)).toBe(false);

    guard.interrupt();
    expect(guard.shouldSuppressFrame(0)).toBe(true);
    expect(guard.shouldSuppressFrame(0)).toBe(false);

    expect(guard.shouldSuppressFrame(2)).toBe(true);
    expect(guard.shouldSuppressFrame(2)).toBe(false);

    guard.disconnect();
    expect(guard.shouldSuppressFrame(2)).toBe(true);
  });

  it("keeps keyboard and controller input neutral through repeated blockers", () => {
    const keyboardGuard = new KeyboardSessionGuard();
    expect(keyboardGuard.admit("KeyW", false, true)).toBe(true);
    keyboardGuard.interrupt();
    keyboardGuard.interrupt();
    expect(keyboardGuard.admit("KeyW", true, true)).toBe(false);

    const gamepadGuard = new GamepadSessionGuard();
    expect(gamepadGuard.shouldSuppressFrame(0)).toBe(true);
    gamepadGuard.interrupt();
    gamepadGuard.interrupt();
    expect(gamepadGuard.shouldSuppressFrame(0)).toBe(true);
    expect(gamepadGuard.shouldSuppressFrame(0)).toBe(false);

    const held = createSuppressedDirectionRepeatState("left");
    expect(advanceDirectionRepeat("left", 20_000, held).move).toBeNull();
    const neutral = advanceDirectionRepeat(null, 20_001, held);
    expect(advanceDirectionRepeat("left", 20_002, neutral.state).move).toBe(
      "left",
    );
  });

  it("skips stale disconnected slots when choosing a controller", () => {
    const disconnected = { ...gamepad(), index: 0, connected: false };
    const connected = { ...gamepad(), index: 1, connected: true };
    expect(firstConnectedGamepad([disconnected, null, connected])).toBe(connected);
    expect(firstConnectedGamepad([disconnected, null])).toBeUndefined();
  });

  it("maps keyboard commands and reserves scrolling keys", () => {
    expect(keyboardInputDecision(keyboard("ArrowUp"))).toEqual({
      intent: { type: "move", dx: 0, dy: -1 },
      preventDefault: true,
    });
    expect(keyboardInputDecision(keyboard("KeyD"))?.intent).toEqual({
      type: "move",
      dx: 1,
      dy: 0,
    });
    expect(keyboardInputDecision(keyboard("Space"))).toEqual({
      intent: { type: "interact" },
      preventDefault: true,
    });
    expect(keyboardInputDecision(keyboard("KeyR"))?.intent).toEqual({
      type: "reset",
    });
    expect(keyboardInputDecision(keyboard("KeyM"))?.intent).toEqual({
      type: "openMap",
    });
    expect(keyboardInputDecision(keyboard("KeyQ"))).toBeNull();
  });

  it("rejects browser shortcuts, composition, and already-handled keys", () => {
    expect(keyboardInputDecision(keyboard("KeyR", { ctrlKey: true }))).toBeNull();
    expect(keyboardInputDecision(keyboard("KeyW", { metaKey: true }))).toBeNull();
    expect(keyboardInputDecision(keyboard("ArrowLeft", { altKey: true }))).toBeNull();
    expect(keyboardInputDecision(keyboard("KeyE", { isComposing: true }))).toBeNull();
    expect(keyboardInputDecision(keyboard("KeyE", { keyCode: 229 }))).toBeNull();
    expect(
      keyboardInputDecision(keyboard("Space", { defaultPrevented: true })),
    ).toBeNull();
  });

  it("admits movement repeat only after a fresh focused keydown", () => {
    const guard = new KeyboardSessionGuard();
    expect(guard.admit("KeyW", false, true)).toBe(true);
    expect(guard.admit("KeyW", false, true)).toBe(false);
    expect(guard.admit("KeyW", true, true)).toBe(true);
    expect(guard.admit("KeyE", false, false)).toBe(true);
    expect(guard.admit("KeyE", true, false)).toBe(false);

    guard.release("KeyW");
    expect(guard.admit("KeyW", true, true)).toBe(false);
    expect(guard.admit("KeyW", false, true)).toBe(true);
    guard.interrupt();
    expect(guard.admit("KeyW", true, true)).toBe(false);
  });

  it("maps finite primary world coordinates to bounded grid cells", () => {
    const geometry = {
      left: 120,
      top: 54,
      cellSize: 48,
      minX: 1,
      maxX: 13,
      minY: 1,
      maxY: 7,
    };
    const primary = { button: 0, primaryDown: true };
    expect(
      pointerGridCell(
        { ...primary, worldX: 120 + 4 * 48 + 24, worldY: 54 + 3 * 48 + 24 },
        geometry,
      ),
    ).toEqual({ x: 4, y: 3 });
    expect(
      pointerGridCell(
        { ...primary, worldX: 120 + 48, worldY: 54 + 48 },
        geometry,
      ),
    ).toEqual({ x: 1, y: 1 });
    expect(
      pointerGridCell(
        { ...primary, worldX: 120 + 14 * 48 - 0.001, worldY: 54 + 8 * 48 - 0.001 },
        geometry,
      ),
    ).toEqual({ x: 13, y: 7 });
  });

  it("rejects secondary, released, invalid, and out-of-grid pointer samples", () => {
    const geometry = {
      left: 120,
      top: 54,
      cellSize: 48,
      minX: 1,
      maxX: 13,
      minY: 1,
      maxY: 7,
    };
    const sample = { worldX: 216, worldY: 150, button: 0, primaryDown: true };
    expect(pointerGridCell({ ...sample, button: 2 }, geometry)).toBeNull();
    expect(pointerGridCell({ ...sample, primaryDown: false }, geometry)).toBeNull();
    expect(pointerGridCell({ ...sample, worldX: Number.NaN }, geometry)).toBeNull();
    expect(pointerGridCell({ ...sample, worldY: Number.POSITIVE_INFINITY }, geometry)).toBeNull();
    expect(pointerGridCell({ ...sample, worldX: 120 + 14 * 48 }, geometry)).toBeNull();
    expect(pointerGridCell(sample, { ...geometry, cellSize: 0 })).toBeNull();
  });

  it("adjusts controller-operated ranges by their declared step and clamps", () => {
    expect(adjustedRangeValue(0.5, 0, 1, 0.05, "right")).toBe(0.55);
    expect(adjustedRangeValue(0.5, 0, 1, 0.05, "left")).toBe(0.45);
    expect(adjustedRangeValue(1, 0, 1, 0.05, "right")).toBe(1);
    expect(adjustedRangeValue(0, 0, 1, 0.05, "left")).toBe(0);
    expect(adjustedRangeValue(3, 0, 10, Number.NaN, "right")).toBe(4);
  });
});
