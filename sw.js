/* Auralis service worker — cache the app shell so installed copies open
 * fast and saved articles keep working offline. NETWORK-FIRST for the
 * app shell (index.html, app.js, config.js, styles.css): returning users
 * must always get the newest code, never a cached old app.js. The cache
 * is only an offline fallback. Cache-first for the rest (icons etc.).
 * Bump CACHE on every release so old caches are deleted on activate.
 * No tracking, no analytics. */
var CACHE = "auralis-v1.3.1";
var SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./config.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];
var SHELL_FILES = ["", "index.html", "styles.css", "app.js", "config.js", "manifest.webmanifest"];

function isShellRequest(url) {
  var path = url.pathname;
  if (path === "/" || path.charAt(path.length - 1) === "/") return true;
  return SHELL_FILES.indexOf(path.split("/").pop()) !== -1;
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(SHELL); }).catch(function () {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);
  // Only handle same-origin GET requests; everything else goes to the network.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (isShellRequest(url)) {
    // Network-first: always try the live file, fall back to cache offline.
    event.respondWith(
      fetch(event.request).then(function (resp) {
        if (resp && resp.ok) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
        }
        return resp;
      }).catch(function () { return caches.match(event.request); })
    );
    return;
  }
  // Cache-first for the rest (icons etc.).
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var network = fetch(event.request).then(function (resp) {
        if (resp && resp.ok) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
        }
        return resp;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
