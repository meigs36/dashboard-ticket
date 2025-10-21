'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Save, AlertCircle } from 'lucide-react'

export default function ModificaContrattoModal({ contratto, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [clienti, setClienti] = useState([])
  
  const [formData, setFormData] = useState({
    codice_cliente: contratto.codice_cliente || '',
    tipo_contratto: contratto.tipo_contratto || 'Informatica',
    nome_contratto: contratto.nome_contratto || '',
    sede_riferimento: contratto.sede_riferimento || '',
    data_contratto: contratto.data_contratto || '',
    data_scadenza: contratto.data_scadenza || '',
    ore_incluse: parseFloat(contratto.ore_incluse || 0),
    stato: contratto.stato || 'attivo',
    note: contratto.note || ''
  })

  useEffect(() => {
    loadClienti()
  }, [])

  async function loadClienti() {
    try {
      const { data, error } = await supabase
        .from('clienti')
        .select('id, codice_cliente, ragione_sociale, citta')
        .eq('attivo', true)
        .order('ragione_sociale')

      if (error) throw error
      setClienti(data || [])
    } catch (error) {
      console.error('Errore caricamento clienti:', error)
    }
  }

  function handleChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  function calcolaDurataResidua() {
    if (!formData.data_scadenza) return 0
    const oggi = new Date()
    const scadenza = new Date(formData.data_scadenza)
    const diffGiorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24))
    return Math.max(0, diffGiorni)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.codice_cliente) {
      alert('⚠️ Seleziona un cliente')
      return
    }

    if (formData.ore_incluse <= 0) {
      alert('⚠️ Le ore incluse devono essere maggiori di 0')
      return
    }

    // Verifica che ore_utilizzate non superi ore_incluse
    if (contratto.ore_utilizzate > parseFloat(formData.ore_incluse)) {
      if (!confirm(
        `⚠️ ATTENZIONE!\n\n` +
        `Ore utilizzate: ${contratto.ore_utilizzate}h\n` +
        `Ore nuove incluse: ${formData.ore_incluse}h\n\n` +
        `Le ore utilizzate superano le ore incluse!\n` +
        `Vuoi comunque procedere?`
      )) {
        return
      }
    }

    setLoading(true)

    try {
      const contrattoAggiornato = {
        codice_cliente: formData.codice_cliente,
        tipo_contratto: formData.tipo_contratto,
        nome_contratto: formData.nome_contratto,
        sede_riferimento: formData.sede_riferimento || null,
        data_contratto: formData.data_contratto,
        data_scadenza: formData.data_scadenza,
        ore_incluse: parseFloat(formData.ore_incluse),
        stato: formData.stato,
        note: formData.note || null
      }

      console.log('Aggiornamento contratto:', contrattoAggiornato)

      const { data, error } = await supabase
        .from('contratti')
        .update(contrattoAggiornato)
        .eq('id', contratto.id)
        .select()
        .single()

      if (error) throw error

      alert(`✅ Contratto ${contratto.num_contratto} aggiornato con successo!`)
      onSuccess()
    } catch (error) {
      console.error('Errore aggiornamento contratto:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const durataResidua = calcolaDurataResidua()
  const oreRimanenti = parseFloat(formData.ore_incluse) - parseFloat(contratto.ore_utilizzate || 0)
  const percentualeOre = (oreRimanenti / parseFloat(formData.ore_incluse)) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              ✏️ Modifica Contratto
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              #{contratto.num_contratto}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Alert Ore Utilizzate */}
        {contratto.ore_utilizzate > 0 && (
          <div className="mx-6 mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Attenzione: Contratto già in uso
                </p>
                <p className="text-sm text-blue-700">
                  Questo contratto ha già <span className="font-bold">{parseFloat(contratto.ore_utilizzate).toFixed(1)}h utilizzate</span>.
                  Se riduci le ore incluse sotto questo valore, potrebbero verificarsi problemi con gli interventi già registrati.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              👤 Cliente *
            </label>
            <select
              value={formData.codice_cliente}
              onChange={(e) => handleChange('codice_cliente', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seleziona cliente...</option>
              {clienti.map((cliente) => (
                <option key={cliente.id} value={cliente.codice_cliente}>
                  {cliente.ragione_sociale} - {cliente.citta} ({cliente.codice_cliente})
                </option>
              ))}
            </select>
          </div>

          {/* Tipo e Nome */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📦 Tipo Contratto *
              </label>
              <select
                value={formData.tipo_contratto}
                onChange={(e) => handleChange('tipo_contratto', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="Informatica">Informatica</option>
                <option value="Elettronica">Elettronica</option>
                <option value="Macchine">Macchine</option>
                <option value="Misto">Misto</option>
                <option value="Altro">Altro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏷️ Nome Contratto *
              </label>
              <input
                type="text"
                value={formData.nome_contratto}
                onChange={(e) => handleChange('nome_contratto', e.target.value)}
                placeholder="Es: Freedom, Premium, Basic"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Sede Riferimento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📍 Sede di Riferimento
            </label>
            <input
              type="text"
              value={formData.sede_riferimento}
              onChange={(e) => handleChange('sede_riferimento', e.target.value)}
              placeholder="Es: Sede Principale, Filiale Milano..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Data Inizio *
              </label>
              <input
                type="date"
                value={formData.data_contratto}
                onChange={(e) => handleChange('data_contratto', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📆 Data Scadenza *
              </label>
              <input
                type="date"
                value={formData.data_scadenza}
                onChange={(e) => handleChange('data_scadenza', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Info Durata Residua */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-700">
              <span className="font-medium">⏱️ Giorni rimanenti:</span>{' '}
              <span className={`font-bold ${durataResidua <= 30 ? 'text-orange-600' : 'text-green-600'}`}>
                {durataResidua} giorni
              </span>
            </p>
          </div>

          {/* Ore Incluse */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ⏰ Ore Incluse *
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[5, 10, 20, 50].map((ore) => (
                <button
                  key={ore}
                  type="button"
                  onClick={() => handleChange('ore_incluse', ore)}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    formData.ore_incluse == ore
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                      : 'border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {ore}h
                </button>
              ))}
            </div>
            <input
              type="number"
              value={formData.ore_incluse}
              onChange={(e) => handleChange('ore_incluse', e.target.value)}
              min="0"
              step="0.5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Info Ore Utilizzate */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Ore Utilizzate:</span>
                <span className="text-lg font-bold text-purple-600">
                  {parseFloat(contratto.ore_utilizzate || 0).toFixed(1)}h
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Ore Rimanenti:</span>
                <span className={`text-lg font-bold ${
                  percentualeOre <= 10 ? 'text-red-600' :
                  percentualeOre <= 25 ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {oreRimanenti.toFixed(1)}h
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    percentualeOre <= 10 ? 'bg-red-500' :
                    percentualeOre <= 25 ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, percentualeOre))}%` }}
                ></div>
              </div>
              
              <p className="text-xs text-gray-600 text-center">
                {percentualeOre.toFixed(0)}% disponibili
              </p>
            </div>
          </div>

          {/* Stato */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔄 Stato *
            </label>
            <select
              value={formData.stato}
              onChange={(e) => handleChange('stato', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="attivo">✅ Attivo</option>
              <option value="sospeso">⏸️ Sospeso</option>
              <option value="scaduto">❌ Scaduto</option>
              <option value="rinnovato">🔄 Rinnovato</option>
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📝 Note
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => handleChange('note', e.target.value)}
              placeholder="Note aggiuntive sul contratto..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Salva Modifiche
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
