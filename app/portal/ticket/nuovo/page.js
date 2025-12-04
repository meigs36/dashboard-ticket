// app/portal/ticket/nuovo/page.js
// Pagina creazione nuovo ticket dal portale clienti
//
// 🔧 MODIFICHE APPLICATE (4 Dic 2025):
// 1. ✅ Lettura parametro ?macchinario=xxx dalla URL
// 2. ✅ Preselezione automatica del macchinario nel dropdown
// 3. ✅ Banner informativo quando macchinario è preselezionato
// 4. ✅ Suspense boundary per useSearchParams (Next.js 14+)

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { ArrowLeft, Send, Wrench, AlertCircle, CheckCircle, Info } from 'lucide-react'
import Link from 'next/link'

// ✅ Componente interno che usa useSearchParams
function NuovoTicketForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, customerProfile, loading: authLoading } = useCustomerAuth()
  
  // ✅ Leggi parametro macchinario dalla URL
  const macchinarioIdFromUrl = searchParams.get('macchinario')
  
  const [loading, setLoading] = useState(false)
  const [loadingMacchinari, setLoadingMacchinari] = useState(true)
  const [macchinari, setMacchinari] = useState([])
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  
  // ✅ Info macchinario preselezionato
  const [macchinarioPreselezionato, setMacchinarioPreselezionato] = useState(null)
  
  const [formData, setFormData] = useState({
    id_macchinario: '',
    categoria: 'guasto_macchina',
    oggetto: '',
    descrizione: ''
  })

  // Carica macchinari del cliente
  useEffect(() => {
    const fetchMacchinari = async () => {
      if (!customerProfile?.cliente_id) return
      
      setLoadingMacchinari(true)
      try {
        const { data, error } = await supabase
          .from('macchinari')
          .select('id, tipo_macchinario, marca, modello, numero_seriale')
          .eq('id_cliente', customerProfile.cliente_id)
          .eq('stato', 'attivo')
          .order('tipo_macchinario')
        
        if (error) throw error
        setMacchinari(data || [])
        
        // ✅ Se c'è un macchinario nella URL, preselezionalo
        if (macchinarioIdFromUrl && data) {
          const macchinarioTrovato = data.find(m => m.id === macchinarioIdFromUrl)
          if (macchinarioTrovato) {
            setFormData(prev => ({
              ...prev,
              id_macchinario: macchinarioIdFromUrl
            }))
            setMacchinarioPreselezionato(macchinarioTrovato)
            console.log('✅ Macchinario preselezionato:', macchinarioTrovato)
          }
        }
      } catch (err) {
        console.error('Errore caricamento macchinari:', err)
      } finally {
        setLoadingMacchinari(false)
      }
    }
    
    fetchMacchinari()
  }, [customerProfile?.cliente_id, macchinarioIdFromUrl])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // ✅ Se cambia il macchinario manualmente, aggiorna l'info
    if (name === 'id_macchinario') {
      if (value) {
        const macchinarioSelezionato = macchinari.find(m => m.id === value)
        setMacchinarioPreselezionato(macchinarioSelezionato || null)
      } else {
        setMacchinarioPreselezionato(null)
      }
    }
    
    // Reset errore quando l'utente modifica
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validazione
    if (!formData.oggetto.trim()) {
      setError('Inserisci un oggetto per la richiesta')
      setLoading(false)
      return
    }
    if (!formData.descrizione.trim()) {
      setError('Inserisci una descrizione del problema')
      setLoading(false)
      return
    }

    try {
      const { data, error: insertError } = await supabase
        .from('ticket')
        .insert([{
          id_cliente: customerProfile.cliente_id,
          id_macchinario: formData.id_macchinario || null,
          categoria: formData.categoria,
          oggetto: formData.oggetto.trim(),
          descrizione: formData.descrizione.trim(),
          priorita: 'media',
          canale_origine: 'portale_cliente',
          stato: 'aperto'
        }])
        .select('id, numero_ticket')
        .single()

      if (insertError) throw insertError

      console.log('✅ Ticket creato:', data)
      setSuccess(true)
      
      // Redirect dopo 2 secondi
      setTimeout(() => {
        router.push('/portal/dashboard')
      }, 2000)

    } catch (err) {
      console.error('❌ Errore creazione ticket:', err)
      setError(err.message || 'Errore durante la creazione del ticket. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  // Loading auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Successo
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Richiesta Inviata!
          </h2>
          <p className="text-gray-600 mb-4">
            La tua richiesta di assistenza è stata ricevuta. 
            Ti contatteremo il prima possibile.
          </p>
          <p className="text-sm text-gray-500">
            Reindirizzamento alla dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link 
            href="/portal/dashboard"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft size={20} />
            <span>Torna alla Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Apri Ticket di Assistenza
          </h1>
          <p className="text-gray-600">
            Descrivi il problema e ti risponderemo il prima possibile
          </p>
        </div>

        {/* ✅ Banner macchinario preselezionato */}
        {macchinarioPreselezionato && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Wrench className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-800">
                Ticket per macchinario specifico
              </h3>
              <p className="text-amber-700 text-sm mt-1">
                <strong>{macchinarioPreselezionato.tipo_macchinario}</strong>
                {macchinarioPreselezionato.marca && ` - ${macchinarioPreselezionato.marca}`}
                {macchinarioPreselezionato.modello && ` ${macchinarioPreselezionato.modello}`}
                <span className="text-amber-600"> (Matr: {macchinarioPreselezionato.numero_seriale})</span>
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          
          {/* Info Cliente (readonly) */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <label className="block text-sm font-medium text-blue-800 mb-1">
              Cliente
            </label>
            <p className="text-lg font-semibold text-blue-900">
              {customerProfile?.ragione_sociale || 'Caricamento...'}
            </p>
            {customerProfile?.codice_cliente && (
              <p className="text-sm text-blue-700">
                Cod. {customerProfile.codice_cliente}
              </p>
            )}
          </div>

          {/* Macchinario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Wrench size={16} />
                <span>Macchinario interessato</span>
              </div>
            </label>
            {loadingMacchinari ? (
              <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500">
                Caricamento macchinari...
              </div>
            ) : macchinari.length > 0 ? (
              <select
                name="id_macchinario"
                value={formData.id_macchinario}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
                  formData.id_macchinario ? 'border-amber-300 bg-amber-50' : 'border-gray-300'
                }`}
              >
                <option value="">Seleziona macchinario (opzionale)</option>
                {macchinari.map(mac => (
                  <option key={mac.id} value={mac.id}>
                    {mac.tipo_macchinario} - {mac.marca && `${mac.marca} `}{mac.modello} ({mac.numero_seriale})
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500">
                Nessun macchinario registrato
              </div>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Se il problema riguarda un macchinario specifico, selezionalo dalla lista
            </p>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo di richiesta *
            </label>
            <select
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="guasto_macchina">🔧 Guasto Macchinario</option>
              <option value="manutenzione_software">💻 Problema Software</option>
              <option value="consulenza">💬 Richiesta Informazioni</option>
              <option value="installazione">📦 Installazione / Configurazione</option>
              <option value="altro">📋 Altro</option>
            </select>
          </div>

          {/* Oggetto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Oggetto della richiesta *
            </label>
            <input
              type="text"
              name="oggetto"
              value={formData.oggetto}
              onChange={handleChange}
              required
              maxLength={200}
              placeholder="Es: Riunito non si accende, Errore sul display..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrizione del problema *
            </label>
            <textarea
              name="descrizione"
              value={formData.descrizione}
              onChange={handleChange}
              required
              rows={6}
              placeholder="Descrivi in dettaglio il problema riscontrato, quando è iniziato, eventuali messaggi di errore..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="mt-1 text-sm text-gray-500">
              Più dettagli fornisci, più velocemente potremo aiutarti
            </p>
          </div>

          {/* Errore */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <Link
              href="/portal/dashboard"
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-center font-medium transition-colors"
            >
              Annulla
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Invio in corso...</span>
                </>
              ) : (
                <>
                  <Send size={20} />
                  <span>Invia Richiesta</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-semibold text-amber-800 mb-2">
            ℹ️ Come funziona?
          </h3>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• La tua richiesta verrà presa in carico dal nostro team</li>
            <li>• Riceverai aggiornamenti sullo stato del ticket</li>
            <li>• Per urgenze, contattaci telefonicamente</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// ✅ Loading fallback per Suspense
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Caricamento...</p>
      </div>
    </div>
  )
}

// ✅ Export con Suspense boundary (richiesto da Next.js 14+ per useSearchParams)
export default function NuovoTicketClientePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NuovoTicketForm />
    </Suspense>
  )
}
