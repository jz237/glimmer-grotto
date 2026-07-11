export interface ModalStateTransition<T extends string> {
  active: T | null;
  changed: boolean;
}

export function activateModalState<T extends string>(
  current: T | null,
  next: T,
): ModalStateTransition<T> {
  return {
    active: next,
    changed: current !== next,
  };
}

export function dismissModalState<T extends string>(
  current: T | null,
  expected: T,
): ModalStateTransition<T> {
  if (current !== expected) return { active: current, changed: false };
  return { active: null, changed: true };
}

export function clearModalState<T extends string>(
  current: T | null,
): ModalStateTransition<T> {
  return {
    active: null,
    changed: current !== null,
  };
}
