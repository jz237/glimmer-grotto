const CACHE_PREFIX = "glimmer-grotto-";
const CACHE = "glimmer-grotto-v10";
const CORE = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
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

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
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
      if (response.ok) {
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
