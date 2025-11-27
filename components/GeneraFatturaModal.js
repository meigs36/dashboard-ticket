'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { 
  X, 
  Receipt, 
  FileText, 
  Euro, 
  Clock, 
  Building2, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Calendar,
  List,
  Plus,
  Trash2,
  Sun,
  Mic,
  ChevronDown,
  ChevronUp,
  Car
} from 'lucide-react'

export default function GeneraFatturaModal({ 
  interventi, // Array di interventi da fatturare
  ticket,
  cliente,
  onClose, 
  onSuccess 
}) {
  const { userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [loadingTariffe, setLoadingTariffe] = useState(true)
  const [loadingDistanza, setLoadingDistanza] = useState(false)
  const [clienteDistanza, setClienteDistanza] = useState(cliente?.distanza_km || null)
  const [tariffe, setTariffe] = useState([])
  const [note, setNote] = useState('')
  const [dataScadenza, setDataScadenza] = useState('')
  const [isFestivo, setIsFestivo] = useState(false)
  const [showInterventiDetails, setShowInterventiDetails] = useState(true)
  
  // Voci fattura (righe)
  const [vociFattura, setVociFattura] = useState([])

  // Carica tariffe dal database
  useEffect(() => {
    loadTariffe()
    
    // Data scadenza default 30 giorni
    const oggi = new Date()
    oggi.setDate(oggi.getDate() + 30)
    setDataScadenza(oggi.toISOString().split('T')[0])
  }, [])

  // Inizializza voci quando tariffe sono caricate
  useEffect(() => {
    if (tariffe.length > 0) {
      initVociFattura()
    }
  }, [tariffe])

  async function loadTariffe() {
    setLoadingTariffe(true)
    try {
      const { data, error } = await supabase
        .from('tariffe_servizio')
        .select('*')
        .eq('attivo', true)
        .order('categoria')
        .order('codice')

      if (error) throw error
      setTariffe(data || [])
    } catch (error) {
      console.error('❌ Errore caricamento tariffe:', error)
      // Fallback tariffe se tabella non esiste
      setTariffe([
        { codice: 'HM', descrizione: 'Mano d\'opera Standard', categoria: 'standard', prezzo: 60, unita: 'ora' },
        { codice: 'HMI', descrizione: 'Mano d\'opera Hi-Tech', categoria: 'hi-tech', prezzo: 80, unita: 'ora' }
      ])
    } finally {
      setLoadingTariffe(false)
    }
  }

  // Calcola distanza cliente on-demand
  async function calcolaDistanza() {
    if (!cliente?.id || !cliente?.indirizzo || !cliente?.citta) {
      alert('Dati indirizzo cliente incompleti')
      return
    }

    setLoadingDistanza(true)
    try {
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_DISTANZA || 'https://n8nsimpro.simulationproject.it/webhook/calcola-distanza'
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: cliente.id,
          indirizzo: cliente.indirizzo,
          cap: cliente.cap || '',
          citta: cliente.citta
        })
      })

      const data = await response.json()
      
      if (data.success && data.distanza_km) {
        setClienteDistanza(data.distanza_km)
        // Ricalcola le voci con la nuova distanza
        aggiungiVoceKm(data.distanza_km)
      } else {
        alert('Errore nel calcolo: ' + (data.error || 'Indirizzo non trovato'))
      }
    } catch (error) {
      console.error('❌ Errore calcolo distanza:', error)
      alert('Errore di connessione al servizio di calcolo')
    } finally {
      setLoadingDistanza(false)
    }
  }

  // Aggiunge la voce KM alle voci fattura
  function aggiungiVoceKm(distanza) {
    const sogliaMinima = 20
    if (distanza < sogliaMinima) return

    const kmTotali = distanza * 2 // A/R
    const tariffaKm = tariffe.find(t => t.codice === 'KM')
    const prezzoKm = tariffaKm?.prezzo || 0.50

    // Rimuovi eventuale voce KM esistente e aggiungi la nuova
    setVociFattura(prev => {
      const senzaKm = prev.filter(v => v.codice_tariffa !== 'KM')
      return [...senzaKm, {
        id: Date.now() + 1,
        codice_tariffa: 'KM',
        descrizione: `Rimborso chilometrico (${distanza.toFixed(1)} km x 2 A/R)`,
        quantita: kmTotali,
        prezzo_unitario: prezzoKm,
        totale: kmTotali * prezzoKm
      }]
    })
  }

  // Inizializza le voci fattura con le ore degli interventi
  function initVociFattura() {
    const voci = []
    
    // 1. Calcola ore totali da fatturare
    const oreTotali = interventi.reduce((sum, i) => {
      const durataAddebitata = parseFloat(i.durata_addebitata || 0)
      const oreScalate = parseFloat(i.ore_scalate || 0)
      return sum + Math.max(0, durataAddebitata - oreScalate)
    }, 0)

    // Determina se è hi-tech o standard basandosi sulla categoria cliente
    const categoriaDefault = cliente?.tariffa_categoria || 'standard'
    const codiceDefault = categoriaDefault === 'hi-tech' ? 'HMI' : 'HM'
    const tariffa = tariffe.find(t => t.codice === codiceDefault)
    const prezzoDefault = tariffa?.prezzo || (categoriaDefault === 'hi-tech' ? 80 : 60)

    // Aggiungi voce manodopera
    voci.push({
      id: Date.now(),
      codice_tariffa: codiceDefault,
      descrizione: tariffa?.descrizione || 'Mano d\'opera',
      quantita: oreTotali,
      prezzo_unitario: prezzoDefault,
      totale: oreTotali * prezzoDefault
    })

    // 2. Aggiungi voce KM se intervento on-site e cliente ha distanza
    const haInterventoOnSite = interventi.some(i => 
      i.modalita_intervento === 'in_loco' || i.modalita_intervento === 'in-loco' || i.modalita_intervento === 'on-site'
    )
    const distanzaCliente = parseFloat(clienteDistanza) || 0
    const sogliaMinima = 20 // km
    const costoKm = 0.50 // €/km

    if (haInterventoOnSite && distanzaCliente >= sogliaMinima) {
      const kmAndata = distanzaCliente
      const kmTotali = kmAndata * 2 // Andata e ritorno
      const tariffaKm = tariffe.find(t => t.codice === 'KM')
      const prezzoKm = tariffaKm?.prezzo || costoKm

      voci.push({
        id: Date.now() + 1,
        codice_tariffa: 'KM',
        descrizione: `Rimborso chilometrico (${kmAndata.toFixed(1)} km x 2 A/R)`,
        quantita: kmTotali,
        prezzo_unitario: prezzoKm,
        totale: kmTotali * prezzoKm
      })
    }

    setVociFattura(voci)
  }

  // Aggiungi voce fattura
  function aggiungiVoce() {
    setVociFattura(prev => [...prev, {
      id: Date.now(),
      codice_tariffa: '',
      descrizione: '',
      quantita: 1,
      prezzo_unitario: 0,
      totale: 0
    }])
  }

  // Rimuovi voce fattura
  function rimuoviVoce(id) {
    setVociFattura(prev => prev.filter(v => v.id !== id))
  }

  // Aggiorna voce quando cambia la tariffa selezionata
  function handleTariffaChange(voceId, codice) {
    const tariffa = tariffe.find(t => t.codice === codice)
    if (!tariffa) return

    setVociFattura(prev => prev.map(v => {
      if (v.id !== voceId) return v
      
      const prezzoBase = parseFloat(tariffa.prezzo)
      const prezzo = isFestivo ? prezzoBase * 2 : prezzoBase
      
      return {
        ...v,
        codice_tariffa: codice,
        descrizione: tariffa.descrizione,
        prezzo_unitario: prezzo,
        totale: v.quantita * prezzo
      }
    }))
  }

  // Aggiorna quantità
  function handleQuantitaChange(voceId, quantita) {
    const qty = parseFloat(quantita) || 0
    setVociFattura(prev => prev.map(v => {
      if (v.id !== voceId) return v
      return {
        ...v,
        quantita: qty,
        totale: qty * v.prezzo_unitario
      }
    }))
  }

  // Aggiorna prezzo unitario manuale
  function handlePrezzoChange(voceId, prezzo) {
    const prc = parseFloat(prezzo) || 0
    setVociFattura(prev => prev.map(v => {
      if (v.id !== voceId) return v
      return {
        ...v,
        prezzo_unitario: prc,
        totale: v.quantita * prc
      }
    }))
  }

  // Ricalcola prezzi quando cambia festivo
  useEffect(() => {
    if (tariffe.length === 0) return
    
    setVociFattura(prev => prev.map(v => {
      const tariffa = tariffe.find(t => t.codice === v.codice_tariffa)
      if (!tariffa) return v
      
      const prezzoBase = parseFloat(tariffa.prezzo)
      const prezzo = isFestivo ? prezzoBase * 2 : prezzoBase
      
      return {
        ...v,
        prezzo_unitario: prezzo,
        totale: v.quantita * prezzo
      }
    }))
  }, [isFestivo])

  // Calcoli totali
  const imponibile = vociFattura.reduce((sum, v) => sum + (v.totale || 0), 0)
  const ivaPercentuale = 22
  const ivaImporto = imponibile * (ivaPercentuale / 100)
  const totale = imponibile + ivaImporto
  const oreTotali = vociFattura
    .filter(v => ['HM', 'HMI', 'HMIR', 'HVI'].includes(v.codice_tariffa))
    .reduce((sum, v) => sum + (v.quantita || 0), 0)

  async function handleGeneraFattura() {
    if (vociFattura.length === 0 || imponibile <= 0) {
      alert('❌ Aggiungi almeno una voce alla fattura')
      return
    }

    setLoading(true)

    try {
      // 1. Crea record fattura nel database
      const { data: fattura, error: fatturaError } = await supabase
        .from('fatture')
        .insert({
          cliente_id: cliente.id,
          ticket_id: ticket.id,
          interventi_ids: interventi.map(i => i.id),
          ore_totali: oreTotali,
          tariffa_oraria: vociFattura[0]?.prezzo_unitario || 0,
          imponibile: imponibile,
          iva_percentuale: ivaPercentuale,
          iva_importo: ivaImporto,
          totale: totale,
          data_scadenza: dataScadenza,
          stato: 'emessa',
          generato_da: userProfile?.id,
          note: note || null
        })
        .select()
        .single()

      if (fatturaError) throw fatturaError

      console.log('✅ Fattura creata:', fattura)

      // 2. Aggiorna gli interventi come fatturati
      const { error: updateError } = await supabase
        .from('interventi')
        .update({
          fatturato: true,
          data_fatturazione: new Date().toISOString().split('T')[0],
          numero_fattura: fattura.numero_fattura
        })
        .in('id', interventi.map(i => i.id))

      if (updateError) throw updateError

      console.log('✅ Interventi aggiornati come fatturati')

      // 3. Chiama webhook n8n per generare PDF
      try {
        const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_FATTURA
        if (webhookUrl) {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fattura_id: fattura.id,
              numero_fattura: fattura.numero_fattura,
              data_emissione: new Date().toISOString().split('T')[0],
              data_scadenza: dataScadenza,
              cliente: {
                id: cliente.id,
                ragione_sociale: cliente.ragione_sociale,
                indirizzo: cliente.via,
                citta: cliente.citta,
                cap: cliente.cap,
                partita_iva: cliente.partita_iva,
                codice_fiscale: cliente.codice_fiscale,
                email: cliente.email_principale
              },
              ticket_numero: ticket.numero_ticket || `TKT-${ticket.id?.slice(0,8)}`,
              ticket_oggetto: ticket.oggetto || ticket.tipo_intervento || 'Assistenza tecnica',
              voci: vociFattura.map(v => ({
                codice: v.codice_tariffa,
                descrizione: v.descrizione,
                quantita: v.quantita,
                prezzo_unitario: v.prezzo_unitario,
                totale: v.totale
              })),
              // ✅ AGGIUNTO: Interventi con trascrizioni per righe descrittive
              interventi: interventi.map(i => ({
                id: i.id,
                data: i.data_intervento,
                descrizione: i.descrizione_intervento || i.tipo_attivita || '',
                trascrizione: i.trascrizioni_audio || '',  // Campo corretto: trascrizioni_audio
                ore: (parseFloat(i.durata_addebitata || 0) - parseFloat(i.ore_scalate || 0))
              })),
              imponibile,
              iva_percentuale: ivaPercentuale,
              iva_importo: ivaImporto,
              totale,
              is_festivo: isFestivo,
              note: note || ''
            })
          })
          
          const result = await response.json()
          console.log('📤 Webhook n8n risposta:', result)
          
          if (!result.success) {
            console.warn('⚠️ Webhook ha restituito errore:', result.error)
          }
        }
      } catch (webhookError) {
        console.warn('⚠️ Webhook n8n non disponibile:', webhookError)
      }

      alert(`✅ Fattura ${fattura.numero_fattura} generata con successo!`)
      onSuccess()
    } catch (error) {
      console.error('❌ Errore generazione fattura:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Raggruppa tariffe per categoria
  const tariffePerCategoria = tariffe.reduce((acc, t) => {
    if (!acc[t.categoria]) acc[t.categoria] = []
    acc[t.categoria].push(t)
    return acc
  }, {})

  const categorieLabel = {
    'hi-tech': '🖥️ Hi-Tech',
    'standard': '🔧 Standard',
    'servizi': '📋 Servizi',
    'extra': '➕ Extra',
    'contratti': '📄 Contratti'
  }

  // Conta interventi con trascrizione (campo: trascrizioni_audio)
  const interventiConTrascrizione = interventi.filter(i => i.trascrizioni_audio).length

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <Receipt size={24} />
            <h2 className="text-2xl font-bold">Genera Fattura</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info Cliente */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <Building2 className="text-gray-400 mt-1" size={20} />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {cliente?.ragione_sociale || 'Cliente'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {cliente?.indirizzo && `${cliente.indirizzo}, `}
                  {cliente?.cap} {cliente?.citta}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  P.IVA: {cliente?.partita_iva || 'N/D'}
                </p>
                {cliente?.tariffa_categoria && (
                  <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
                    cliente.tariffa_categoria === 'hi-tech' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    Categoria: {cliente.tariffa_categoria}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Info Distanza KM - Solo per interventi in loco */}
          {interventi.some(i => i.modalita_intervento === 'in_loco' || i.modalita_intervento === 'in-loco' || i.modalita_intervento === 'on-site') && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Car className="text-blue-500" size={20} />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Rimborso Chilometrico
                    </h4>
                    {clienteDistanza ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Distanza: <span className="font-semibold">{clienteDistanza.toFixed(1)} km</span> 
                        {clienteDistanza >= 20 && (
                          <span className="text-green-600 ml-2">
                            → {(clienteDistanza * 2).toFixed(1)} km A/R = €{(clienteDistanza * 2 * 0.50).toFixed(2)}
                          </span>
                        )}
                        {clienteDistanza < 20 && (
                          <span className="text-gray-500 ml-2">(sotto soglia minima 20 km)</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Distanza non calcolata per questo cliente
                      </p>
                    )}
                  </div>
                </div>
                {!clienteDistanza && (
                  <button
                    onClick={calcolaDistanza}
                    disabled={loadingDistanza}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors text-sm"
                  >
                    {loadingDistanza ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Calcolo...
                      </>
                    ) : (
                      <>
                        <Car size={16} />
                        Calcola Distanza
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Opzioni Festivo */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFestivo}
                onChange={(e) => setIsFestivo(e.target.checked)}
                className="w-5 h-5 text-orange-600 rounded"
              />
              <Sun size={18} className="text-orange-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Intervento Festivo/Sabato (tariffa doppia)
              </span>
            </label>
          </div>

          {/* ============================================ */}
          {/* SEZIONE DETTAGLIO INTERVENTI (NUOVA) */}
          {/* ============================================ */}
          <div className="border border-amber-200 dark:border-amber-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowInterventiDetails(!showInterventiDetails)}
              className="w-full flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-amber-600" />
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Dettaglio Interventi ({interventi.length})
                </h4>
                {interventiConTrascrizione > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 text-xs rounded-full">
                    <Mic size={12} />
                    {interventiConTrascrizione} trascrizioni
                  </span>
                )}
              </div>
              {showInterventiDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            
            {showInterventiDetails && (
              <div className="p-4 space-y-3 bg-amber-50/50 dark:bg-amber-900/10">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Queste descrizioni appariranno come righe informative nella fattura PDF (sfondo giallo)
                </p>
                
                {interventi.map((intervento, idx) => (
                  <div 
                    key={intervento.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-amber-400 shadow-sm"
                  >
                    {/* Data e ore */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-amber-600" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {new Date(intervento.data_intervento).toLocaleDateString('it-IT', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Clock size={14} />
                        {parseFloat(intervento.durata_addebitata || 0).toFixed(1)}h
                        {parseFloat(intervento.ore_scalate || 0) > 0 && (
                          <span className="text-green-600">
                            (-{parseFloat(intervento.ore_scalate).toFixed(1)}h contratto)
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Descrizione intervento */}
                    {(intervento.descrizione_intervento || intervento.tipo_attivita) && (
                      <div className="mb-2">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">Attività:</span>{' '}
                          {intervento.descrizione_intervento || intervento.tipo_attivita}
                        </p>
                      </div>
                    )}

                    {/* Trascrizione audio */}
                    {intervento.trascrizioni_audio ? (
                      <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-700">
                        <div className="flex items-center gap-1 mb-1">
                          <Mic size={12} className="text-amber-600" />
                          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                            Trascrizione audio
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {intervento.trascrizioni_audio}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        Nessuna trascrizione audio disponibile
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Voci Fattura (Addebiti) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Euro size={18} className="text-green-600" />
                Voci Fattura (Addebiti)
              </h4>
              <button
                onClick={aggiungiVoce}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium rounded-lg transition-colors"
              >
                <Plus size={16} />
                Aggiungi Voce
              </button>
            </div>

            {loadingTariffe ? (
              <div className="text-center py-4">
                <Loader2 className="animate-spin mx-auto" size={24} />
                <p className="text-sm text-gray-500 mt-2">Caricamento tariffe...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {vociFattura.map((voce, index) => (
                  <div 
                    key={voce.id}
                    className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="grid grid-cols-12 gap-3 items-end">
                      {/* Selezione Tariffa */}
                      <div className="col-span-12 sm:col-span-5">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Tariffa
                        </label>
                        <select
                          value={voce.codice_tariffa}
                          onChange={(e) => handleTariffaChange(voce.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Seleziona tariffa...</option>
                          {Object.entries(tariffePerCategoria).map(([categoria, items]) => (
                            <optgroup key={categoria} label={categorieLabel[categoria] || categoria}>
                              {items.map(t => (
                                <option key={t.codice} value={t.codice}>
                                  {t.codice} - {t.descrizione} - Tariffa {t.unita === 'ora' ? 'Oraria' : 'Fissa'}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      {/* Quantità */}
                      <div className="col-span-4 sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Qtà
                        </label>
                        <input
                          type="number"
                          value={voce.quantita}
                          onChange={(e) => handleQuantitaChange(voce.id, e.target.value)}
                          min="0"
                          step="0.5"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      {/* Prezzo Unitario */}
                      <div className="col-span-4 sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          €/unità
                        </label>
                        <input
                          type="number"
                          value={voce.prezzo_unitario}
                          onChange={(e) => handlePrezzoChange(voce.id, e.target.value)}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      {/* Totale */}
                      <div className="col-span-3 sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Totale
                        </label>
                        <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm font-semibold text-green-700 dark:text-green-400">
                          € {(voce.totale || 0).toFixed(2)}
                        </div>
                      </div>

                      {/* Elimina */}
                      <div className="col-span-1">
                        {vociFattura.length > 1 && (
                          <button
                            onClick={() => rimuoviVoce(voce.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Rimuovi voce"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Descrizione sotto */}
                    {voce.descrizione && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {voce.descrizione}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Data scadenza e Note */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar size={14} className="inline mr-1" />
                Data scadenza
              </label>
              <input
                type="date"
                value={dataScadenza}
                onChange={(e) => setDataScadenza(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Note fattura
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note aggiuntive..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Riepilogo Totali */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Receipt size={18} className="text-green-600" />
              Riepilogo Fattura
              {isFestivo && (
                <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                  🌞 FESTIVO x2
                </span>
              )}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Numero voci:</span>
                <span className="font-medium text-gray-900 dark:text-white">{vociFattura.length}</span>
              </div>
              {interventiConTrascrizione > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Righe descrittive (trascrizioni):</span>
                  <span className="font-medium text-amber-600">{interventiConTrascrizione}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-green-200 dark:border-green-800 pt-2">
                <span className="text-gray-600 dark:text-gray-400">Imponibile:</span>
                <span className="font-medium text-gray-900 dark:text-white">€ {imponibile.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">IVA ({ivaPercentuale}%):</span>
                <span className="font-medium text-gray-900 dark:text-white">€ {ivaImporto.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-green-300 dark:border-green-700 pt-3 mt-3">
                <span className="text-gray-900 dark:text-white">TOTALE:</span>
                <span className="text-green-600 dark:text-green-400">€ {totale.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Warning se nessuna voce */}
          {(vociFattura.length === 0 || imponibile <= 0) && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-400">
              <AlertCircle size={20} />
              <span className="text-sm">Aggiungi almeno una voce con importo positivo</span>
            </div>
          )}

          {/* Pulsanti */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Annulla
            </button>
            <button
              onClick={handleGeneraFattura}
              disabled={loading || vociFattura.length === 0 || imponibile <= 0}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Generazione...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  <span>Genera Fattura (€ {totale.toFixed(2)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
