// Keeps the locked page available offline (stale-while-revalidate). Stamped by tools/bundle-private.mjs.
const VERSION = 'v-202610040045';
const FILES = ['./', 'index.html', 'icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.all(FILES.map(async (u) => { try { await cache.add(new Request(u, { cache: 'reload' })); } catch (_) { /* skip */ } }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
    for (const c of await self.clients.matchAll()) c.postMessage({ type: 'cached', version: VERSION });
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    const refresh = fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(refresh); return hit; }
    return (await refresh) || new Response('Offline and not saved yet.', { status: 503 });
  })());
});
