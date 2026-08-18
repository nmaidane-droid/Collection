/* =======================================================
   MÉRIDIENNE — service worker
   À CHAQUE MODIFICATION D'UN FICHIER, INCRÉMENTER VERSION
   ======================================================= */
const VERSION = 'silhouette-v12';

const COQUE = [
  './',
  './index.html',
  './manifest.json',
  './img/icone-192.png',
  './img/icone-512.png',
  './img/icone-maskable-512.png',
  './img/icone-apple-180.png',
  './img/icone-32.png'
];

/* --- installation : on met la coque en cache --- */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(COQUE))
      .then(() => self.skipWaiting())
  );
});

/* --- activation : on supprime les anciennes versions --- */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(noms => Promise.all(noms.filter(n => n !== VERSION).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

/* --- lecture ---
   pages   : réseau d'abord, cache en secours (tu vois toujours la dernière version)
   images  : cache d'abord, réseau si absente (les vignettes ne se rechargent pas)
   le reste: cache d'abord                                                        */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const estPage = req.mode === 'navigate' || url.pathname.endsWith('.html');

  if (estPage) {
    e.respondWith(
      fetch(req)
        .then(rep => {
          const copie = rep.clone();
          caches.open(VERSION).then(c => c.put(req, copie));
          return rep;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(cache => {
      if (cache) return cache;
      return fetch(req).then(rep => {
        if (rep && rep.status === 200 && rep.type === 'basic') {
          const copie = rep.clone();
          caches.open(VERSION).then(c => c.put(req, copie));
        }
        return rep;
      }).catch(() => cache);
    })
  );
});
