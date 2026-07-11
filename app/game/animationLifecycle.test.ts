import { describe, expect, it, vi } from "vitest";
import { AnimationLifecycle } from "./animationLifecycle";

describe("scene animation lifecycle", () => {
  it("admits one move and completes it exactly once", () => {
    const lifecycle = new AnimationLifecycle();
    const move = lifecycle.beginMove();
    expect(move).not.toBeNull();
    expect(lifecycle.busy).toBe(true);
    expect(lifecycle.beginMove()).toBeNull();
    expect(lifecycle.beginBump()).toBeNull();

    const complete = vi.fn();
    expect(lifecycle.complete(move!, complete)).toBe(true);
    expect(lifecycle.complete(move!, complete)).toBe(false);
    expect(complete).toHaveBeenCalledOnce();
    expect(lifecycle.busy).toBe(false);
  });

  it("prevents bump overlap and releases the scene after completion", () => {
    const lifecycle = new AnimationLifecycle();
    const bump = lifecycle.beginBump();
    expect(bump).not.toBeNull();
    expect(lifecycle.beginBump()).toBeNull();
    expect(lifecycle.beginMove()).toBeNull();
    expect(lifecycle.complete(bump!, vi.fn())).toBe(true);
    expect(lifecycle.beginMove()).not.toBeNull();
  });

  it("invalidates active motion and makes its callback stale", () => {
    const lifecycle = new AnimationLifecycle();
    const move = lifecycle.beginMove();
    const complete = vi.fn();
    expect(lifecycle.invalidate()).toEqual({ moving: true, bumping: false });
    expect(lifecycle.busy).toBe(false);
    expect(lifecycle.complete(move!, complete)).toBe(false);
    expect(complete).not.toHaveBeenCalled();
  });

  it("separates new-room callbacks from an older generation", () => {
    const lifecycle = new AnimationLifecycle();
    const oldBump = lifecycle.beginBump();
    const oldGeneration = lifecycle.snapshot();
    lifecycle.invalidate();
    const currentMove = lifecycle.beginMove();

    expect(lifecycle.isCurrent(oldGeneration)).toBe(false);
    expect(lifecycle.complete(oldBump!, vi.fn())).toBe(false);
    expect(lifecycle.complete(currentMove!, vi.fn())).toBe(true);
  });
});
