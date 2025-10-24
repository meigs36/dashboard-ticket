'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Download, X } from 'lucide-react'

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [swRegistration, setSwRegistration] = useState(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    // Verifica se l'app è già installata
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      console.log('[PWA] App is running in standalone mode')
    }

    // Registra Service Worker
    if ('serviceWorker' in navigator) {
      registerServiceWorker()
    }

    // Gestisci evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      console.log('[PWA] beforeinstallprompt event fired')
      e.preventDefault()
      setDeferredPrompt(e)
      
      // Mostra il banner di installazione dopo un breve ritardo
      setTimeout(() => {
        if (!isInstalled) {
          setShowInstallPrompt(true)
        }
      }, 3000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Gestisci installazione completata
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully')
      setIsInstalled(true)
      setShowInstallPrompt(false)
      toast.success('App installata con successo! 🎉')
    })

    // Rileva se l'app è già installata su iOS
    if (window.navigator.standalone === true) {
      setIsInstalled(true)
      console.log('[PWA] iOS standalone mode detected')
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [isInstalled])

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      console.log('[PWA] Service Worker registered:', registration)
      setSwRegistration(registration)

      // Controlla aggiornamenti
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New version available')
            setUpdateAvailable(true)
            toast('Nuovo aggiornamento disponibile!', {
              icon: '🔄',
              duration: Infinity,
              action: {
                label: 'Aggiorna',
                onClick: () => updateServiceWorker()
              }
            })
          }
        })
      })

      // Controlla aggiornamenti ogni ora
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)
      
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error)
    }
  }

  function updateServiceWorker() {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  async function handleInstallClick() {
    if (!deferredPrompt) {
      console.log('[PWA] No deferred prompt available')
      return
    }

    // Mostra il prompt di installazione nativo
    deferredPrompt.prompt()

    // Aspetta la scelta dell'utente
    const { outcome } = await deferredPrompt.userChoice
    console.log('[PWA] User choice:', outcome)

    if (outcome === 'accepted') {
      toast.success('Installazione avviata...')
    }

    // Reset del prompt
    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  function handleDismiss() {
    setShowInstallPrompt(false)
    // Nascondi per 7 giorni
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  // Non mostrare il banner se è stato dismisso recentemente
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)
      
      if (daysSinceDismissed < 7) {
        setShowInstallPrompt(false)
      }
    }
  }, [])

  // Banner di installazione
  if (showInstallPrompt && !isInstalled) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-2xl p-4 z-50 animate-slide-up">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Chiudi"
        >
          <X size={16} />
        </button>
        
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <Download size={24} />
          </div>
          
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Installa l'App</h3>
            <p className="text-sm text-white/90 mb-3">
              Aggiungi Dashboard Ticket alla tua home screen per un accesso rapido e funzionalità offline!
            </p>
            
            <button
              onClick={handleInstallClick}
              className="w-full px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
            >
              Installa Ora
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

// Hook personalizzato per usare le funzionalità PWA
export function usePWA() {
  const [isOnline, setIsOnline] = useState(true)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Status online/offline
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      toast.success('Connessione ripristinata! 🌐')
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      toast.error('Sei offline. Alcune funzionalità potrebbero non essere disponibili.')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Verifica modalità standalone
    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    )

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    isOnline,
    isStandalone
  }
}
