type TimerHandle = ReturnType<typeof globalThis.setTimeout>;

export interface DownloadLinkLike {
  href: string;
  download: string;
  hidden: boolean;
  click(): void;
  remove(): void;
}

export interface TextDownloadDependencies {
  createBlob(content: string, type: string): Blob;
  createObjectUrl(blob: Blob): string;
  revokeObjectUrl(url: string): void;
  createLink(): DownloadLinkLike;
  appendLink(link: DownloadLinkLike): void;
  scheduleCleanup(callback: () => void, delayMs: number): TimerHandle;
}

function browserDownloadDependencies(): TextDownloadDependencies | null {
  if (
    typeof document === "undefined" ||
    typeof Blob === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function" ||
    typeof URL.revokeObjectURL !== "function"
  ) {
    return null;
  }
  return {
    createBlob: (content, type) => new Blob([content], { type }),
    createObjectUrl: (blob) => URL.createObjectURL(blob),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
    createLink: () => document.createElement("a"),
    appendLink: (link) => document.body.append(link as HTMLAnchorElement),
    scheduleCleanup: (callback, delayMs) =>
      globalThis.setTimeout(callback, delayMs),
  };
}

/**
 * Requests a browser download and returns only whether activation completed.
 * The caller deliberately says “requested,” because browsers do not expose a
 * reliable signal that a user accepted or retained the resulting file.
 */
export function requestTextDownload(
  content: string,
  filename: string,
  dependencies: TextDownloadDependencies | null = browserDownloadDependencies(),
): boolean {
  if (!dependencies) return false;
  let url: string | undefined;
  let link: DownloadLinkLike | undefined;
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      link?.remove();
    } catch {
      // A detached or restricted link needs no further cleanup.
    }
    if (url) {
      try {
        dependencies.revokeObjectUrl(url);
      } catch {
        // A browser may revoke automatically during document teardown.
      }
    }
  };

  try {
    const blob = dependencies.createBlob(content, "application/json");
    url = dependencies.createObjectUrl(blob);
    link = dependencies.createLink();
    link.href = url;
    link.download = filename;
    link.hidden = true;
    dependencies.appendLink(link);
    link.click();
    dependencies.scheduleCleanup(cleanup, 1_000);
    return true;
  } catch {
    cleanup();
    return false;
  }
}
