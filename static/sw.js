const CACHE = "playlist-manager-v1"

self.addEventListener("install", e => {
    e.waitUntil(
        caches.open(CACHE).then(cache =>
            cache.addAll([
                "/",
                "/static/style.css",
                "/static/app.js",
                "/static/manifest.json"
            ])
        )
    )
})

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(r => r || fetch(event.request))
    )
})