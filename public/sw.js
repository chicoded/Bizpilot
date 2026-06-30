const CACHE_NAME = "bizpilot-v4";
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [OFFLINE_URL];

const SKIP_CACHE_PATHS = [
  "/manifest.webmanifest",
  "/sw.js",
];

function isNextAppRequest(request) {
  const url = new URL(request.url);

  if (url.pathname.startsWith("/_next/")) return true;

  if (
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-Prefetch") === "1" ||
    request.headers.get("Next-Router-State-Tree") ||
    request.headers.get("Next-Url")
  ) {
    return true;
  }

  return false;
}

function shouldBypassServiceWorker(url) {
  return SKIP_CACHE_PATHS.some(
    (path) => url.pathname === path || url.pathname.endsWith(path)
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;
  if (isNextAppRequest(request)) return;

  const url = new URL(request.url);

  if (shouldBypassServiceWorker(url)) return;

  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/sign-in") ||
    url.pathname.startsWith("/sign-up")
  ) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(JSON.stringify({ error: "offline", offline: true }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          })
      )
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then(
          (offline) =>
            offline ??
            new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
        )
      )
    );
    return;
  }

  if (
    url.pathname.match(
      /\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf)$/
    )
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok && response.type === "basic") {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);

        return (
          cached ??
          network ??
          new Response("", { status: 504, statusText: "Offline" })
        );
      })
    );
  }
});
