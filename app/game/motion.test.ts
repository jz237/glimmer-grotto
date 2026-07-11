import { describe, expect, it } from "vitest";
import { mothPose } from "./motion";

describe("ambient motion", () => {
  it("keeps Luma completely still when reduced motion is enabled", () => {
    expect(mothPose(0, true)).toEqual(mothPose(12_000, true));
    expect(mothPose(12_000, true)).toEqual({ x: 24, y: -22, rotation: 0 });
  });

  it("uses a bounded orbit during standard play", () => {
    const start = mothPose(0, false);
    const later = mothPose(900, false);
    expect(later).not.toEqual(start);
    expect(Math.abs(later.x)).toBeLessThanOrEqual(28);
    expect(later.y).toBeGreaterThanOrEqual(-32);
    expect(later.y).toBeLessThanOrEqual(-12);
    expect(Math.abs(later.rotation)).toBeLessThanOrEqual(0.12);
  });
});
