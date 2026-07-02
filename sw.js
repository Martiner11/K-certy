// Furmanka PUNK – service worker
// Zabezpečuje: rýchlejší štart, offline shell, vždy čerstvé dáta z Gistu.

const CACHE = 'furmanka-v1';
const SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }

  // Dáta o koncertoch / "o nás" – vždy zo siete, pri výpadku skús cache
  const isLiveData = url.hostname.includes('gist') || url.search.includes('t=');
  if (isLiveData) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Zvyšok (shell, plagáty, fonty…) – najprv cache, potom sieť, fallback index
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((resp) => {
          if (resp && resp.ok && url.origin === self.location.origin) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return resp;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
