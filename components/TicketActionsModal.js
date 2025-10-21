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
      const { data, error } = await supabase
        .from('ticket_note_complete')
        .select('*')
        .eq('id_ticket', ticket.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNote(data || [])
    } catch (error) {
      console.error('Errore caricamento note:', error)
    } finally {
      setLoadingNote(false)
    }
  }

  async function loadStorico() {
    setLoadingStorico(true)
    try {
      const { data, error } = await supabase
        .from('ticket_storico_complete')
        .select('*')
        .eq('id_ticket', ticket.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setStorico(data || [])
    } catch (error) {
      console.error('Errore caricamento storico:', error)
    } finally {
      setLoadingStorico(false)
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
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Errore cambio stato:', error)
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

      // Aggiungi nota automatica
      await supabase.rpc('add_ticket_note', {
        p_id_ticket: ticket.id,
        p_tipo: 'cambio_priorita',
        p_contenuto: `Priorità cambiata da "${ticket.priorita}" a "${nuovaPriorita}"`
      })

      alert('✅ Priorità aggiornata!')
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Errore cambio priorità:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAssegnaTecnico() {
    if (tecnicoAssegnato === ticket.id_tecnico_assegnato) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('ticket')
        .update({ 
          id_tecnico_assegnato: tecnicoAssegnato || null,
          stato: tecnicoAssegnato ? 'assegnato' : 'aperto'
        })
        .eq('id', ticket.id)

      if (error) throw error

      const tecnico = tecnici.find(t => t.id === tecnicoAssegnato)
      const nomeCompleto = tecnico ? `${tecnico.nome} ${tecnico.cognome}` : 'Nessuno'

      await supabase.rpc('add_ticket_note', {
        p_id_ticket: ticket.id,
        p_tipo: 'assegnazione',
        p_contenuto: `Ticket assegnato a: ${nomeCompleto}`
      })

      alert('✅ Tecnico assegnato!')
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Errore assegnazione:', error)
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
          contenuto: nuovaNota
        })

      if (error) throw error

      alert('✅ Nota aggiunta!')
      setNuovaNota('')
      loadNote()
    } catch (error) {
      console.error('Errore aggiunta nota:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  function getStatoColor(stato) {
    const colors = {
      'aperto': 'text-blue-600',
      'assegnato': 'text-purple-600',
      'in_lavorazione': 'text-orange-600',
      'in_attesa': 'text-yellow-600',
      'risolto': 'text-green-600',
      'chiuso': 'text-gray-600'
    }
    return colors[stato] || 'text-gray-600'
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
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Ticket #{ticket.numero_ticket}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {ticket.oggetto}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="flex gap-2 px-6 pt-4 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('azioni')}
            className={`flex items-center gap-2 px-4 py-3 font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'azioni'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <CheckCircle size={18} />
            Azioni
          </button>

          {/* ⭐ NUOVO TAB INTERVENTI */}
          <button
            onClick={() => setActiveTab('interventi')}
            className={`flex items-center gap-2 px-4 py-3 font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'interventi'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <Briefcase size={18} />
            Interventi
          </button>

          <button
            onClick={() => setActiveTab('note')}
            className={`flex items-center gap-2 px-4 py-3 font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'note'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <MessageSquare size={18} />
            Note
          </button>
          <button
            onClick={() => setActiveTab('storico')}
            className={`flex items-center gap-2 px-4 py-3 font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'storico'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <History size={18} />
            Storico
          </button>
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
                    {loading ? 'Salvataggio...' : 'Aggiorna'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Stato attuale: <span className={`font-semibold ${getStatoColor(ticket.stato)}`}>
                    {ticket.stato?.toUpperCase()}
                  </span>
                </p>
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
                    <option value="alta">🔴 Alta</option>
                    <option value="critica">🚨 Critica</option>
                  </select>
                  <button
                    onClick={handleCambiaPriorita}
                    disabled={loading || nuovaPriorita === ticket.priorita}
                    className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Salvataggio...' : 'Aggiorna'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Priorità attuale: <span className={`font-semibold ${getPrioritaColor(ticket.priorita)}`}>
                    {ticket.priorita?.toUpperCase()}
                  </span>
                </p>
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
                    <option value="">Non assegnato</option>
                    {tecnici.map((tecnico) => (
                      <option key={tecnico.id} value={tecnico.id}>
                        {tecnico.nome} {tecnico.cognome}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssegnaTecnico}
                    disabled={loading || tecnicoAssegnato === ticket.id_tecnico_assegnato}
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
                    {note.map((nota) => (
                      <div key={nota.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {nota.utente_nome[0]}{nota.utente_cognome[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white text-sm">
                                {nota.utente_nome} {nota.utente_cognome}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(nota.created_at).toLocaleString('it-IT')}
                              </p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            nota.tipo === 'nota_interna' 
                              ? 'bg-gray-200 text-gray-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {nota.tipo === 'nota_interna' ? '📝 Interna' : '💬 Cliente'}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                          {nota.contenuto}
                        </p>
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
                    <div key={entry.id} className="flex gap-4 items-start">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                          <History className="text-white" size={18} />
                        </div>
                      </div>
                      <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">
                              {getAzioneLabel(entry.azione)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(entry.created_at).toLocaleString('it-IT')}
                            </p>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {entry.utente_nome} {entry.utente_cognome}
                          </p>
                        </div>
                        {entry.valore_precedente && entry.valore_nuovo && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-red-600 dark:text-red-400 line-through">
                              {entry.valore_precedente}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="text-green-600 dark:text-green-400 font-semibold">
                              {entry.valore_nuovo}
                            </span>
                          </div>
                        )}
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
