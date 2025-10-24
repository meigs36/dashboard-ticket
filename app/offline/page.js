'use client'

import { WifiOff, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload()
    }
  }

  if (isOnline) {
    window.location.reload()
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
          {/* Icon animato */}
          <div className="mb-6 animate-pulse">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/30">
              <WifiOff className="text-red-600 dark:text-red-400" size={48} />
            </div>
          </div>

          {/* Titolo */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Nessuna Connessione
          </h1>

          {/* Descrizione */}
          <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
            Non sei connesso a Internet. Alcune funzionalità potrebbero non essere disponibili.
            La dashboard si sincronizzerà automaticamente quando torni online.
          </p>

          {/* Pulsante retry */}
          <button
            onClick={handleRetry}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            <RefreshCw size={20} />
            Riprova Connessione
          </button>

          {/* Info aggiuntive */}
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              💡 <strong>Suggerimenti:</strong>
            </p>
            <ul className="text-sm text-left text-gray-600 dark:text-gray-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Verifica la tua connessione Wi-Fi o dati mobili</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Alcune informazioni potrebbero essere disponibili offline</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>I tuoi dati saranno sincronizzati al ripristino della connessione</span>
              </li>
            </ul>
          </div>

          {/* Status indicator */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Offline
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-500">
          <p>Dashboard Ticket System PWA</p>
          <p className="mt-1">Versione 1.0.0</p>
        </div>
      </div>
    </div>
  )
}
