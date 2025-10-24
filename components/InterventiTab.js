'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, Clock, Calendar, User as UserIcon, Trash2, Briefcase, Gift, Edit2 } from 'lucide-react'
import AggiungiInterventoModal from './AggiungiInterventoModal'
import ModificaInterventoModal from './ModificaInterventoModal'

export default function InterventiTab({ ticket, onUpdate }) {
  const [interventi, setInterventi] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [interventoSelezionato, setInterventoSelezionato] = useState(null)
  const [totali, setTotali] = useState({
    oreEffettive: 0,
    oreAddebitate: 0,
    oreScalate: 0,
    oreDaFatturare: 0,
    oreFatturate: 0,
    oreCortesia: 0
  })

  useEffect(() => {
    loadInterventi()
  }, [ticket.id])

  async function loadInterventi() {
    setLoading(true)
    try {
      console.log('🔍 Carico interventi per ticket:', ticket.id)
      
      // ✅ FIX: Usa num_contratto e nome_contratto (non numero_contratto)
      const { data, error } = await supabase
        .from('interventi')
        .select(`
          *,
          tecnico:id_tecnico(nome, cognome, email),
          contratto:contratto_id(num_contratto, nome_contratto, tipo_contratto)
        `)
        .eq('ticket_id', ticket.id)
        .order('data_intervento', { ascending: false })
        .order('ora_inizio', { ascending: false })

      if (error) {
        console.error('❌ Errore query interventi:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      console.log('✅ Interventi caricati:', data?.length || 0, data)
      
      // Arricchisci i dati per compatibilità con il template
      const interventiArricchiti = data?.map(int => ({
        ...int,
        tecnico_nome: int.tecnico ? `${int.tecnico.nome} ${int.tecnico.cognome}` : 'N/A',
        num_contratto: int.contratto?.num_contratto || null,
        nome_contratto: int.contratto?.nome_contratto || int.contratto?.tipo_contratto || null
      })) || []
      
      setInterventi(interventiArricchiti)
      
      // Calcola totali
      if (interventiArricchiti.length > 0) {
        const totaleEffettive = interventiArricchiti.reduce((sum, i) => 
          sum + parseFloat(i.durata_effettiva || 0), 0)
        
        const totaleAddebitate = interventiArricchiti.reduce((sum, i) => 
          sum + parseFloat(i.durata_addebitata || 0), 0)
        
        // Ore scalate: solo interventi che hanno scalato dal contratto
        const totaleScalate = interventiArricchiti.reduce((sum, i) => 
          sum + parseFloat(i.ore_scalate || 0), 0)
        
        // Ore da fatturare: ore NON coperte da contratto, escluse cortesia
        const totaleDaFatturare = interventiArricchiti
          .filter(i => !i.is_cortesia && !i.fatturato)
          .reduce((sum, i) => {
            const oreAddebitate = parseFloat(i.durata_addebitata || 0)
            const oreScalate = parseFloat(i.ore_scalate || 0)
            const oreDaFatturare = oreAddebitate - oreScalate
            return sum + (oreDaFatturare > 0 ? oreDaFatturare : 0)
          }, 0)
        
        // Ore fatturate: ore già fatturate
        const totaleFatturate = interventiArricchiti
          .filter(i => !i.is_cortesia && i.fatturato)
          .reduce((sum, i) => {
            const oreAddebitate = parseFloat(i.durata_addebitata || 0)
            const oreScalate = parseFloat(i.ore_scalate || 0)
            const oreFatturate = oreAddebitate - oreScalate
            return sum + (oreFatturate > 0 ? oreFatturate : 0)
          }, 0)
        
        // Ore cortesia
        const totaleCortesia = interventiArricchiti
          .filter(i => i.is_cortesia)
          .reduce((sum, i) => sum + parseFloat(i.durata_addebitata || 0), 0)
        
        setTotali({
          oreEffettive: totaleEffettive,
          oreAddebitate: totaleAddebitate,
          oreScalate: totaleScalate,
          oreDaFatturare: totaleDaFatturare,
          oreFatturate: totaleFatturate,
          oreCortesia: totaleCortesia
        })
        
        console.log('📊 Totali calcolati:', {
          oreEffettive: totaleEffettive,
          oreAddebitate: totaleAddebitate,
          oreScalate: totaleScalate,
          oreDaFatturare: totaleDaFatturare,
          oreFatturate: totaleFatturate,
          oreCortesia: totaleCortesia
        })
      }
    } catch (error) {
      console.error('❌ Errore caricamento interventi:', error)
      alert('❌ Errore caricamento interventi: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleEliminaIntervento(interventoId) {
    if (!confirm('Sei sicuro di voler eliminare questo intervento?\n\nLe ore verranno rimborsate nel contratto.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('interventi')
        .delete()
        .eq('id', interventoId)

      if (error) throw error

      alert('✅ Intervento eliminato')
      loadInterventi()
      onUpdate()
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('❌ Errore: ' + error.message)
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  function formatDurata(ore) {
    return parseFloat(ore).toFixed(1) + 'h'
  }

  return (
    <div className="space-y-6">
      {/* Header con pulsante Aggiungi */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          📋 Interventi su questo ticket
        </h3>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus size={18} />
          Aggiungi intervento
        </button>
      </div>

      {/* Lista Interventi */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-2 text-gray-500">Caricamento interventi...</p>
        </div>
      ) : interventi.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <Briefcase className="mx-auto text-gray-400" size={48} />
          <p className="mt-4 text-gray-500 dark:text-gray-400">
            Nessun intervento registrato per questo ticket
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Aggiungi il primo intervento →
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {interventi.map((intervento) => {
              const durataText = intervento.durata_effettiva === intervento.durata_addebitata
                ? `(${formatDurata(intervento.durata_addebitata)})`
                : `(${formatDurata(intervento.durata_effettiva)} → ${formatDurata(intervento.durata_addebitata)})`

              return (
                <div
                  key={intervento.id}
                  className={`bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 transition-all hover:shadow-md ${
                    intervento.is_cortesia ? 'border-2 border-yellow-400' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Data e Orari */}
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                          <Calendar size={16} />
                          <span>{formatDate(intervento.data_intervento)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Clock size={16} />
                          <span>
                            {intervento.ora_inizio} - {intervento.ora_fine} {durataText}
                          </span>
                        </div>
                      </div>

                      {/* Tecnico */}
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <UserIcon size={14} />
                        <span>{intervento.tecnico_nome}</span>
                      </div>

                      {/* Tipo Attività */}
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        📋 {intervento.tipo_attivita || 'N/A'}
                      </div>

                      {/* Contratto, Cortesia o Ore da Fatturare */}
                      {intervento.is_cortesia ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-xs font-semibold">
                            <Gift size={12} />
                            CORTESIA
                          </span>
                          {intervento.motivo_cortesia && (
                            <span className="text-xs text-gray-500">
                              {intervento.motivo_cortesia}
                            </span>
                          )}
                        </div>
                      ) : (intervento.modalita_intervento?.toLowerCase() === 'in loco' || 
                           intervento.modalita_intervento?.toLowerCase() === 'in_loco' ||
                           intervento.modalita_intervento?.toLowerCase() === 'loco') ? (
                        <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                          💰 Ore da fatturare: {formatDurata(intervento.durata_addebitata || intervento.durata_effettiva || 0)}
                        </div>
                      ) : intervento.contratto_id ? (
                        <div className="text-sm text-blue-600 dark:text-blue-400">
                          💼 {intervento.nome_contratto || 'Contratto'} (#{intervento.num_contratto || 'N/A'}) 
                          <span className="ml-2 font-semibold">
                            {formatDurata(intervento.ore_scalate || 0)} scalate
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          📍 Assistenza remota
                        </div>
                      )}

                      {/* Descrizione */}
                      {intervento.descrizione_intervento && (
                        <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded p-2">
                          {intervento.descrizione_intervento}
                        </p>
                      )}
                    </div>

                    {/* Pulsanti Azioni */}
                    <div className="ml-4 flex gap-2">
                      {/* Pulsante Modifica */}
                      <button
                        onClick={() => {
                          setInterventoSelezionato(intervento)
                          setShowEditModal(true)
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Modifica intervento"
                      >
                        <Edit2 size={18} />
                      </button>
                      
                      {/* Pulsante Elimina */}
                      <button
                        onClick={() => handleEliminaIntervento(intervento.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Elimina intervento"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Totali */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              📊 Riepilogo Ticket
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Ore lavorate */}
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Ore lavorate
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totali.oreEffettive.toFixed(1)}h
                </p>
              </div>
              
              {/* Ore addebitate */}
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Ore addebitate
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {totali.oreAddebitate.toFixed(1)}h
                </p>
              </div>
              
              {/* Ore scalate da contratti */}
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Ore scalate
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {totali.oreScalate.toFixed(1)}h
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5">
                  (da contratti)
                </p>
              </div>
              
              {/* Ore da fatturare */}
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Ore da fatturare
                </p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {totali.oreDaFatturare.toFixed(1)}h
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5">
                  (in loco)
                </p>
              </div>
              
              {/* Ore già fatturate */}
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Ore fatturate
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {totali.oreFatturate.toFixed(1)}h
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5">
                  (fatturate)
                </p>
              </div>
              
              {/* Ore cortesia */}
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Ore cortesia
                </p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {totali.oreCortesia.toFixed(1)}h
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Aggiungi Intervento */}
      {showModal && (
        <AggiungiInterventoModal
          ticket={ticket}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            loadInterventi()
            onUpdate()
          }}
        />
      )}

      {/* Modal Modifica Intervento */}
      {showEditModal && interventoSelezionato && (
        <ModificaInterventoModal
          intervento={interventoSelezionato}
          ticket={ticket}
          onClose={() => {
            setShowEditModal(false)
            setInterventoSelezionato(null)
          }}
          onSuccess={() => {
            setShowEditModal(false)
            setInterventoSelezionato(null)
            loadInterventi()
            onUpdate()
          }}
        />
      )}
    </div>
  )
}
