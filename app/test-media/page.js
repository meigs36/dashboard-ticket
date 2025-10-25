// app/test-media/page.js
'use client'

import { useState, useEffect } from 'react'
import InterventoMediaCapture from '@/components/InterventoMediaCapture'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

/**
 * PAGINA DI TEST per il sistema Media Capture - VERSIONE CORRETTA CON UUID
 * 
 * Accedi a: /test-media
 * 
 * Questa pagina ti permette di testare rapidamente:
 * - Registrazione audio
 * - Cattura foto
 * - Upload su Supabase
 * - Visualizzazione gallery
 */
export default function TestMediaPage() {
  const { user } = useAuth()
  const [interventoIdTest, setInterventoIdTest] = useState(null)
  const [interventiDisponibili, setInterventiDisponibili] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadInterventi()
    }
  }, [user])

  async function loadInterventi() {
    try {
      // Carica gli ultimi 10 interventi dell'utente
      const { data, error } = await supabase
        .from('interventi')
        .select(`
          id,
          data_intervento,
          tipo_attivita,
          ticket:ticket_id(numero_ticket, oggetto)
        `)
        .eq('id_tecnico', user.id)
        .order('data_intervento', { ascending: false })
        .limit(10)

      if (error) throw error

      setInterventiDisponibili(data || [])
      
      // Seleziona automaticamente il primo intervento
      if (data && data.length > 0) {
        setInterventoIdTest(data[0].id)
      }
    } catch (error) {
      console.error('Errore caricamento interventi:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            ⚠️ Login Richiesto
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Devi essere autenticato per testare il sistema media
          </p>
          <a
            href="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Vai al Login
          </a>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (interventiDisponibili.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            ⚠️ Nessun Intervento Disponibile
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Per testare il sistema media, devi prima creare almeno un intervento.
          </p>
          <a
            href="/dashboard"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
          >
            Vai alla Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              🧪 Test Media Capture System
            </h1>
            <a
              href="/dashboard"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Torna alla Dashboard
            </a>
          </div>

          {/* Selettore Intervento */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <h2 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
              🎯 Seleziona Intervento per Test
            </h2>
            <select
              value={interventoIdTest || ''}
              onChange={(e) => setInterventoIdTest(e.target.value)}
              className="w-full px-4 py-2 border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {interventiDisponibili.map((intervento) => (
                <option key={intervento.id} value={intervento.id}>
                  {intervento.ticket?.numero_ticket || 'N/A'} - {intervento.tipo_attivita || 'N/A'} - {new Date(intervento.data_intervento).toLocaleDateString('it-IT')}
                </option>
              ))}
            </select>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">
              💡 Gli allegati saranno collegati all'intervento selezionato
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h2 className="font-semibold text-green-900 dark:text-green-100 mb-2">
              ℹ️ Modalità Test (con Intervento Reale)
            </h2>
            <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
              <li>✅ Utente: <strong>{user.email}</strong></li>
              <li>✅ Intervento ID: <strong>{interventoIdTest}</strong></li>
              <li>✅ I file caricati saranno reali e collegati all'intervento selezionato</li>
              <li>💡 Puoi visualizzarli/eliminarli nella tab "Interventi" del ticket</li>
            </ul>
          </div>
        </div>

        {/* Istruzioni */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            📋 Come Testare
          </h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                1️⃣ Test Audio
              </h4>
              <ol className="list-decimal list-inside text-gray-600 dark:text-gray-400 space-y-1 text-sm ml-4">
                <li>Click su tab "Registra Audio"</li>
                <li>Click "Inizia Registrazione"</li>
                <li>Parla per 5-10 secondi (es: "Questo è un test di registrazione audio")</li>
                <li>Click "Stop" (quadrato rosso)</li>
                <li>Ascolta il playback</li>
                <li>Click "Carica Audio"</li>
                <li>Verifica in tab "Allegati" che l'audio sia presente</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                2️⃣ Test Foto
              </h4>
              <ol className="list-decimal list-inside text-gray-600 dark:text-gray-400 space-y-1 text-sm ml-4">
                <li>Click su tab "Aggiungi Foto"</li>
                <li>Click "Scatta/Seleziona Foto"</li>
                <li>Su mobile: scatta una foto | Su desktop: seleziona immagine</li>
                <li>Verifica preview della foto</li>
                <li>Opzionale: aggiungi altre foto</li>
                <li>Click "Carica X Foto"</li>
                <li>Verifica in tab "Allegati"</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                3️⃣ Test Elimina
              </h4>
              <ol className="list-decimal list-inside text-gray-600 dark:text-gray-400 space-y-1 text-sm ml-4">
                <li>Vai in tab "Allegati"</li>
                <li>Passa il mouse su un allegato</li>
                <li>Click cestino (🗑️)</li>
                <li>Conferma eliminazione</li>
                <li>Verifica che l'allegato sia sparito</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Componente Media Capture */}
        {interventoIdTest && (
          <InterventoMediaCapture
            interventoId={interventoIdTest}
            onMediaUploaded={(media) => {
              console.log('✅ Media caricato in test:', media)
              
              // Mostra notifica
              const notification = document.createElement('div')
              notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce'
              notification.textContent = `✅ ${media.tipo.toUpperCase()} caricato con successo!`
              document.body.appendChild(notification)
              
              setTimeout(() => {
                notification.remove()
              }, 3000)
            }}
          />
        )}

        {/* Debug Info */}
        <div className="mt-8 bg-gray-800 text-green-400 rounded-lg p-4 font-mono text-xs">
          <div className="font-semibold mb-2">🐛 Debug Info</div>
          <div>User ID: {user?.id || 'N/A'}</div>
          <div>Intervento ID: {interventoIdTest}</div>
          <div>Storage Bucket: interventi-media</div>
          <div>Timestamp: {new Date().toISOString()}</div>
          <div>Interventi disponibili: {interventiDisponibili.length}</div>
        </div>

        {/* Checklist Verifica */}
        <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-3">
            ✔️ Checklist Verifica Sistema
          </h3>
          <div className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              Registrazione audio funziona
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              Upload audio su Supabase Storage
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              Cattura foto da camera/galleria
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              Upload foto su Supabase Storage
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              Visualizzazione gallery allegati
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              Playback audio funziona
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              Visualizzazione foto in full size
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              Eliminazione allegati funziona
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              Responsive su mobile
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              Funziona offline (PWA)
            </label>
          </div>
        </div>

        {/* Link Utili */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
            Link Utili per Debug:
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="https://app.supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              📊 Supabase Dashboard
            </a>
            <a
              href="https://app.supabase.com/project/_/storage/buckets"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              💾 Storage Buckets
            </a>
            <a
              href="https://app.supabase.com/project/_/editor"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              🗃️ Database Editor
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
