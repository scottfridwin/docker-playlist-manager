const CACHE = "playlist-manager-v1"

self.addEventListener("install", e => {
    e.waitUntil(
        caches.open(CACHE).then(cache => {
            return cache.addAll([
                "/",
                "/static/style.css",
                "/static/app.js",
                "/static/manifest.json"
            ]).catch(err => {
                console.warn("Cache installation failed:", err);
            });
        })
    )
    self.skipWaiting();
})

self.addEventListener("activate", e => {
    e.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
})

self.addEventListener("fetch", event => {
    if (event.request.method !== "GET") {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) {
                return response;
            }
            return fetch(event.request).then(response => {
                if (!response || response.status !== 200 || response.type !== "basic") {
                    return response;
                }
                const responseToCache = response.clone();
                caches.open(CACHE).then(cache => {
                    cache.put(event.request, responseToCache);
                });
                return response;
            }).catch(err => {
                console.warn("Fetch failed:", err);
                return caches.match("/");
            });
        })
    );
})