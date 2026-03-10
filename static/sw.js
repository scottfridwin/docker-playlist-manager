/* ===========================
   sw.js
=========================== */

const CACHE = "playlist-manager-v2";

const FILES_TO_CACHE = [
    "/",
    "/static/manifest.json",
    "/static/css/base.css",
    "/static/css/buttons.css",
    "/static/css/inputs.css",
    "/static/css/header.css",
    "/static/css/playlist.css",
    "/static/css/editor.css",
    "/static/css/browser.css",
    "/static/css/responsive.css",
    "/static/app.js",
    "/static/spa-router.js",
    "/static/playlists.js",
    "/static/editor.js",
    "/static/browser/browser-modal.js",
    "/static/browser/browser-navigation.js",
    "/static/browser/browser-selection.js"
];

self.addEventListener("install", e => {
    e.waitUntil(
        caches.open(CACHE).then(cache => {
            return cache.addAll(FILES_TO_CACHE).catch(err => {
                console.warn("Cache installation failed:", err);
            });
        })
    );
    self.skipWaiting();
});

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
});

self.addEventListener("fetch", event => {
    if (event.request.method !== "GET") return;

    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) return response;

            return fetch(event.request).then(fetchResponse => {
                if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== "basic") {
                    return fetchResponse;
                }
                const responseToCache = fetchResponse.clone();
                caches.open(CACHE).then(cache => {
                    cache.put(event.request, responseToCache);
                });
                return fetchResponse;
            }).catch(err => {
                console.warn("Fetch failed:", err);
                return caches.match("/");
            });
        })
    );
});