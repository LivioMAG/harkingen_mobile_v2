const CACHE_VERSION = '2026-05-31-4';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(removeLegacyServiceWorker());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHES') {
    event.waitUntil(clearAllCaches());
  }
});

async function removeLegacyServiceWorker() {
  await clearAllCaches();
  await self.clients.claim();
  await self.registration.unregister();

  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  await Promise.all(
    clients.map((client) => {
      const url = new URL(client.url);
      if (url.searchParams.get('appBuild') === CACHE_VERSION) return undefined;
      url.searchParams.set('appBuild', CACHE_VERSION);
      return client.navigate(url.toString());
    })
  );
}

async function clearAllCaches() {
  const names = await caches.keys();
  await Promise.all(names.map((name) => caches.delete(name)));
}
