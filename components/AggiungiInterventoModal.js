'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { X, Clock, AlertCircle } from 'lucide-react'

export default function AggiungiInterventoModal({ ticket, onClose, onSuccess }) {
  const { userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [contratti, setContratti] = useState([])
  
  // Form state
  const [formData, setFormData] = useState({
    data_intervento: new Date().toISOString().split('T')[0],
    ora_inizio: '',
    ora_fine: '',
    tipo_attivita: '',
    descrizione_intervento: '',
    contratto_id: '',
    is_cortesia: false,
    motivo_cortesia: '',
    modalita_intervento: 'in_loco' // remoto, in_loco, in_garanzia
  })

  // Durata calcolata
  const [durataCalcolata, setDurataCalcolata] = useState(null)
  
  // Stato per la garanzia
  const [garanziaValida, setGaranziaValida] = useState(false)
  const [garanziaInfo, setGaranziaInfo] = useState(null)

  useEffect(() => {
    loadContratti()
    checkGaranzia()
  }, [])

  useEffect(() => {
    if (formData.ora_inizio && formData.ora_fine) {
      calcolaDurata()
    }
  }, [formData.ora_inizio, formData.ora_fine])

  async function loadContratti() {
  try {
    console.log('🔍 DEBUG Ticket object:', ticket)
    
    // Ottieni ID cliente dal ticket
    const clienteId = ticket.id_cliente || ticket.cliente_id
    
    if (!clienteId) {
      console.warn('⚠️ Nessun cliente associato - intervento sarà da fatturare')
      return
    }
    
    console.log('✅ Cliente ID:', clienteId)
    
    // 1. Carica il codice_cliente da clienti
    const { data: clienteData, error: clienteError } = await supabase
      .from('clienti')
      .select('codice_cliente')
      .eq('id', clienteId)
      .single()
    
    if (clienteError) {
      console.error('❌ Errore caricamento cliente:', clienteError)
      return
    }
    
    const codiceCliente = clienteData?.codice_cliente
    
    if (!codiceCliente) {
      console.warn('⚠️ Cliente senza codice - intervento sarà da fatturare')
      return
    }
    
    console.log('🔍 Cerco contratti per codice_cliente:', codiceCliente)
    
    // 2. Cerca contratti usando codice_cliente
    const { data, error } = await supabase
      .from('contratti')
      .select('*')
      .eq('codice_cliente', codiceCliente)
      .eq('stato', 'attivo')
      .order('data_scadenza', { ascending: false })

    if (error) {
      console.error('❌ Errore query contratti:', error)
      return
    }
    
    console.log('✅ Contratti trovati:', data?.length || 0, data)
    setContratti(data || [])
    
    // Seleziona automaticamente il primo contratto se presente
    if (data && data.length > 0) {
      setFormData(prev => ({ ...prev, contratto_id: data[0].id }))
      console.log('✅ Contratto preselezionato:', data[0].num_contratto)
    } else {
      console.log('ℹ️ Nessun contratto attivo - intervento sarà da fatturare')
    }
  } catch (error) {
    console.error('❌ Errore caricamento contratti:', error)
    // Non bloccare il form - permetti inserimento senza contratto
  }
}

  async function checkGaranzia() {
    try {
      // Se il ticket ha un macchinario associato, verifica la garanzia
      if (!ticket.id_macchinario) {
        console.log('ℹ️ Ticket senza macchinario associato')
        return
      }

      const { data, error } = await supabase
        .from('macchinari')
        .select('garanzia_scadenza, garanzia_estensione_scadenza, numero_seriale, marca, modello')
        .eq('id', ticket.id_macchinario)
        .single()

      if (error) throw error

      if (data) {
        const oggi = new Date()
        oggi.setHours(0, 0, 0, 0)
        
        // Controlla prima garanzia estensione, poi garanzia base
        let dataScadenza = null
        let tipoGaranzia = null

        if (data.garanzia_estensione_scadenza) {
          const scadenzaEstensione = new Date(data.garanzia_estensione_scadenza)
          scadenzaEstensione.setHours(0, 0, 0, 0)
          
          if (scadenzaEstensione >= oggi) {
            dataScadenza = scadenzaEstensione
            tipoGaranzia = 'Garanzia Estesa'
          }
        }
        
        if (!dataScadenza && data.garanzia_scadenza) {
          const scadenzaBase = new Date(data.garanzia_scadenza)
          scadenzaBase.setHours(0, 0, 0, 0)
          
          if (scadenzaBase >= oggi) {
            dataScadenza = scadenzaBase
            tipoGaranzia = 'Garanzia Base'
          }
        }

        if (dataScadenza) {
          setGaranziaValida(true)
          setGaranziaInfo({
            tipo: tipoGaranzia,
            scadenza: dataScadenza,
            macchinario: `${data.marca} ${data.modello} - ${data.numero_seriale}`
          })
          console.log('✅ Garanzia valida trovata:', tipoGaranzia, 'fino al', dataScadenza)
        } else {
          console.log('ℹ️ Nessuna garanzia valida per questo macchinario')
        }
      }
    } catch (error) {
      console.error('❌ Errore verifica garanzia:', error)
    }
  }

  function calcolaDurata() {
    const [oreInizio, minInizio] = formData.ora_inizio.split(':').map(Number)
    const [oreFine, minFine] = formData.ora_fine.split(':').map(Number)
    
    if (isNaN(oreInizio) || isNaN(minInizio) || isNaN(oreFine) || isNaN(minFine)) {
      setDurataCalcolata(null)
      return
    }
    
    const minutiInizio = oreInizio * 60 + minInizio
    const minutiFine = oreFine * 60 + minFine
    
    if (minutiFine <= minutiInizio) {
      setDurataCalcolata({ error: 'Ora fine deve essere dopo ora inizio' })
      return
    }
    
    const durataMinuti = minutiFine - minutiInizio
    const durataOre = durataMinuti / 60
    
    // Arrotondamento per eccesso a blocchi di 30 minuti
    const durataArrotondata = Math.ceil(durataOre * 2) / 2
    
    setDurataCalcolata({
      effettiva: durataOre.toFixed(2),
      addebitata: durataArrotondata.toFixed(1),
      warning: durataOre !== durataArrotondata
    })
  }

  function handleChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  function toggleCortesia() {
    setFormData(prev => ({ 
      ...prev, 
      is_cortesia: !prev.is_cortesia,
      contratto_id: !prev.is_cortesia ? '' : contratti[0]?.id || '',
      motivo_cortesia: !prev.is_cortesia ? prev.motivo_cortesia : ''
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    // Validazioni
    if (!formData.ora_fine || formData.ora_fine <= formData.ora_inizio) {
      alert('⚠️ Ora fine deve essere dopo ora inizio')
      return
    }

    if (!formData.is_cortesia && !formData.contratto_id && formData.modalita_intervento !== 'in_garanzia') {
      alert('⚠️ Seleziona un contratto o imposta come cortesia/garanzia')
      return
    }

    if (formData.is_cortesia && !formData.motivo_cortesia.trim()) {
      alert('⚠️ Specifica il motivo della cortesia')
      return
    }

    if (!formData.tipo_attivita) {
      alert('⚠️ Seleziona il tipo di attività')
      return
    }

    if (!formData.modalita_intervento) {
      alert('⚠️ Seleziona la modalità di intervento')
      return
    }

    setLoading(true)

    try {
      const interventoData = {
  ticket_id: ticket.id,
  contratto_id: (formData.is_cortesia || formData.modalita_intervento === 'in_garanzia') 
    ? null 
    : (formData.contratto_id || null),
  data_intervento: formData.data_intervento,
  ora_inizio: formData.ora_inizio,
  ora_fine: formData.ora_fine,
  is_cortesia: formData.is_cortesia,
  motivo_cortesia: formData.is_cortesia ? formData.motivo_cortesia : null,
  id_tecnico: userProfile.id,  // ← CAMBIATO QUI
  inserito_da: userProfile.id,
  tipo_attivita: formData.tipo_attivita,
  descrizione_intervento: formData.descrizione_intervento || null,
  modalita_intervento: formData.modalita_intervento
}

      console.log('📤 Invio intervento:', interventoData)

      const { data, error } = await supabase
        .from('interventi')
        .insert(interventoData)
        .select()
        .single()

      if (error) throw error

      alert('✅ Intervento salvato con successo!')
      onSuccess()
    } catch (error) {
      console.error('❌ Errore salvataggio:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            ➕ Nuovo Intervento
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Data e Orari */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                📅 Data intervento *
              </label>
              <input
                type="date"
                value={formData.data_intervento}
                onChange={(e) => handleChange('data_intervento', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ⏰ Ora inizio *
              </label>
              <input
                type="time"
                value={formData.ora_inizio}
                onChange={(e) => handleChange('ora_inizio', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ⏰ Ora fine *
              </label>
              <input
                type="time"
                value={formData.ora_fine}
                onChange={(e) => handleChange('ora_fine', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Durata Calcolata */}
          {durataCalcolata && (
            <div className={`p-4 rounded-lg ${
              durataCalcolata.error 
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
                : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
            }`}>
              <div className="flex items-start gap-3">
                {durataCalcolata.error ? (
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                ) : (
                  <Clock className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                )}
                <div className="flex-1">
                  {durataCalcolata.error ? (
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                      {durataCalcolata.error}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                        ⏱️ Durata calcolata: {durataCalcolata.effettiva}h → {durataCalcolata.addebitata}h
                      </p>
                      {durataCalcolata.warning && (
                        <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                          Arrotondato per eccesso a blocchi di 30 minuti
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Modalità Intervento */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              🎯 Modalità Intervento *
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Remoto */}
              <label className={`relative flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                formData.modalita_intervento === 'remoto'
                  ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/30'
                  : 'border-gray-300 dark:border-gray-600 hover:border-purple-300'
              }`}>
                <input
                  type="radio"
                  name="modalita_intervento"
                  value="remoto"
                  checked={formData.modalita_intervento === 'remoto'}
                  onChange={(e) => handleChange('modalita_intervento', e.target.value)}
                  className="sr-only"
                />
                <div className="flex flex-col flex-1">
                  <span className="font-semibold text-gray-900 dark:text-white">💻 Remoto</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Assistenza da remoto</span>
                </div>
                {formData.modalita_intervento === 'remoto' && (
                  <span className="text-purple-600">✓</span>
                )}
              </label>

              {/* In Loco */}
              <label className={`relative flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                formData.modalita_intervento === 'in_loco'
                  ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
              }`}>
                <input
                  type="radio"
                  name="modalita_intervento"
                  value="in_loco"
                  checked={formData.modalita_intervento === 'in_loco'}
                  onChange={(e) => handleChange('modalita_intervento', e.target.value)}
                  className="sr-only"
                />
                <div className="flex flex-col flex-1">
                  <span className="font-semibold text-gray-900 dark:text-white">🏢 In Loco</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Presso il cliente</span>
                </div>
                {formData.modalita_intervento === 'in_loco' && (
                  <span className="text-blue-600">✓</span>
                )}
              </label>

              {/* In Garanzia */}
              <label className={`relative flex items-center p-3 rounded-lg border-2 transition-all ${
                !garanziaValida 
                  ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700'
                  : formData.modalita_intervento === 'in_garanzia'
                  ? 'border-green-500 bg-green-100 dark:bg-green-900/30 cursor-pointer'
                  : 'border-gray-300 dark:border-gray-600 hover:border-green-300 cursor-pointer'
              }`}>
                <input
                  type="radio"
                  name="modalita_intervento"
                  value="in_garanzia"
                  checked={formData.modalita_intervento === 'in_garanzia'}
                  onChange={(e) => handleChange('modalita_intervento', e.target.value)}
                  disabled={!garanziaValida}
                  className="sr-only"
                />
                <div className="flex flex-col flex-1">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    🛡️ In Garanzia
                    {!garanziaValida && <span className="text-xs font-normal ml-1">(Non disponibile)</span>}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {garanziaValida ? 'Coperto da garanzia' : 'Garanzia scaduta'}
                  </span>
                </div>
                {formData.modalita_intervento === 'in_garanzia' && (
                  <span className="text-green-600">✓</span>
                )}
              </label>
            </div>

            {/* Info Garanzia */}
            {garanziaValida && garanziaInfo && (
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                  ✅ {garanziaInfo.tipo} valida fino al {garanziaInfo.scadenza.toLocaleDateString('it-IT')}
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                  {garanziaInfo.macchinario}
                </p>
              </div>
            )}
          </div>

          {/* Tipo Billing: Contratto o Cortesia */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              💼 Tipo Intervento
            </h3>

            {/* Toggle Cortesia */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_cortesia"
                checked={formData.is_cortesia}
                onChange={toggleCortesia}
                className="w-5 h-5 text-yellow-600 rounded focus:ring-2 focus:ring-yellow-500"
              />
              <label htmlFor="is_cortesia" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                🎁 Intervento di cortesia (non scala ore dal contratto)
              </label>
            </div>

            {/* Sezione Contratto */}
            {!formData.is_cortesia && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Seleziona contratto attivo *
                </label>
                <select
                  value={formData.contratto_id}
                  onChange={(e) => handleChange('contratto_id', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required={!formData.is_cortesia}
                >
                  <option value="">Seleziona contratto...</option>
                  {contratti.map((contratto) => {
                    const oreInfo = `${contratto.ore_rimanenti}h/${contratto.ore_incluse}h`
                    const warning = contratto.ore_rimanenti < 2 ? ' ⚠️ QUASI ESAURITO' : ''
                    return (
                      <option key={contratto.id} value={contratto.id}>
                        {contratto.nome_contratto} #{contratto.num_contratto} - {oreInfo}{warning}
                      </option>
                    )
                  })}
                </select>
                {contratti.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ Nessun contratto attivo per questo cliente
                  </p>
                )}
              </div>
            )}

            {/* Sezione Cortesia */}
            {formData.is_cortesia && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Motivo cortesia *
                </label>
                <input
                  type="text"
                  value={formData.motivo_cortesia}
                  onChange={(e) => handleChange('motivo_cortesia', e.target.value)}
                  placeholder="Es: Cliente VIP, Test gratuito, Problema nostro"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white"
                  required={formData.is_cortesia}
                />
              </div>
            )}
          </div>

          {/* Tipo Attività */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              📋 Tipo attività *
            </label>
            <select
              value={formData.tipo_attivita}
              onChange={(e) => handleChange('tipo_attivita', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            >
              <option value="">Seleziona...</option>
              <option value="Installazione">Installazione</option>
              <option value="Manutenzione">Manutenzione</option>
              <option value="Supporto">Supporto</option>
              <option value="Formazione">Formazione</option>
              <option value="Configurazione">Configurazione</option>
              <option value="Diagnosi">Diagnosi</option>
              <option value="Riparazione">Riparazione</option>
              <option value="Aggiornamento">Aggiornamento</option>
              <option value="Altro">Altro</option>
            </select>
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              📝 Descrizione intervento
            </label>
            <textarea
              value={formData.descrizione_intervento}
              onChange={(e) => handleChange('descrizione_intervento', e.target.value)}
              placeholder="Descrivi cosa è stato fatto durante l'intervento..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Opzionale ma consigliato
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading || (durataCalcolata && durataCalcolata.error)}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Salvataggio...
                </span>
              ) : (
                '💾 Salva Intervento'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
