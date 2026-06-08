const CACHE_NAME = "mathverse-cache-v2";

const ASSETS_TO_CACHE = [
    "/",
    "/index.html",
    "/manifest.json",
    "/app.js",
    "/sw.js"
];

self.addEventListener("install", event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => {
        console.log("Opened cache and saving assets");
        return cache.addAll(ASSETS_TO_CACHE);
    })
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(caches.keys().then(cacheNames => {
        return Promise.all(cacheNames.map(cache => {
            if (cache !== CACHE_NAME) {
                console.log("Clearing old cache");
                return caches.delete(cache);
            }
        })
        );
    })
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            return cachedResponse || fetch(event.request);
        })
    );
});