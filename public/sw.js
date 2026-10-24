// Service worker de Rasd : rend l'application installable et affiche une page
// de repli hors connexion. Les données restent toujours lues en ligne — aucune
// donnée réglementaire n'est servie depuis un cache périmé.
const VERSION = "rasd-v1";
const REPLI = "/hors-ligne.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.add(REPLI)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => caches.match(REPLI)));
});
