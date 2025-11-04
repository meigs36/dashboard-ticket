'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, Clock, Calendar, User as UserIcon, Trash2, Briefcase, Gift, Edit2, Camera, Mic } from 'lucide-react'
import AggiungiInterventoModal from './AggiungiInterventoModal'
import ModificaInterventoModal from './ModificaInterventoModal'
import InterventoMediaCapture from './InterventoMediaCapture' // Per audio/foto upload
import InterventiAllegatiInline from './InterventiAllegatiInline' // ✅ Visualizza audio e foto inline
import TrascrizioniSalvate from './TrascrizioniSalvate' // ✅ Visualizza trascrizioni permanenti salvate

export default function InterventiTab({ ticket, onUpdate }) {
  const [interventi, setInterventi] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [interventoSelezionato, setInterventoSelezionato] = useState(null)
  const [interventoMediaAperto, setInterventoMediaAperto] = useState(null)
  
  // ❌ RIMOSSO: State per allegati e lightbox (ora gestiti da InterventiAllegatiInline)
  // const [allegatiPerIntervento, setAllegatiPerIntervento] = useState({})
  // const [lightboxImage, setLightboxImage] = useState(null)
  
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
      
      const interventiArricchiti = data?.map(int => ({
        ...int,
        tecnico_nome: int.tecnico ? `${int.tecnico.nome} ${int.tecnico.cognome}` : 'N/A',
        num_contratto: int.contratto?.num_contratto || null,
        nome_contratto: int.contratto?.nome_contratto || int.contratto?.tipo_contratto || null
      })) || []
      
      setInterventi(interventiArricchiti)
      
      // ❌ RIMOSSO: Caricamento miniature (ora gestito da InterventiAllegatiInline)
      // await loadAllegatiMiniature(interventiArricchiti)
      
      // Calcola totali
      if (interventiArricchiti.length > 0) {
        const totaleEffettive = interventiArricchiti.reduce((sum, i) => 
          sum + parseFloat(i.durata_effettiva || 0), 0)
        
        const totaleAddebitate = interventiArricchiti.reduce((sum, i) => 
          sum + parseFloat(i.durata_addebitata || 0), 0)
        
        const totaleScalate = interventiArricchiti.reduce((sum, i) => 
          sum + parseFloat(i.ore_scalate || 0), 0)
        
        const totaleDaFatturare = interventiArricchiti
          .filter(i => !i.is_cortesia && !i.fatturato)
          .reduce((sum, i) => {
            const oreAddebitate = parseFloat(i.durata_addebitata || 0)
            const oreScalate = parseFloat(i.ore_scalate || 0)
            const oreDaFatturare = oreAddebitate - oreScalate
            return sum + (oreDaFatturare > 0 ? oreDaFatturare : 0)
          }, 0)
        
        const totaleFatturate = interventiArricchiti
          .filter(i => !i.is_cortesia && i.fatturato)
          .reduce((sum, i) => {
            const oreAddebitate = parseFloat(i.durata_addebitata || 0)
            const oreScalate = parseFloat(i.ore_scalate || 0)
            const oreFatturate = oreAddebitate - oreScalate
            return sum + (oreFatturate > 0 ? oreFatturate : 0)
          }, 0)
        
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

  // ❌ RIMOSSO: Funzione loadAllegatiMiniature (ora gestita da InterventiAllegatiInline)
  /*
  async function loadAllegatiMiniature(interventiList) {
    // ... codice rimosso ...
  }
  */

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
          Interventi ({interventi.length})
        </h3>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          <span>Nuovo Intervento</span>
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Caricamento interventi...</p>
        </div>
      )}

      {/* Nessun intervento */}
      {!loading && interventi.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
          <Briefcase size={48} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nessun intervento registrato
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Inizia aggiungendo il primo intervento per questo ticket
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
            <span>Aggiungi Intervento</span>
          </button>
        </div>
      )}

      {/* Lista Interventi */}
      {!loading && interventi.length > 0 && (
        <>
          <div className="space-y-4">
            {interventi.map((intervento) => {
              const durataEffettiva = parseFloat(intervento.durata_effettiva || 0)
              const durataAddebitata = parseFloat(intervento.durata_addebitata || 0)
              const oreScalate = parseFloat(intervento.ore_scalate || 0)
              const oreDaFatturare = durataAddebitata - oreScalate

              return (
                <div
                  key={intervento.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                >
                  <div className="flex justify-between">
                    <div className="flex-1">
                      {/* Header Intervento */}
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        {/* Data */}
                        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar size={16} />
                          <span className="font-medium">{formatDate(intervento.data_intervento)}</span>
                        </div>

                        {/* Orario */}
                        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                          <Clock size={16} />
                          <span>
                            {intervento.ora_inizio} - {intervento.ora_fine}
                            <span className="ml-1 text-xs">({formatDurata(durataEffettiva)})</span>
                          </span>
                        </div>

                        {/* Tecnico */}
                        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                          <UserIcon size={16} />
                          <span>{intervento.tecnico_nome}</span>
                        </div>

                        {/* Badge Tipo */}
                        {intervento.is_loco && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                            IN LOCO
                          </span>
                        )}
                        
                        {intervento.is_remoto && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                            REMOTO
                          </span>
                        )}
                        
                        {intervento.is_aggiornamento && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                            AGGIORNAMENTO
                          </span>
                        )}
                        
                        {intervento.is_cortesia && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded flex items-center gap-1">
                            <Gift size={12} />
                            CORTESIA
                          </span>
                        )}

                        {/* Badge Contratto */}
                        {intervento.num_contratto && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
                            {intervento.num_contratto}
                          </span>
                        )}
                      </div>

                      {/* Descrizione */}
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">
                        {intervento.descrizione_intervento || <span className="text-gray-400 dark:text-gray-600 italic">Nessuna descrizione</span>}
                      </p>

                      {/* ✅ COMPONENTE TRASCRIZIONI SALVATE (Trascrizioni permanenti) - PRIMA */}
                      <TrascrizioniSalvate
                        interventoId={intervento.id}
                        onUpdate={loadInterventi}
                      />

                      {/* ✅ COMPONENTE ALLEGATI INLINE (Audio e Foto sempre visibili) - DOPO */}
                      <InterventiAllegatiInline
                        interventoId={intervento.id}
                        onDelete={loadInterventi}
                      />

                      {/* Pulsante Gestione Audio/Foto Completa */}
                      <div className="mt-3">
                        <button
                          onClick={() => setInterventoMediaAperto(
                            interventoMediaAperto === intervento.id ? null : intervento.id
                          )}
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                        >
                          <Camera size={14} />
                          <Mic size={14} />
                          <span>
                            {interventoMediaAperto === intervento.id 
                              ? 'Nascondi gestione media' 
                              : 'Gestisci foto e audio'
                            }
                          </span>
                        </button>
                      </div>

                      {/* Sezione Gestione Media Completa (Upload, Audio, etc) */}
                      {interventoMediaAperto === intervento.id && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                          <InterventoMediaCapture 
                            interventoId={intervento.id}
                            onMediaUploaded={() => {
                              // Ricarica quando viene caricato nuovo media
                              loadInterventi()
                            }}
                          />
                        </div>
                      )}

                      {/* Info Fatturazione */}
                      <div className="mt-3 flex flex-wrap gap-4 text-xs">
                        <div>
                          <span className="text-gray-500 dark:text-gray-500">Addebitate:</span>
                          <span className="ml-1 font-semibold text-blue-600 dark:text-blue-400">
                            {formatDurata(durataAddebitata)}
                          </span>
                        </div>
                        
                        {oreScalate > 0 && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-500">Scalate:</span>
                            <span className="ml-1 font-semibold text-purple-600 dark:text-purple-400">
                              {formatDurata(oreScalate)}
                            </span>
                          </div>
                        )}
                        
                        {!intervento.is_cortesia && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-500">
                              {intervento.fatturato ? 'Fatturate:' : 'Da fatturare:'}
                            </span>
                            <span className={`ml-1 font-semibold ${
                              intervento.fatturato 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-orange-600 dark:text-orange-400'
                            }`}>
                              {formatDurata(oreDaFatturare > 0 ? oreDaFatturare : 0)}
                            </span>
                          </div>
                        )}
                      </div>
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

      {/* ❌ RIMOSSO: Lightbox separato (ora gestito da InterventiAllegatiInline) */}
    </div>
  )
}
