import { useEffect, type RefObject } from "react";
import type { InputMethod } from "./game/contracts";
import {
  adjustedRangeValue,
  advanceDirectionRepeat,
  createDirectionRepeatState,
  createSuppressedDirectionRepeatState,
  firstConnectedGamepad,
  GamepadSessionGuard,
  nextDialogFocusIndex,
  readGamepadFrame,
} from "./game/input";

const DIALOG_CONTROLS =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const PAGE_CONTROLS =
  'main button:not([disabled]), main a[href], main input:not([disabled]), main [tabindex]:not([tabindex="-1"])';

function connectedGamepad(): Gamepad | undefined {
  return firstConnectedGamepad(navigator.getGamepads?.() ?? []);
}

function observeInputInterruptions(interrupt: () => void): () => void {
  document.addEventListener("visibilitychange", interrupt);
  window.addEventListener("blur", interrupt);
  window.addEventListener("pagehide", interrupt);
  window.addEventListener("gamepadconnected", interrupt);
  window.addEventListener("gamepaddisconnected", interrupt);
  return () => {
    document.removeEventListener("visibilitychange", interrupt);
    window.removeEventListener("blur", interrupt);
    window.removeEventListener("pagehide", interrupt);
    window.removeEventListener("gamepadconnected", interrupt);
    window.removeEventListener("gamepaddisconnected", interrupt);
  };
}

function visibleControls(root: ParentNode, selector: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (element) =>
      !element.hidden &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.getClientRects().length > 0,
  );
}

export function useDialogGamepadNavigation(
  dialogRef: RefObject<HTMLDialogElement | null>,
  onClose: () => void,
): void {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const gamepadSession = new GamepadSessionGuard();
    let actionHeld = false;
    let cancelHeld = false;
    let repeat = createDirectionRepeatState();
    let gamepadFrame = 0;

    const pollGamepad = (time: number) => {
      const gamepad = connectedGamepad();
      if (!gamepad) {
        gamepadSession.disconnect();
        actionHeld = false;
        cancelHeld = false;
        repeat = createDirectionRepeatState();
      } else {
        const frame = readGamepadFrame(gamepad);
        if (gamepadSession.shouldSuppressFrame(gamepad.index)) {
          actionHeld = frame.action;
          cancelHeld = frame.describe;
          repeat = createSuppressedDirectionRepeatState(frame.direction);
        } else {
          const advanced = advanceDirectionRepeat(frame.direction, time, repeat);
          repeat = advanced.state;
          if (advanced.move) {
            const active = document.activeElement;
            const focusable = visibleControls(dialog, DIALOG_CONTROLS);
            if (
              active instanceof HTMLInputElement &&
              active.type === "range" &&
              (advanced.move === "left" || advanced.move === "right")
            ) {
              const nextValue = adjustedRangeValue(
                Number(active.value),
                Number(active.min || 0),
                Number(active.max || 100),
                Number(active.step || 1),
                advanced.move,
              );
              const valueSetter = Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value",
              )?.set;
              if (valueSetter) valueSetter.call(active, String(nextValue));
              else active.value = String(nextValue);
              active.dispatchEvent(new Event("input", { bubbles: true }));
              active.dispatchEvent(new Event("change", { bubbles: true }));
            } else if (
              focusable.length <= 1 &&
              (advanced.move === "up" || advanced.move === "down")
            ) {
              dialog.querySelector<HTMLElement>(".modal-panel")?.scrollBy({
                top: advanced.move === "up" ? -180 : 180,
                behavior: "auto",
              });
            } else {
              const currentIndex = focusable.indexOf(active as HTMLElement);
              const next = focusable[
                nextDialogFocusIndex(
                  focusable.length,
                  currentIndex,
                  advanced.move,
                )
              ];
              next?.focus({ preventScroll: true });
              next?.scrollIntoView({ block: "nearest" });
            }
          }
          if (frame.describe && !cancelHeld) {
            onClose();
            return;
          }
          if (frame.action && !actionHeld) {
            const active = document.activeElement;
            if (active instanceof HTMLElement && dialog.contains(active)) {
              active.click();
            }
          }
          actionHeld = frame.action;
          cancelHeld = frame.describe;
        }
      }
      gamepadFrame = window.requestAnimationFrame(pollGamepad);
    };

    const stopObserving = observeInputInterruptions(() => {
      gamepadSession.interrupt();
    });
    gamepadFrame = window.requestAnimationFrame(pollGamepad);
    return () => {
      stopObserving();
      window.cancelAnimationFrame(gamepadFrame);
    };
  }, [dialogRef, onClose]);
}

export function usePageGamepadNavigation({
  enabled,
  onInputMethod,
  onMemories,
  onSettings,
}: {
  enabled: boolean;
  onInputMethod(method: InputMethod): void;
  onMemories(): void;
  onSettings(): void;
}): void {
  useEffect(() => {
    if (!enabled) return;
    const gamepadSession = new GamepadSessionGuard();
    let actionHeld = false;
    let memoriesHeld = false;
    let menuHeld = false;
    let repeat = createDirectionRepeatState();
    let gamepadFrame = 0;

    const controls = () => visibleControls(document, PAGE_CONTROLS);
    const pollGamepad = (time: number) => {
      const gamepad = connectedGamepad();
      if (!gamepad) {
        gamepadSession.disconnect();
        actionHeld = false;
        memoriesHeld = false;
        menuHeld = false;
        repeat = createDirectionRepeatState();
      } else {
        const frame = readGamepadFrame(gamepad);
        if (gamepadSession.shouldSuppressFrame(gamepad.index)) {
          actionHeld = frame.action;
          memoriesHeld = frame.memories;
          menuHeld = frame.menu;
          repeat = createSuppressedDirectionRepeatState(frame.direction);
        } else {
          if (frame.direction || frame.action || frame.memories || frame.menu) {
            onInputMethod("gamepad");
          }
          const advanced = advanceDirectionRepeat(frame.direction, time, repeat);
          repeat = advanced.state;
          if (advanced.move) {
            const focusable = controls();
            const active = document.activeElement as HTMLElement;
            const currentIndex = focusable.indexOf(active);
            if (currentIndex < 0) {
              const preferred = document.querySelector<HTMLElement>(
                "[data-controller-default]",
              );
              (preferred && focusable.includes(preferred)
                ? preferred
                : focusable[0]
              )?.focus({ preventScroll: true });
            } else {
              const next = focusable[
                nextDialogFocusIndex(
                  focusable.length,
                  currentIndex,
                  advanced.move,
                )
              ];
              next?.focus({ preventScroll: true });
              next?.scrollIntoView({ block: "nearest" });
            }
          }
          if (frame.memories && !memoriesHeld) {
            onMemories();
            return;
          }
          if (frame.menu && !menuHeld) {
            onSettings();
            return;
          }
          if (frame.action && !actionHeld) {
            const focusable = controls();
            const active = document.activeElement;
            const target = active instanceof HTMLElement && focusable.includes(active)
              ? active
              : document.querySelector<HTMLElement>("[data-controller-default]") ??
                focusable[0];
            target?.focus({ preventScroll: true });
            target?.click();
          }
          actionHeld = frame.action;
          memoriesHeld = frame.memories;
          menuHeld = frame.menu;
        }
      }
      gamepadFrame = window.requestAnimationFrame(pollGamepad);
    };

    const stopObserving = observeInputInterruptions(() => {
      gamepadSession.interrupt();
    });
    gamepadFrame = window.requestAnimationFrame(pollGamepad);
    return () => {
      stopObserving();
      window.cancelAnimationFrame(gamepadFrame);
    };
  }, [enabled, onInputMethod, onMemories, onSettings]);
}
