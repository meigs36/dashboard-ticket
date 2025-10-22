'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { X, Calendar, Clock, User, FileText, Gift, Save } from 'lucide-react'

export default function ModificaInterventoModal({ intervento, ticket, onClose, onSuccess }) {
  const { userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [contratti, setContratti] = useState([])
  const [formData, setFormData] = useState({
    data_intervento: '',
    ora_inizio: '',
    ora_fine: '',
    tipo_attivita: '',
    descrizione_intervento: '',
    is_cortesia: false,
    motivo_cortesia: '',
    contratto_id: null
  })

  useEffect(() => {
    if (intervento) {
      // Precompila il form con i dati dell'intervento esistente
      setFormData({
        data_intervento: intervento.data_intervento || '',
        ora_inizio: intervento.ora_inizio || '',
        ora_fine: intervento.ora_fine || '',
        tipo_attivita: intervento.tipo_attivita || '',
        descrizione_intervento: intervento.descrizione_intervento || '',
        is_cortesia: intervento.is_cortesia || false,
        motivo_cortesia: intervento.motivo_cortesia || '',
        contratto_id: intervento.contratto_id || null
      })
    }
    loadContratti()
  }, [intervento])

  async function loadContratti() {
    try {
      // Carica contratti attivi del cliente
      const { data: clienteData } = await supabase
        .from('clienti')
        .select('codice_cliente')
        .eq('id', ticket.id_cliente)
        .single()

      if (!clienteData) return

      const { data, error } = await supabase
        .from('contratti')
        .select('*')
        .eq('codice_cliente', clienteData.codice_cliente)
        .eq('stato', 'attivo')
        .gt('ore_rimanenti', 0)
        .order('data_scadenza', { ascending: false })

      if (error) throw error
      setContratti(data || [])
    } catch (error) {
      console.error('Errore caricamento contratti:', error)
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    try {
      // Validazioni
      if (!formData.data_intervento || !formData.ora_inizio || !formData.ora_fine) {
        throw new Error('Compila tutti i campi obbligatori')
      }

      if (formData.ora_fine <= formData.ora_inizio) {
        throw new Error('L\'ora di fine deve essere successiva all\'ora di inizio')
      }

      if (formData.is_cortesia && !formData.motivo_cortesia) {
        throw new Error('Specifica il motivo della cortesia')
      }

      // Prepara dati per update
      const updateData = {
        data_intervento: formData.data_intervento,
        ora_inizio: formData.ora_inizio,
        ora_fine: formData.ora_fine,
        tipo_attivita: formData.tipo_attivita,
        descrizione_intervento: formData.descrizione_intervento,
        is_cortesia: formData.is_cortesia,
        motivo_cortesia: formData.is_cortesia ? formData.motivo_cortesia : null,
        contratto_id: formData.is_cortesia ? null : (formData.contratto_id || null),
        updated_at: new Date().toISOString()
      }

      console.log('📝 Aggiorno intervento:', intervento.id, updateData)

      const { error } = await supabase
        .from('interventi')
        .update(updateData)
        .eq('id', intervento.id)

      if (error) throw error

      alert('✅ Intervento modificato con successo!')
      onSuccess()
    } catch (error) {
      console.error('❌ Errore modifica intervento:', error)
      alert('❌ ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <FileText size={24} />
            <h2 className="text-2xl font-bold">Modifica Intervento</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Data e Orari */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar size={18} />
              Data e Orari
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Data <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="data_intervento"
                  value={formData.data_intervento}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ora Inizio <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  name="ora_inizio"
                  value={formData.ora_inizio}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ora Fine <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  name="ora_fine"
                  value={formData.ora_fine}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Tipo Attività */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo Attività <span className="text-red-500">*</span>
            </label>
            <select
              name="tipo_attivita"
              value={formData.tipo_attivita}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            >
              <option value="">Seleziona tipo attività</option>
              <option value="Diagnosi">Diagnosi</option>
              <option value="Riparazione">Riparazione</option>
              <option value="Manutenzione">Manutenzione</option>
              <option value="Installazione">Installazione</option>
              <option value="Formazione">Formazione</option>
              <option value="Consulenza">Consulenza</option>
              <option value="Altro">Altro</option>
            </select>
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descrizione Intervento
            </label>
            <textarea
              name="descrizione_intervento"
              value={formData.descrizione_intervento}
              onChange={handleChange}
              placeholder="Descrivi cosa è stato fatto durante l'intervento..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white min-h-24"
            />
          </div>

          {/* Cortesia */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_cortesia"
                checked={formData.is_cortesia}
                onChange={handleChange}
                className="w-5 h-5 text-yellow-600 rounded focus:ring-2 focus:ring-yellow-500"
              />
              <div className="flex items-center gap-2">
                <Gift className="text-yellow-600" size={20} />
                <span className="font-semibold text-gray-900 dark:text-white">
                  Intervento di cortesia
                </span>
              </div>
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-8">
              Gli interventi di cortesia non scalano ore dai contratti e non vengono fatturati
            </p>

            {formData.is_cortesia && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Motivo cortesia <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="motivo_cortesia"
                  value={formData.motivo_cortesia}
                  onChange={handleChange}
                  placeholder="Es: Cliente premium, problema di nostra responsabilità..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white"
                  required={formData.is_cortesia}
                />
              </div>
            )}
          </div>

          {/* Contratto (solo se non è cortesia) */}
          {!formData.is_cortesia && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contratto
              </label>
              <select
                name="contratto_id"
                value={formData.contratto_id || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Nessun contratto (fatturato a parte)</option>
                {contratti.map(contratto => (
                  <option key={contratto.id} value={contratto.id}>
                    {contratto.nome_contratto} - {contratto.ore_rimanenti}h disponibili
                  </option>
                ))}
              </select>
              {contratti.length === 0 && (
                <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                  ⚠️ Nessun contratto attivo con ore disponibili
                </p>
              )}
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
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Salvataggio...</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>Salva Modifiche</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
