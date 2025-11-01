// sw-unregister.js - Disinstalla Service Worker automaticamente
console.log('🔧 Avvio disinstallazione Service Worker...');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    if (registrations.length === 0) {
      console.log('✅ Nessun Service Worker da disinstallare');
      return;
    }
    
    console.log('📋 Trovati ' + registrations.length + ' Service Worker');
    
    for (let registration of registrations) {
      registration.unregister().then(function(success) {
        if (success) {
          console.log('✅ Service Worker disinstallato:', registration.scope);
        }
      });
    }
    
    // Pulisci anche le cache
    if ('caches' in window) {
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            console.log('🗑️ Rimozione cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(function() {
        console.log('✅ Cache pulite!');
      });
    }
  });
}
