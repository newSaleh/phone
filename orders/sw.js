// الملفات الثقيلة (النماذج والمكتبات) من الكاش دائمًا؛ ملفات البرنامج نفسه من الشبكة أولًا فيصل التحديث فورًا، وتعمل بلا إنترنت من الكاش
const CACHE = 'orders-v3';
const HEAVY = /\/(vendor|models)\//;
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, {ignoreSearch: true});
    if (HEAVY.test(u.pathname) && hit) return hit;
    try { const r = await fetch(e.request); if (r.ok) c.put(e.request, r.clone()); return r; } catch (_) { if (hit) return hit; throw _; }
  }));
});
