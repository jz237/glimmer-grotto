import { describe, expect, it, vi } from "vitest";
import {
  RuntimeHandleController,
  type RuntimeHandleDependencies,
} from "./runtimeHandle";

function createHarness(
  overrides: Partial<RuntimeHandleDependencies<string>> = {},
) {
  const dependencies: RuntimeHandleDependencies<string> = {
    canDispatch: vi.fn(() => true),
    dispatch: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    shutdownScene: vi.fn(),
    destroyRenderer: vi.fn(),
    ...overrides,
  };
  return {
    controller: new RuntimeHandleController(dependencies),
    dependencies,
  };
}

describe("mounted game runtime handle", () => {
  it("admits active commands and respects scene dispatch eligibility", () => {
    const active = createHarness();
    expect(active.controller.dispatch("move")).toBe(true);
    expect(active.dependencies.dispatch).toHaveBeenCalledWith("move");

    const paused = createHarness({ canDispatch: vi.fn(() => false) });
    expect(paused.controller.dispatch("move")).toBe(false);
    expect(paused.dependencies.dispatch).not.toHaveBeenCalled();
  });

  it("contains dispatch and pause boundary failures", () => {
    const { controller } = createHarness({
      canDispatch: vi.fn(() => {
        throw new Error("scene detached");
      }),
      pause: vi.fn(() => {
        throw new Error("pause failed");
      }),
    });
    expect(controller.dispatch("move")).toBe(false);
    expect(controller.pause()).toBe(false);
  });

  it("applies pause and resume only once per state transition", () => {
    const { controller, dependencies } = createHarness();
    expect(controller.resume()).toBe(true);
    expect(dependencies.resume).not.toHaveBeenCalled();

    expect(controller.pause()).toBe(true);
    expect(controller.pause()).toBe(true);
    expect(dependencies.pause).toHaveBeenCalledOnce();

    expect(controller.resume()).toBe(true);
    expect(controller.resume()).toBe(true);
    expect(dependencies.resume).toHaveBeenCalledOnce();
  });

  it("does not latch a failed pause and allows the policy to retry", () => {
    const pause = vi.fn()
      .mockImplementationOnce(() => {
        throw new Error("scene was still booting");
      })
      .mockImplementationOnce(() => undefined);
    const { controller } = createHarness({ pause });
    expect(controller.pause()).toBe(false);
    expect(controller.pause()).toBe(true);
    expect(controller.pause()).toBe(true);
    expect(pause).toHaveBeenCalledTimes(2);
  });

  it("does not latch an explicitly deferred scene transition", () => {
    const pause = vi.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const { controller } = createHarness({ pause });
    expect(controller.pause()).toBe(false);
    expect(controller.pause()).toBe(true);
    expect(controller.pause()).toBe(true);
    expect(pause).toHaveBeenCalledTimes(2);
  });

  it("keeps a failed resume paused and retryable", () => {
    const resume = vi.fn()
      .mockImplementationOnce(() => {
        throw new Error("scene resume deferred");
      })
      .mockImplementationOnce(() => undefined);
    const { controller } = createHarness({ resume });
    expect(controller.pause()).toBe(true);
    expect(controller.resume()).toBe(false);
    expect(controller.resume()).toBe(true);
    expect(controller.resume()).toBe(true);
    expect(resume).toHaveBeenCalledTimes(2);
  });

  it("always destroys the renderer when scene shutdown throws", () => {
    const { controller, dependencies } = createHarness({
      shutdownScene: vi.fn(() => {
        throw new Error("partial scene");
      }),
    });
    expect(controller.destroy()).toBe(true);
    expect(dependencies.shutdownScene).toHaveBeenCalledOnce();
    expect(dependencies.destroyRenderer).toHaveBeenCalledOnce();
  });

  it("makes destroy terminal and rejects every later operation", () => {
    const { controller, dependencies } = createHarness({
      destroyRenderer: vi.fn(() => {
        throw new Error("renderer already gone");
      }),
    });
    expect(controller.destroy()).toBe(true);
    expect(controller.destroy()).toBe(false);
    expect(controller.dispatch("visit")).toBe(false);
    expect(controller.pause()).toBe(false);
    expect(controller.resume()).toBe(false);
    expect(dependencies.shutdownScene).toHaveBeenCalledOnce();
    expect(dependencies.destroyRenderer).toHaveBeenCalledOnce();
  });
});
