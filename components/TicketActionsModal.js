'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { X, User, MessageSquare, History, Send, CheckCircle, Clock, AlertTriangle, Briefcase } from 'lucide-react'
import InterventiTab from './InterventiTab'

export default function TicketActionsModal({ ticket, onClose, onUpdate }) {
  const { userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('azioni')
  const [loading, setLoading] = useState(false)
  
  // Stati per azioni
  const [nuovoStato, setNuovoStato] = useState(ticket.stato)
  const [nuovaPriorita, setNuovaPriorita] = useState(ticket.priorita)
  const [tecnicoAssegnato, setTecnicoAssegnato] = useState(ticket.id_tecnico_assegnato || '')
  const [tecnici, setTecnici] = useState([])
  
  // Stati per note
  const [nuovaNota, setNuovaNota] = useState('')
  const [tipoNota, setTipoNota] = useState('nota_interna')
  const [note, setNote] = useState([])
  const [loadingNote, setLoadingNote] = useState(false)
  
  // Stati per storico
  const [storico, setStorico] = useState([])
  const [notaInModifica, setNotaInModifica] = useState(null)
  const [testoModifica, setTestoModifica] = useState('')
  const [loadingStorico, setLoadingStorico] = useState(false)

  useEffect(() => {
    loadTecnici()
    if (activeTab === 'note') loadNote()
    if (activeTab === 'storico') loadStorico()
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
      console.log('📝 Carico note per ticket:', ticket.id)
      
      // Carica note senza JOIN automatico
      const { data: noteData, error: noteError } = await supabase
        .from('ticket_note')
        .select('*')
        .eq('id_ticket', ticket.id)
        .order('created_at', { ascending: false })

      if (noteError) {
        console.error('❌ Errore Supabase note:', noteError)
        throw noteError
      }
      
      console.log('📝 Note trovate:', noteData?.length || 0)
      
      // Se non ci sono note, ritorna array vuoto
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
              .maybeSingle() // Usa maybeSingle invece di single per evitare errori
            
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
      
      console.log('✅ Note caricate con utenti:', noteConUtenti.length)
      setNote(noteConUtenti)
    } catch (error) {
      console.error('❌ Errore caricamento note:', error)
      setNote([])
    } finally {
      setLoadingNote(false)
    }
  }

  async function loadStorico() {
    setLoadingStorico(true)
    try {
      console.log('📜 Carico storico per ticket:', ticket.id)
      
      // Carica storico senza JOIN automatico
      const { data: storicoData, error: storicoError } = await supabase
        .from('ticket_storico')
        .select('*')
        .eq('id_ticket', ticket.id)
        .order('created_at', { ascending: false })

      if (storicoError) {
        console.error('❌ Errore Supabase storico:', storicoError)
        throw storicoError
      }
      
      console.log('📜 Storico trovato:', storicoData?.length || 0)
      
      // Se non c'è storico, ritorna array vuoto
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
              .maybeSingle() // Usa maybeSingle invece di single
            
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
      
      console.log('✅ Storico caricato con utenti:', storicoConUtenti.length)
      setStorico(storicoConUtenti)
    } catch (error) {
      console.error('❌ Errore caricamento storico:', error)
      setStorico([])
    } finally {
      setLoadingStorico(false)
    }
  }

  async function handleAggiungiNota() {
    if (!nuovaNota.trim()) return

    setLoading(true)
    try {
      const { error } = await supabase.rpc('add_ticket_note', {
        p_id_ticket: ticket.id,
        p_tipo: tipoNota,
        p_contenuto: nuovaNota.trim()
      })

      if (error) throw error

      alert('✅ Nota aggiunta con successo!')
      setNuovaNota('')
      loadNote()
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('❌ Errore aggiunta nota:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAssegnaTecnico() {
    if (!tecnicoAssegnato || tecnicoAssegnato === ticket.id_tecnico_assegnato) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('ticket')
        .update({ 
          id_tecnico_assegnato: tecnicoAssegnato,
          stato: ticket.stato === 'aperto' ? 'assegnato' : ticket.stato
        })
        .eq('id', ticket.id)

      if (error) throw error

      const tecnico = tecnici.find(t => t.id === tecnicoAssegnato)
      await supabase.rpc('add_ticket_note', {
        p_id_ticket: ticket.id,
        p_tipo: 'assegnazione',
        p_contenuto: `Ticket assegnato a ${tecnico.nome} ${tecnico.cognome}`
      })

      alert('✅ Tecnico assegnato!')
      if (onUpdate) onUpdate()
      onClose()
    } catch (error) {
      console.error('❌ Errore assegnazione:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCambiaPriorita() {
    if (nuovaPriorita === ticket.priorita) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('ticket')
        .update({ priorita: nuovaPriorita })
        .eq('id', ticket.id)

      if (error) throw error

      await supabase.rpc('add_ticket_note', {
        p_id_ticket: ticket.id,
        p_tipo: 'cambio_priorita',
        p_contenuto: `Priorità cambiata da "${ticket.priorita}" a "${nuovaPriorita}"`
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

  async function handleModificaNota(notaId, nuovoContenuto) {
    if (!nuovoContenuto.trim()) {
      alert('⚠️ Il contenuto della nota non può essere vuoto')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('ticket_note')
        .update({ 
          contenuto: nuovoContenuto,
          updated_at: new Date().toISOString()
        })
        .eq('id', notaId)

      if (error) throw error

      alert('✅ Nota modificata con successo!')
      setNotaInModifica(null)
      setTestoModifica('')
      loadNote()
    } catch (error) {
      console.error('❌ Errore modifica nota:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleEliminaNota(notaId) {
    if (!confirm('⚠️ Sei sicuro di voler eliminare questa nota?\n\nQuesta azione non può essere annullata.')) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('ticket_note')
        .delete()
        .eq('id', notaId)

      if (error) throw error

      alert('✅ Nota eliminata con successo!')
      loadNote()
    } catch (error) {
      console.error('❌ Errore eliminazione nota:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCambiaStato() {
    if (nuovoStato === ticket.stato) return

    setLoading(true)
    try {
      const updates = { stato: nuovoStato }
      
      // Se chiuso, aggiungi data chiusura
      if (nuovoStato === 'chiuso' || nuovoStato === 'risolto') {
        updates.data_chiusura = new Date().toISOString()
      }

      const { error } = await supabase
        .from('ticket')
        .update(updates)
        .eq('id', ticket.id)

      if (error) throw error

      // Aggiungi nota automatica
      await supabase.rpc('add_ticket_note', {
        p_id_ticket: ticket.id,
        p_tipo: 'cambio_stato',
        p_contenuto: `Stato cambiato da "${ticket.stato}" a "${nuovoStato}"`
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

  function getStatoColor(stato) {
    const colors = {
      'aperto': 'text-blue-600',
      'assegnato': 'text-purple-600',
      'in_lavorazione': 'text-yellow-600',
      'in_attesa': 'text-orange-600',
      'risolto': 'text-green-600',
      'chiuso': 'text-gray-600'
    }
    return colors[stato] || 'text-gray-600'
  }

  function getStatoIcon(stato) {
    const icons = {
      'aperto': '🔵',
      'assegnato': '🟣',
      'in_lavorazione': '🟠',
      'in_attesa': '🟡',
      'risolto': '🟢',
      'chiuso': '⚫'
    }
    return icons[stato] || '⚪'
  }

  function getPrioritaColor(priorita) {
    const colors = {
      'bassa': 'text-green-600',
      'media': 'text-yellow-600',
      'alta': 'text-orange-600',
      'critica': 'text-red-600'
    }
    return colors[priorita] || 'text-gray-600'
  }

  function getAzioneLabel(azione) {
    const labels = {
      'creato': '🆕 Ticket Creato',
      'stato_cambiato': '🔄 Stato Modificato',
      'priorita_cambiata': '⚠️ Priorità Modificata',
      'assegnato': '👤 Tecnico Assegnato',
      'nota_aggiunta': '📝 Nota Aggiunta',
      'chiuso': '✅ Ticket Chiuso'
    }
    return labels[azione] || azione
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header - Responsive */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 min-w-0 mr-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
              Ticket #{ticket.numero_ticket}
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

        {/* Tabs Navigation - RESPONSIVE FIX COMPLETO */}
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

        {/* Tab Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB AZIONI */}
          {activeTab === 'azioni' && (
            <div className="space-y-6">
              {/* Cambia Stato */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="text-blue-600" size={20} />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Cambia Stato</h3>
                </div>
                <div className="flex items-center gap-4">
                  <select
                    value={nuovoStato}
                    onChange={(e) => setNuovoStato(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="aperto">🔵 Aperto</option>
                    <option value="assegnato">🟣 Assegnato</option>
                    <option value="in_lavorazione">🟠 In Lavorazione</option>
                    <option value="in_attesa">🟡 In Attesa</option>
                    <option value="risolto">🟢 Risolto</option>
                    <option value="chiuso">⚫ Chiuso</option>
                  </select>
                  <button
                    onClick={handleCambiaStato}
                    disabled={loading || nuovoStato === ticket.stato}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Salvataggio...' : 'Cambia'}
                  </button>
                </div>
              </div>

              {/* Cambia Priorità */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="text-orange-600" size={20} />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Cambia Priorità</h3>
                </div>
                <div className="flex items-center gap-4">
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
                    className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Salvataggio...' : 'Cambia'}
                  </button>
                </div>
              </div>

              {/* Assegna Tecnico */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="text-purple-600" size={20} />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Assegna Tecnico</h3>
                </div>
                <div className="flex items-center gap-4">
                  <select
                    value={tecnicoAssegnato}
                    onChange={(e) => setTecnicoAssegnato(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">-- Seleziona Tecnico --</option>
                    {tecnici.map(tecnico => (
                      <option key={tecnico.id} value={tecnico.id}>
                        {tecnico.nome} {tecnico.cognome}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssegnaTecnico}
                    disabled={loading || !tecnicoAssegnato || tecnicoAssegnato === ticket.id_tecnico_assegnato}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Salvataggio...' : 'Assegna'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ⭐ TAB INTERVENTI (NUOVO) */}
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
                    {note.map(nota => (
                      <div 
                        key={nota.id} 
                        className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {nota.autore?.nome} {nota.autore?.cognome}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              nota.tipo === 'nota_interna' 
                                ? 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                            }`}>
                              {nota.tipo === 'nota_interna' ? '📝 Interna' : '💬 Cliente'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {new Date(nota.created_at).toLocaleString('it-IT')}
                            </span>
                            {nota.id_utente === userProfile?.id && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => {
                                    setNotaInModifica(nota.id)
                                    setTestoModifica(nota.contenuto)
                                  }}
                                  className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded transition-colors"
                                  title="Modifica"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleEliminaNota(nota.id)}
                                  className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded transition-colors"
                                  title="Elimina"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
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
                  {storico.map(evento => (
                    <div 
                      key={evento.id}
                      className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border-l-4 border-blue-500"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {getAzioneLabel(evento.azione)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {evento.descrizione}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>👤 {evento.utente?.nome} {evento.utente?.cognome}</span>
                            <span>📅 {new Date(evento.created_at).toLocaleString('it-IT')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">Nessun evento nello storico</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
