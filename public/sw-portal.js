// public/sw-portal.js
// Service Worker MINIMALE per Portale Clienti ODONTO SERVICE
// 
// SCOPO: Solo per permettere installazione PWA su Android/Chrome
// NON FA: caching, offline mode, notifiche push
// SCOPE: /portal/

const SW_VERSION = 'portal-1.0.0';

self.addEventListener('install', (event) => {
  console.log('[SW-Portal] Install v' + SW_VERSION);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW-Portal] Activate');
  event.waitUntil(self.clients.claim());
});

// NON intercetta fetch - dati sempre freschi dal server
self.addEventListener('fetch', (event) => {
  return;
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
