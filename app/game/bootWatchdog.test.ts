import { describe, expect, it, vi } from "vitest";
import {
  BootReadinessWatchdog,
  type BootWatchdogTimers,
} from "./bootWatchdog";

function harness(overrides: Partial<BootWatchdogTimers> = {}) {
  let callback: (() => void) | undefined;
  const timers: BootWatchdogTimers = {
    setTimer: vi.fn((next) => {
      callback = next;
      return 7 as unknown as ReturnType<typeof setTimeout>;
    }),
    clearTimer: vi.fn(),
    ...overrides,
  };
  return {
    watchdog: new BootReadinessWatchdog(timers),
    timers,
    fire: () => callback?.(),
  };
}

describe("game boot readiness watchdog", () => {
  it("publishes one bounded timeout", () => {
    const { watchdog, timers, fire } = harness();
    const timedOut = vi.fn();
    expect(watchdog.arm(12_000, timedOut)).toBe(true);
    expect(timers.setTimer).toHaveBeenCalledWith(expect.any(Function), 12_000);
    fire();
    fire();
    expect(timedOut).toHaveBeenCalledOnce();
    expect(watchdog.ready()).toBe(false);
  });

  it("cancels timeout when ready arrives", () => {
    const { watchdog, timers, fire } = harness();
    const timedOut = vi.fn();
    expect(watchdog.arm(12_000, timedOut)).toBe(true);
    expect(watchdog.ready()).toBe(true);
    expect(watchdog.ready()).toBe(false);
    expect(timers.clearTimer).toHaveBeenCalledOnce();
    fire();
    expect(timedOut).not.toHaveBeenCalled();
  });

  it("makes cleanup cancellation terminal", () => {
    const { watchdog, timers, fire } = harness();
    const timedOut = vi.fn();
    expect(watchdog.arm(12_000, timedOut)).toBe(true);
    expect(watchdog.cancel()).toBe(true);
    expect(watchdog.cancel()).toBe(false);
    expect(timers.clearTimer).toHaveBeenCalledOnce();
    fire();
    expect(timedOut).not.toHaveBeenCalled();
  });

  it("rejects invalid or repeated arms", () => {
    const first = harness();
    expect(first.watchdog.arm(0, vi.fn())).toBe(false);
    const second = harness();
    expect(second.watchdog.arm(Number.NaN, vi.fn())).toBe(false);
    const third = harness();
    expect(third.watchdog.arm(12_000, vi.fn())).toBe(true);
    expect(third.watchdog.arm(12_000, vi.fn())).toBe(false);
  });

  it("contains timer setup, cleanup, and callback failures", () => {
    const setupFailure = harness({
      setTimer: vi.fn(() => {
        throw new Error("timer unavailable");
      }),
    });
    expect(setupFailure.watchdog.arm(12_000, vi.fn())).toBe(false);

    const cleanupFailure = harness({
      clearTimer: vi.fn(() => {
        throw new Error("timer already gone");
      }),
    });
    expect(cleanupFailure.watchdog.arm(12_000, vi.fn())).toBe(true);
    expect(() => cleanupFailure.watchdog.cancel()).not.toThrow();

    const callbackFailure = harness();
    expect(
      callbackFailure.watchdog.arm(12_000, () => {
        throw new Error("recovery failed");
      }),
    ).toBe(true);
    expect(() => callbackFailure.fire()).not.toThrow();
  });
});
