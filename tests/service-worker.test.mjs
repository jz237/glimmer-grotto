import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const ORIGIN = "https://glimmer-grotto.example";
const CURRENT_CACHE = "glimmer-grotto-v13";
const workerSource = await readFile(
  new URL("../public/sw.js", import.meta.url),
  "utf8",
);

function requestKey(request) {
  const value = typeof request === "string" ? request : request.url;
  return new URL(value, ORIGIN).href;
}

function createHarness() {
  const listeners = new Map();
  const stores = new Map();
  const network = new Map();
  let skipWaitingCalls = 0;
  let claimCalls = 0;

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
        entries.set(requestKey(request), response.clone());
      },
      async match(request) {
        return entries.get(requestKey(request))?.clone();
      },
    };
  };

  const caches = {
    open: openCache,
    async keys() {
      return [...stores.keys()];
    },
    async delete(name) {
      return stores.delete(name);
    },
    async match(request) {
      const key = requestKey(request);
      for (const entries of stores.values()) {
        const response = entries.get(key);
        if (response) return response.clone();
      }
      return undefined;
    },
  };

  const self = {
    location: { origin: ORIGIN },
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
      <link rel="stylesheet" href="/assets/app.css">
      <link rel="modulepreload" href="/assets/runtime.js">
      <link rel="modulepreload" href="/assets/game.js">
      <link rel="manifest" href="/manifest.webmanifest">
      <link rel="icon" href="${ORIGIN}/icon-192.png">
      <script src="https://cdn.example/ignored.js"></script>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

function seedShellNetwork(harness) {
  harness.network.set("/", gameShell());
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
    "/assets/app.css",
    new Response("body{}", { headers: { "content-type": "text/css" } }),
  );
  harness.network.set(
    "/assets/runtime.js",
    new Response("export{}", { headers: { "content-type": "text/javascript" } }),
  );
  harness.network.set(
    "/assets/game.js",
    new Response('export const game=true;const load=()=>import("./createGame.js")', {
      headers: { "content-type": "text/javascript" },
    }),
  );
  harness.network.set(
    "/assets/createGame.js",
    new Response("export const engine=true", {
      headers: { "content-type": "text/javascript" },
    }),
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
      `${ORIGIN}/assets/app.css`,
      `${ORIGIN}/assets/createGame.js`,
      `${ORIGIN}/assets/game.js`,
      `${ORIGIN}/assets/runtime.js`,
      `${ORIGIN}/icon-192.png`,
      `${ORIGIN}/icon-512.png`,
      `${ORIGIN}/manifest.webmanifest`,
      `${ORIGIN}/third-party-notices.txt`,
    ].sort(),
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
  assert.ok(gameEngine);
  const offlineEngine = await harness.dispatchFetch({
    method: "GET",
    mode: "same-origin",
    destination: "script",
    url: `${ORIGIN}/assets/${gameEngine}`,
  });
  assert.ok((await offlineEngine.text()).length > 500_000);
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

test("activation removes only old grotto caches and claims open clients", async () => {
  const harness = createHarness();
  await harness.openCache("glimmer-grotto-v9");
  await harness.openCache(CURRENT_CACHE);
  await harness.openCache("another-app-v1");

  await harness.dispatchExtendable("activate");

  assert.deepEqual(
    [...harness.stores.keys()].sort(),
    [CURRENT_CACHE, "another-app-v1"].sort(),
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
