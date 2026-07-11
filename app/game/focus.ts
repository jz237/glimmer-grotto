export interface FocusTargetLike {
  readonly isConnected: boolean;
  readonly hidden?: boolean;
  readonly disabled?: boolean;
  readonly inert?: boolean;
  readonly tabIndex?: number;
  getAttribute(name: string): string | null;
  closest(selector: string): unknown | null;
  getClientRects(): ArrayLike<unknown>;
  focus(options?: FocusOptions): void;
}

export interface FocusContainerLike {
  contains(target: Node | null): boolean;
}

export type FocusRestoreResult = "previous" | "fallback" | "none";
export type FocusAdvanceResult = "focused" | "empty" | "failed";

export function isFocusWithinSafely(
  container: FocusContainerLike,
  target: Node | null | undefined,
): boolean {
  if (!target) return false;
  try {
    return container.contains(target);
  } catch {
    return false;
  }
}

export function isRestorableFocusTarget(
  target: FocusTargetLike | null | undefined,
): target is FocusTargetLike {
  if (!target) return false;
  try {
    if (
      !target.isConnected ||
      target.hidden ||
      target.disabled ||
      target.inert ||
      (target.tabIndex !== undefined && target.tabIndex < 0)
    ) {
      return false;
    }
    if (target.getAttribute("aria-hidden") === "true") return false;
    if (target.closest('[inert], [aria-hidden="true"]')) return false;
    return target.getClientRects().length > 0;
  } catch {
    return false;
  }
}

function focusSafely(target: FocusTargetLike | null | undefined): boolean {
  if (!isRestorableFocusTarget(target)) return false;
  try {
    target.focus({ preventScroll: true });
    return true;
  } catch {
    return false;
  }
}

export function restoreFocusSafely(
  previous: FocusTargetLike | null | undefined,
  fallback: FocusTargetLike | null | undefined,
): FocusRestoreResult {
  if (focusSafely(previous)) return "previous";
  if (fallback !== previous && focusSafely(fallback)) return "fallback";
  return "none";
}

export function firstRestorableFocusTarget(
  candidates: ArrayLike<FocusTargetLike>,
): FocusTargetLike | null {
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (isRestorableFocusTarget(candidate)) return candidate;
  }
  return null;
}

export function advanceFocusSafely(
  candidates: ArrayLike<FocusTargetLike>,
  active: FocusTargetLike | null | undefined,
  backwards = false,
): FocusAdvanceResult {
  const targets: FocusTargetLike[] = [];
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (isRestorableFocusTarget(candidate)) targets.push(candidate);
  }
  if (targets.length === 0) return "empty";

  const activeIndex = active ? targets.indexOf(active) : -1;
  const step = backwards ? -1 : 1;
  const startIndex = activeIndex < 0
    ? backwards ? targets.length - 1 : 0
    : (activeIndex + step + targets.length) % targets.length;

  for (let offset = 0; offset < targets.length; offset += 1) {
    const index = (
      startIndex + step * offset + targets.length * 2
    ) % targets.length;
    if (focusSafely(targets[index])) return "focused";
  }
  return "failed";
}
