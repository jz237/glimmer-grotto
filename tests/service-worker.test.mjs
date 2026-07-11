import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const ORIGIN = "https://glimmer-grotto.example";
const CURRENT_CACHE = "glimmer-grotto-v45";
const CURRENT_CACHE_VERSION = Number(CURRENT_CACHE.match(/v(\d+)$/)?.[1]);
const PREVIOUS_CACHE = `glimmer-grotto-v${CURRENT_CACHE_VERSION - 1}`;
const FUTURE_CACHE = `glimmer-grotto-v${CURRENT_CACHE_VERSION + 1}`;
const workerSource = await readFile(
  new URL("../public/sw.js", import.meta.url),
  "utf8",
);

function requestKey(request) {
  const value = typeof request === "string" ? request : request.url;
  return new URL(value, ORIGIN).href;
}

function createHarness(scope = `${ORIGIN}/`) {
  const listeners = new Map();
  const stores = new Map();
  const network = new Map();
  let skipWaitingCalls = 0;
  let claimCalls = 0;
  let cacheMatchFailure = false;
  let cacheKeysFailure = false;
  let cachePutFailurePath = null;

  const fetchImpl = async (request) => {
    const url = new URL(requestKey(request));
    const response = network.get(url.pathname);
    if (response instanceof Error) throw response;
    if (!response) throw new Error(`Unexpected network request: ${url.pathname}`);
    return response.clone();
  };

  const openCache = async (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name);
    return {
      async addAll(requests) {
        const pending = await Promise.all(
          requests.map(async (request) => {
            const response = await fetchImpl(request);
            if (!response.ok) throw new Error(`Failed to cache ${requestKey(request)}`);
            return [requestKey(request), response];
          }),
        );
        for (const [key, response] of pending) entries.set(key, response.clone());
      },
      async put(request, response) {
        if (new URL(requestKey(request)).pathname === cachePutFailurePath) {
          throw new Error(`cache put failed for ${cachePutFailurePath}`);
        }
        entries.set(requestKey(request), response.clone());
      },
      async match(request) {
        return entries.get(requestKey(request))?.clone();
      },
      async keys() {
        return [...entries.keys()].map((key) => new Request(key));
      },
      async delete(request) {
        return entries.delete(requestKey(request));
      },
    };
  };

  const caches = {
    open: openCache,
    async keys() {
      if (cacheKeysFailure) throw new Error("cache keys unavailable");
      return [...stores.keys()];
    },
    async delete(name) {
      return stores.delete(name);
    },
    async match(request, options = {}) {
      if (cacheMatchFailure) throw new Error("cache reads unavailable");
      const key = requestKey(request);
      const cacheNames = options.cacheName
        ? [options.cacheName]
        : [...stores.keys()];
      for (const cacheName of cacheNames) {
        const entries = stores.get(cacheName);
        if (!entries) continue;
        const response = entries.get(key);
        if (response) return response.clone();
      }
      return undefined;
    },
  };

  const self = {
    location: { origin: ORIGIN },
    registration: { scope },
    clients: {
      async claim() {
        claimCalls += 1;
      },
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    skipWaiting() {
      skipWaitingCalls += 1;
    },
  };

  vm.runInNewContext(workerSource, {
    URL,
    Request,
    Response,
    crypto: globalThis.crypto,
    caches,
    fetch: fetchImpl,
    self,
  });

  const dispatchExtendable = async (type, extra = {}) => {
    const pending = [];
    listeners.get(type)({
      ...extra,
      waitUntil(promise) {
        pending.push(Promise.resolve(promise));
      },
    });
    await Promise.all(pending);
  };

  const dispatchFetch = async (request) => {
    const pending = [];
    let responsePromise;
    listeners.get("fetch")({
      request,
      respondWith(promise) {
        responsePromise = Promise.resolve(promise);
      },
      waitUntil(promise) {
        pending.push(Promise.resolve(promise));
      },
    });
    assert.ok(responsePromise, "fetch handler should provide a response");
    const response = await responsePromise;
    await Promise.all(pending);
    return response;
  };

  const cacheEntries = (name = CURRENT_CACHE) => [
    ...(stores.get(name)?.keys() ?? []),
  ];
  const cachedText = async (path, name = CURRENT_CACHE) => {
    const response = stores.get(name)?.get(new URL(path, ORIGIN).href);
    return response?.clone().text();
  };

  return {
    cacheEntries,
    cachedText,
    dispatchExtendable,
    dispatchFetch,
    network,
    openCache,
    setCacheKeysFailure(value) {
      cacheKeysFailure = value;
    },
    setCacheMatchFailure(value) {
      cacheMatchFailure = value;
    },
    setCachePutFailure(path) {
      cachePutFailurePath = path;
    },
    stores,
    get claimCalls() {
      return claimCalls;
    },
    get skipWaitingCalls() {
      return skipWaitingCalls;
    },
  };
}

function gameShell() {
  return new Response(
    `<!doctype html>
      <title>Glimmer Grotto — A quiet puzzle adventure</title>
      <link rel="stylesheet" href="assets/app.css">
      <link rel="modulepreload" href="assets/runtime.js">
      <link rel="modulepreload" href="assets/game.js">
      <link rel="manifest" href="manifest.webmanifest">
      <link rel="icon" href="icon-192.png">
      <script src="https://cdn.example/ignored.js"></script>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

function seedShellNetwork(harness, scopePath = "/") {
  const scopedPath = (path) => new URL(path, `${ORIGIN}${scopePath}`).pathname;
  harness.network.set(scopedPath("./"), gameShell());
  harness.network.set(
    scopedPath("manifest.webmanifest"),
    new Response("{}", { headers: { "content-type": "application/manifest+json" } }),
  );
  harness.network.set(
    scopedPath("icon-192.png"),
    new Response("icon-192", { headers: { "content-type": "image/png" } }),
  );
  harness.network.set(
    scopedPath("icon-512.png"),
    new Response("icon-512", { headers: { "content-type": "image/png" } }),
  );
  harness.network.set(
    scopedPath("third-party-notices.txt"),
    new Response("Glimmer Grotto third-party notices", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    }),
  );
  harness.network.set(
    scopedPath("release/clean-profile-certificate.json"),
    new Response('{"certificate":"clean-profile-completion"}', {
      headers: { "content-type": "application/json" },
    }),
  );
  harness.network.set(
    scopedPath("assets/app.css"),
    new Response("body{}", { headers: { "content-type": "text/css" } }),
  );
  harness.network.set(
    scopedPath("assets/runtime.js"),
    new Response("export{}", { headers: { "content-type": "text/javascript" } }),
  );
  harness.network.set(
    scopedPath("assets/game.js"),
    new Response('export const game=true;const load=()=>import("./createGame.js")', {
      headers: { "content-type": "text/javascript" },
    }),
  );
  harness.network.set(
    scopedPath("assets/createGame.js"),
    new Response("export const engine=true", {
      headers: { "content-type": "text/javascript" },
    }),
  );
}

async function markCompleteRelease(cache, cacheName) {
  await cache.put(
    `${ORIGIN}/.glimmer-release-cache`,
    new Response(cacheName, { headers: { "content-type": "text/plain" } }),
  );
}

test("first install precaches the complete hashed app shell", async () => {
  const harness = createHarness();
  seedShellNetwork(harness);

  await harness.dispatchExtendable("install");

  assert.deepEqual(
    harness.cacheEntries().sort(),
    [
      `${ORIGIN}/`,
      `${ORIGIN}/.glimmer-release-cache`,
      `${ORIGIN}/assets/app.css`,
      `${ORIGIN}/assets/createGame.js`,
      `${ORIGIN}/assets/game.js`,
      `${ORIGIN}/assets/runtime.js`,
      `${ORIGIN}/icon-192.png`,
      `${ORIGIN}/icon-512.png`,
      `${ORIGIN}/manifest.webmanifest`,
      `${ORIGIN}/release/clean-profile-certificate.json`,
      `${ORIGIN}/third-party-notices.txt`,
    ].sort(),
  );
  const marker = JSON.parse(await harness.cachedText("/.glimmer-release-cache"));
  assert.equal(marker.cacheName, CURRENT_CACHE);
  assert.equal(marker.resources.length, 10);
  assert.ok(marker.resources.every((entry) => /^[a-f0-9]{64}$/.test(entry[1])));
});

test("a nested arcade deployment keeps its offline graph inside its folder", async () => {
  const scopePath = "/games/2026-06-10/glimmer-grotto/";
  const harness = createHarness(`${ORIGIN}${scopePath}`);
  seedShellNetwork(harness, scopePath);

  await harness.dispatchExtendable("install");

  const cachedPaths = harness.cacheEntries().map((entry) => new URL(entry).pathname);
  assert.ok(cachedPaths.length > 1);
  assert.ok(cachedPaths.every((pathname) => pathname.startsWith(scopePath)));
  assert.ok(cachedPaths.includes(`${scopePath}assets/createGame.js`));
  assert.ok(cachedPaths.includes(`${scopePath}third-party-notices.txt`));

  harness.network.set(scopePath, new Error("offline"));
  const response = await harness.dispatchFetch({
    method: "GET",
    mode: "navigate",
    destination: "document",
    url: `${ORIGIN}${scopePath}afterglow`,
  });
  assert.match(await response.text(), /Glimmer Grotto/);
});

test("an incomplete install stays unmarked and is replaced before retry", async () => {
  const harness = createHarness();
  seedShellNetwork(harness);
  harness.setCachePutFailure("/.glimmer-release-cache");

  await assert.rejects(harness.dispatchExtendable("install"), /cache put failed/);
  assert.equal(
    await harness.cachedText("/.glimmer-release-cache"),
    undefined,
  );
  assert.ok(harness.cacheEntries().length > 1);
  const partial = await harness.openCache(CURRENT_CACHE);
  await partial.put(
    `${ORIGIN}/assets/stale-partial.js`,
    new Response("stale", { headers: { "content-type": "text/javascript" } }),
  );

  harness.setCachePutFailure(null);
  await harness.dispatchExtendable("install");

  const marker = JSON.parse(await harness.cachedText("/.glimmer-release-cache"));
  assert.equal(marker.cacheName, CURRENT_CACHE);
  assert.equal(await harness.cachedText("/assets/stale-partial.js"), undefined);
});

test("a same-name cache is reused only when its content manifest matches", async () => {
  const harness = createHarness();
  seedShellNetwork(harness);
  await harness.dispatchExtendable("install");
  const firstMarker = await harness.cachedText("/.glimmer-release-cache");
  harness.network.set(
    "/third-party-notices.txt",
    new Response("Glimmer Grotto changed release notices", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    }),
  );

  await harness.dispatchExtendable("install");

  const nextMarker = await harness.cachedText("/.glimmer-release-cache");
  assert.notEqual(nextMarker, firstMarker);
  assert.match(
    await harness.cachedText("/third-party-notices.txt"),
    /changed release notices/,
  );
});

test("the credits notice opens from its own cache while offline", async () => {
  const harness = createHarness();
  seedShellNetwork(harness);
  await harness.dispatchExtendable("install");

  harness.network.set("/third-party-notices.txt", new Error("offline"));
  const response = await harness.dispatchFetch({
    method: "GET",
    mode: "navigate",
    destination: "document",
    url: `${ORIGIN}/third-party-notices.txt`,
  });
  assert.match(await response.text(), /third-party notices/);
});

test("the completion certificate opens from its own cache while offline", async () => {
  const harness = createHarness();
  seedShellNetwork(harness);
  await harness.dispatchExtendable("install");

  harness.network.set(
    "/release/clean-profile-certificate.json",
    new Error("offline"),
  );
  const response = await harness.dispatchFetch({
    method: "GET",
    mode: "same-origin",
    destination: "",
    url: `${ORIGIN}/release/clean-profile-certificate.json`,
  });
  assert.match(await response.text(), /clean-profile-completion/);
});

test("the production build's lazy game engine is available on first offline load", async () => {
  const harness = createHarness();
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("offline-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const shellResponse = await worker.fetch(
    new Request(`${ORIGIN}/`, { headers: { accept: "text/html" } }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  const shell = await shellResponse.text();
  harness.network.set(
    "/",
    new Response(shell, { headers: { "content-type": "text/html; charset=utf-8" } }),
  );
  harness.network.set(
    "/manifest.webmanifest",
    new Response("{}", { headers: { "content-type": "application/manifest+json" } }),
  );
  harness.network.set(
    "/icon-192.png",
    new Response("icon-192", { headers: { "content-type": "image/png" } }),
  );
  harness.network.set(
    "/icon-512.png",
    new Response("icon-512", { headers: { "content-type": "image/png" } }),
  );
  harness.network.set(
    "/third-party-notices.txt",
    new Response("Glimmer Grotto third-party notices", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    }),
  );
  harness.network.set(
    "/release/clean-profile-certificate.json",
    new Response('{"certificate":"clean-profile-completion"}', {
      headers: { "content-type": "application/json" },
    }),
  );

  const assetDirectory = new URL("../dist/client/assets/", import.meta.url);
  const assetNames = (await readdir(assetDirectory)).filter((name) =>
    /\.(?:css|js)$/.test(name),
  );
  for (const name of assetNames) {
    const body = await readFile(new URL(name, assetDirectory));
    harness.network.set(
      `/assets/${name}`,
      new Response(body, {
        headers: {
          "content-type": name.endsWith(".css") ? "text/css" : "text/javascript",
        },
      }),
    );
  }

  await harness.dispatchExtendable("install");

  const cachedAssets = harness
    .cacheEntries()
    .map((entry) => new URL(entry).pathname)
    .filter((pathname) => pathname.startsWith("/assets/"))
    .sort();
  assert.deepEqual(
    cachedAssets,
    assetNames.map((name) => `/assets/${name}`).sort(),
  );
  assert.ok(
    cachedAssets.some((pathname) => /\/createGame-[^/]+\.js$/.test(pathname)),
    "the lazy Phaser game engine must be precached",
  );
  assert.match(
    await harness.cachedText("/third-party-notices.txt"),
    /third-party notices/,
  );

  harness.network.set("/", new Error("offline"));
  for (const name of assetNames) {
    harness.network.set(`/assets/${name}`, new Error("offline"));
  }
  const offlineShell = await harness.dispatchFetch({
    method: "GET",
    mode: "navigate",
    destination: "document",
    url: `${ORIGIN}/`,
  });
  assert.match(await offlineShell.text(), /Glimmer Grotto/);

  const gameEngine = assetNames.find((name) => /^createGame-.+\.js$/.test(name));
  const inputEngine = assetNames.find((name) => /^input-.+\.js$/.test(name));
  assert.ok(gameEngine);
  assert.ok(inputEngine);
  const offlineEngine = await harness.dispatchFetch({
    method: "GET",
    mode: "same-origin",
    destination: "script",
    url: `${ORIGIN}/assets/${gameEngine}`,
  });
  const offlineEngineSource = await offlineEngine.text();
  assert.ok(offlineEngineSource.length > 500_000);
  assert.match(offlineEngineSource, /Web Audio is unavailable/);
  assert.match(offlineEngineSource, /visibilitychange/);
  assert.match(offlineEngineSource, /gamepadconnected/);
  assert.match(offlineEngineSource, /gamepaddisconnected/);
  assert.match(offlineEngineSource, /contenteditable/);
  assert.match(offlineEngineSource, /keyup/);
  assert.match(offlineEngineSource, /beginMove/);
  assert.match(offlineEngineSource, /beginBump/);
  assert.match(offlineEngineSource, /killAll/);
  assert.match(offlineEngineSource, /shutdownScene/);
  assert.match(offlineEngineSource, /destroyRenderer/);
  assert.match(offlineEngineSource, /shutdownComplete/);

  const offlineInput = await harness.dispatchFetch({
    method: "GET",
    mode: "same-origin",
    destination: "script",
    url: `${ORIGIN}/assets/${inputEngine}`,
  });
  const offlineInputSource = await offlineInput.text();
  assert.match(offlineInputSource, /isComposing/);
  assert.match(offlineInputSource, /keyCode/);
  assert.match(offlineInputSource, /primaryDown/);
  assert.match(offlineInputSource, /isFinite/);
});

test("a successful sign-in page cannot replace the offline game shell", async () => {
  const harness = createHarness();
  seedShellNetwork(harness);
  await harness.dispatchExtendable("install");

  harness.network.set(
    "/",
    new Response("<title>Sign in required</title>", {
      headers: { "content-type": "text/html" },
    }),
  );
  const online = await harness.dispatchFetch({
    method: "GET",
    mode: "navigate",
    destination: "document",
    url: `${ORIGIN}/`,
  });
  assert.match(await online.text(), /Sign in required/);
  assert.match(await harness.cachedText("/"), /Glimmer Grotto/);

  harness.network.set("/", new Error("offline"));
  const offline = await harness.dispatchFetch({
    method: "GET",
    mode: "navigate",
    destination: "document",
    url: `${ORIGIN}/deep-link`,
  });
  assert.match(await offline.text(), /Glimmer Grotto/);
});

test("HTML cannot poison a cached script during background refresh", async () => {
  const harness = createHarness();
  seedShellNetwork(harness);
  await harness.dispatchExtendable("install");
  harness.network.set(
    "/assets/game.js",
    new Response("<title>Sign in required</title>", {
      headers: { "content-type": "text/html" },
    }),
  );

  const response = await harness.dispatchFetch({
    method: "GET",
    mode: "same-origin",
    destination: "script",
    url: `${ORIGIN}/assets/game.js`,
  });

  assert.match(await response.text(), /export const game=true/);
  assert.match(await harness.cachedText("/assets/game.js"), /export const game=true/);
});

test("a corrupt cached asset is rejected and repaired from the network", async () => {
  const harness = createHarness();
  seedShellNetwork(harness);
  await harness.dispatchExtendable("install");
  const current = await harness.openCache(CURRENT_CACHE);
  await current.put(
    `${ORIGIN}/assets/game.js`,
    new Response("export const game='corrupt-cache'", {
      headers: { "content-type": "text/javascript" },
    }),
  );

  const response = await harness.dispatchFetch({
    method: "GET",
    mode: "same-origin",
    destination: "script",
    url: `${ORIGIN}/assets/game.js`,
  });

  assert.match(await response.text(), /export const game=true/);
  assert.match(await harness.cachedText("/assets/game.js"), /export const game=true/);
});

test("a corrupt offline asset is deleted rather than executed", async () => {
  const harness = createHarness();
  seedShellNetwork(harness);
  await harness.dispatchExtendable("install");
  const current = await harness.openCache(CURRENT_CACHE);
  await current.put(
    `${ORIGIN}/assets/runtime.js`,
    new Response("globalThis.corrupt=true", {
      headers: { "content-type": "text/javascript" },
    }),
  );
  harness.network.set("/assets/runtime.js", new Error("offline"));

  await assert.rejects(
    harness.dispatchFetch({
      method: "GET",
      mode: "same-origin",
      destination: "script",
      url: `${ORIGIN}/assets/runtime.js`,
    }),
    /offline/,
  );
  assert.equal(await harness.cachedText("/assets/runtime.js"), undefined);
});

test("shared core files come only from the current release cache", async () => {
  const harness = createHarness();
  const previous = await harness.openCache(PREVIOUS_CACHE);
  await markCompleteRelease(previous, PREVIOUS_CACHE);
  await previous.put(
    `${ORIGIN}/third-party-notices.txt`,
    new Response("old release notices", {
      headers: { "content-type": "text/plain" },
    }),
  );
  seedShellNetwork(harness);
  await harness.dispatchExtendable("install");
  harness.network.set("/third-party-notices.txt", new Error("offline"));

  const response = await harness.dispatchFetch({
    method: "GET",
    mode: "same-origin",
    destination: "",
    url: `${ORIGIN}/third-party-notices.txt`,
  });

  assert.match(await response.text(), /Glimmer Grotto third-party notices/);
  assert.doesNotMatch(
    await harness.cachedText("/third-party-notices.txt"),
    /old release/,
  );
});

test("a cache read failure falls through to a healthy network response", async () => {
  const harness = createHarness();
  seedShellNetwork(harness);
  await harness.dispatchExtendable("install");
  harness.network.set(
    "/assets/game.js",
    new Response("export const game='fresh-network'", {
      headers: { "content-type": "text/javascript" },
    }),
  );
  harness.setCacheMatchFailure(true);

  const response = await harness.dispatchFetch({
    method: "GET",
    mode: "same-origin",
    destination: "script",
    url: `${ORIGIN}/assets/game.js`,
  });

  assert.match(await response.text(), /fresh-network/);
});

test("a background cache write failure does not block a fresh response", async () => {
  const harness = createHarness();
  seedShellNetwork(harness);
  await harness.dispatchExtendable("install");
  const current = await harness.openCache(CURRENT_CACHE);
  await current.delete(`${ORIGIN}/assets/game.js`);
  harness.network.set(
    "/assets/game.js",
    new Response("export const game='network-without-cache'", {
      headers: { "content-type": "text/javascript" },
    }),
  );
  harness.setCachePutFailure("/assets/game.js");

  const response = await harness.dispatchFetch({
    method: "GET",
    mode: "same-origin",
    destination: "script",
    url: `${ORIGIN}/assets/game.js`,
  });

  assert.match(await response.text(), /network-without-cache/);
  assert.equal(await harness.cachedText("/assets/game.js"), undefined);
});

test("a claimed old page can still load its predecessor's hashed engine", async () => {
  const harness = createHarness();
  seedShellNetwork(harness);
  await harness.dispatchExtendable("install");
  const previous = await harness.openCache(PREVIOUS_CACHE);
  await markCompleteRelease(previous, PREVIOUS_CACHE);
  await previous.put(
    `${ORIGIN}/assets/old-createGame.js`,
    new Response("export const oldEngine=true", {
      headers: { "content-type": "text/javascript" },
    }),
  );
  await harness.openCache("glimmer-grotto-v9");
  await harness.dispatchExtendable("activate");
  harness.network.set("/assets/old-createGame.js", new Error("removed release"));

  const response = await harness.dispatchFetch({
    method: "GET",
    mode: "same-origin",
    destination: "script",
    url: `${ORIGIN}/assets/old-createGame.js`,
  });

  assert.match(await response.text(), /oldEngine=true/);
  assert.ok(harness.stores.has(PREVIOUS_CACHE));
  assert.equal(harness.stores.has("glimmer-grotto-v9"), false);
});

test("offline navigation always prefers the current shell over its predecessor", async () => {
  const harness = createHarness();
  const previous = await harness.openCache(PREVIOUS_CACHE);
  await markCompleteRelease(previous, PREVIOUS_CACHE);
  await previous.put(
    `${ORIGIN}/`,
    new Response("<title>Glimmer Grotto old release</title><p>old-shell</p>", {
      headers: { "content-type": "text/html" },
    }),
  );
  seedShellNetwork(harness);
  await harness.dispatchExtendable("install");
  await harness.dispatchExtendable("activate");
  harness.network.set("/", new Error("offline"));

  const response = await harness.dispatchFetch({
    method: "GET",
    mode: "navigate",
    destination: "document",
    url: `${ORIGIN}/some-room`,
  });

  assert.match(await response.text(), /A quiet puzzle adventure/);
  assert.doesNotMatch(await harness.cachedText("/"), /old-shell/);
});

test("activation prunes duplicate and non-asset predecessor entries", async () => {
  const harness = createHarness();
  const previous = await harness.openCache(PREVIOUS_CACHE);
  await previous.put(`${ORIGIN}/`, gameShell());
  await previous.put(
    `${ORIGIN}/third-party-notices.txt`,
    new Response("old notices", { headers: { "content-type": "text/plain" } }),
  );
  await previous.put(
    `${ORIGIN}/assets/game.js`,
    new Response("export const game='old-copy'", {
      headers: { "content-type": "text/javascript" },
    }),
  );
  await previous.put(
    `${ORIGIN}/assets/old-only.js`,
    new Response("export const bridge=true", {
      headers: { "content-type": "text/javascript" },
    }),
  );
  await markCompleteRelease(previous, PREVIOUS_CACHE);
  seedShellNetwork(harness);
  await harness.dispatchExtendable("install");

  await harness.dispatchExtendable("activate");

  assert.deepEqual(
    harness.cacheEntries(PREVIOUS_CACHE).sort(),
    [
      `${ORIGIN}/.glimmer-release-cache`,
      `${ORIGIN}/assets/old-only.js`,
    ].sort(),
  );
});

test("activation removes only old grotto caches and claims open clients", async () => {
  const harness = createHarness();
  await harness.openCache("glimmer-grotto-v9");
  const previous = await harness.openCache(PREVIOUS_CACHE);
  await markCompleteRelease(previous, PREVIOUS_CACHE);
  const future = await harness.openCache(FUTURE_CACHE);
  await markCompleteRelease(future, FUTURE_CACHE);
  await harness.openCache(CURRENT_CACHE);
  await harness.openCache("another-app-v1");

  await harness.dispatchExtendable("activate");

  assert.deepEqual(
    [...harness.stores.keys()].sort(),
    [CURRENT_CACHE, PREVIOUS_CACHE, "another-app-v1"].sort(),
  );
  assert.equal(harness.claimCalls, 1);
});

test("the waiting worker activates only after the explicit update message", async () => {
  const harness = createHarness();
  await harness.dispatchExtendable("message", { data: { type: "NOT_YET" } });
  assert.equal(harness.skipWaitingCalls, 0);
  await harness.dispatchExtendable("message", { data: { type: "SKIP_WAITING" } });
  assert.equal(harness.skipWaitingCalls, 1);
});

test("activation still claims clients when cache enumeration fails", async () => {
  const harness = createHarness();
  harness.setCacheKeysFailure(true);

  await harness.dispatchExtendable("activate");

  assert.equal(harness.claimCalls, 1);
});
