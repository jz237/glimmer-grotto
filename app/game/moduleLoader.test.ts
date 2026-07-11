import { describe, expect, it, vi } from "vitest";
import { RetryableModuleLoader } from "./moduleLoader";

describe("retryable module loading", () => {
  it("shares one in-flight import across preload and mount callers", async () => {
    let resolve: ((value: { mount: string }) => void) | undefined;
    const importModule = vi.fn(
      () => new Promise<{ mount: string }>((done) => {
        resolve = done;
      }),
    );
    const loader = new RetryableModuleLoader(importModule);
    const preload = loader.load();
    const mount = loader.load();
    expect(preload).toBe(mount);
    expect(importModule).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(importModule).toHaveBeenCalledOnce();
    resolve?.({ mount: "ready" });
    await expect(preload).resolves.toEqual({ mount: "ready" });
  });

  it("clears a rejected import so a later attempt can recover", async () => {
    const importModule = vi
      .fn<() => Promise<{ mount: string }>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ mount: "ready" });
    const loader = new RetryableModuleLoader(importModule);

    await expect(loader.load()).rejects.toThrow("offline");
    await expect(loader.load()).resolves.toEqual({ mount: "ready" });
    expect(importModule).toHaveBeenCalledTimes(2);
  });

  it("keeps a successful module cached for future sessions", async () => {
    const loadedModule = { mount: "ready" };
    const importModule = vi.fn(async () => loadedModule);
    const loader = new RetryableModuleLoader(importModule);
    const delivered = loader.load();
    await expect(delivered).resolves.toBe(loadedModule);
    expect(loader.invalidatePending(delivered)).toBe(false);
    await expect(loader.load()).resolves.toBe(loadedModule);
    expect(importModule).toHaveBeenCalledOnce();
  });

  it("contains a synchronous importer failure and still retries", async () => {
    const importModule = vi
      .fn<() => Promise<{ mount: string }>>()
      .mockImplementationOnce(() => {
        throw new Error("loader unavailable");
      })
      .mockResolvedValueOnce({ mount: "ready" });
    const loader = new RetryableModuleLoader(importModule);
    await expect(loader.load()).rejects.toThrow("loader unavailable");
    await expect(loader.load()).resolves.toEqual({ mount: "ready" });
  });

  it("invalidates a stalled import without letting it replace the retry", async () => {
    const resolvers: Array<(value: { mount: string }) => void> = [];
    const importModule = vi.fn(
      () => new Promise<{ mount: string }>((resolve) => {
        resolvers.push(resolve);
      }),
    );
    const loader = new RetryableModuleLoader(importModule);
    const stalled = loader.load();
    await Promise.resolve();
    expect(loader.invalidatePending(stalled)).toBe(true);

    const retry = loader.load();
    await Promise.resolve();
    expect(importModule).toHaveBeenCalledTimes(2);
    expect(loader.invalidatePending(stalled)).toBe(false);
    expect(loader.load()).toBe(retry);
    resolvers[0]?.({ mount: "stale" });
    await expect(stalled).resolves.toEqual({ mount: "stale" });
    expect(loader.load()).toBe(retry);

    resolvers[1]?.({ mount: "ready" });
    await expect(retry).resolves.toEqual({ mount: "ready" });
    await expect(loader.load()).resolves.toEqual({ mount: "ready" });
  });

  it("rejects invalidation from a promise that does not own delivery", async () => {
    let resolve: ((value: { mount: string }) => void) | undefined;
    const loader = new RetryableModuleLoader(
      () => new Promise<{ mount: string }>((done) => {
        resolve = done;
      }),
    );
    const current = loader.load();
    await Promise.resolve();

    expect(
      loader.invalidatePending(Promise.resolve({ mount: "unrelated" })),
    ).toBe(false);
    expect(loader.load()).toBe(current);
    resolve?.({ mount: "ready" });
    await expect(current).resolves.toEqual({ mount: "ready" });
  });

  it("reports when no pending import can be invalidated", () => {
    const loader = new RetryableModuleLoader(async () => ({ mount: "ready" }));
    expect(loader.invalidatePending(Promise.resolve({ mount: "other" }))).toBe(false);
  });
});
