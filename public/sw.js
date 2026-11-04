// Service worker Rasd : mode hors ligne et notifications Fournisseurs.
const VERSION = "rasd-v2";
const REPLI = "/hors-ligne.html";
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.add(REPLI)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => { if (e.request.mode !== "navigate") return; e.respondWith(fetch(e.request).catch(() => caches.match(REPLI))); });
self.addEventListener("push", (e) => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(self.registration.showNotification(data.title || "Rasd — Fournisseurs", { body: data.body || "Un suivi fournisseur nécessite votre attention.", icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { url: data.url || "/fournisseurs" } }));
});
self.addEventListener("notificationclick", (e) => { e.notification.close(); e.waitUntil(clients.openWindow(e.notification.data?.url || "/fournisseurs")); });
