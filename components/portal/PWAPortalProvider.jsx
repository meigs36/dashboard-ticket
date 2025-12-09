// components/portal/PWAPortalProvider.jsx
// Provider PWA per Portale Clienti
// Registra sw-portal.js con scope /portal/

'use client'

import { useEffect } from 'react'

export default function PWAPortalProvider({ children }) {
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    // Solo in produzione
    if (process.env.NODE_ENV === 'development') {
      console.log('[PWA-Portal] Dev mode: skip SW')
      return
    }

    // Solo se siamo nel portale
    if (!window.location.pathname.startsWith('/portal')) return

    // Registra SW con scope limitato al portale
    navigator.serviceWorker.register('/sw-portal.js', {
      scope: '/portal/',
    })
    .then(reg => console.log('[PWA-Portal] SW registrato:', reg.scope))
    .catch(err => console.error('[PWA-Portal] Errore SW:', err))

  }, [])

  return <>{children}</>
}
