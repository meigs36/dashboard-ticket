'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Send, CheckCircle, AlertCircle, Search } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function NuovoTicket() {
  const searchParams = useSearchParams()
  const clienteIdFromUrl = searchParams.get('cliente') // 🆕 Legge parametro ?cliente=ID
  
  const [step, setStep] = useState(1) // 1: form, 2: success
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Dati form
  const [clienti, setClienti] = useState([])
  const [clientiFiltered, setClientiFiltered] = useState([])
  const [searchCliente, setSearchCliente] = useState('')
  const [clienteSelezionato, setClienteSelezionato] = useState(null)
  
  const [macchinari, setMacchinari] = useState([])
  const [macchinarioSelezionato, setMacchinarioSelezionato] = useState(null)
  
  const [formData, setFormData] = useState({
    categoria: 'guasto_macchina',
    priorita: 'media',
    oggetto: '',
    descrizione: '',
    nome_contatto: '',
    telefono_contatto: '',
    email_contatto: ''
  })
  
  const [ticketCreato, setTicketCreato] = useState(null)

  // 🆕 Carica clienti all'avvio
  useEffect(() => {
    loadClienti()
  }, [])

  // 🆕 Precompila cliente se arriva da URL
  useEffect(() => {
    if (clienteIdFromUrl && clienti.length > 0 && !clienteSelezionato) {
      const cliente = clienti.find(c => c.id === clienteIdFromUrl)
      if (cliente) {
        selectCliente(cliente)
      }
    }
  }, [clienteIdFromUrl, clienti, clienteSelezionato])

  // Filtra clienti in base alla ricerca
  useEffect(() => {
    if (searchCliente.length >= 2) {
      const filtered = clienti.filter(c =>
        c.ragione_sociale.toLowerCase().includes(searchCliente.toLowerCase()) ||
        c.codice_cliente.toLowerCase().includes(searchCliente.toLowerCase())
      )
      setClientiFiltered(filtered)
    } else {
      setClientiFiltered([])
    }
  }, [searchCliente, clienti])

  // Carica macchinari quando cliente selezionato
  useEffect(() => {
    if (clienteSelezionato) {
      loadMacchinari(clienteSelezionato.id)
    }
  }, [clienteSelezionato])

  async function loadClienti() {
    try {
      const { data, error } = await supabase
        .from('clienti')
        .select('id, codice_cliente, ragione_sociale, email_riparazioni, telefono_principale')
        .eq('attivo', true)
        .order('ragione_sociale')
      
      if (error) throw error
      setClienti(data || [])
    } catch (err) {
      console.error('Errore caricamento clienti:', err)
    }
  }

  async function loadMacchinari(clienteId) {
    try {
      const { data, error } = await supabase
        .from('macchinari')
        .select('*')
        .eq('id_cliente', clienteId)
        .eq('stato', 'attivo')
        .order('tipo_macchinario')
      
      if (error) throw error
      setMacchinari(data || [])
    } catch (err) {
      console.error('Errore caricamento macchinari:', err)
      setMacchinari([])
    }
  }

  function selectCliente(cliente) {
    setClienteSelezionato(cliente)
    setSearchCliente(cliente.ragione_sociale)
    setClientiFiltered([])
    setMacchinarioSelezionato(null)
    
    // Pre-compila contatti se disponibili
    setFormData(prev => ({
      ...prev,
      email_contatto: cliente.email_riparazioni || '',
      telefono_contatto: cliente.telefono_principale || ''
    }))
  }

  function handleChange(e) {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validazioni
      if (!clienteSelezionato) {
        throw new Error('Seleziona un cliente')
      }
      if (!formData.oggetto || !formData.descrizione) {
        throw new Error('Compila tutti i campi obbligatori')
      }

      // Crea ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('ticket')
        .insert({
          id_cliente: clienteSelezionato.id,
          id_macchinario: macchinarioSelezionato?.id || null,
          canale_origine: 'form_web',
          priorita: formData.priorita,
          categoria: formData.categoria,
          oggetto: formData.oggetto,
          descrizione: formData.descrizione,
          stato: 'aperto',
          comunicazioni_cliente: {
            contatto: {
              nome: formData.nome_contatto,
              telefono: formData.telefono_contatto,
              email: formData.email_contatto
            }
          }
        })
        .select()
        .single()

      if (ticketError) throw ticketError

      // Successo!
      setTicketCreato(ticket)
      setStep(2)

      // TODO: Invia email conferma (lo faremo con n8n o trigger Supabase)
      
    } catch (err) {
      console.error('Errore creazione ticket:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Success Screen
  if (step === 2 && ticketCreato) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Ticket Creato con Successo!
            </h1>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">Numero Ticket</p>
              <p className="text-2xl font-bold text-blue-600 font-mono">
                {ticketCreato.numero_ticket}
              </p>
            </div>

            <p className="text-gray-600 mb-6">
              Ti contatteremo entro <strong>{clienteSelezionato?.livello_sla || '48h'}</strong> per gestire la tua richiesta.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setStep(1)
                  setClienteSelezionato(null)
                  setSearchCliente('')
                  setMacchinarioSelezionato(null)
                  setFormData({
                    categoria: 'guasto_macchina',
                    priorita: 'media',
                    oggetto: '',
                    descrizione: '',
                    nome_contatto: '',
                    telefono_contatto: '',
                    email_contatto: ''
                  })
                  setTicketCreato(null)
                }}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Crea Nuovo Ticket
              </button>
              
              <Link
                href="/"
                className="block w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Torna alla Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main Form
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Torna alla Dashboard</span>
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Crea Nuovo Ticket
          </h1>
          <p className="text-gray-600">
            Compila il modulo per aprire una nuova richiesta di assistenza
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-red-900">Errore</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          
          {/* 🆕 Info se cliente precompilato */}
          {clienteIdFromUrl && clienteSelezionato && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                ℹ️ Cliente selezionato automaticamente: <strong>{clienteSelezionato.ragione_sociale}</strong>
              </p>
            </div>
          )}

          {/* Selezione Cliente */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cliente <span className="text-red-500">*</span>
            </label>
            
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Cerca cliente per nome o codice..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchCliente}
                  onChange={(e) => setSearchCliente(e.target.value)}
                  disabled={!!clienteIdFromUrl} // 🆕 Disabilita se arriva da URL
                />
              </div>
              
              {/* Dropdown risultati */}
              {clientiFiltered.length > 0 && !clienteIdFromUrl && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {clientiFiltered.map(cliente => (
                    <button
                      key={cliente.id}
                      type="button"
                      onClick={() => selectCliente(cliente)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <p className="font-medium text-gray-900">{cliente.ragione_sociale}</p>
                      <p className="text-sm text-gray-500">Cod. {cliente.codice_cliente}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Cliente selezionato */}
            {clienteSelezionato && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  ✓ Cliente selezionato: <strong>{clienteSelezionato.ragione_sociale}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Selezione Macchinario (opzionale) */}
          {clienteSelezionato && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Macchinario (opzionale)
              </label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={macchinarioSelezionato?.id || ''}
                onChange={(e) => {
                  const macc = macchinari.find(m => m.id === e.target.value)
                  setMacchinarioSelezionato(macc || null)
                }}
              >
                <option value="">Nessun macchinario specifico</option>
                {macchinari.map(macc => (
                  <option key={macc.id} value={macc.id}>
                    {macc.tipo_macchinario} - {macc.modello} (SN: {macc.numero_seriale})
                  </option>
                ))}
              </select>
              {macchinari.length === 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  Nessun macchinario disponibile per questo cliente
                </p>
              )}
            </div>
          )}

          {/* Categoria */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria <span className="text-red-500">*</span>
            </label>
            <select
              name="categoria"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.categoria}
              onChange={handleChange}
              required
            >
              <option value="guasto_macchina">Guasto Macchina</option>
              <option value="manutenzione_software">Manutenzione Software</option>
              <option value="consulenza">Consulenza</option>
              <option value="installazione">Installazione</option>
              <option value="altro">Altro</option>
            </select>
          </div>

          {/* Priorità */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priorità <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['bassa', 'media', 'alta'].map(priorita => (
                <button
                  key={priorita}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, priorita }))}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-colors ${
                    formData.priorita === priorita
                      ? priorita === 'alta' 
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : priorita === 'media'
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-gray-500 bg-gray-50 text-gray-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {priorita.charAt(0).toUpperCase() + priorita.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Oggetto */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Oggetto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="oggetto"
              placeholder="Es: Errore schermo stampante"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.oggetto}
              onChange={handleChange}
              required
            />
          </div>

          {/* Descrizione */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrizione <span className="text-red-500">*</span>
            </label>
            <textarea
              name="descrizione"
              placeholder="Descrivi il problema in dettaglio..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-32"
              value={formData.descrizione}
              onChange={handleChange}
              required
            />
          </div>

          {/* Dati Contatto */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-4">Dati Contatto</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Referente
                </label>
                <input
                  type="text"
                  name="nome_contatto"
                  placeholder="Nome e Cognome"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.nome_contatto}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefono
                  </label>
                  <input
                    type="tel"
                    name="telefono_contatto"
                    placeholder="+39 ..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.telefono_contatto}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email_contatto"
                    placeholder="email@esempio.it"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.email_contatto}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Link
              href="/"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Annulla
            </Link>
            
            <button
              type="submit"
              disabled={loading || !clienteSelezionato}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Creazione...</span>
                </>
              ) : (
                <>
                  <Send size={20} />
                  <span>Crea Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
