import { describe, expect, it, vi } from "vitest";
import {
  advanceFocusSafely,
  firstRestorableFocusTarget,
  isFocusWithinSafely,
  isRestorableFocusTarget,
  restoreFocusSafely,
  type FocusTargetLike,
} from "./focus";

function target(overrides: Partial<FocusTargetLike> = {}): FocusTargetLike {
  return {
    isConnected: true,
    hidden: false,
    disabled: false,
    inert: false,
    tabIndex: 0,
    getAttribute: vi.fn(() => null),
    closest: vi.fn(() => null),
    getClientRects: vi.fn(() => [{}]),
    focus: vi.fn(),
    ...overrides,
  };
}

describe("modal focus restoration", () => {
  it("restores the connected visible invoking control", () => {
    const previous = target();
    const fallback = target();
    expect(restoreFocusSafely(previous, fallback)).toBe("previous");
    expect(previous.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(fallback.focus).not.toHaveBeenCalled();
  });

  it.each([
    ["detached", { isConnected: false }],
    ["hidden", { hidden: true }],
    ["disabled", { disabled: true }],
    ["inert", { inert: true }],
    ["not tabbable", { tabIndex: -1 }],
    ["without layout", { getClientRects: vi.fn(() => []) }],
  ] as const)("uses the fallback when the prior target is %s", (_name, state) => {
    const previous = target(state);
    const fallback = target();
    expect(restoreFocusSafely(previous, fallback)).toBe("fallback");
    expect(fallback.focus).toHaveBeenCalledOnce();
  });

  it("rejects aria-hidden targets and targets inside blocked ancestors", () => {
    expect(
      isRestorableFocusTarget(
        target({ getAttribute: vi.fn(() => "true") }),
      ),
    ).toBe(false);
    expect(
      isRestorableFocusTarget(target({ closest: vi.fn(() => ({})) })),
    ).toBe(false);
  });

  it("falls back when restoring the previous target throws", () => {
    const previous = target({
      focus: vi.fn(() => {
        throw new Error("element disappeared");
      }),
    });
    const fallback = target();
    expect(restoreFocusSafely(previous, fallback)).toBe("fallback");
    expect(fallback.focus).toHaveBeenCalledOnce();
  });

  it("returns none when neither target can safely receive focus", () => {
    const detached = target({ isConnected: false });
    expect(restoreFocusSafely(detached, detached)).toBe("none");
  });

  it("skips blocked fallback candidates in document order", () => {
    const visible = target();
    expect(
      firstRestorableFocusTarget([
        target({ isConnected: false }),
        target({ disabled: true }),
        visible,
      ]),
    ).toBe(visible);
  });
});

describe("modal focus containment", () => {
  it("recognizes contained focus without trusting a throwing DOM boundary", () => {
    const node = {} as Node;
    expect(
      isFocusWithinSafely({ contains: vi.fn(() => true) }, node),
    ).toBe(true);
    expect(
      isFocusWithinSafely({ contains: vi.fn(() => false) }, node),
    ).toBe(false);
    expect(
      isFocusWithinSafely(
        {
          contains: vi.fn(() => {
            throw new Error("detached container");
          }),
        },
        node,
      ),
    ).toBe(false);
    expect(
      isFocusWithinSafely({ contains: vi.fn(() => true) }, null),
    ).toBe(false);
  });

  it("moves forward through eligible targets", () => {
    const first = target();
    const second = target();
    expect(advanceFocusSafely([first, second], first)).toBe("focused");
    expect(second.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("wraps forward from the last target", () => {
    const first = target();
    const last = target();
    expect(advanceFocusSafely([first, last], last)).toBe("focused");
    expect(first.focus).toHaveBeenCalledOnce();
  });

  it("wraps backward from the first target", () => {
    const first = target();
    const last = target();
    expect(advanceFocusSafely([first, last], first, true)).toBe("focused");
    expect(last.focus).toHaveBeenCalledOnce();
  });

  it("enters at the matching edge when focus starts outside", () => {
    const first = target();
    const last = target();
    const outside = target();
    expect(advanceFocusSafely([first, last], outside)).toBe("focused");
    expect(first.focus).toHaveBeenCalledOnce();

    vi.mocked(first.focus).mockClear();
    expect(advanceFocusSafely([first, last], outside, true)).toBe("focused");
    expect(last.focus).toHaveBeenCalledOnce();
  });

  it("skips blocked targets without changing document order", () => {
    const first = target();
    const hidden = target({ hidden: true });
    const disabled = target({ disabled: true });
    const last = target();
    expect(
      advanceFocusSafely([first, hidden, disabled, last], first),
    ).toBe("focused");
    expect(last.focus).toHaveBeenCalledOnce();
  });

  it("keeps cycling after a target focus method throws", () => {
    const first = target();
    const throwing = target({
      focus: vi.fn(() => {
        throw new Error("focus rejected");
      }),
    });
    const last = target();
    expect(advanceFocusSafely([first, throwing, last], first)).toBe("focused");
    expect(throwing.focus).toHaveBeenCalledOnce();
    expect(last.focus).toHaveBeenCalledOnce();
  });

  it("reports empty and fully failed cycles without throwing", () => {
    expect(advanceFocusSafely([], null)).toBe("empty");
    const throwing = target({
      focus: vi.fn(() => {
        throw new Error("focus rejected");
      }),
    });
    expect(advanceFocusSafely([throwing], null)).toBe("failed");
  });
});
