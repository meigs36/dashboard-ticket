'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Save, AlertCircle } from 'lucide-react'

export default function ContrattoModal({ contratto, mode, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    num_contratto: '',
    nome_contratto: '',
    tipo_contratto: 'assistenza',
    sede_riferimento: '',
    data_contratto: '',
    data_scadenza: '',
    data_rinnovo: '',
    ore_incluse: '',
    stato: 'attivo',
    note: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (contratto) {
      setFormData({
        num_contratto: contratto.num_contratto || '',
        nome_contratto: contratto.nome_contratto || '',
        tipo_contratto: contratto.tipo_contratto || 'assistenza',
        sede_riferimento: contratto.sede_riferimento || '',
        data_contratto: contratto.data_contratto || '',
        data_scadenza: contratto.data_scadenza || '',
        data_rinnovo: contratto.data_rinnovo || '',
        ore_incluse: contratto.ore_incluse || '',
        stato: contratto.stato || 'attivo',
        note: contratto.note || ''
      })
    }
  }, [contratto])

  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validazione
      if (!formData.num_contratto || !formData.nome_contratto) {
        setError('Numero contratto e nome sono obbligatori')
        setLoading(false)
        return
      }

      // Update contratto
      const { error: updateError } = await supabase
        .from('contratti')
        .update({
          num_contratto: formData.num_contratto,
          nome_contratto: formData.nome_contratto,
          tipo_contratto: formData.tipo_contratto,
          sede_riferimento: formData.sede_riferimento,
          data_contratto: formData.data_contratto || null,
          data_scadenza: formData.data_scadenza || null,
          data_rinnovo: formData.data_rinnovo || null,
          ore_incluse: parseFloat(formData.ore_incluse) || 0,
          stato: formData.stato,
          note: formData.note
        })
        .eq('id', contratto.id)

      if (updateError) throw updateError

      alert('✅ Contratto aggiornato con successo!')
      onUpdate()
      onClose()
    } catch (err) {
      console.error('Errore aggiornamento contratto:', err)
      setError(err.message || 'Errore durante l\'aggiornamento')
    } finally {
      setLoading(false)
    }
  }

  const isViewMode = mode === 'view'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isViewMode ? 'Dettagli Contratto' : 'Modifica Contratto'}
            </h2>
            {contratto && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                #{contratto.num_contratto}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Informazioni Base */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Informazioni Base
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Numero Contratto *
                  </label>
                  <input
                    type="text"
                    name="num_contratto"
                    value={formData.num_contratto}
                    onChange={handleChange}
                    disabled={isViewMode}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome Contratto *
                  </label>
                  <input
                    type="text"
                    name="nome_contratto"
                    value={formData.nome_contratto}
                    onChange={handleChange}
                    disabled={isViewMode}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo Contratto
                  </label>
                  <select
                    name="tipo_contratto"
                    value={formData.tipo_contratto}
                    onChange={handleChange}
                    disabled={isViewMode}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                  >
                    <option value="assistenza">Assistenza</option>
                    <option value="manutenzione">Manutenzione</option>
                    <option value="noleggio">Noleggio</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sede Riferimento
                  </label>
                  <input
                    type="text"
                    name="sede_riferimento"
                    value={formData.sede_riferimento}
                    onChange={handleChange}
                    disabled={isViewMode}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Stato
                  </label>
                  <select
                    name="stato"
                    value={formData.stato}
                    onChange={handleChange}
                    disabled={isViewMode}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                  >
                    <option value="attivo">Attivo</option>
                    <option value="scaduto">Scaduto</option>
                    <option value="sospeso">Sospeso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ore Incluse
                  </label>
                  <input
                    type="number"
                    name="ore_incluse"
                    value={formData.ore_incluse}
                    onChange={handleChange}
                    disabled={isViewMode}
                    step="0.5"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Date */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Date
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Data Inizio Contratto
                  </label>
                  <input
                    type="date"
                    name="data_contratto"
                    value={formData.data_contratto}
                    onChange={handleChange}
                    disabled={isViewMode}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Data Scadenza
                  </label>
                  <input
                    type="date"
                    name="data_scadenza"
                    value={formData.data_scadenza}
                    onChange={handleChange}
                    disabled={isViewMode}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Data Rinnovo
                  </label>
                  <input
                    type="date"
                    name="data_rinnovo"
                    value={formData.data_rinnovo}
                    onChange={handleChange}
                    disabled={isViewMode}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Informazioni Utilizzo (solo visualizzazione) */}
            {contratto && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Utilizzo Ore
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ore Incluse</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {parseFloat(contratto.ore_incluse || 0).toFixed(1)}h
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ore Utilizzate</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {parseFloat(contratto.ore_utilizzate || 0).toFixed(1)}h
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ore Rimanenti</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {parseFloat(contratto.ore_rimanenti || 0).toFixed(1)}h
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Note
              </label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleChange}
                disabled={isViewMode}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              {isViewMode ? 'Chiudi' : 'Annulla'}
            </button>
            {!isViewMode && (
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Salvataggio...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Salva Modifiche</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
