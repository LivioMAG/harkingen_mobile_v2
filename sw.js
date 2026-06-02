const CACHE_VERSION = 'v2026-06-02-2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await clearAllCaches();
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await clearAllCaches();
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHES') {
    event.waitUntil(clearAllCaches());
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  if (!isSameOrigin) return;

  event.respondWith(fetchFresh(request));
});

async function clearAllCaches() {
  const names = await caches.keys();
  await Promise.all(names.map((name) => caches.delete(name)));
}

async function fetchFresh(request) {
  const freshUrl = new URL(request.url);
  freshUrl.searchParams.set('__fresh', `${CACHE_VERSION}-${Date.now()}`);

  return fetch(freshUrl.toString(), {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: request.redirect
  });
}
