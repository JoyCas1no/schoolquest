const CACHE = "schoolquest-editor-v7";
const CORE = [
  "./editor.html", "./src/editor.js", "./assets/favicon.svg", "./editor-manifest.webmanifest",
  ...[...Array.from({ length: 7 }, (_, index) => String(index).padStart(2, "0")), "07-a", "07-b", "07-c", "07-d", "08"].map((name) => `./assets/models/floor-parts/part-${name}`),
  "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.min.js",
  "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js",
  "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/BufferGeometryUtils.js"
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("schoolquest-editor-") && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  const isThree = url.origin === "https://cdn.jsdelivr.net" && url.pathname.startsWith("/npm/three@0.180.0/");
  const isModel = url.origin === location.origin && url.pathname.includes("/assets/models/");
  if (isThree || isModel || (url.origin === location.origin && url.pathname.endsWith("/src/editor.js"))) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    })));
    return;
  }
  if (url.origin === location.origin && url.pathname.endsWith("/editor.html")) {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request)));
  }
});
