// الملفات الثقيلة (النماذج والمكتبات) من الكاش دائمًا؛ ملفات البرنامج نفسه من الشبكة أولًا فيصل التحديث فورًا، وتعمل بلا إنترنت من الكاش
// (v5) كل طلب لملف البرنامج يحمل معاملًا فريدًا _sw ويتجاوز الكاش: حافة CDN لـGitHub Pages قد تُبقي النسخة القديمة حتى 10 دقائق للرابط نفسه.
const CACHE = 'orders-v5';
const HEAVY = /\/(vendor|models)\//;
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, {ignoreSearch: true});
    if (HEAVY.test(u.pathname) && hit) return hit;
    try {
      let r;
      if (HEAVY.test(u.pathname)) r = await fetch(e.request);
      else if (e.request.mode === 'navigate') r = await fetch(e.request, {cache: 'no-store'});
      else { const b = new URL(u.href); b.searchParams.set('_sw', Date.now()); r = await fetch(b.href, {cache: 'no-store'}); }
      if (r.ok) c.put(e.request, r.clone());
      return r;
    } catch (_) { if (hit) return hit; throw _; }
  }));
});
