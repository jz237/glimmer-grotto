export type RendererMode = "auto" | "canvas";
export const WEBGL_LOSS_FALLBACK_THRESHOLD = 2;

export interface RendererContextLossEvent {
  preventDefault(): void;
}

export function alternateRendererMode(current: RendererMode): RendererMode {
  return current === "canvas" ? "auto" : "canvas";
}

export function recommendedRendererMode(
  webglLosses: number,
  redrawFailed: boolean,
): RendererMode {
  if (redrawFailed) return "canvas";
  if (!Number.isFinite(webglLosses)) return "auto";
  return webglLosses >= WEBGL_LOSS_FALLBACK_THRESHOLD ? "canvas" : "auto";
}

export class RendererContextGuard {
  private state: "available" | "lost" | "destroyed" = "available";

  lose(event?: RendererContextLossEvent): boolean {
    if (this.state !== "available") return false;
    this.state = "lost";
    if (event) {
      try {
        event.preventDefault();
      } catch {
        // Manual renderer recovery remains available if cancellation is broken.
      }
    }
    return true;
  }

  restore(): boolean {
    if (this.state !== "lost") return false;
    this.state = "available";
    return true;
  }

  destroy(): boolean {
    if (this.state === "destroyed") return false;
    this.state = "destroyed";
    return true;
  }
}
