const CACHE_NAME = "bizpilot-v5";
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [OFFLINE_URL];

const SKIP_CACHE_PATHS = ["/manifest.webmanifest", "/sw.js"];

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

  const url = new URL(request.url);

  // Never intercept cross-origin requests (Clerk proxy, CDNs, analytics, etc.)
  if (!isSameOrigin(request)) return;

  if (isNextAppRequest(request)) return;
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
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request)
          .then((response) => {
            if (response.ok && response.type === "basic") {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(
            () =>
              new Response("", { status: 504, statusText: "Offline" })
          );
      })
    );
  }
});
