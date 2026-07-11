import { describe, expect, it } from "vitest";
import { runtimePauseReason, type RuntimePauseContext } from "./pausePolicy";

const runnable: RuntimePauseContext = {
  playing: true,
  modalOpen: false,
  pageHidden: false,
  rendererUnavailable: false,
  loadFailed: false,
};

describe("runtime pause ownership", () => {
  it("allows play only when every blocker is clear", () => {
    expect(runtimePauseReason(runnable)).toBeNull();
  });

  it("keeps non-playing screens paused", () => {
    expect(runtimePauseReason({ ...runnable, playing: false })).toBe(
      "not-playing",
    );
  });

  it("keeps an open modal paused", () => {
    expect(runtimePauseReason({ ...runnable, modalOpen: true })).toBe("modal");
  });

  it("keeps a hidden page paused after its modal closes", () => {
    expect(runtimePauseReason({ ...runnable, pageHidden: true })).toBe(
      "page-hidden",
    );
  });

  it("keeps a failed load paused", () => {
    expect(runtimePauseReason({ ...runnable, loadFailed: true })).toBe(
      "load-error",
    );
  });

  it("keeps an unavailable renderer paused", () => {
    expect(
      runtimePauseReason({ ...runnable, rendererUnavailable: true }),
    ).toBe("renderer-unavailable");
  });

  it("uses stable blocker precedence for combined transitions", () => {
    expect(
      runtimePauseReason({
        playing: false,
        modalOpen: true,
        pageHidden: true,
        rendererUnavailable: true,
        loadFailed: true,
      }),
    ).toBe("not-playing");
    expect(
      runtimePauseReason({
        playing: true,
        modalOpen: true,
        pageHidden: true,
        rendererUnavailable: true,
        loadFailed: true,
      }),
    ).toBe("modal");
  });
});
