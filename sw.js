const CACHE_VERSION = 'houwen-site-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const STATIC_ASSETS = [
    './style.css',
    './script.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .catch(() => undefined)
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key.startsWith('houwen-site-') && !key.startsWith(CACHE_VERSION))
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (isStaticAsset(url)) {
        event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
        return;
    }

    if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
        event.respondWith(networkFirst(request, PAGE_CACHE));
    }
});

function isStaticAsset(url) {
    return (
        url.pathname.endsWith('/style.css') ||
        url.pathname.endsWith('/script.js') ||
        /^\/images\/projects\/thumbs\/.+\.webp$/i.test(url.pathname)
    );
}

function staleWhileRevalidate(request, cacheName) {
    return caches.open(cacheName).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
            const networkResponse = fetch(request).then((response) => {
                if (response && response.ok) cache.put(request, response.clone());
                return response;
            }).catch((error) => {
                if (cachedResponse) return cachedResponse;
                throw error;
            });

            return cachedResponse || networkResponse;
        });
    });
}

function networkFirst(request, cacheName) {
    return caches.open(cacheName).then((cache) => {
        return fetch(request).then((response) => {
            if (response && response.ok) cache.put(request, response.clone());
            return response;
        }).catch((error) => {
            return cache.match(request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                throw error;
            });
        });
    });
}
