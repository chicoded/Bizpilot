const CACHE_NAME = "bizpilot-v6";
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [OFFLINE_URL];

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
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
      Promise.all(keys.map((key) => caches.delete(key))).then(() =>
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
      )
    )
  );
  self.clients.claim();
});

// Minimal SW: offline page fallback for navigations only.
// Never cache /_next/ chunks, JS, or CSS — Next.js handles those per deploy.
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;
  if (request.mode !== "navigate") return;
  if (!isSameOrigin(request)) return;

  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return;

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
});
