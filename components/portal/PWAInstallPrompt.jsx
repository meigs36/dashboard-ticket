// components/PWAInstallPrompt.jsx
// Componente per mostrare il prompt di installazione PWA
//
// Supporta:
// - Android/Chrome: prompt nativo
// - iOS/Safari: istruzioni manuali
// - Desktop: banner discreto

'use client'

import { useState, useEffect } from 'react'
import { useInstallPWA } from '@/hooks/useInstallPWA'
import { X, Download, Share, Plus, Smartphone, Monitor, CheckCircle2 } from 'lucide-react'

export default function PWAInstallPrompt() {
  const {
    isInstallable,
    isInstalled,
    isStandalone,
    isIOS,
    isAndroid,
    showIOSPrompt,
    installPWA,
    dismissIOSPrompt,
  } = useInstallPWA()

  const [showBanner, setShowBanner] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  // Mostra banner dopo 5 secondi se installabile
  useEffect(() => {
    if (isInstallable && !isInstalled && !isStandalone) {
      const timer = setTimeout(() => setShowBanner(true), 5000)
      return () => clearTimeout(timer)
    }
  }, [isInstallable, isInstalled, isStandalone])

  // Gestisci installazione
  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      await installPWA()
    } finally {
      setIsInstalling(false)
      setShowBanner(false)
    }
  }

  // Chiudi banner
  const closeBanner = () => {
    setShowBanner(false)
    // Rimostra dopo 1 giorno
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString())
  }

  // Non mostrare se già installato o in standalone mode
  if (isInstalled || isStandalone) {
    return null
  }

  // ==================== iOS PROMPT ====================
  if (showIOSPrompt && isIOS) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Installa l'App</h3>
                  <p className="text-blue-100 text-sm">ODONTO SERVICE</p>
                </div>
              </div>
              <button
                onClick={() => dismissIOSPrompt(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Contenuto */}
          <div className="p-5">
            <p className="text-gray-600 mb-4">
              Installa il Portale Clienti sul tuo iPhone per un accesso rapido e un'esperienza migliore.
            </p>

            {/* Steps per iOS */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-sm">1</span>
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 font-medium">
                    Tocca l'icona <Share className="w-5 h-5 inline text-blue-600 mx-1" /> Condividi
                  </p>
                  <p className="text-gray-500 text-sm">Nella barra in basso di Safari</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-sm">2</span>
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 font-medium">
                    Scorri e tocca "Aggiungi alla schermata Home"
                  </p>
                  <p className="text-gray-500 text-sm">
                    <Plus className="w-4 h-4 inline mr-1" />
                    Aggiungi alla schermata Home
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 font-medium">Tocca "Aggiungi"</p>
                  <p className="text-gray-500 text-sm">L'app apparirà nella tua Home</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 pt-2 flex gap-3">
            <button
              onClick={() => dismissIOSPrompt(true)}
              className="flex-1 px-4 py-3 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Non mostrare più
            </button>
            <button
              onClick={() => dismissIOSPrompt(false)}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              Ho capito
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ==================== ANDROID/CHROME BANNER ====================
  if (showBanner && isInstallable) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm animate-slide-up">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Header colorato */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  {isAndroid ? (
                    <Smartphone className="w-5 h-5 text-white" />
                  ) : (
                    <Monitor className="w-5 h-5 text-white" />
                  )}
                </div>
                <span className="font-bold text-white">Installa l'App</span>
              </div>
              <button
                onClick={closeBanner}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Contenuto */}
          <div className="p-4">
            <p className="text-gray-600 text-sm mb-4">
              Installa ODONTO SERVICE per un accesso rapido dalla schermata Home del tuo dispositivo.
            </p>

            {/* Vantaggi */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                ⚡ Accesso rapido
              </span>
              <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                📴 Funziona offline
              </span>
              <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
                🔔 Notifiche
              </span>
            </div>

            {/* Pulsanti */}
            <div className="flex gap-2">
              <button
                onClick={closeBanner}
                className="flex-1 px-3 py-2.5 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Più tardi
              </button>
              <button
                onClick={handleInstall}
                disabled={isInstalling}
                className="flex-1 px-3 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isInstalling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Installazione...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Installa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

// ==================== MINI INSTALL BUTTON ====================
// Pulsante compatto per l'header/menu
export function PWAInstallButton({ className = '' }) {
  const { isInstallable, isInstalled, isStandalone, installPWA, isIOS } = useInstallPWA()
  const [showIOSModal, setShowIOSModal] = useState(false)

  if (isInstalled || isStandalone) {
    return null
  }

  const handleClick = () => {
    if (isIOS) {
      setShowIOSModal(true)
    } else if (isInstallable) {
      installPWA()
    }
  }

  if (!isInstallable && !isIOS) {
    return null
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium ${className}`}
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Installa App</span>
      </button>

      {/* Modal iOS */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-4">Installa su iPhone</h3>
            <ol className="space-y-3 text-gray-600 mb-6">
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">1.</span>
                <span>Tocca <Share className="w-4 h-4 inline text-blue-600" /> in Safari</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">2.</span>
                <span>Seleziona "Aggiungi alla schermata Home"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">3.</span>
                <span>Tocca "Aggiungi"</span>
              </li>
            </ol>
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium"
            >
              Ho capito
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ==================== STILI CSS ====================
// Aggiungi questi stili al tuo globals.css o usa Tailwind
/*
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
*/
