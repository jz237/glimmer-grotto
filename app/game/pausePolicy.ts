export type RuntimePauseReason =
  | "not-playing"
  | "modal"
  | "page-hidden"
  | "renderer-unavailable"
  | "load-error"
  | null;

export interface RuntimePauseContext {
  playing: boolean;
  modalOpen: boolean;
  pageHidden: boolean;
  rendererUnavailable: boolean;
  loadFailed: boolean;
}

export function runtimePauseReason(
  context: RuntimePauseContext,
): RuntimePauseReason {
  if (!context.playing) return "not-playing";
  if (context.modalOpen) return "modal";
  if (context.pageHidden) return "page-hidden";
  if (context.rendererUnavailable) return "renderer-unavailable";
  if (context.loadFailed) return "load-error";
  return null;
}
