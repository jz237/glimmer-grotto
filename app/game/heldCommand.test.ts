import { describe, expect, it, vi } from "vitest";
import {
  HeldCommandController,
  type HeldCommandTimers,
} from "./heldCommand";

function createHarness(overrides: Partial<HeldCommandTimers> = {}) {
  const delays: Array<() => void> = [];
  const repeats: Array<() => void> = [];
  const timers: HeldCommandTimers = {
    setDelay: vi.fn((callback) => {
      delays.push(callback);
      return 1 as unknown as ReturnType<typeof globalThis.setTimeout>;
    }),
    clearDelay: vi.fn(),
    setRepeat: vi.fn((callback) => {
      repeats.push(callback);
      return 2 as unknown as ReturnType<typeof globalThis.setTimeout>;
    }),
    clearRepeat: vi.fn(),
    ...overrides,
  };
  const execute = vi.fn<(command: string) => void>();
  const controller = new HeldCommandController(timers, execute);
  return { controller, delays, execute, repeats, timers };
}

describe("held pointer commands", () => {
  it("executes immediately, then repeats at the tuned cadence", () => {
    const { controller, delays, execute, repeats, timers } = createHarness();
    expect(controller.start(7, "right")).toBe(true);
    expect(execute).toHaveBeenCalledExactlyOnceWith("right");
    expect(timers.setDelay).toHaveBeenCalledWith(expect.any(Function), 285);

    delays[0]();
    expect(timers.setRepeat).toHaveBeenCalledWith(expect.any(Function), 135);
    repeats[0]();
    repeats[0]();
    expect(execute.mock.calls).toEqual([["right"], ["right"], ["right"]]);
  });

  it("ignores a stale pointer release while a newer touch is active", () => {
    const { controller, execute } = createHarness();
    const releaseFirst = vi.fn();
    const releaseSecond = vi.fn();
    controller.start(1, "up", releaseFirst);
    controller.start(2, "left", releaseSecond);

    expect(releaseFirst).toHaveBeenCalledOnce();
    expect(controller.stop(1)).toBe(false);
    expect(releaseSecond).not.toHaveBeenCalled();
    expect(controller.stop(2)).toBe(true);
    expect(releaseSecond).toHaveBeenCalledOnce();
    expect(execute.mock.calls).toEqual([["up"], ["left"]]);
  });

  it("makes late callbacks inert even when timer cancellation fails", () => {
    const { controller, delays, execute } = createHarness({
      clearDelay: vi.fn(() => {
        throw new Error("timer already detached");
      }),
    });
    controller.start(3, "down");
    controller.stop();
    delays[0]();
    expect(execute).toHaveBeenCalledOnce();
  });

  it("clears an active repeat and rejects its late interval callback", () => {
    const { controller, delays, execute, repeats, timers } = createHarness();
    controller.start(8, "right");
    delays[0]();
    controller.stop(8);
    expect(timers.clearRepeat).toHaveBeenCalledOnce();
    repeats[0]();
    expect(execute).toHaveBeenCalledOnce();
  });

  it("contains delay and repeat construction failures", () => {
    const delayFailure = createHarness({
      setDelay: vi.fn(() => {
        throw new Error("delay unavailable");
      }),
    });
    const releaseDelay = vi.fn();
    expect(delayFailure.controller.start(4, "up", releaseDelay)).toBe(false);
    expect(releaseDelay).toHaveBeenCalledOnce();

    const repeatFailure = createHarness({
      setRepeat: vi.fn(() => {
        throw new Error("repeat unavailable");
      }),
    });
    const releaseRepeat = vi.fn();
    expect(repeatFailure.controller.start(5, "up", releaseRepeat)).toBe(true);
    repeatFailure.delays[0]();
    expect(releaseRepeat).toHaveBeenCalledOnce();
  });

  it("stops and releases capture when command dispatch fails", () => {
    const { controller, execute } = createHarness();
    execute.mockImplementation(() => {
      throw new Error("scene unavailable");
    });
    const release = vi.fn();
    expect(controller.start(6, "left", release)).toBe(false);
    expect(release).toHaveBeenCalledOnce();
    expect(controller.stop()).toBe(false);
  });
});
