import { describe, expect, it, vi } from "vitest";
import {
  alternateRendererMode,
  recommendedRendererMode,
  RendererContextGuard,
  WEBGL_LOSS_FALLBACK_THRESHOLD,
} from "./rendererContext";

describe("renderer recovery policy", () => {
  it("always offers the renderer not used by the failed attempt", () => {
    expect(alternateRendererMode("auto")).toBe("canvas");
    expect(alternateRendererMode("canvas")).toBe("auto");
  });

  it("retries the normal renderer after one isolated loss", () => {
    expect(recommendedRendererMode(1, false)).toBe("auto");
  });

  it("switches to Canvas after the bounded loss threshold", () => {
    expect(WEBGL_LOSS_FALLBACK_THRESHOLD).toBe(2);
    expect(
      recommendedRendererMode(WEBGL_LOSS_FALLBACK_THRESHOLD, false),
    ).toBe("canvas");
    expect(recommendedRendererMode(8, false)).toBe("canvas");
  });

  it("switches to Canvas immediately after redraw failure", () => {
    expect(recommendedRendererMode(1, true)).toBe("canvas");
  });

  it("does not force fallback from an invalid external count", () => {
    expect(recommendedRendererMode(Number.NaN, false)).toBe("auto");
    expect(recommendedRendererMode(Number.POSITIVE_INFINITY, false)).toBe(
      "auto",
    );
  });
});

describe("renderer context lifecycle", () => {
  it("opts an admitted browser loss into later restoration", () => {
    const guard = new RendererContextGuard();
    const event = { preventDefault: vi.fn() };
    expect(guard.lose(event)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(guard.lose(event)).toBe(false);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(guard.restore()).toBe(true);
  });

  it("keeps manual recovery available when loss cancellation throws", () => {
    const guard = new RendererContextGuard();
    expect(
      guard.lose({
        preventDefault() {
          throw new Error("event already detached");
        },
      }),
    ).toBe(true);
    expect(guard.restore()).toBe(true);
  });

  it("admits one loss and one matching restoration", () => {
    const guard = new RendererContextGuard();
    expect(guard.lose()).toBe(true);
    expect(guard.restore()).toBe(true);
  });

  it("ignores repeated loss notifications", () => {
    const guard = new RendererContextGuard();
    expect(guard.lose()).toBe(true);
    expect(guard.lose()).toBe(false);
    expect(guard.restore()).toBe(true);
  });

  it("ignores a restoration without an owned loss", () => {
    const guard = new RendererContextGuard();
    expect(guard.restore()).toBe(false);
  });

  it("makes destruction terminal for late browser events", () => {
    const guard = new RendererContextGuard();
    expect(guard.lose()).toBe(true);
    expect(guard.destroy()).toBe(true);
    expect(guard.destroy()).toBe(false);
    expect(guard.restore()).toBe(false);
    expect(guard.lose()).toBe(false);
  });
});
