'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'  // AGGIUNTO
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
  Wrench,
  MessageSquare  // AGGIUNTO per icona note
} from 'lucide-react'
import Link from 'next/link'
import TicketActionsModal from '@/components/TicketActionsModal'
import InterventiTab from '@/components/InterventiTab'
import NoteTicketForm from '@/components/NoteTicketForm'  // AGGIUNTO

export default function TicketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params.id
  const { userProfile } = useAuth()  // AGGIUNTO

  const [ticket, setTicket] = useState(null)
  const [cliente, setCliente] = useState(null)
  const [macchinario, setMacchinario] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mostraModalAzioni, setMostraModalAzioni] = useState(false)
  
  // AGGIUNTO: stato per note
  const [noteTicket, setNoteTicket] = useState([])
  const [loadingNote, setLoadingNote] = useState(false)

  useEffect(() => {
    if (ticketId) {
      loadTicket()
      loadNoteTicket()  // AGGIUNTO
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

  // AGGIUNTO: Funzione per caricare le note
  async function loadNoteTicket() {
    try {
      setLoadingNote(true)
      
      const { data, error } = await supabase
        .from('ticket_note')
        .select(`
          *,
          utente:id_utente(nome, cognome)
        `)
        .eq('id_ticket', ticketId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setNoteTicket(data || [])
      
    } catch (err) {
      console.error('Errore caricamento note:', err)
    } finally {
      setLoadingNote(false)
    }
  }

  function handleTicketUpdate() {
    loadTicket()
    setMostraModalAzioni(false)
  }

  // AGGIUNTO: Handler per quando viene aggiunta una nota
  function handleNotaAggiunta(nota) {
    loadNoteTicket()  // Ricarica le note
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

  // AGGIUNTO: Helper per formattare il tipo nota
  function getTipoNotaLabel(tipo) {
    const labels = {
      'nota_interna': '🔒 Nota Interna',
      'commento_cliente': '💬 Nota al Cliente',
      'cambio_stato': '🔄 Cambio Stato',
      'assegnazione': '👤 Assegnazione'
    }
    return labels[tipo] || tipo
  }

  // AGGIUNTO: Helper per colore tipo nota
  function getTipoNotaColor(tipo) {
    switch (tipo) {
      case 'nota_interna': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'commento_cliente': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cambio_stato': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'assegnazione': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
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
              <Settings size={18} />
              Gestisci Ticket
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonna sinistra - Info */}
          <div className="space-y-6">
            {/* Card Stato e Priorità */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Stato Ticket
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Stato</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatoColor(ticket.stato)}`}>
                    {ticket.stato?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Priorità</span>
                  <span className={`font-medium ${getPrioritaColor(ticket.priorita)}`}>
                    {getPrioritaIcon(ticket.priorita)} {ticket.priorita?.toUpperCase()}
                  </span>
                </div>

                {ticket.categoria && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Categoria</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {getCategoriaLabel(ticket.categoria)}
                    </span>
                  </div>
                )}

                {ticket.canale_origine && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Origine</span>
                    <span className="text-gray-900 dark:text-white capitalize">
                      {ticket.canale_origine?.replace('_', ' ')}
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

            {/* ========== SEZIONE NOTE - AGGIUNTA ========== */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <MessageSquare size={20} />
                Note e Comunicazioni
              </h2>

              {/* Form per aggiungere nota */}
              {userProfile && ticket && cliente && (
                <NoteTicketForm
                  ticketId={ticket.id}
                  clienteId={cliente.id}
                  utente={userProfile}
                  onNotaAggiunta={handleNotaAggiunta}
                />
              )}

              {/* Lista note esistenti */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Storico Note ({noteTicket.length})
                </h3>

                {loadingNote ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-gray-400" size={24} />
                  </div>
                ) : noteTicket.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Nessuna nota presente
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {noteTicket.map((nota) => (
                      <div 
                        key={nota.id} 
                        className={`p-4 rounded-lg border ${getTipoNotaColor(nota.tipo)}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-xs font-medium">
                            {getTipoNotaLabel(nota.tipo)}
                          </span>
                          <span className="text-xs opacity-75">
                            {new Date(nota.created_at).toLocaleString('it-IT', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        
                        <p className="text-sm whitespace-pre-wrap">
                          {nota.contenuto}
                        </p>
                        
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs opacity-75">
                            di {nota.utente?.nome} {nota.utente?.cognome}
                          </span>
                          
                          {/* Indicatore email inviata */}
                          {nota.tipo === 'commento_cliente' && nota.email_inviata && (
                            <span className="text-xs flex items-center gap-1 text-green-600">
                              <Mail size={12} />
                              Email inviata
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* ========== FINE SEZIONE NOTE ========== */}

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
