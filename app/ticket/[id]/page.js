'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  MapPin, 
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Edit,
  Trash2,
  Settings,
  Phone,
  Mail,
  Package,
  Wrench
} from 'lucide-react'
import Link from 'next/link'
import TicketActionsModal from '@/components/TicketActionsModal'
import InterventiTab from '@/components/InterventiTab'

export default function TicketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params.id

  const [ticket, setTicket] = useState(null)
  const [cliente, setCliente] = useState(null)
  const [macchinario, setMacchinario] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mostraModalAzioni, setMostraModalAzioni] = useState(false)

  useEffect(() => {
    if (ticketId) {
      loadTicket()
    }
  }, [ticketId])

  async function loadTicket() {
    try {
      setLoading(true)
      setError(null)

      // Carica ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('ticket')
        .select('*')
        .eq('id', ticketId)
        .single()

      if (ticketError) throw ticketError

      setTicket(ticketData)

      // Carica cliente
      if (ticketData.id_cliente) {
        const { data: clienteData, error: clienteError } = await supabase
          .from('clienti')
          .select('*')
          .eq('id', ticketData.id_cliente)
          .single()

        if (!clienteError) {
          setCliente(clienteData)
        }
      }

      // Carica macchinario
      if (ticketData.id_macchinario) {
        const { data: macchinarioData, error: macchinarioError } = await supabase
          .from('macchinari')
          .select('*')
          .eq('id', ticketData.id_macchinario)
          .single()

        if (!macchinarioError) {
          setMacchinario(macchinarioData)
        }
      }

    } catch (err) {
      console.error('Errore caricamento ticket:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleTicketUpdate() {
    loadTicket()
    setMostraModalAzioni(false)
  }

  function getStatoColor(stato) {
    switch (stato) {
      case 'aperto': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'in_lavorazione': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'in_attesa': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'risolto': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'chiuso': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case 'annullato': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  function getPrioritaColor(priorita) {
    switch (priorita) {
      case 'bassa': return 'text-gray-600 dark:text-gray-400'
      case 'media': return 'text-yellow-600 dark:text-yellow-400'
      case 'alta': return 'text-orange-600 dark:text-orange-400'
      case 'critica': return 'text-red-600 dark:text-red-400'
      default: return 'text-gray-600'
    }
  }

  function getPrioritaIcon(priorita) {
    switch (priorita) {
      case 'bassa': return '🔵'
      case 'media': return '🟡'
      case 'alta': return '🟠'
      case 'critica': return '🔴'
      default: return '⚪'
    }
  }

  function getStatoIcon(stato) {
    switch (stato) {
      case 'aperto': return <AlertCircle className="text-yellow-600" size={20} />
      case 'in_lavorazione': return <Clock className="text-blue-600" size={20} />
      case 'in_attesa': return <Clock className="text-purple-600" size={20} />
      case 'risolto': return <CheckCircle2 className="text-green-600" size={20} />
      case 'chiuso': return <CheckCircle2 className="text-gray-600" size={20} />
      case 'annullato': return <XCircle className="text-red-600" size={20} />
      default: return <AlertCircle className="text-gray-600" size={20} />
    }
  }

  function getCategoriaLabel(categoria) {
    const labels = {
      'guasto_macchina': 'Guasto Macchina',
      'manutenzione_software': 'Manutenzione Software',
      'consulenza': 'Consulenza',
      'installazione': 'Installazione',
      'altro': 'Altro'
    }
    return labels[categoria] || categoria
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto text-blue-600 mb-4" size={48} />
          <p className="text-gray-600 dark:text-gray-400">Caricamento ticket...</p>
        </div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <AlertCircle className="mx-auto text-red-600 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Ticket non trovato
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || 'Il ticket richiesto non esiste o non hai i permessi per visualizzarlo.'}
          </p>
          <Link
            href="/ticket"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft size={20} />
            Torna ai Ticket
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            Indietro
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Ticket #{ticket.numero_ticket || ticket.id.slice(0, 8)}
                </h1>
                {getStatoIcon(ticket.stato)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ID: {ticket.id}
              </p>
            </div>

            <button
              onClick={() => setMostraModalAzioni(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Settings size={20} />
              Gestisci Ticket
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonna sinistra - Informazioni */}
          <div className="lg:col-span-1 space-y-6">
            {/* Card Stato e Priorità */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Stato Ticket
              </h2>

              <div className="space-y-4">
                {/* Stato */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Stato</span>
                  <div className="flex items-center gap-2">
                    {getStatoIcon(ticket.stato)}
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatoColor(ticket.stato)}`}>
                      {ticket.stato?.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Priorità */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Priorità</span>
                  <div className="flex items-center gap-2">
                    <span>{getPrioritaIcon(ticket.priorita)}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPrioritaColor(ticket.priorita)}`}>
                      {ticket.priorita?.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Categoria */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Categoria</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {getCategoriaLabel(ticket.categoria)}
                  </span>
                </div>

                {/* Canale Origine */}
                {ticket.canale_origine && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Canale</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {ticket.canale_origine.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Card Cliente */}
            {cliente && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <User size={20} />
                  Cliente
                </h2>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ragione Sociale</p>
                    <Link
                      href={`/clienti/${cliente.id}`}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                    >
                      {cliente.ragione_sociale}
                    </Link>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Codice Cliente</p>
                    <p className="text-sm text-gray-900 dark:text-white font-mono">
                      {cliente.codice_cliente}
                    </p>
                  </div>

                  {cliente.telefono && (
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-gray-400" />
                      <a
                        href={`tel:${cliente.telefono}`}
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        {cliente.telefono}
                      </a>
                    </div>
                  )}

                  {cliente.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-gray-400" />
                      <a
                        href={`mailto:${cliente.email}`}
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 break-all"
                      >
                        {cliente.email}
                      </a>
                    </div>
                  )}

                  {cliente.indirizzo && (
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="text-gray-400 mt-0.5" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {cliente.indirizzo}
                        {cliente.citta && `, ${cliente.citta}`}
                        {cliente.provincia && ` (${cliente.provincia})`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Card Macchinario */}
            {macchinario && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Wrench size={20} />
                  Macchinario
                </h2>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tipo</p>
                    <p className="text-sm text-gray-900 dark:text-white font-medium">
                      {macchinario.tipo_macchinario}
                    </p>
                  </div>

                  {(macchinario.marca || macchinario.modello) && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Marca / Modello</p>
                      <p className="text-sm text-gray-900 dark:text-white font-medium">
                        {macchinario.marca} {macchinario.modello}
                      </p>
                    </div>
                  )}

                  {macchinario.numero_seriale && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Numero Seriale</p>
                      <p className="text-sm text-gray-900 dark:text-white font-mono">
                        {macchinario.numero_seriale}
                      </p>
                    </div>
                  )}

                  {macchinario.anno_installazione && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Anno Installazione</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {macchinario.anno_installazione}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Card Date */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Calendar size={20} />
                Timeline
              </h2>

              <div className="space-y-3">
                {ticket.created_at && (
                  <div className="flex items-start gap-3">
                    <Clock className="text-gray-400 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Creato il</p>
                      <p className="text-sm text-gray-900 dark:text-white font-medium">
                        {new Date(ticket.created_at).toLocaleString('it-IT', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {ticket.updated_at && ticket.updated_at !== ticket.created_at && (
                  <div className="flex items-start gap-3">
                    <Clock className="text-gray-400 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Ultimo aggiornamento</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {new Date(ticket.updated_at).toLocaleString('it-IT', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {ticket.data_chiusura && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="text-green-600 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Chiuso il</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {new Date(ticket.data_chiusura).toLocaleString('it-IT', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Colonna destra - Dettagli e Interventi */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card Oggetto */}
            {ticket.oggetto && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Oggetto
                </h2>
                <p className="text-gray-900 dark:text-white font-medium text-lg">
                  {ticket.oggetto}
                </p>
              </div>
            )}

            {/* Card Descrizione */}
            {ticket.descrizione && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Descrizione
                </h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {ticket.descrizione}
                </p>
              </div>
            )}

            {/* Tab Interventi */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <InterventiTab ticket={ticket} onUpdate={loadTicket} />
            </div>
          </div>
        </div>
      </div>

      {/* Modal Azioni */}
      {mostraModalAzioni && (
        <TicketActionsModal
          ticket={ticket}
          onClose={() => setMostraModalAzioni(false)}
          onUpdate={handleTicketUpdate}
        />
      )}
    </div>
  )
}
