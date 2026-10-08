/* Service worker do Brasil Fiscal (PWA).
 * Princípios:
 *  - Dados fiscais NUNCA vêm de cache: páginas e APIs sempre vão à rede (assim ninguém vê número velho sem saber).
 *  - Só arquivos estáticos com hash (/_next/static) e ícones são guardados, para abrir mais rápido.
 *  - Sem rede, a navegação mostra /offline.html em vez do erro do navegador.
 *  - Áreas autenticadas (/admin, /login, /api) jamais passam pelo cache.
 * Para invalidar tudo, aumente VERSION. */
const VERSION = "bf-v1";
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("bf-") && !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const NEVER_CACHE = [/^\/api\//, /^\/admin(\/|$)/, /^\/login(\/|$)/, /^\/auth\//];
const isCacheableStatic = (url) => url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER_CACHE.some((re) => re.test(url.pathname))) return;
  if (req.headers.has("range")) return;

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  if (isCacheableStatic(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
