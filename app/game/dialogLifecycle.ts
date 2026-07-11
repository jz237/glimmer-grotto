export interface DialogLifecycleTarget {
  readonly open: boolean;
  showModal?: () => void;
  close?: () => void;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

export type DialogOpenMode = "modal" | "existing" | "attribute" | "failed";
export type DialogCloseMode = "closed" | "attribute" | "already-closed" | "failed";

export function openDialogSafely(
  dialog: DialogLifecycleTarget,
): DialogOpenMode {
  if (dialog.open) return "existing";
  if (typeof dialog.showModal === "function") {
    try {
      dialog.showModal();
      if (dialog.open) return "modal";
    } catch {
      // Fall through to a non-native open attribute.
    }
  }
  try {
    dialog.setAttribute("open", "");
    return "attribute";
  } catch {
    return "failed";
  }
}

export function closeDialogSafely(
  dialog: DialogLifecycleTarget,
): DialogCloseMode {
  if (!dialog.open) {
    try {
      dialog.removeAttribute("open");
      return "already-closed";
    } catch {
      return "failed";
    }
  }

  if (typeof dialog.close === "function") {
    try {
      dialog.close();
      return "closed";
    } catch {
      // Removing the fallback attribute still clears a broken open surface.
    }
  }
  try {
    dialog.removeAttribute("open");
    return "attribute";
  } catch {
    return "failed";
  }
}
