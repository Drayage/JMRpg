const cacheName = "job-master-rpg-20260621-1";

const appShell = [
  "./",
  "./index.html",
  "./db.html",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./css/style.css",
  "./js/main.js",
  "./js/db-viewer.js",
  "./js/state.js",
  "./js/data/jobs.js",
  "./js/data/skills.js",
  "./js/data/relics.js",
  "./js/data/monsters.js",
  "./js/data/events.js",
  "./js/data/bosses.js",
  "./js/systems/battle.js",
  "./js/systems/jobs.js",
  "./js/systems/skills.js",
  "./js/systems/relics.js",
  "./js/systems/events.js",
  "./js/systems/stats.js",
  "./js/ui/render.js",
  "./js/ui/panels.js",
  "./js/i18n/ko.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) => cache.addAll(appShell))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(cacheName).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then((cached) => cached ?? caches.match("./index.html")))
  );
});
