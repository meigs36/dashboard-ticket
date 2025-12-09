// hooks/useInstallPWA.js
// Hook per gestire l'installazione della PWA su iOS e Android
//
// Funzionalità:
// - Rileva se l'app è già installata
// - Gestisce il prompt di installazione nativo (Android/Chrome)
// - Fornisce istruzioni per iOS (Safari)
// - Traccia stato installazione

'use client'

import { useState, useEffect, useCallback } from 'react'

export function useInstallPWA() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)

  useEffect(() => {
    // Rileva piattaforma
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)
    const isAndroidDevice = /android/.test(userAgent)
    const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent)
    
    setIsIOS(isIOSDevice)
    setIsAndroid(isAndroidDevice)

    // Rileva se già in modalità standalone (installata)
    const isInStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    
    setIsStandalone(isInStandaloneMode)
    setIsInstalled(isInStandaloneMode)

    // Listener per prompt di installazione (Chrome/Edge/Android)
    const handleBeforeInstallPrompt = (e) => {
      console.log('📱 beforeinstallprompt event fired')
      e.preventDefault()
      setInstallPrompt(e)
      setIsInstallable(true)
    }

    // Listener per installazione completata
    const handleAppInstalled = () => {
      console.log('✅ App installed successfully')
      setIsInstalled(true)
      setIsInstallable(false)
      setInstallPrompt(null)
      
      // Salva in localStorage
      localStorage.setItem('pwa-installed', 'true')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Check se già installata (da localStorage)
    if (localStorage.getItem('pwa-installed') === 'true') {
      setIsInstalled(true)
    }

    // Per iOS, mostra prompt se:
    // 1. È iOS
    // 2. È Safari (non Chrome/Firefox su iOS)
    // 3. Non è già in standalone mode
    // 4. Non ha già dismissato il prompt
    if (isIOSDevice && isSafari && !isInStandaloneMode) {
      const hasSeenIOSPrompt = localStorage.getItem('ios-prompt-dismissed')
      if (!hasSeenIOSPrompt) {
        // Mostra dopo 3 secondi per non essere troppo invasivo
        setTimeout(() => setShowIOSPrompt(true), 3000)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Funzione per installare (Android/Chrome)
  const installPWA = useCallback(async () => {
    if (!installPrompt) {
      console.warn('❌ No install prompt available')
      return false
    }

    try {
      console.log('📱 Showing install prompt...')
      installPrompt.prompt()
      
      const { outcome } = await installPrompt.userChoice
      console.log('📱 Install prompt outcome:', outcome)
      
      if (outcome === 'accepted') {
        setIsInstalled(true)
        localStorage.setItem('pwa-installed', 'true')
      }
      
      setInstallPrompt(null)
      setIsInstallable(false)
      
      return outcome === 'accepted'
    } catch (error) {
      console.error('❌ Install prompt error:', error)
      return false
    }
  }, [installPrompt])

  // Funzione per dismissare il prompt iOS
  const dismissIOSPrompt = useCallback((dontShowAgain = false) => {
    setShowIOSPrompt(false)
    if (dontShowAgain) {
      localStorage.setItem('ios-prompt-dismissed', 'true')
    }
  }, [])

  // Funzione per resettare lo stato (per debug)
  const resetInstallState = useCallback(() => {
    localStorage.removeItem('pwa-installed')
    localStorage.removeItem('ios-prompt-dismissed')
    setIsInstalled(false)
    setShowIOSPrompt(false)
  }, [])

  return {
    // Stato
    isInstallable,      // Può essere installata (prompt disponibile)
    isInstalled,        // Già installata
    isStandalone,       // In esecuzione come app standalone
    isIOS,              // È un dispositivo iOS
    isAndroid,          // È un dispositivo Android
    showIOSPrompt,      // Mostrare le istruzioni iOS
    
    // Azioni
    installPWA,         // Avvia installazione (Android/Chrome)
    dismissIOSPrompt,   // Chiudi prompt iOS
    resetInstallState,  // Reset per debug
  }
}

export default useInstallPWA
