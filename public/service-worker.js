const FILES_TO_CACHE = [
    "/",
    "/index.html",
    '/manifest.webmanifest',
    "/assets/css/styles.css",
    "/assets/images/icons/icon-192x192.png",
    "/assets/images/icons/icon-512x512.png",
    "/db.js",
    "/index.js"
];
  
const STATIC_CACHE = "static-cache-v1";
const RUNTIME_CACHE = "runtime-cache";
// const DATA_CACHE_NAME = "data-cache-v1";

self.addEventListener("install", function (event) {
  // pre cache budget data
  event.waitUntil(
    caches
      .open(RUNTIME_CACHE)
      .then((cache) => cache.add("/api/transaction"))
  );
  
  // pre cache all static assets
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(FILES_TO_CACHE))
  );

  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          if (key !== STATIC_CACHE && key !== RUNTIME_CACHE) {
            console.log("Removing old cache data", key);
            return caches.delete(key);
          }
        })
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
// //   if (evt.request.url.includes('/api/transaction')) {
// //     console.log('[Service Worker] Fetch (data)', evt.request.url);

  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) {
    event.respondWith(fetch(event.request));
    return;
  }

    // handle runtime GET requests for data from /api routes
  if (event.request.url.includes("/api/transaction")) {
    // make network request and fallback to cache if network request fails (offline)
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(cache => {
        return fetch(event.request)
          .then(response => {
            cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => caches.match(event.request));
      })
    );
    return;
  }
  // use cache first for all other requests for performance
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      
      if (cachedResponse) {
        return cachedResponse;
      }
      // request is not in cache. make network request and cache the response
      return caches.open(RUNTIME_CACHE).then(cache => {
        return fetch(event.request).then(response => {
          return cache.put(event.request, response.clone()).then(() => {
            return response;
          });
        });
      });
    })
  );
});