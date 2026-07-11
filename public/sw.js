const CACHE_PREFIX = "glimmer-grotto-";
const CACHE = "glimmer-grotto-v12";
const CORE = [
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/third-party-notices.txt",
];
const APP_SHELL_TITLE = "<title>Glimmer Grotto";

async function isAppShellResponse(response) {
  if (!response.ok) return false;
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("text/html")) return false;
  try {
    const html = await response.clone().text();
    return html.includes(APP_SHELL_TITLE) && html.includes("manifest.webmanifest");
  } catch {
    return false;
  }
}

function shellAssetsFromHtml(html) {
  const assets = new Set();
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    try {
      const url = new URL(match[1], self.location.origin);
      if (url.origin === self.location.origin && url.pathname.startsWith("/assets/")) {
        assets.add(url.href);
      }
    } catch {
      // Ignore malformed and non-URL attributes in the generated shell.
    }
  }
  return [...assets];
}

function dependentAssets(source, baseUrl, contentType) {
  const assets = new Set();
  const patterns = [];
  if (contentType.includes("javascript")) {
    patterns.push(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["'`]([^"'`]+)["'`]/g);
  }
  if (contentType.includes("text/css")) {
    patterns.push(/url\(\s*["']?([^"')]+)["']?\s*\)/g);
  }
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      try {
        const reference = match[1].trim();
        if (
          contentType.includes("javascript") &&
          !/^(?:\.{1,2}\/|\/|https?:\/\/)/.test(reference)
        ) {
          continue;
        }
        const url = new URL(reference, baseUrl);
        if (url.origin === self.location.origin && url.pathname.startsWith("/assets/")) {
          assets.add(url.href);
        }
      } catch {
        // Ignore data URLs, bare package names, and malformed generated references.
      }
    }
  }
  return [...assets];
}

function isGeneratedAssetResponse(response) {
  if (!response.ok) return false;
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  return Boolean(contentType) && !contentType.includes("text/html");
}

function isCoreResponse(url, response) {
  if (!response.ok) return false;
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const pathname = new URL(url).pathname;
  if (pathname.endsWith(".webmanifest")) {
    return contentType.includes("json") || contentType.includes("manifest");
  }
  if (pathname.endsWith(".png")) return contentType.startsWith("image/png");
  if (pathname.endsWith(".txt")) return contentType.startsWith("text/plain");
  return false;
}

async function cacheCompleteShell() {
  const shellRequest = new Request(new URL("/", self.location.origin), {
    cache: "reload",
  });
  const shellResponse = await fetch(shellRequest);
  if (!(await isAppShellResponse(shellResponse))) {
    throw new Error("Glimmer Grotto app shell was unavailable during install.");
  }
  const html = await shellResponse.clone().text();
  const resources = new Map([[shellRequest.url, shellResponse]]);
  const pendingAssets = shellAssetsFromHtml(html);

  for (let index = 0; index < pendingAssets.length; index += 1) {
    const assetUrl = pendingAssets[index];
    if (resources.has(assetUrl)) continue;
    const response = await fetch(new Request(assetUrl, { cache: "reload" }));
    if (!isGeneratedAssetResponse(response)) {
      throw new Error(`Invalid app asset response for ${new URL(assetUrl).pathname}.`);
    }
    resources.set(assetUrl, response);
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (contentType.includes("javascript") || contentType.includes("text/css")) {
      const source = await response.clone().text();
      for (const dependency of dependentAssets(source, assetUrl, contentType)) {
        if (!resources.has(dependency)) pendingAssets.push(dependency);
      }
    }
  }

  for (const corePath of CORE) {
    const coreUrl = new URL(corePath, self.location.origin).href;
    const response = await fetch(new Request(coreUrl, { cache: "reload" }));
    if (!isCoreResponse(coreUrl, response)) {
      throw new Error(`Invalid core response for ${corePath}.`);
    }
    resources.set(coreUrl, response);
  }

  const cache = await caches.open(CACHE);
  for (const [url, response] of resources) {
    await cache.put(url, response);
  }
}

function isCacheableAsset(request, response) {
  if (!response.ok) return false;
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (request.destination === "script") return contentType.includes("javascript");
  if (request.destination === "style") return contentType.includes("text/css");
  if (request.destination === "image") return contentType.startsWith("image/");
  if (request.destination === "font") {
    return (
      contentType.startsWith("font/") ||
      contentType.includes("font-") ||
      contentType.includes("octet-stream")
    );
  }
  return false;
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheCompleteShell());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname === "/sw.js" ||
    url.searchParams.has("_rsc")
  ) {
    return;
  }

  if (CORE.includes(url.pathname)) {
    const refresh = fetch(request).then(async (response) => {
      if (isCoreResponse(request.url, response)) {
        const copy = response.clone();
        await caches
          .open(CACHE)
          .then((cache) => cache.put(request, copy))
          .catch(() => undefined);
      }
      return response;
    });
    event.waitUntil(refresh.then(() => undefined, () => undefined));
    event.respondWith(caches.match(request).then((cached) => cached || refresh));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (await isAppShellResponse(response)) {
            const copy = response.clone();
            await caches
              .open(CACHE)
              .then((cache) => cache.put("/", copy))
              .catch(() => undefined);
          }
          return response;
        })
        .catch(() => caches.match("/").then((response) => response || Response.error())),
    );
    return;
  }

  if (["script", "style", "image", "font"].includes(request.destination)) {
    const refresh = fetch(request).then(async (response) => {
      if (isCacheableAsset(request, response)) {
        const copy = response.clone();
        await caches
          .open(CACHE)
          .then((cache) => cache.put(request, copy))
          .catch(() => undefined);
      }
      return response;
    });
    event.waitUntil(refresh.then(() => undefined, () => undefined));
    event.respondWith(
      caches.match(request).then((cached) => cached || refresh),
    );
  }
});
