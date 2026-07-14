const CACHE_NAME = "bizpilot-v7";
const OFFLINE_URL = "/offline";
const SHELL_PATHS = [
  OFFLINE_URL,
  "/sales",
  "/inventory",
  "/dashboard",
  "/expenses",
  "/customers",
  "/debts",
  "/reports",
  "/settings/backup",
];

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isAppShellPath(pathname) {
  return SHELL_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        SHELL_PATHS.map((url) =>
          cache.add(url).catch(() => undefined)
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Network-first navigations. Cache successful app-shell pages for offline reopen.
// Never cache /api or /_next assets (Next handles deploy freshness).
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;
  if (request.mode !== "navigate") return;
  if (!isSameOrigin(request)) return;

  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.ok && isAppShellPath(url.pathname)) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cached =
          (await caches.match(request)) ||
          (await caches.match(url.pathname)) ||
          (await caches.match(OFFLINE_URL));
        return (
          cached ||
          new Response("Offline", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          })
        );
      }
    })()
  );
});
