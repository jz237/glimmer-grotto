const CACHE_PREFIX = "glimmer-grotto-";
const CACHE = "glimmer-grotto-v45";
const SCOPE_URL = new URL("./", self.registration.scope);
const SHELL_URL = new URL("./", SCOPE_URL);
const ASSET_DIRECTORY_URL = new URL("assets/", SCOPE_URL);
const RELEASE_MARKER_URL = new URL(".glimmer-release-cache", SCOPE_URL);
const WORKER_URL = new URL("sw.js", SCOPE_URL);
const FIRST_MARKED_CACHE_VERSION = 41;
const CORE = [
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "third-party-notices.txt",
  "release/clean-profile-certificate.json",
];
const CORE_URLS = new Set(CORE.map((path) => new URL(path, SCOPE_URL).href));
const APP_SHELL_TITLE = "<title>Glimmer Grotto";
const releaseManifests = new Map();
const verifiedCacheEntries = new Set();

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
      const url = new URL(match[1], SHELL_URL);
      if (
        url.origin === self.location.origin &&
        url.pathname.startsWith(ASSET_DIRECTORY_URL.pathname)
      ) {
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
        if (
          url.origin === self.location.origin &&
          url.pathname.startsWith(ASSET_DIRECTORY_URL.pathname)
        ) {
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
  if (pathname.endsWith(".json")) return contentType.includes("json");
  if (pathname.endsWith(".png")) return contentType.startsWith("image/png");
  if (pathname.endsWith(".txt")) return contentType.startsWith("text/plain");
  return false;
}

function releaseCacheVersion(cacheName) {
  const versionPrefix = `${CACHE_PREFIX}v`;
  if (!cacheName.startsWith(versionPrefix)) return -1;
  const version = Number(cacheName.slice(versionPrefix.length));
  return Number.isSafeInteger(version) && version >= 0 ? version : -1;
}

function markerBelongsToCache(markerText, cacheName) {
  if (markerText === cacheName) return true;
  try {
    const marker = JSON.parse(markerText);
    return (
      marker?.cacheName === cacheName &&
      Array.isArray(marker.resources) &&
      marker.resources.length > 0 &&
      marker.resources.every(
        (entry) =>
          Array.isArray(entry) &&
          entry.length === 2 &&
          typeof entry[0] === "string" &&
          /^[a-f0-9]{64}$/.test(entry[1]),
      )
    );
  } catch {
    return false;
  }
}

async function releaseCacheState(cacheName, expectedMarker) {
  try {
    const marker = await caches.match(RELEASE_MARKER_URL.href, { cacheName });
    if (!marker) return "incomplete";
    const markerText = await marker.text();
    const complete = expectedMarker === undefined
      ? markerBelongsToCache(markerText, cacheName)
      : markerText === expectedMarker;
    return complete ? "complete" : "incomplete";
  } catch {
    return "unavailable";
  }
}

async function isCompleteReleaseCache(cacheName) {
  return (await releaseCacheState(cacheName)) === "complete";
}

async function previousReleaseCache(cacheNames) {
  const currentVersion = releaseCacheVersion(CACHE);
  const candidates = cacheNames
    .filter((cacheName) => cacheName !== CACHE)
    .map((cacheName) => ({ cacheName, version: releaseCacheVersion(cacheName) }))
    .filter(({ version }) => version >= 0 && version < currentVersion)
    .sort((left, right) => right.version - left.version);

  for (const candidate of candidates) {
    if (await isCompleteReleaseCache(candidate.cacheName)) {
      return candidate.cacheName;
    }
  }

  return candidates.find(({ version }) => version < FIRST_MARKED_CACHE_VERSION)
    ?.cacheName;
}

function absoluteRequestUrl(request) {
  const value = typeof request === "string" ? request : request.url;
  return new URL(value, self.location.origin).href;
}

async function readReleaseManifest(cacheName) {
  const existing = releaseManifests.get(cacheName);
  if (existing) return existing;
  try {
    const markerResponse = await caches.match(RELEASE_MARKER_URL.href, { cacheName });
    if (!markerResponse) return { kind: "invalid" };
    const markerText = await markerResponse.text();
    if (markerText === cacheName) {
      const legacy = { kind: "legacy" };
      releaseManifests.set(cacheName, legacy);
      return legacy;
    }
    if (!markerBelongsToCache(markerText, cacheName)) {
      return { kind: "invalid" };
    }
    const marker = JSON.parse(markerText);
    const manifest = { kind: "manifest", digests: new Map(marker.resources) };
    releaseManifests.set(cacheName, manifest);
    return manifest;
  } catch {
    return { kind: "invalid" };
  }
}

function forgetVerifiedCacheEntry(cacheName, request) {
  const prefix = `${cacheName}\n${absoluteRequestUrl(request)}\n`;
  for (const key of verifiedCacheEntries) {
    if (key.startsWith(prefix)) verifiedCacheEntries.delete(key);
  }
}

async function deleteInvalidCacheEntry(cacheName, request, expectedDigest) {
  forgetVerifiedCacheEntry(cacheName, request);
  try {
    const cache = await caches.open(cacheName);
    if (expectedDigest) {
      const latest = await cache.match(request);
      if (latest && (await responseSha256(latest)) === expectedDigest) return;
    }
    await cache.delete(request);
  } catch {
    // Returning a miss is sufficient when corrupt storage cannot be changed.
  }
}

async function validatedCacheMatch(request, cacheName) {
  const response = await caches.match(request, { cacheName });
  if (!response) return undefined;
  const manifest = await readReleaseManifest(cacheName);
  if (manifest.kind === "legacy") return response;
  if (manifest.kind !== "manifest") return undefined;
  const url = absoluteRequestUrl(request);
  const expected = manifest.digests.get(url);
  if (!expected) {
    await deleteInvalidCacheEntry(cacheName, request);
    return undefined;
  }
  const verificationKey = `${cacheName}\n${url}\n${expected}`;
  if (verifiedCacheEntries.has(verificationKey)) return response;
  try {
    if ((await responseSha256(response)) !== expected) {
      await deleteInvalidCacheEntry(cacheName, request, expected);
      return undefined;
    }
  } catch {
    await deleteInvalidCacheEntry(cacheName, request, expected);
    return undefined;
  }
  verifiedCacheEntries.add(verificationKey);
  return response;
}

async function matchReleaseCache(request, allowPrevious = false) {
  try {
    const current = await validatedCacheMatch(request, CACHE);
    if (current || !allowPrevious) return current;
    const previous = await previousReleaseCache(await caches.keys());
    if (!previous) return undefined;
    return validatedCacheMatch(request, previous);
  } catch {
    return undefined;
  }
}

async function prunePreviousReleaseCache(previous) {
  if (!previous) return;
  try {
    const [currentCache, previousCache] = await Promise.all([
      caches.open(CACHE),
      caches.open(previous),
    ]);
    const requests = await previousCache.keys();
    for (const request of requests) {
      const pathname = new URL(request.url).pathname;
      if (pathname === RELEASE_MARKER_URL.pathname) continue;
      const belongsToAssetGraph = pathname.startsWith(ASSET_DIRECTORY_URL.pathname);
      const alreadyCurrent = belongsToAssetGraph
        ? Boolean(await currentCache.match(request))
        : true;
      if (alreadyCurrent) {
        await previousCache.delete(request);
      }
    }
  } catch {
    // Pruning is an optimization; an intact predecessor remains safe.
  }
}

async function cleanReleaseCaches() {
  let keys;
  try {
    keys = await caches.keys();
  } catch {
    return;
  }
  const previous = await previousReleaseCache(keys);
  await Promise.all(
    keys
      .filter(
        (key) =>
          key.startsWith(CACHE_PREFIX) && key !== CACHE && key !== previous,
      )
      .map((key) =>
        Promise.resolve()
          .then(() => caches.delete(key))
          .catch(() => false),
      ),
  );
  await prunePreviousReleaseCache(previous);
}

async function responseSha256(response) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await response.clone().arrayBuffer(),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function releaseMarker(resources) {
  const entries = await Promise.all(
    [...resources].map(async ([url, response]) => [url, await responseSha256(response)]),
  );
  entries.sort((left, right) => (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0));
  return JSON.stringify({ cacheName: CACHE, resources: entries });
}

async function cacheCompleteShell() {
  const shellRequest = new Request(SHELL_URL, {
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
    const coreUrl = new URL(corePath, SCOPE_URL).href;
    const response = await fetch(new Request(coreUrl, { cache: "reload" }));
    if (!isCoreResponse(coreUrl, response)) {
      throw new Error(`Invalid core response for ${corePath}.`);
    }
    resources.set(coreUrl, response);
  }

  const markerText = await releaseMarker(resources);
  const existingState = await releaseCacheState(CACHE, markerText);
  if (existingState === "unavailable") {
    throw new Error("Glimmer Grotto cache storage was unavailable during install.");
  }
  if (existingState === "complete") return;
  try {
    await caches.delete(CACHE);
  } catch {
    throw new Error("An incomplete Glimmer Grotto cache could not be replaced.");
  }
  const cache = await caches.open(CACHE);
  for (const [url, response] of resources) {
    await cache.put(url, response);
  }
  await cache.put(
    RELEASE_MARKER_URL.href,
    new Response(markerText, { headers: { "content-type": "application/json" } }),
  );
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
    cleanReleaseCaches()
      .catch(() => undefined)
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.href === WORKER_URL.href ||
    url.searchParams.has("_rsc")
  ) {
    return;
  }

  if (CORE_URLS.has(url.href)) {
    const refresh = fetch(request).then(async (response) => {
      if (isCoreResponse(request.url, response)) {
        const copy = response.clone();
        await caches
          .open(CACHE)
          .then(async (cache) => {
            await cache.put(request, copy);
            forgetVerifiedCacheEntry(CACHE, request);
          })
          .catch(() => undefined);
      }
      return response;
    });
    event.waitUntil(refresh.then(() => undefined, () => undefined));
    event.respondWith(matchReleaseCache(request).then((cached) => cached || refresh));
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
              .then(async (cache) => {
                await cache.put(SHELL_URL.href, copy);
                forgetVerifiedCacheEntry(CACHE, SHELL_URL.href);
              })
              .catch(() => undefined);
          }
          return response;
        })
        .catch(() =>
          matchReleaseCache(SHELL_URL.href).then(
            (response) => response || Response.error(),
          ),
        ),
    );
    return;
  }

  if (["script", "style", "image", "font"].includes(request.destination)) {
    const refresh = fetch(request).then(async (response) => {
      if (isCacheableAsset(request, response)) {
        const copy = response.clone();
        await caches
          .open(CACHE)
          .then(async (cache) => {
            await cache.put(request, copy);
            forgetVerifiedCacheEntry(CACHE, request);
          })
          .catch(() => undefined);
      }
      return response;
    });
    event.waitUntil(refresh.then(() => undefined, () => undefined));
    event.respondWith(
      matchReleaseCache(request, true).then((cached) => cached || refresh),
    );
  }
});
