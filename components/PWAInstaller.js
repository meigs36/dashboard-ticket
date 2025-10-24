'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // Ascolta l'evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      console.log('beforeinstallprompt event fired');
      // Previeni il prompt automatico del browser
      e.preventDefault();
      // Salva l'evento per usarlo dopo
      setDeferredPrompt(e);
      // Mostra il banner personalizzato
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Controlla se l'app è già installata
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App già installata');
      setShowInstallBanner(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    console.log('Install button clicked');
    
    if (!deferredPrompt) {
      console.log('No deferred prompt available');
      // Se non c'è il prompt, potrebbe essere già installata o non disponibile
      alert('L\'installazione non è disponibile. L\'app potrebbe essere già installata o il browser non supporta l\'installazione.');
      return;
    }

    // Mostra il prompt nativo del browser
    deferredPrompt.prompt();
    
    // Aspetta la scelta dell'utente
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // Pulisci il prompt
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    // Salva che l'utente ha chiuso il banner
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Non mostrare se già installata o se è stato chiuso
  if (!showInstallBanner) {
    return null;
  }

  return (
    <>
      {/* Banner Desktop - top */}
      <div className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5" />
            <div>
              <p className="font-semibold text-sm">Installa Odonto Service</p>
              <p className="text-xs text-blue-100">Accesso rapido e funzionalità offline</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors"
            >
              Installa App
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-blue-600 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Banner Mobile - bottom */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Download className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-sm">
                Installa Odonto Service
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Installabile come app nativa su tutti i dispositivi
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
                >
                  Installa
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-gray-600 text-sm hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Dopo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
