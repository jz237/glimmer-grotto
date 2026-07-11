import type { AccessibilitySettings } from "./contracts";

type TimerHandle = ReturnType<typeof globalThis.setTimeout>;

export interface AudioGardenDependencies {
  createContext(): AudioContext;
  setTimer(callback: () => void, delayMs: number): TimerHandle;
  clearTimer(handle: TimerHandle): void;
}

function createBrowserAudioContext(): AudioContext {
  const Context = globalThis.AudioContext;
  if (!Context) throw new Error("Web Audio is unavailable.");
  return new Context();
}

/**
 * Optional procedural sound for the grotto. Every Web Audio operation is
 * contained here so a missing, blocked, closed, or partially implemented audio
 * stack can only silence the garden—it can never interrupt game input.
 */
export class AudioGarden {
  private readonly dependencies: AudioGardenDependencies;
  private readonly timers = new Set<TimerHandle>();
  private context?: AudioContext;
  private master?: GainNode;
  private droneGain?: GainNode;
  private drones: OscillatorNode[] = [];
  private resumingContext?: AudioContext;
  private settings: AccessibilitySettings;
  private disabled = false;
  private destroyed = false;

  constructor(
    settings: AccessibilitySettings,
    dependencies: Partial<AudioGardenDependencies> = {},
  ) {
    this.settings = settings;
    this.dependencies = {
      createContext: dependencies.createContext ?? createBrowserAudioContext,
      setTimer:
        dependencies.setTimer ??
        ((callback, delayMs) => globalThis.setTimeout(callback, delayMs)),
      clearTimer:
        dependencies.clearTimer ??
        ((handle) => globalThis.clearTimeout(handle)),
    };
  }

  updateSettings(settings: AccessibilitySettings): void {
    this.settings = settings;
    if (!this.droneGain || !this.context || this.disabled || this.destroyed) return;
    try {
      this.droneGain.gain.setTargetAtTime(
        settings.musicVolume * 0.025,
        this.context.currentTime,
        0.15,
      );
    } catch {
      this.disable();
    }
  }

  wake(): boolean {
    if (this.disabled || this.destroyed) return false;
    if (!this.context) {
      try {
        this.context = this.dependencies.createContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0.55;
        this.master.connect(this.context.destination);
        this.startDrone();
      } catch {
        this.disable();
        return false;
      }
    }
    if (this.context.state === "closed") {
      this.disable();
      return false;
    }
    if (this.context.state !== "running") {
      this.requestResume(this.context);
      return false;
    }
    return true;
  }

  private requestResume(context: AudioContext): void {
    if (
      this.disabled ||
      this.destroyed ||
      this.resumingContext === context
    ) {
      return;
    }
    this.resumingContext = context;
    try {
      void context
        .resume()
        .catch(() => undefined)
        .finally(() => {
          if (this.resumingContext === context) {
            this.resumingContext = undefined;
          }
        });
    } catch {
      if (this.resumingContext === context) this.resumingContext = undefined;
    }
  }

  private startDrone(): void {
    if (!this.context || !this.master || this.drones.length > 0) return;
    this.droneGain = this.context.createGain();
    this.droneGain.gain.value = this.settings.musicVolume * 0.025;
    this.droneGain.connect(this.master);
    for (const [index, frequency] of [73.42, 110].entries()) {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = index === 0 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.value = index === 0 ? 0.75 : 0.22;
      oscillator.connect(gain);
      gain.connect(this.droneGain);
      oscillator.start();
      this.drones.push(oscillator);
    }
  }

  note(frequency: number, duration = 0.45, strength = 1): boolean {
    if (!this.wake() || !this.context || !this.master) return false;
    if (this.settings.effectsVolume <= 0) return false;
    let oscillator: OscillatorNode | undefined;
    try {
      oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      const now = this.context.currentTime;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * 1.04,
        now + duration,
      );
      gain.gain.setValueAtTime(
        Math.max(0.0001, this.settings.effectsVolume * 0.08 * strength),
        now,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.05);
      return true;
    } catch {
      try {
        oscillator?.stop();
      } catch {
        // The oscillator may never have reached a startable state.
      }
      this.disable();
      return false;
    }
  }

  rotate(): void {
    this.note(330, 0.22, 0.7);
  }

  collect(): void {
    if (!this.note(660, 0.35, 0.9)) return;
    this.schedule(() => this.note(880, 0.45, 0.65), 90);
  }

  solve(): void {
    if (!this.wake() || this.settings.effectsVolume <= 0) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((tone, index) => {
      this.schedule(() => this.note(tone, 0.75, 0.9), index * 120);
    });
  }

  bump(): void {
    this.note(145, 0.12, 0.35);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clearTimers();
    this.releaseAudioGraph();
  }

  private schedule(callback: () => void, delayMs: number): void {
    if (this.disabled || this.destroyed) return;
    try {
      const handle = this.dependencies.setTimer(() => {
        this.timers.delete(handle);
        if (this.disabled || this.destroyed) return;
        try {
          callback();
        } catch {
          this.disable();
        }
      }, delayMs);
      this.timers.add(handle);
    } catch {
      this.disable();
    }
  }

  private clearTimers(): void {
    for (const handle of this.timers) {
      try {
        this.dependencies.clearTimer(handle);
      } catch {
        // A failed cancellation is still guarded by disabled/destroyed checks.
      }
    }
    this.timers.clear();
  }

  private disable(): void {
    if (this.disabled) return;
    this.disabled = true;
    this.clearTimers();
    this.releaseAudioGraph();
  }

  private releaseAudioGraph(): void {
    for (const drone of this.drones) {
      try {
        drone.stop();
      } catch {
        // A partially constructed or already stopped oscillator is harmless.
      }
      try {
        drone.disconnect();
      } catch {
        // Some restricted implementations expose nodes that cannot disconnect.
      }
    }
    this.drones = [];
    try {
      this.droneGain?.disconnect();
    } catch {
      // Audio is optional; teardown must remain best effort.
    }
    try {
      this.master?.disconnect();
    } catch {
      // Audio is optional; teardown must remain best effort.
    }
    this.droneGain = undefined;
    this.master = undefined;
    const context = this.context;
    this.context = undefined;
    this.resumingContext = undefined;
    if (context && context.state !== "closed") {
      try {
        void context.close().catch(() => undefined);
      } catch {
        // A restricted or already closing context needs no further cleanup.
      }
    }
  }
}
