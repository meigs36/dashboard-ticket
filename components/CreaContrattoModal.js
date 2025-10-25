'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { X, Save } from 'lucide-react'

export default function CreaContrattoModal({ onClose, onSuccess }) {
  const { userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [clienti, setClienti] = useState([])
  
  const [formData, setFormData] = useState({
    codice_cliente: '',
    tipo_contratto: 'Informatica',
    nome_contratto: 'Freedom',
    sede_riferimento: '',
    data_contratto: new Date().toISOString().split('T')[0],
    durata_mesi: 24,
    ore_incluse: 10.0,
    stato: 'attivo',
    note: ''
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

  function calcolaDataScadenza() {
    const dataInizio = new Date(formData.data_contratto)
    dataInizio.setMonth(dataInizio.getMonth() + parseInt(formData.durata_mesi))
    return dataInizio.toISOString().split('T')[0]
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

    setLoading(true)

    try {
      // Genera numero contratto automatico
      const anno = new Date().getFullYear()
      
      // Usa MAX invece di COUNT per evitare duplicati
      const { data: ultimi, error: errQuery } = await supabase
        .from('contratti')
        .select('num_contratto')
        .like('num_contratto', `CNT-${anno}-%`)
        .order('num_contratto', { ascending: false })
        .limit(1)
      
      let numeroProgressivo = 1
      if (ultimi && ultimi.length > 0) {
        // Estrai il numero dall'ultimo contratto (CNT-2025-0003 -> 3)
        const ultimoNumero = ultimi[0].num_contratto.split('-')[2]
        numeroProgressivo = parseInt(ultimoNumero) + 1
      }
      
      const numContratto = `CNT-${anno}-${numeroProgressivo.toString().padStart(4, '0')}`

      // Calcola data scadenza
      const dataScadenza = calcolaDataScadenza()

      const nuovoContratto = {
        num_contratto: numContratto,
        codice_cliente: formData.codice_cliente,
        tipo_contratto: formData.tipo_contratto,
        nome_contratto: formData.nome_contratto,
        sede_riferimento: formData.sede_riferimento || null,
        data_contratto: formData.data_contratto,
        data_scadenza: dataScadenza,
        ore_incluse: parseFloat(formData.ore_incluse),
        ore_utilizzate: 0,
        stato: formData.stato,
        note: formData.note || null
      }

      console.log('Creazione contratto:', nuovoContratto)

      const { data, error } = await supabase
        .from('contratti')
        .insert(nuovoContratto)
        .select()
        .single()

      if (error) throw error

      alert(`✅ Contratto ${numContratto} creato con successo!`)
      onSuccess()
    } catch (error) {
      console.error('Errore creazione contratto:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            ➕ Nuovo Contratto
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

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
                ⏱️ Durata (mesi) *
              </label>
              <select
                value={formData.durata_mesi}
                onChange={(e) => handleChange('durata_mesi', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="12">12 mesi (1 anno)</option>
                <option value="24">24 mesi (2 anni)</option>
                <option value="36">36 mesi (3 anni)</option>
                <option value="6">6 mesi</option>
                <option value="3">3 mesi</option>
              </select>
            </div>
          </div>

          {/* Data Scadenza Calcolata */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-900">
              <span className="font-medium">📆 Data scadenza calcolata:</span>{' '}
              {new Date(calcolaDataScadenza()).toLocaleDateString('it-IT', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
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
            <p className="text-xs text-gray-500 mt-1">
              Puoi inserire anche valori personalizzati (es: 7.5, 15.5)
            </p>
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
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creazione...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Crea Contratto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
