import { describe, expect, it, vi } from "vitest";
import {
  requestTextDownload,
  type DownloadLinkLike,
  type TextDownloadDependencies,
} from "./download";

function createHarness() {
  const cleanupCallbacks: Array<() => void> = [];
  const link: DownloadLinkLike = {
    href: "",
    download: "",
    hidden: false,
    click: vi.fn(),
    remove: vi.fn(),
  };
  const dependencies: TextDownloadDependencies = {
    createBlob: vi.fn((content, type) =>
      ({ content, type }) as unknown as Blob,
    ),
    createObjectUrl: vi.fn(() => "blob:glimmer-save"),
    revokeObjectUrl: vi.fn(),
    createLink: vi.fn(() => link),
    appendLink: vi.fn(),
    scheduleCleanup: vi.fn((callback) => {
      cleanupCallbacks.push(callback);
      return 1 as unknown as ReturnType<typeof globalThis.setTimeout>;
    }),
  };
  return { cleanupCallbacks, dependencies, link };
}

describe("manual save download", () => {
  it("activates an attached download and delays URL cleanup", () => {
    const { cleanupCallbacks, dependencies, link } = createHarness();
    expect(
      requestTextDownload('{"schemaVersion":1}', "glimmer-save.json", dependencies),
    ).toBe(true);
    expect(link).toMatchObject({
      href: "blob:glimmer-save",
      download: "glimmer-save.json",
      hidden: true,
    });
    expect(dependencies.appendLink).toHaveBeenCalledWith(link);
    expect(link.click).toHaveBeenCalledOnce();
    expect(link.remove).not.toHaveBeenCalled();
    expect(dependencies.revokeObjectUrl).not.toHaveBeenCalled();

    cleanupCallbacks[0]();
    expect(link.remove).toHaveBeenCalledOnce();
    expect(dependencies.revokeObjectUrl).toHaveBeenCalledWith("blob:glimmer-save");
  });

  it("returns a truthful failure when object URLs are unavailable", () => {
    const { dependencies, link } = createHarness();
    dependencies.createObjectUrl = vi.fn(() => {
      throw new Error("object URLs blocked");
    });
    expect(requestTextDownload("save", "save.json", dependencies)).toBe(false);
    expect(link.click).not.toHaveBeenCalled();
  });

  it("cleans up immediately when download activation throws", () => {
    const { dependencies, link } = createHarness();
    link.click = vi.fn(() => {
      throw new Error("download blocked");
    });
    expect(requestTextDownload("save", "save.json", dependencies)).toBe(false);
    expect(link.remove).toHaveBeenCalledOnce();
    expect(dependencies.revokeObjectUrl).toHaveBeenCalledOnce();
  });

  it("falls back when delayed cleanup cannot be scheduled", () => {
    const { dependencies, link } = createHarness();
    dependencies.scheduleCleanup = vi.fn(() => {
      throw new Error("timers blocked");
    });
    expect(requestTextDownload("save", "save.json", dependencies)).toBe(false);
    expect(link.click).toHaveBeenCalledOnce();
    expect(link.remove).toHaveBeenCalledOnce();
    expect(dependencies.revokeObjectUrl).toHaveBeenCalledOnce();
  });
});
