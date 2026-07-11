import { describe, expect, it } from "vitest";
import {
  activateModalState,
  clearModalState,
  dismissModalState,
} from "./modalState";

type ModalId = "menu" | "settings" | "help";

describe("exclusive modal state", () => {
  it("opens a modal from the clear state", () => {
    expect(activateModalState<ModalId>(null, "menu")).toEqual({
      active: "menu",
      changed: true,
    });
  });

  it("replaces one modal atomically with another", () => {
    expect(activateModalState<ModalId>("menu", "settings")).toEqual({
      active: "settings",
      changed: true,
    });
  });

  it("treats repeated open requests as idempotent", () => {
    expect(activateModalState<ModalId>("menu", "menu")).toEqual({
      active: "menu",
      changed: false,
    });
  });

  it("dismisses only the modal that is still active", () => {
    expect(dismissModalState<ModalId>("menu", "menu")).toEqual({
      active: null,
      changed: true,
    });
  });

  it("rejects a stale close after a modal handoff", () => {
    expect(dismissModalState<ModalId>("settings", "menu")).toEqual({
      active: "settings",
      changed: false,
    });
  });

  it("rejects a close when no modal is active", () => {
    expect(dismissModalState<ModalId>(null, "help")).toEqual({
      active: null,
      changed: false,
    });
  });

  it("clears active state idempotently", () => {
    expect(clearModalState<ModalId>("help")).toEqual({
      active: null,
      changed: true,
    });
    expect(clearModalState<ModalId>(null)).toEqual({
      active: null,
      changed: false,
    });
  });
});
