'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Plus, 
  Clock, 
  Calendar, 
  User as UserIcon, 
  Trash2, 
  Briefcase, 
  Gift, 
  Edit2, 
  Camera, 
  Mic,
  Receipt,        // ✅ NUOVO: Icona fattura
  CheckCircle,    // ✅ NUOVO: Icona fatturato
  Euro,           // ✅ NUOVO: Icona euro
  Download,       // ✅ NUOVO: Icona download
  Eye,            // ✅ NUOVO: Icona preview
  ExternalLink,   // ✅ NUOVO: Icona link esterno
  X               // ✅ NUOVO: Icona chiudi
} from 'lucide-react'
import AggiungiInterventoModal from './AggiungiInterventoModal'
import ModificaInterventoModal from './ModificaInterventoModal'
import InterventoMediaCapture from './InterventoMediaCapture'
import InterventiAllegatiInline from './InterventiAllegatiInline'
import TrascrizioniSalvate from './TrascrizioniSalvate'
import GeneraFatturaModal from './GeneraFatturaModal'  // ✅ NUOVO: Modal fattura

export default function InterventiTab({ ticket, onUpdate }) {
  const { userProfile } = useAuth()
  const [interventi, setInterventi] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [interventoSelezionato, setInterventoSelezionato] = useState(null)
  const [interventoMediaAperto, setInterventoMediaAperto] = useState(null)
  
  // ✅ NUOVO: State per fatturazione
  const [showFatturaModal, setShowFatturaModal] = useState(false)
  const [interventiDaFatturare, setInterventiDaFatturare] = useState([])
  const [clienteData, setClienteData] = useState(null)
  
  // ✅ NUOVO: State per preview PDF fattura
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null)
  const [previewNumeroFattura, setPreviewNumeroFattura] = useState('')
  const [loadingPreview, setLoadingPreview] = useState(false)
  
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
    loadClienteData()
  }, [ticket.id])

  // ✅ NUOVO: Carica dati cliente per la fattura
  async function loadClienteData() {
    try {
      const { data, error } = await supabase
        .from('clienti')
        .select('*')
        .eq('id', ticket.id_cliente)
        .single()

      if (error) throw error
      setClienteData(data)
    } catch (error) {
      console.error('❌ Errore caricamento cliente:', error)
    }
  }

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

  // ✅ NUOVO: Apri modal per fatturare singolo intervento
  function handleFatturaSingolo(intervento) {
    setInterventiDaFatturare([intervento])
    setShowFatturaModal(true)
  }

  // ✅ NUOVO: Apri modal per fatturare tutti gli interventi da fatturare
  function handleFatturaTutti() {
    const daFatturare = interventi.filter(i => {
      if (i.is_cortesia || i.fatturato) return false
      const durataAddebitata = parseFloat(i.durata_addebitata || 0)
      const oreScalate = parseFloat(i.ore_scalate || 0)
      return (durataAddebitata - oreScalate) > 0
    })
    
    if (daFatturare.length === 0) {
      alert('⚠️ Non ci sono interventi da fatturare')
      return
    }
    
    setInterventiDaFatturare(daFatturare)
    setShowFatturaModal(true)
  }

  // ✅ NUOVO: Visualizza o scarica PDF fattura
  async function handleFatturaPdf(numeroFattura, action = 'preview') {
    try {
      if (action === 'preview') {
        setLoadingPreview(true)
      }

      // Cerca la fattura nel database
      const { data: fattura, error } = await supabase
        .from('fatture')
        .select('storage_path, storage_bucket')
        .eq('numero_fattura', numeroFattura)
        .single()

      if (error || !fattura) {
        alert('❌ Fattura non trovata nel database')
        return
      }

      if (!fattura.storage_path) {
        alert('⚠️ PDF non ancora generato per questa fattura')
        return
      }

      // Ottieni URL pubblico o firmato dal bucket
      const bucket = fattura.storage_bucket || 'fatture-documenti'
      const { data: urlData, error: urlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(fattura.storage_path, 3600) // URL valido 1 ora

      if (urlError || !urlData?.signedUrl) {
        console.error('Errore URL:', urlError)
        alert('❌ Impossibile ottenere il link al PDF')
        return
      }

      if (action === 'preview') {
        // Apri modal con preview
        setPreviewPdfUrl(urlData.signedUrl)
        setPreviewNumeroFattura(numeroFattura)
        setShowPreviewModal(true)
      } else {
        // Download diretto - fetch e forza download
        const response = await fetch(urlData.signedUrl)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `Fattura_${numeroFattura.replace('/', '-')}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('❌ Errore accesso fattura:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoadingPreview(false)
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
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                >
                  <div className="flex justify-between gap-2 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Header Intervento - RESPONSIVE */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        {/* Data */}
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          <Calendar size={16} className="flex-shrink-0" />
                          <span className="font-medium">{formatDate(intervento.data_intervento)}</span>
                        </div>

                        {/* Orario */}
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          <Clock size={14} className="flex-shrink-0" />
                          <span>
                            {intervento.ora_inizio} - {intervento.ora_fine}
                            <span className="ml-1 text-[10px] sm:text-xs">({formatDurata(durataEffettiva)})</span>
                          </span>
                        </div>

                        {/* Badge Modalità Intervento */}
                        {intervento.modalita_intervento && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded flex-shrink-0 ${
                            intervento.modalita_intervento?.toLowerCase() === 'remoto' 
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                              : (intervento.modalita_intervento?.toLowerCase() === 'in_loco' || 
                                 intervento.modalita_intervento?.toLowerCase() === 'in loco' ||
                                 intervento.modalita_intervento?.toLowerCase() === 'loco')
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                          }`}>
                            {intervento.modalita_intervento?.toLowerCase() === 'remoto' 
                              ? '💻 Remoto'
                              : (intervento.modalita_intervento?.toLowerCase() === 'in_loco' || 
                                 intervento.modalita_intervento?.toLowerCase() === 'in loco' ||
                                 intervento.modalita_intervento?.toLowerCase() === 'loco')
                              ? '🏢 In Loco'
                              : '🛡️ Garanzia'
                            }
                          </span>
                        )}
                        
                        {/* Badge Cortesia */}
                        {intervento.is_cortesia && (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded flex items-center gap-1 flex-shrink-0 border border-yellow-200 dark:border-yellow-800">
                            <Gift size={12} />
                            CORTESIA
                          </span>
                        )}

                        {/* Badge Contratto */}
                        {intervento.num_contratto && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded flex-shrink-0 border border-indigo-200 dark:border-indigo-800">
                            {intervento.num_contratto}
                          </span>
                        )}

                        {/* ✅ NUOVO: Badge Fatturato - Cliccabile con Preview */}
                        {intervento.fatturato && intervento.numero_fattura && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-l flex items-center gap-1 border border-green-200 dark:border-green-800">
                              <CheckCircle size={12} />
                              {intervento.numero_fattura}
                            </span>
                            <button
                              onClick={() => handleFatturaPdf(intervento.numero_fattura, 'preview')}
                              className="p-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800 rounded-r border border-l-0 border-green-200 dark:border-green-800 transition-colors"
                              title="Visualizza fattura"
                            >
                              <Eye size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Tecnico */}
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">
                        <UserIcon size={14} className="flex-shrink-0" />
                        <span className="truncate">{intervento.tecnico_nome}</span>
                      </div>

                      {/* Descrizione */}
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-2 sm:mb-3 break-words whitespace-pre-wrap">
                        {intervento.descrizione_intervento || <span className="text-gray-400 dark:text-gray-600 italic">Nessuna descrizione</span>}
                      </p>

                      {/* Trascrizioni Salvate */}
                      <TrascrizioniSalvate
                        interventoId={intervento.id}
                        onUpdate={loadInterventi}
                      />

                      {/* Allegati Inline */}
                      <InterventiAllegatiInline
                        interventoId={intervento.id}
                        onDelete={loadInterventi}
                      />

                      {/* Pulsante Gestione Audio/Foto */}
                      <div className="mt-2 sm:mt-3">
                        <button
                          onClick={() => setInterventoMediaAperto(
                            interventoMediaAperto === intervento.id ? null : intervento.id
                          )}
                          className="flex items-center gap-2 text-xs sm:text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
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

                      {/* Sezione Gestione Media */}
                      {interventoMediaAperto === intervento.id && (
                        <div className="mt-3 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                          <InterventoMediaCapture 
                            interventoId={intervento.id}
                            onMediaUploaded={() => {
                              loadInterventi()
                            }}
                          />
                        </div>
                      )}

                      {/* Info Fatturazione - CON PULSANTE FATTURA */}
                      <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-3 sm:gap-4 text-[10px] sm:text-xs">
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
                          <>
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

                            {/* ✅ NUOVO: Pulsante fattura singolo intervento */}
                            {!intervento.fatturato && oreDaFatturare > 0 && (
                              <button
                                onClick={() => handleFatturaSingolo(intervento)}
                                className="flex items-center gap-1 px-2 py-1 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 text-xs font-medium rounded transition-colors"
                                title="Genera fattura per questo intervento"
                              >
                                <Receipt size={12} />
                                <span className="hidden sm:inline">Fattura</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Pulsanti Azioni */}
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 flex-shrink-0">
                      {/* Pulsante Modifica */}
                      <button
                        onClick={() => {
                          setInterventoSelezionato(intervento)
                          setShowEditModal(true)
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Modifica intervento"
                      >
                        <Edit2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                      </button>
                      
                      {/* Pulsante Elimina */}
                      <button
                        onClick={() => handleEliminaIntervento(intervento.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Elimina intervento"
                      >
                        <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Totali con pulsante FATTURA TUTTI */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                📊 Riepilogo Ticket
              </h4>
              
              {/* ✅ NUOVO: Pulsante fattura tutti */}
              {totali.oreDaFatturare > 0 && (
                <button
                  onClick={handleFatturaTutti}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-medium rounded-lg transition-all shadow-md hover:shadow-lg"
                >
                  <Receipt size={18} />
                  <span>Genera Fattura ({totali.oreDaFatturare.toFixed(1)}h)</span>
                </button>
              )}
            </div>
            
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
              
              {/* Ore da fatturare - CON HIGHLIGHT SE > 0 */}
              <div className={`${totali.oreDaFatturare > 0 ? 'bg-orange-100 dark:bg-orange-900/30 rounded-lg p-2 -m-2' : ''}`}>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Ore da fatturare
                </p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {totali.oreDaFatturare.toFixed(1)}h
                </p>
                {totali.oreDaFatturare > 0 && (
                  <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5 font-medium">
                    💰 In attesa
                  </p>
                )}
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
                  ✅ (fatturate)
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

      {/* ✅ NUOVO: Modal Genera Fattura */}
      {showFatturaModal && interventiDaFatturare.length > 0 && clienteData && (
        <GeneraFatturaModal
          interventi={interventiDaFatturare}
          ticket={ticket}
          cliente={clienteData}
          onClose={() => {
            setShowFatturaModal(false)
            setInterventiDaFatturare([])
          }}
          onSuccess={() => {
            setShowFatturaModal(false)
            setInterventiDaFatturare([])
            loadInterventi()
            onUpdate()
          }}
        />
      )}

      {/* ✅ NUOVO: Modal Preview PDF Fattura */}
      {showPreviewModal && previewPdfUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-xl">
              <div className="flex items-center gap-3">
                <Receipt size={24} />
                <h2 className="text-xl font-bold">Fattura {previewNumeroFattura}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFatturaPdf(previewNumeroFattura, 'download')}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm"
                >
                  <Download size={18} />
                  Scarica PDF
                </button>
                <button
                  onClick={() => window.open(previewPdfUrl, '_blank')}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm"
                >
                  <ExternalLink size={18} />
                  Apri in nuova tab
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false)
                    setPreviewPdfUrl(null)
                    setPreviewNumeroFattura('')
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            {/* PDF Viewer */}
            <div className="flex-1 p-2 bg-gray-100 dark:bg-gray-900">
              <iframe
                src={previewPdfUrl}
                className="w-full h-full rounded-lg border border-gray-300 dark:border-gray-600"
                title={`Fattura ${previewNumeroFattura}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
