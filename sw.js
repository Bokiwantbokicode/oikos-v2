// ── OIKOS v2 · sw.js ─────────────────────────
// Cache version — bump this number on every deploy to force refresh
const VERSION = 'oikos-v2-5';

// On install — skip waiting immediately so new SW takes over fast
self.addEventListener('install', () => {
  self.skipWaiting();
});

// On activate — delete ALL old caches, claim all clients
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== VERSION).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - GitHub API → always network only
// - Everything else → network first, fallback to cache
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // GitHub API — never cache
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

  // Network first — always try to get fresh content
  // Only fall back to cache if network fails (offline)
  e.respondWith(
    fetch(e.request).then(res => {
      // Cache a fresh copy
      if (res && res.status === 200 && e.request.method === 'GET') {
        const clone = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() =>
      // Network failed — serve from cache
      caches.match(e.request).then(cached =>
        cached || caches.match('./index.html')
      )
    )
  );
});
