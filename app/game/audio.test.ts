import { afterEach, describe, expect, it, vi } from "vitest";
import type { AccessibilitySettings } from "./contracts";
import { AudioGarden } from "./audio";

const SETTINGS: AccessibilitySettings = {
  reducedMotion: false,
  highContrast: false,
  largeText: false,
  musicVolume: 0.35,
  effectsVolume: 0.65,
};

class FakeAudioParam {
  value = 0;
  setTargetAtTime = vi.fn();
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}

class FakeNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class FakeGain extends FakeNode {
  gain = new FakeAudioParam();
}

class FakeOscillator extends FakeNode {
  type: OscillatorType = "sine";
  frequency = new FakeAudioParam();
  start = vi.fn();
  stop = vi.fn();
}

class FakeAudioContext {
  state: AudioContextState = "running";
  currentTime = 4;
  destination = new FakeNode();
  readonly gains: FakeGain[] = [];
  readonly oscillators: FakeOscillator[] = [];
  resume = vi.fn<() => Promise<void>>(async () => undefined);
  close = vi.fn(async () => {
    this.state = "closed";
  });

  createGain(): GainNode {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain as unknown as GainNode;
  }

  createOscillator(): OscillatorNode {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator as unknown as OscillatorNode;
  }

  asContext(): AudioContext {
    return this as unknown as AudioContext;
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe("optional procedural audio", () => {
  it("fails silent when an audio context cannot be constructed", () => {
    const createContext = vi.fn(() => {
      throw new Error("audio blocked");
    });
    const garden = new AudioGarden(SETTINGS, { createContext });

    expect(() => garden.wake()).not.toThrow();
    expect(garden.wake()).toBe(false);
    expect(() => garden.note(440)).not.toThrow();
    expect(createContext).toHaveBeenCalledTimes(1);
  });

  it("contains partial graph construction failures", () => {
    const context = new FakeAudioContext();
    context.createGain = vi.fn(() => {
      throw new Error("gain unavailable");
    });
    const garden = new AudioGarden(SETTINGS, {
      createContext: () => context.asContext(),
    });

    expect(garden.wake()).toBe(false);
    expect(() => garden.bump()).not.toThrow();
    expect(context.close).toHaveBeenCalledOnce();
  });

  it("retries a rejected resume without queuing a stale action note", async () => {
    const context = new FakeAudioContext();
    context.state = "suspended";
    context.resume = vi.fn(async () => {
      throw new Error("gesture rejected");
    });
    const garden = new AudioGarden(SETTINGS, {
      createContext: () => context.asContext(),
    });

    expect(garden.note(440)).toBe(false);
    await Promise.resolve();
    await Promise.resolve();
    expect(context.resume).toHaveBeenCalled();
    expect(context.oscillators).toHaveLength(2);

    context.resume = vi.fn(async () => {
      context.state = "running";
    });
    expect(garden.note(440)).toBe(false);
    await Promise.resolve();
    await Promise.resolve();
    expect(garden.note(440)).toBe(true);
    expect(context.oscillators).toHaveLength(3);
    garden.destroy();
  });

  it("deduplicates an in-flight resume across repeated effects", async () => {
    const context = new FakeAudioContext();
    context.state = "suspended";
    let resolveResume: (() => void) | undefined;
    context.resume = vi.fn(
      () => new Promise<void>((resolve) => {
        resolveResume = () => {
          context.state = "running";
          resolve();
        };
      }),
    );
    const garden = new AudioGarden(SETTINGS, {
      createContext: () => context.asContext(),
    });

    expect(garden.note(330)).toBe(false);
    expect(garden.note(440)).toBe(false);
    expect(context.resume).toHaveBeenCalledOnce();
    expect(context.oscillators).toHaveLength(2);

    resolveResume?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(garden.note(550)).toBe(true);
    expect(context.oscillators).toHaveLength(3);
    garden.destroy();
  });

  it("contains a synchronous resume rejection and retries later", async () => {
    const context = new FakeAudioContext();
    context.state = "suspended";
    context.resume = vi.fn(() => {
      throw new Error("resume unavailable");
    });
    const garden = new AudioGarden(SETTINGS, {
      createContext: () => context.asContext(),
    });

    expect(() => garden.note(440)).not.toThrow();
    expect(garden.note(440)).toBe(false);
    expect(context.resume).toHaveBeenCalledTimes(2);
    expect(context.oscillators).toHaveLength(2);
    garden.destroy();
    await Promise.resolve();
  });

  it("contains transient note creation failures after a healthy wake", () => {
    const context = new FakeAudioContext();
    const garden = new AudioGarden(SETTINGS, {
      createContext: () => context.asContext(),
    });
    expect(garden.wake()).toBe(true);
    context.createOscillator = vi.fn(() => {
      throw new Error("oscillator unavailable");
    });

    expect(() => garden.note(440)).not.toThrow();
    expect(garden.note(440)).toBe(false);
    expect(context.close).toHaveBeenCalledOnce();
  });

  it("cancels delayed tones and tears down idempotently", () => {
    vi.useFakeTimers();
    const context = new FakeAudioContext();
    const garden = new AudioGarden(SETTINGS, {
      createContext: () => context.asContext(),
    });

    garden.collect();
    expect(context.oscillators).toHaveLength(3);
    garden.destroy();
    garden.destroy();
    vi.runAllTimers();

    expect(context.oscillators).toHaveLength(3);
    expect(context.close).toHaveBeenCalledOnce();
    expect(context.oscillators[0].stop).toHaveBeenCalled();
    expect(context.oscillators[1].stop).toHaveBeenCalled();
  });
});
