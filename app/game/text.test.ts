import { describe, expect, it } from "vitest";
import { LARGE_TEXT_SCALE, gameTextSize } from "./text";

describe("accessible canvas text", () => {
  it("keeps standard labels unchanged", () => {
    expect(gameTextSize(13, false)).toBe("13px");
    expect(gameTextSize(27, false)).toBe("27px");
  });

  it("scales and rounds every canvas label consistently", () => {
    expect(LARGE_TEXT_SCALE).toBe(1.2);
    expect(gameTextSize(13, true)).toBe("16px");
    expect(gameTextSize(16, true)).toBe("19px");
    expect(gameTextSize(27, true)).toBe("32px");
  });
});
