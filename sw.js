const CACHE_VERSION = "v4";
const STATIC_CACHE = `ips-ceria-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `ips-ceria-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const APP_SHELL = [
  "/",
  "/index.html",
  "/admin.html",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/app.css",
  "/config.js",
  "/brand.js",
  "/data.js",
  "/app.js",
  "/admin.js",
  "/pwa.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, url.pathname.includes("admin") ? "/admin.html" : "/index.html"));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  event.respondWith(cacheExternal(req));
});

async function networkFirst(req, fallbackUrl) {
  try {
    const fresh = await fetch(req);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    return (await caches.match(req)) ||
      (await caches.match(fallbackUrl)) ||
      (await caches.match(OFFLINE_URL));
  }
}

async function staleWhileRevalidate(req) {
  const cached = await caches.match(req);
  const refresh = fetch(req).then(async res => {
    if (res && res.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, res.clone());
    }
    return res;
  }).catch(() => null);

  return cached || refresh || caches.match(OFFLINE_URL);
}

async function cacheExternal(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  try {
    const fresh = await fetch(req);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    return cached || Response.error();
  }
}
