'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration.scope);
          
          // Controlla aggiornamenti ogni 60 secondi
          setInterval(() => {
            registration.update();
          }, 60000);
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });
    } else {
      console.log('⚠️ Service Workers not supported in this browser');
    }

    // Log per debug PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('✅ Running in standalone mode (PWA installed)');
    } else {
      console.log('ℹ️ Running in browser mode');
    }
  }, []);

  return null;
}
