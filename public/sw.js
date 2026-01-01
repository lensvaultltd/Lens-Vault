// KILLER SERVICE WORKER
// This SW is designed to replace the old one, DELETE all caches, and ensure fresh network content.

const CACHE_NAME = 'lens-vault-v-cleanup-' + new Date().getTime();

self.addEventListener('install', (event) => {
    // Force this new SW to become the active one immediately
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Delete ALL previous caches
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    console.log('Deleting old cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            // Take control of all clients immediately
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    // NETWORK ONLY - bypass cache completely
    event.respondWith(fetch(event.request));
});
