import { describe, expect, it, vi } from "vitest";
import {
  closeDialogSafely,
  openDialogSafely,
  type DialogLifecycleTarget,
} from "./dialogLifecycle";

function dialog(
  overrides: Partial<DialogLifecycleTarget> = {},
): DialogLifecycleTarget {
  let open = false;
  return {
    get open() {
      return open;
    },
    showModal: vi.fn(() => {
      open = true;
    }),
    close: vi.fn(() => {
      open = false;
    }),
    setAttribute: vi.fn((name) => {
      if (name === "open") open = true;
    }),
    removeAttribute: vi.fn((name) => {
      if (name === "open") open = false;
    }),
    ...overrides,
  };
}

describe("native dialog lifecycle", () => {
  it("opens a closed dialog modally", () => {
    const target = dialog();
    expect(openDialogSafely(target)).toBe("modal");
    expect(target.showModal).toHaveBeenCalledOnce();
  });

  it("does not reopen a dialog that is already open", () => {
    const target = dialog({ open: true });
    expect(openDialogSafely(target)).toBe("existing");
    expect(target.showModal).not.toHaveBeenCalled();
  });

  it("falls back to the open attribute when showModal throws", () => {
    const target = dialog({
      showModal: vi.fn(() => {
        throw new Error("top layer unavailable");
      }),
    });
    expect(openDialogSafely(target)).toBe("attribute");
    expect(target.setAttribute).toHaveBeenCalledWith("open", "");
  });

  it("falls back when showModal is missing or does not open", () => {
    const missing = dialog({ showModal: undefined });
    expect(openDialogSafely(missing)).toBe("attribute");
    const partial = dialog({ showModal: vi.fn() });
    expect(openDialogSafely(partial)).toBe("attribute");
  });

  it("reports failure when neither native nor attribute open succeeds", () => {
    const target = dialog({
      showModal: vi.fn(() => {
        throw new Error("native failed");
      }),
      setAttribute: vi.fn(() => {
        throw new Error("attribute failed");
      }),
    });
    expect(openDialogSafely(target)).toBe("failed");
  });

  it("closes an open native dialog", () => {
    const target = dialog({ open: true });
    expect(closeDialogSafely(target)).toBe("closed");
    expect(target.close).toHaveBeenCalledOnce();
  });

  it("removes the open attribute when native close throws or is missing", () => {
    const throwing = dialog({
      open: true,
      close: vi.fn(() => {
        throw new Error("close failed");
      }),
    });
    expect(closeDialogSafely(throwing)).toBe("attribute");
    expect(throwing.removeAttribute).toHaveBeenCalledWith("open");

    const missing = dialog({ open: true, close: undefined });
    expect(closeDialogSafely(missing)).toBe("attribute");
  });

  it("contains close failure and handles an already-closed dialog", () => {
    const closed = dialog();
    expect(closeDialogSafely(closed)).toBe("already-closed");
    const broken = dialog({
      open: true,
      close: undefined,
      removeAttribute: vi.fn(() => {
        throw new Error("detached");
      }),
    });
    expect(closeDialogSafely(broken)).toBe("failed");
  });
});
