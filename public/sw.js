const CACHE_NAME = 'cricket-scorecard-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
          // Fallback for offline API requests could be added here
          return new Response(JSON.stringify({ error: 'Offline' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        });
      })
  );
});
