// Simpan fail game supaya boleh main tanpa internet.
// Cuba rangkaian dulu (supaya versi baru sampai), guna simpanan kalau offline.
const CACHE = 'pinkcraft-v7';
const FILES = ['./', 'index.html', 'game.js', 'world-tools.mjs', 'three.module.min.js', 'peerjs.min.js', 'pixel.woff2', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (!res.ok) throw new Error('Network response failed');
        const copy = res.clone();
        e.waitUntil(caches.open(CACHE).then((c) => c.put(e.request, copy)));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
