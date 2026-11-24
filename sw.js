/* Find that song: service worker sin dependencias. */
const CACHE_NAME = "find-that-song-v1";
const CACHE_PREFIX = "find-that-song-";

const SHELL_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png"
];

function scopeUrl(path) {
  return new URL(path, self.registration.scope).href;
}

function isCacheable(response) {
  return Boolean(response && (response.ok || response.type === "opaque"));
}

/* Descubre los archivos con hash generados por Vite leyendo el index.html publicado. */
async function precacheBundledAssets(cache) {
  let html;
  try {
    const response = await fetch(scopeUrl("./index.html"), { cache: "no-store" });
    if (!response || !response.ok) return;
    html = await response.text();
  } catch {
    return;
  }

  const urls = new Set();
  const attributePattern = /(?:src|href)="([^"]+)"/g;
  let match;
  while ((match = attributePattern.exec(html)) !== null) {
    const value = match[1];
    if (!value || value.startsWith("#") || value.startsWith("data:") || /^[a-z]+:/i.test(value)) continue;
    let url;
    try {
      url = new URL(value, self.registration.scope);
    } catch {
      continue;
    }
    if (url.origin !== self.location.origin) continue;
    if (url.pathname.endsWith(".html") || url.pathname.endsWith(".webmanifest")) continue;
    urls.add(url.href);
  }

  await Promise.allSettled([...urls].map((href) => cache.add(href)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.allSettled(SHELL_URLS.map((path) => cache.add(scopeUrl(path))));
      await precacheBundledAssets(cache);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      const stale = names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME);
      await Promise.all(stale.map((name) => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (isCacheable(response)) cache.put(request, response.clone());
    return response;
  } catch {
    return (
      (await cache.match(request)) ||
      (await cache.match(scopeUrl("./index.html"))) ||
      Response.error()
    );
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheable(response)) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const revalidated = fetch(request)
    .then((response) => {
      if (isCacheable(response)) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) return cached;
  return (await revalidated) || (await cache.match(request)) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") return;

  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  if (url.origin !== self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
  } else if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});
