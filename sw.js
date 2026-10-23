/* Service worker: la app abre sin conexión; las reservas y pedidos siempre van por la red. */
const VERSION = 'club-1cda171df862';
const BASE = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Datos del club (Google Apps Script): siempre en directo
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;
  // La página: primero la red (así ves enseguida cada versión nueva), si no hay conexión, la copia guardada
  if (req.mode === 'navigate') {
    // cache: 'no-cache' → el navegador pregunta siempre a GitHub si hay versión nueva (no usa su copia de 10 minutos)
    e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
      .then(r => { const copia = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', copia)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // Solo se guardan iconos, manifest y tipografía; cualquier otra petición va siempre a la red
  const estatico = url.origin === location.origin && !url.search && /(\.png|manifest\.json)$/.test(url.pathname);
  const fuente = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (estatico || fuente) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') { const copia = r.clone(); caches.open(VERSION).then(c => c.put(req, copia)); }
      return r;
    })));
  }
});
