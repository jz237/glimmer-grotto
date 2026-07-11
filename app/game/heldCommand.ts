type TimerHandle = ReturnType<typeof globalThis.setTimeout>;

export interface HeldCommandTimers {
  setDelay(callback: () => void, delayMs: number): TimerHandle;
  clearDelay(handle: TimerHandle): void;
  setRepeat(callback: () => void, delayMs: number): TimerHandle;
  clearRepeat(handle: TimerHandle): void;
}

export interface HeldCommandOptions {
  initialDelayMs?: number;
  repeatDelayMs?: number;
}

export class HeldCommandController<Command> {
  private activePointerId: number | null = null;
  private delayHandle: TimerHandle | undefined;
  private repeatHandle: TimerHandle | undefined;
  private releaseCapture: (() => void) | undefined;
  private generation = 0;
  private readonly initialDelayMs: number;
  private readonly repeatDelayMs: number;

  constructor(
    private readonly timers: HeldCommandTimers,
    private readonly execute: (command: Command) => void,
    options: HeldCommandOptions = {},
  ) {
    this.initialDelayMs = options.initialDelayMs ?? 285;
    this.repeatDelayMs = options.repeatDelayMs ?? 135;
  }

  start(
    pointerId: number,
    command: Command,
    releaseCapture?: () => void,
  ): boolean {
    this.stop();
    this.activePointerId = pointerId;
    this.releaseCapture = releaseCapture;
    const generation = ++this.generation;

    if (!this.executeSafely(command, pointerId, generation)) return false;
    try {
      this.delayHandle = this.timers.setDelay(() => {
        if (!this.isCurrent(pointerId, generation)) return;
        this.delayHandle = undefined;
        try {
          this.repeatHandle = this.timers.setRepeat(() => {
            this.executeSafely(command, pointerId, generation);
          }, this.repeatDelayMs);
        } catch {
          this.stop(pointerId);
        }
      }, this.initialDelayMs);
      return true;
    } catch {
      this.stop(pointerId);
      return false;
    }
  }

  stop(pointerId?: number): boolean {
    if (this.activePointerId === null) return false;
    if (pointerId !== undefined && pointerId !== this.activePointerId) {
      return false;
    }

    this.generation += 1;
    this.activePointerId = null;
    const delayHandle = this.delayHandle;
    const repeatHandle = this.repeatHandle;
    const releaseCapture = this.releaseCapture;
    this.delayHandle = undefined;
    this.repeatHandle = undefined;
    this.releaseCapture = undefined;

    if (delayHandle !== undefined) {
      try {
        this.timers.clearDelay(delayHandle);
      } catch {
        // The generation guard keeps an uncleared callback inert.
      }
    }
    if (repeatHandle !== undefined) {
      try {
        this.timers.clearRepeat(repeatHandle);
      } catch {
        // The generation guard keeps an uncleared callback inert.
      }
    }
    try {
      releaseCapture?.();
    } catch {
      // Lost or detached pointer capture is already effectively released.
    }
    return true;
  }

  private isCurrent(pointerId: number, generation: number): boolean {
    return (
      this.activePointerId === pointerId && this.generation === generation
    );
  }

  private executeSafely(
    command: Command,
    pointerId: number,
    generation: number,
  ): boolean {
    if (!this.isCurrent(pointerId, generation)) return false;
    try {
      this.execute(command);
      return true;
    } catch {
      this.stop(pointerId);
      return false;
    }
  }
}

export function browserHeldCommandTimers(): HeldCommandTimers {
  return {
    setDelay: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
    clearDelay: (handle) => globalThis.clearTimeout(handle),
    setRepeat: (callback, delayMs) => globalThis.setInterval(callback, delayMs),
    clearRepeat: (handle) => globalThis.clearInterval(handle),
  };
}
