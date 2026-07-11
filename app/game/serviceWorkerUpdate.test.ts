import { describe, expect, it, vi } from "vitest";
import {
  activateWaitingUpdate,
  type ServiceWorkerContainerLike,
  type UpdateActivationDependencies,
  type WaitingWorkerLike,
} from "./serviceWorkerUpdate";

function createHarness(waiting: WaitingWorkerLike | null) {
  const listeners = new Set<() => void>();
  const timers: Array<() => void> = [];
  const serviceWorkers: ServiceWorkerContainerLike = {
    getRegistration: vi.fn(async () => ({ waiting })),
    addEventListener: vi.fn((_type, listener) => listeners.add(listener)),
    removeEventListener: vi.fn((_type, listener) => listeners.delete(listener)),
  };
  const dependencies: UpdateActivationDependencies = {
    serviceWorkers,
    reload: vi.fn(),
    setTimer: vi.fn((callback) => {
      timers.push(callback);
      return 1 as unknown as ReturnType<typeof globalThis.setTimeout>;
    }),
    clearTimer: vi.fn(),
  };
  const dispatchControllerChange = () => {
    for (const listener of [...listeners]) listener();
  };
  return { dependencies, dispatchControllerChange, listeners, timers };
}

describe("service-worker update activation", () => {
  it("reloads directly when no waiting worker remains", async () => {
    const { dependencies } = createHarness(null);
    await expect(activateWaitingUpdate(dependencies)).resolves.toBe(
      "reload-requested",
    );
    expect(dependencies.reload).toHaveBeenCalledOnce();
  });

  it("activates, cleans up, and reloads on controller change", async () => {
    const waiting = { postMessage: vi.fn() };
    const { dependencies, dispatchControllerChange, listeners } =
      createHarness(waiting);
    const result = activateWaitingUpdate(dependencies);
    await Promise.resolve();
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    expect(listeners.size).toBe(1);

    dispatchControllerChange();
    await expect(result).resolves.toBe("activated");
    expect(listeners.size).toBe(0);
    expect(dependencies.clearTimer).toHaveBeenCalledOnce();
    expect(dependencies.reload).toHaveBeenCalledOnce();
  });

  it("times out cleanly without arming a later surprise reload", async () => {
    const waiting = { postMessage: vi.fn() };
    const { dependencies, dispatchControllerChange, listeners, timers } =
      createHarness(waiting);
    const result = activateWaitingUpdate(dependencies, 25);
    await Promise.resolve();
    timers[0]();

    await expect(result).resolves.toBe("timed-out");
    expect(listeners.size).toBe(0);
    dispatchControllerChange();
    expect(dependencies.reload).not.toHaveBeenCalled();
  });

  it("bounds registration lookup and ignores a worker that arrives late", async () => {
    const waiting = { postMessage: vi.fn() };
    const harness = createHarness(null);
    let resolveRegistration:
      | ((registration: { waiting: WaitingWorkerLike }) => void)
      | undefined;
    harness.dependencies.serviceWorkers.getRegistration = vi.fn(
      () => new Promise<{ waiting: WaitingWorkerLike }>((resolve) => {
        resolveRegistration = resolve;
      }),
    );

    const result = activateWaitingUpdate(harness.dependencies, 25);
    harness.timers[0]();
    await expect(result).resolves.toBe("timed-out");

    resolveRegistration?.({ waiting });
    await Promise.resolve();
    expect(waiting.postMessage).not.toHaveBeenCalled();
    expect(harness.dependencies.reload).not.toHaveBeenCalled();
    expect(harness.listeners.size).toBe(0);
  });

  it("contains registration and activation failures", async () => {
    const registrationFailure = createHarness(null).dependencies;
    registrationFailure.serviceWorkers.getRegistration = vi.fn(() => {
      throw new Error("registration unavailable");
    });
    await expect(activateWaitingUpdate(registrationFailure)).resolves.toBe(
      "failed",
    );

    const waiting = {
      postMessage: vi.fn(() => {
        throw new Error("worker detached");
      }),
    };
    const activationFailure = createHarness(waiting);
    await expect(
      activateWaitingUpdate(activationFailure.dependencies),
    ).resolves.toBe("failed");
    expect(activationFailure.listeners.size).toBe(0);

    const timerFailure = createHarness(null).dependencies;
    timerFailure.setTimer = vi.fn(() => {
      throw new Error("timer unavailable");
    });
    await expect(activateWaitingUpdate(timerFailure)).resolves.toBe("failed");
    expect(timerFailure.serviceWorkers.getRegistration).not.toHaveBeenCalled();
  });
});
