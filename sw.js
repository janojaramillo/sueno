/* El sueño de su hijo · service worker
   Sube la versión en CACHE cada vez que publique cambios:
   así el teléfono descarta lo viejo y descarga lo nuevo. */
const CACHE = 'cdss-sueno-v3';
const SHELL = ['./', './index.html', './manifest.json',
               './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const FUENTES = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;              // los envíos al servidor no se tocan
  const url = new URL(req.url);

  /* Fuentes: primero la copia guardada. Así la letra sobrevive sin internet. */
  if (FUENTES.includes(url.origin)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(r => {
        const copia = r.clone();
        caches.open(CACHE).then(c => c.put(req, copia));
        return r;
      }).catch(() => hit))
    );
    return;
  }

  if (url.origin !== location.origin) return;    // Apps Script y cualquier otro: directo a la red

  /* La app: primero la red, para que se actualice sola; si no hay, la copia guardada. */
  e.respondWith(
    fetch(req).then(r => {
      const copia = r.clone();
      caches.open(CACHE).then(c => c.put(req, copia));
      return r;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
