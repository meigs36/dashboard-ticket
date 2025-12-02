'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { 
  ArrowLeft, 
  Clock, 
  Calendar, 
  Wrench, 
  User, 
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Loader2,
  Tag,
  FileText
} from 'lucide-react'
import Link from 'next/link'

export default function DettaglioTicketClientePage() {
  const params = useParams()
  const router = useRouter()
  const { user, customerProfile, loading: authLoading } = useCustomerAuth()
  
  const [ticket, setTicket] = useState(null)
  const [note, setNote] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingNote, setLoadingNote] = useState(true)
  const [error, setError] = useState('')

  // Carica ticket
  useEffect(() => {
    if (params.id && customerProfile?.cliente_id) {
      loadTicket()
    }
  }, [params.id, customerProfile?.cliente_id])

  async function loadTicket() {
    setLoading(true)
    setError('')
    
    try {
      // Carica ticket con macchinario
      const { data: ticketData, error: ticketError } = await supabase
        .from('ticket')
        .select(`
          *,
          macchinari (
            id,
            tipo_macchinario,
            marca,
            modello,
            numero_seriale
          )
        `)
        .eq('id', params.id)
        .eq('id_cliente', customerProfile.cliente_id) // Sicurezza: solo ticket del cliente
        .single()

      if (ticketError) {
        if (ticketError.code === 'PGRST116') {
          setError('Ticket non trovato o non autorizzato')
        } else {
          throw ticketError
        }
        return
      }

      setTicket(ticketData)
      
      // Carica note visibili al cliente
      await loadNote(params.id)
      
    } catch (err) {
      console.error('Errore caricamento ticket:', err)
      setError('Errore nel caricamento del ticket')
    } finally {
      setLoading(false)
    }
  }

  async function loadNote(ticketId) {
    setLoadingNote(true)
    try {
      const { data: noteData, error: noteError } = await supabase
        .from('ticket_note')
        .select('*')
        .eq('id_ticket', ticketId)
        .eq('visibile_portale', true) // IMPORTANTE: Solo note visibili al cliente
        .order('created_at', { ascending: false })

      if (noteError) {
        console.error('Errore caricamento note:', noteError)
        return
      }

      if (!noteData || noteData.length === 0) {
        setNote([])
        return
      }

      // Arricchisci con info autore
      const noteConAutore = await Promise.all(
        noteData.map(async (nota) => {
          try {
            const { data: utente } = await supabase
              .from('utenti')
              .select('nome, cognome')
              .eq('id', nota.id_utente)
              .maybeSingle()
            
            return {
              ...nota,
              autore_nome: utente ? `${utente.nome} ${utente.cognome}` : 'Team Assistenza'
            }
          } catch (err) {
            return {
              ...nota,
              autore_nome: 'Team Assistenza'
            }
          }
        })
      )

      setNote(noteConAutore)
    } catch (err) {
      console.error('Errore:', err)
    } finally {
      setLoadingNote(false)
    }
  }

  // Funzioni helper
  function getStatoConfig(stato) {
    const config = {
      aperto: { label: 'Aperto', color: 'bg-green-100 text-green-800', icon: AlertCircle },
      assegnato: { label: 'Assegnato', color: 'bg-blue-100 text-blue-800', icon: User },
      in_lavorazione: { label: 'In Lavorazione', color: 'bg-yellow-100 text-yellow-800', icon: Wrench },
      in_attesa_cliente: { label: 'In Attesa Risposta', color: 'bg-purple-100 text-purple-800', icon: Clock },
      in_attesa_parti: { label: 'In Attesa Ricambi', color: 'bg-orange-100 text-orange-800', icon: Clock },
      risolto: { label: 'Risolto', color: 'bg-teal-100 text-teal-800', icon: CheckCircle },
      chiuso: { label: 'Chiuso', color: 'bg-gray-100 text-gray-800', icon: CheckCircle }
    }
    return config[stato] || { label: stato, color: 'bg-gray-100 text-gray-800', icon: Tag }
  }

  function getPrioritaConfig(priorita) {
    const config = {
      bassa: { label: 'Bassa', color: 'bg-green-100 text-green-700' },
      media: { label: 'Media', color: 'bg-yellow-100 text-yellow-700' },
      alta: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
      critica: { label: 'Urgente', color: 'bg-red-100 text-red-700' }
    }
    return config[priorita] || { label: priorita, color: 'bg-gray-100 text-gray-700' }
  }

  function formatDate(dateString) {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  function formatDateTime(dateString) {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function isRecente(dataCreazione) {
    const now = new Date()
    const created = new Date(dataCreazione)
    const diffInHours = (now - created) / (1000 * 60 * 60)
    return diffInHours < 48
  }

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Caricamento ticket...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Errore</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link 
            href="/portal/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft size={20} />
            Torna alla Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!ticket) return null

  const statoConfig = getStatoConfig(ticket.stato)
  const prioritaConfig = getPrioritaConfig(ticket.priorita)
  const StatoIcon = statoConfig.icon

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link 
            href="/portal/dashboard"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft size={20} />
            <span>I Miei Ticket</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Ticket Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-mono font-semibold">
                  {ticket.numero_ticket}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 ${statoConfig.color}`}>
                  <StatoIcon size={14} />
                  {statoConfig.label}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {ticket.oggetto}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${prioritaConfig.color}`}>
                Priorità: {prioritaConfig.label}
              </span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Categoria</p>
              <p className="text-sm font-medium text-gray-900">
                {ticket.categoria?.replace(/_/g, ' ') || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Data Apertura</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(ticket.data_creazione)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Ultimo Aggiornamento</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(ticket.updated_at || ticket.data_creazione)}
              </p>
            </div>
            {ticket.data_chiusura && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Data Chiusura</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(ticket.data_chiusura)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Descrizione */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText size={18} className="text-gray-500" />
            Descrizione Problema
          </h2>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {ticket.descrizione || 'Nessuna descrizione'}
          </p>
        </div>

        {/* Macchinario (se presente) */}
        {ticket.macchinari && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Wrench size={18} className="text-gray-500" />
              Macchinario Interessato
            </h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">
                {ticket.macchinari.tipo_macchinario} - {ticket.macchinari.marca} {ticket.macchinari.modello}
              </p>
              <p className="text-sm text-gray-500">
                S/N: {ticket.macchinari.numero_seriale}
              </p>
            </div>
          </div>
        )}

        {/* SEZIONE NOTE / COMUNICAZIONI */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-blue-600" />
            Comunicazioni dal Team
            {note.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                {note.length}
              </span>
            )}
          </h2>

          {loadingNote ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-blue-500" size={24} />
              <span className="ml-2 text-gray-500">Caricamento comunicazioni...</span>
            </div>
          ) : note.length > 0 ? (
            <div className="space-y-4">
              {note.map((nota) => (
                <div 
                  key={nota.id}
                  className="bg-blue-50 border border-blue-100 rounded-xl p-5"
                >
                  {/* Header nota */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                        <User className="text-blue-700" size={18} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {nota.autore_nome}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDateTime(nota.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Badge "Nuovo" per note recenti */}
                    {isRecente(nota.created_at) && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full animate-pulse">
                        Nuovo
                      </span>
                    )}
                  </div>

                  {/* Contenuto nota */}
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {nota.contenuto}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <MessageSquare className="mx-auto text-gray-300 mb-3" size={48} />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Nessuna comunicazione
              </h3>
              <p className="text-gray-500 text-sm">
                Non ci sono ancora messaggi da parte del team tecnico.
              </p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-semibold text-amber-800 mb-2">
            ℹ️ Hai bisogno di ulteriore assistenza?
          </h3>
          <p className="text-sm text-amber-700">
            Per comunicazioni urgenti o aggiornamenti sul ticket, contatta il nostro team 
            telefonicamente al numero <strong>0544 949554</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}
