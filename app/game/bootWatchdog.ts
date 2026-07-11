type TimerHandle = ReturnType<typeof globalThis.setTimeout>;

export interface BootWatchdogTimers {
  setTimer(callback: () => void, timeoutMs: number): TimerHandle;
  clearTimer(handle: TimerHandle): void;
}

export function browserBootWatchdogTimers(): BootWatchdogTimers {
  return {
    setTimer: (callback, timeoutMs) => globalThis.setTimeout(callback, timeoutMs),
    clearTimer: (handle) => globalThis.clearTimeout(handle),
  };
}

export class BootReadinessWatchdog {
  private status: "idle" | "pending" | "ready" | "timed-out" | "cancelled" =
    "idle";
  private timer?: TimerHandle;

  constructor(private readonly timers: BootWatchdogTimers) {}

  arm(timeoutMs: number, onTimeout: () => void): boolean {
    if (this.status !== "idle" || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      return false;
    }
    this.status = "pending";
    try {
      this.timer = this.timers.setTimer(() => {
        if (this.status !== "pending") return;
        this.status = "timed-out";
        this.timer = undefined;
        try {
          onTimeout();
        } catch {
          // A recovery callback cannot escape the watchdog boundary.
        }
      }, timeoutMs);
      return true;
    } catch {
      this.status = "timed-out";
      return false;
    }
  }

  ready(): boolean {
    if (this.status !== "pending") return false;
    this.status = "ready";
    this.clearTimer();
    return true;
  }

  cancel(): boolean {
    if (this.status !== "pending") return false;
    this.status = "cancelled";
    this.clearTimer();
    return true;
  }

  private clearTimer(): void {
    const timer = this.timer;
    this.timer = undefined;
    if (timer === undefined) return;
    try {
      this.timers.clearTimer(timer);
    } catch {
      // Status still prevents a late callback from changing the attempt.
    }
  }
}
