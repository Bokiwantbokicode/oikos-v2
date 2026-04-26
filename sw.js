// ── OIKOS v2 · sw.js ─────────────────────────
const CACHE = 'oikos-v2-cache-1';
const CORE = [
  './',
  './index.html',
  './css/main.css',
  './js/utils.js',
  './js/db.js',
  './js/quotes.js',
  './js/home.js',
  './js/entry.js',
  './js/ledger.js',
  './js/charts.js',
  './js/mind.js',
  './js/settings.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './manifest.json'
];

// Install: cache all core files
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {})
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for local, network-first for GitHub API
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // GitHub API — always network, never cache
  if (url.includes('api.github.com')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Google Fonts — network first, fallback to cache
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
