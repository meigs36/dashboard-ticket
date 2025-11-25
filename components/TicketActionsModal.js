'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { 
  X, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  User, 
  MessageSquare, 
  Send,
  History,
  Briefcase,
  Edit3,
  FileText
} from 'lucide-react'
import InterventiTab from './InterventiTab'

export default function TicketActionsModal({ ticket, onClose, onUpdate }) {
  const { userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('azioni')
  const [loading, setLoading] = useState(false)

  // Stati per modifiche ticket
  const [nuovoStato, setNuovoStato] = useState(ticket.stato)
  const [nuovaPriorita, setNuovaPriorita] = useState(ticket.priorita)
  const [tecnicoAssegnato, setTecnicoAssegnato] = useState(ticket.id_tecnico_assegnato || '')
  const [oggetto, setOggetto] = useState(ticket.oggetto || '')
  const [descrizione, setDescrizione] = useState(ticket.descrizione || '')

  // Stati per note
  const [note, setNote] = useState([])
  const [nuovaNota, setNuovaNota] = useState('')
  const [tipoNota, setTipoNota] = useState('nota_interna')
  const [loadingNote, setLoadingNote] = useState(false)
  const [notaInModifica, setNotaInModifica] = useState(null)
  const [testoModifica, setTestoModifica] = useState('')

  // Stati per storico
  const [storico, setStorico] = useState([])
  const [loadingStorico, setLoadingStorico] = useState(false)

  // Stati per tecnici
  const [tecnici, setTecnici] = useState([])

  useEffect(() => {
    loadTecnici()
    if (activeTab === 'note') {
      loadNote()
    }
    if (activeTab === 'storico') {
      loadStorico()
    }
  }, [activeTab])

  async function loadTecnici() {
    try {
      const { data, error } = await supabase
        .from('utenti')
        .select('id, nome, cognome, email')
        .eq('ruolo', 'tecnico')
        .eq('attivo', true)
        .order('nome')

      if (error) throw error
      setTecnici(data || [])
    } catch (error) {
      console.error('Errore caricamento tecnici:', error)
    }
  }

  async function loadNote() {
    setLoadingNote(true)
    try {
      // Carica note senza JOIN automatico
      const { data: noteData, error: noteError } = await supabase
        .from('ticket_note')
        .select('*')
        .eq('id_ticket', ticket.id)
        .order('created_at', { ascending: false })

      if (noteError) throw noteError
      
      if (!noteData || noteData.length === 0) {
        setNote([])
        return
      }
      
      // Per ogni nota, carica l'utente manualmente
      const noteConUtenti = await Promise.all(
        noteData.map(async (nota) => {
          try {
            const { data: utente } = await supabase
              .from('utenti')
              .select('nome, cognome, email')
              .eq('id', nota.id_utente)
              .maybeSingle()
            
            return {
              ...nota,
              autore: utente,
              utente_nome: utente ? `${utente.nome} ${utente.cognome}` : 'Utente Sconosciuto',
              utente_email: utente?.email || null
            }
          } catch (err) {
            console.error('Errore caricamento utente per nota:', nota.id, err)
            return {
              ...nota,
              autore: null,
              utente_nome: 'Utente Sconosciuto',
              utente_email: null
            }
          }
        })
      )
      
      setNote(noteConUtenti)
    } catch (error) {
      console.error('Errore caricamento note:', error)
      setNote([])
    } finally {
      setLoadingNote(false)
    }
  }

  async function loadStorico() {
    setLoadingStorico(true)
    try {
      // Carica storico senza JOIN automatico
      const { data: storicoData, error: storicoError } = await supabase
        .from('ticket_storico')
        .select('*')
        .eq('id_ticket', ticket.id)
        .order('created_at', { ascending: false })

      if (storicoError) throw storicoError
      
      if (!storicoData || storicoData.length === 0) {
        setStorico([])
        return
      }
      
      // Per ogni item, carica l'utente manualmente
      const storicoConUtenti = await Promise.all(
        storicoData.map(async (item) => {
          try {
            const { data: utente } = await supabase
              .from('utenti')
              .select('nome, cognome, email')
              .eq('id', item.id_utente)
              .maybeSingle()
            
            return {
              ...item,
              utente,
              utente_nome: utente ? `${utente.nome} ${utente.cognome}` : 'Sistema',
              utente_email: utente?.email || null
            }
          } catch (err) {
            console.error('Errore caricamento utente per storico:', item.id, err)
            return {
              ...item,
              utente: null,
              utente_nome: 'Sistema',
              utente_email: null
            }
          }
        })
      )
      
      setStorico(storicoConUtenti)
    } catch (error) {
      console.error('Errore caricamento storico:', error)
      setStorico([])
    } finally {
      setLoadingStorico(false)
    }
  }

  // ⭐ NUOVA FUNZIONE: Aggiorna Oggetto e Descrizione
  async function handleAggiornaInfoTicket() {
    if (!oggetto.trim() || !descrizione.trim()) {
      alert('⚠️ Oggetto e Descrizione sono obbligatori')
      return
    }

    // Se non ci sono modifiche, non fare nulla
    if (oggetto.trim() === ticket.oggetto && descrizione.trim() === ticket.descrizione) {
      alert('ℹ️ Nessuna modifica da salvare')
      return
    }

    setLoading(true)
    try {
      const updates = {}
      const cambiamenti = []

      if (oggetto.trim() !== ticket.oggetto) {
        updates.oggetto = oggetto.trim()
        cambiamenti.push(`Oggetto: "${ticket.oggetto}" → "${oggetto.trim()}"`)
      }

      if (descrizione.trim() !== ticket.descrizione) {
        updates.descrizione = descrizione.trim()
        cambiamenti.push(`Descrizione modificata`)
      }

      // Aggiorna ticket
      const { error: updateError } = await supabase
        .from('ticket')
        .update(updates)
        .eq('id', ticket.id)

      if (updateError) throw updateError

      // Registra nello storico
      const { error: storicoError } = await supabase
        .from('ticket_storico')
        .insert({
          id_ticket: ticket.id,
          id_utente: userProfile.id,
          azione: 'modifica_info',
          campo_modificato: cambiamenti.join(', '),
          valore_precedente: JSON.stringify({
            oggetto: ticket.oggetto,
            descrizione: ticket.descrizione
          }),
          valore_nuovo: JSON.stringify({
            oggetto: oggetto.trim(),
            descrizione: descrizione.trim()
          })
        })

      if (storicoError) throw storicoError

      alert('✅ Informazioni ticket aggiornate!')
      if (onUpdate) onUpdate()
      onClose()
    } catch (error) {
      console.error('❌ Errore aggiornamento info:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCambiaStato() {
    if (nuovoStato === ticket.stato) {
      alert('ℹ️ Lo stato non è cambiato')
      return
    }

    setLoading(true)
    try {
      const updates = { stato: nuovoStato }
      
      // Se chiuso o risolto, aggiungi data chiusura
      if ((nuovoStato === 'chiuso' || nuovoStato === 'risolto') && !ticket.data_chiusura) {
        updates.data_chiusura = new Date().toISOString()
      }
      
      // Se in lavorazione, aggiungi data presa in carico
      if (nuovoStato === 'in_lavorazione' && !ticket.data_presa_in_carico) {
        updates.data_presa_in_carico = new Date().toISOString()
      }

      const { error } = await supabase
        .from('ticket')
        .update(updates)
        .eq('id', ticket.id)

      if (error) throw error

      // Aggiungi al log storico
      await supabase
        .from('ticket_storico')
        .insert({
          id_ticket: ticket.id,
          id_utente: userProfile.id,
          azione: 'cambio_stato',
          campo_modificato: 'stato',
          valore_precedente: ticket.stato,
          valore_nuovo: nuovoStato
        })

      alert('✅ Stato aggiornato!')
      if (onUpdate) onUpdate()
      onClose()
    } catch (error) {
      console.error('❌ Errore cambio stato:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCambiaPriorita() {
    if (nuovaPriorita === ticket.priorita) {
      alert('ℹ️ La priorità non è cambiata')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('ticket')
        .update({ priorita: nuovaPriorita })
        .eq('id', ticket.id)

      if (error) throw error

      // Aggiungi al log storico
      await supabase
        .from('ticket_storico')
        .insert({
          id_ticket: ticket.id,
          id_utente: userProfile.id,
          azione: 'cambio_priorita',
          campo_modificato: 'priorita',
          valore_precedente: ticket.priorita,
          valore_nuovo: nuovaPriorita
        })

      alert('✅ Priorità aggiornata!')
      if (onUpdate) onUpdate()
      onClose()
    } catch (error) {
      console.error('❌ Errore cambio priorità:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAssegnaTecnico() {
    if (!tecnicoAssegnato) {
      alert('⚠️ Seleziona un tecnico')
      return
    }

    if (tecnicoAssegnato === ticket.id_tecnico_assegnato) {
      alert('ℹ️ Questo tecnico è già assegnato')
      return
    }

    setLoading(true)
    try {
      const updates = { 
        id_tecnico_assegnato: tecnicoAssegnato
      }
      
      // Se non era assegnato, aggiungi data assegnazione e cambia stato
      if (!ticket.id_tecnico_assegnato) {
        updates.data_assegnazione = new Date().toISOString()
        if (ticket.stato === 'aperto') {
          updates.stato = 'assegnato'
        }
      }

      const { error } = await supabase
        .from('ticket')
        .update(updates)
        .eq('id', ticket.id)

      if (error) throw error

      const tecnico = tecnici.find(t => t.id === tecnicoAssegnato)
      
      // Aggiungi al log storico
      await supabase
        .from('ticket_storico')
        .insert({
          id_ticket: ticket.id,
          id_utente: userProfile.id,
          azione: 'assegnazione',
          campo_modificato: 'tecnico_assegnato',
          valore_precedente: ticket.id_tecnico_assegnato || 'Non assegnato',
          valore_nuovo: tecnicoAssegnato
        })

      alert(`✅ Ticket assegnato a ${tecnico?.nome} ${tecnico?.cognome}!`)
      if (onUpdate) onUpdate()
      onClose()
    } catch (error) {
      console.error('❌ Errore assegnazione:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAggiungiNota() {
    if (!nuovaNota.trim()) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('ticket_note')
        .insert({
          id_ticket: ticket.id,
          id_utente: userProfile.id,
          tipo: tipoNota,
          contenuto: nuovaNota.trim()
        })

      if (error) throw error

      setNuovaNota('')
      await loadNote()
      
      if (onUpdate) onUpdate()
      alert('✅ Nota aggiunta!')
    } catch (error) {
      console.error('Errore aggiunta nota:', error)
      alert('❌ Errore nell\'aggiunta della nota: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleModificaNota(notaId, nuovoTesto) {
    if (!nuovoTesto.trim()) {
      alert('Il testo della nota non può essere vuoto')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('ticket_note')
        .update({
          contenuto: nuovoTesto.trim()
        })
        .eq('id', notaId)

      if (error) throw error

      setNotaInModifica(null)
      setTestoModifica('')
      await loadNote()
      if (onUpdate) onUpdate()
      alert('✅ Nota modificata!')
    } catch (error) {
      console.error('Errore modifica nota:', error)
      alert('❌ Errore nella modifica della nota: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleEliminaNota(notaId) {
    if (!confirm('Sei sicuro di voler eliminare questa nota?')) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('ticket_note')
        .delete()
        .eq('id', notaId)

      if (error) throw error

      await loadNote()
      if (onUpdate) onUpdate()
      alert('✅ Nota eliminata!')
    } catch (error) {
      console.error('Errore eliminazione nota:', error)
      alert('❌ Errore nell\'eliminazione della nota: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs sm:text-sm font-semibold">
                #{ticket.numero_ticket}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                ticket.stato === 'aperto' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                ticket.stato === 'in_lavorazione' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                ticket.stato === 'chiuso' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
              }`}>
                {ticket.stato.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white break-words">
              {ticket.cliente?.ragione_sociale || ticket.clienti?.ragione_sociale || 'Cliente Sconosciuto'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
              {ticket.oggetto}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={20} className="sm:w-6 sm:h-6 text-gray-500" />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto overflow-y-hidden scrollbar-hide">
            <div className="flex min-w-min">
              <button
                onClick={() => setActiveTab('azioni')}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3 font-medium transition-all whitespace-nowrap flex-shrink-0 border-b-2 ${
                  activeTab === 'azioni'
                    ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <CheckCircle size={16} className="hidden sm:block flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">Azioni</span>
              </button>

              <button
                onClick={() => setActiveTab('interventi')}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3 font-medium transition-all whitespace-nowrap flex-shrink-0 border-b-2 ${
                  activeTab === 'interventi'
                    ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Briefcase size={16} className="hidden sm:block flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">Interventi</span>
              </button>

              <button
                onClick={() => setActiveTab('note')}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3 font-medium transition-all whitespace-nowrap flex-shrink-0 border-b-2 ${
                  activeTab === 'note'
                    ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <MessageSquare size={16} className="hidden sm:block flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">Note</span>
              </button>

              <button
                onClick={() => setActiveTab('storico')}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3 font-medium transition-all whitespace-nowrap flex-shrink-0 border-b-2 ${
                  activeTab === 'storico'
                    ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <History size={16} className="hidden sm:block flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">Storico</span>
              </button>
            </div>
          </div>
        </div>

        {/* Contenuto Tabs */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* TAB AZIONI */}
          {activeTab === 'azioni' && (
            <div className="space-y-6">
              {/* ⭐ NUOVA SEZIONE - Informazioni Ticket Editabili */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="text-blue-600 dark:text-blue-400" size={20} />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Informazioni Ticket</h3>
                </div>
                
                <div className="space-y-4">
                  {/* Oggetto Editabile */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Oggetto *
                    </label>
                    <input
                      type="text"
                      value={oggetto}
                      onChange={(e) => setOggetto(e.target.value)}
                      placeholder="Breve descrizione del problema"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* Descrizione Editabile */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Descrizione *
                    </label>
                    <textarea
                      value={descrizione}
                      onChange={(e) => setDescrizione(e.target.value)}
                      placeholder="Descrizione dettagliata del problema..."
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                    />
                  </div>

                  {/* Pulsante Aggiorna Info */}
                  {(oggetto !== ticket.oggetto || descrizione !== ticket.descrizione) && (
                    <button
                      onClick={handleAggiornaInfoTicket}
                      disabled={loading || !oggetto.trim() || !descrizione.trim()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle size={18} />
                      {loading ? 'Salvataggio...' : 'Aggiorna Informazioni'}
                    </button>
                  )}
                </div>
              </div>

              {/* Cambia Stato */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="text-green-600 dark:text-green-400" size={20} />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Cambia Stato</h3>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={nuovoStato}
                    onChange={(e) => setNuovoStato(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="aperto">🟢 Aperto</option>
                    <option value="assegnato">🔵 Assegnato</option>
                    <option value="in_lavorazione">🟡 In Lavorazione</option>
                    <option value="in_attesa_cliente">⏸️ In Attesa Cliente</option>
                    <option value="in_attesa_parti">📦 In Attesa Parti</option>
                    <option value="risolto">✅ Risolto</option>
                    <option value="chiuso">⚫ Chiuso</option>
                    <option value="annullato">❌ Annullato</option>
                  </select>
                  <button
                    onClick={handleCambiaStato}
                    disabled={loading || nuovoStato === ticket.stato}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {loading ? 'Salvataggio...' : 'Aggiorna Stato'}
                  </button>
                </div>
              </div>

              {/* Cambio Priorità */}
              <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-6 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="text-orange-600 dark:text-orange-400" size={20} />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Cambia Priorità</h3>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={nuovaPriorita}
                    onChange={(e) => setNuovaPriorita(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="bassa">🟢 Bassa</option>
                    <option value="media">🟡 Media</option>
                    <option value="alta">🟠 Alta</option>
                    <option value="critica">🔴 Critica</option>
                  </select>
                  <button
                    onClick={handleCambiaPriorita}
                    disabled={loading || nuovaPriorita === ticket.priorita}
                    className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {loading ? 'Salvataggio...' : 'Aggiorna Priorità'}
                  </button>
                </div>
              </div>

              {/* Assegnazione Tecnico */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-4">
                  <User className="text-purple-600 dark:text-purple-400" size={20} />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Assegna Tecnico</h3>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={tecnicoAssegnato}
                    onChange={(e) => setTecnicoAssegnato(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Non assegnato</option>
                    {tecnici.map(tecnico => (
                      <option key={tecnico.id} value={tecnico.id}>
                        {tecnico.nome} {tecnico.cognome}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssegnaTecnico}
                    disabled={loading || !tecnicoAssegnato || tecnicoAssegnato === ticket.id_tecnico_assegnato}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {loading ? 'Salvataggio...' : 'Assegna'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB INTERVENTI */}
          {activeTab === 'interventi' && (
            <InterventiTab 
              ticket={ticket} 
              onUpdate={onUpdate}
            />
          )}

          {/* TAB NOTE */}
          {activeTab === 'note' && (
            <div className="space-y-6">
              {/* Aggiungi Nota */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="text-green-600" size={20} />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Aggiungi Nota</h3>
                </div>
                <div className="space-y-3">
                  <select
                    value={tipoNota}
                    onChange={(e) => setTipoNota(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="nota_interna">📝 Nota Interna (solo team)</option>
                    <option value="commento_cliente">💬 Commento Cliente (visibile)</option>
                  </select>
                  <textarea
                    value={nuovaNota}
                    onChange={(e) => setNuovaNota(e.target.value)}
                    placeholder="Scrivi una nota..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white min-h-24"
                  />
                  <button
                    onClick={handleAggiungiNota}
                    disabled={loading || !nuovaNota.trim()}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} />
                    {loading ? 'Invio...' : 'Aggiungi Nota'}
                  </button>
                </div>
              </div>

              {/* Lista Note */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Note Precedenti</h3>
                {loadingNote ? (
                  <p className="text-center text-gray-500">Caricamento...</p>
                ) : note.length > 0 ? (
                  <div className="space-y-3">
                    {note.map((nota) => (
                      <div 
                        key={nota.id} 
                        className={`p-4 rounded-lg border ${
                          nota.tipo === 'nota_interna' 
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' 
                            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              nota.tipo === 'nota_interna' 
                                ? 'bg-yellow-200 text-yellow-800' 
                                : 'bg-blue-200 text-blue-800'
                            }`}>
                              {nota.tipo === 'nota_interna' ? '📝 Interna' : '💬 Cliente'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {nota.utente_nome}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(nota.created_at).toLocaleString('it-IT')}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setNotaInModifica(nota.id)
                                setTestoModifica(nota.contenuto)
                              }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleEliminaNota(nota.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                        {notaInModifica === nota.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={testoModifica}
                              onChange={(e) => setTestoModifica(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                              rows="3"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleModificaNota(nota.id, testoModifica)}
                                disabled={loading}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                              >
                                💾 Salva
                              </button>
                              <button
                                onClick={() => {
                                  setNotaInModifica(null)
                                  setTestoModifica('')
                                }}
                                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                ❌ Annulla
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                            {nota.contenuto}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">Nessuna nota ancora</p>
                )}
              </div>
            </div>
          )}

          {/* TAB STORICO */}
          {activeTab === 'storico' && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Cronologia Modifiche</h3>
              {loadingStorico ? (
                <p className="text-center text-gray-500">Caricamento...</p>
              ) : storico.length > 0 ? (
                <div className="space-y-3">
                  {storico.map((entry) => (
                    <div key={entry.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <History size={16} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-gray-900 dark:text-white text-sm">
                              {entry.utente_nome}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(entry.created_at).toLocaleString('it-IT')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <strong>{entry.azione}</strong>
                            {entry.campo_modificato && `: ${entry.campo_modificato}`}
                          </p>
                          {entry.valore_precedente && entry.valore_nuovo && (
                            <p className="text-xs text-gray-500 mt-1">
                              {entry.valore_precedente} → {entry.valore_nuovo}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">Nessuna modifica registrata</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
