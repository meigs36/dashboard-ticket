'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Save, Loader2, Check, AlertCircle, Upload, X } from 'lucide-react'

export default function InfrastrutturaForm({ clienteId }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [message, setMessage] = useState(null)
  const [formData, setFormData] = useState({
    // Apparecchiatura
    tipo_apparecchiatura: '',
    tipo_apparecchiatura_altro: '',
    
    // Planimetria
    include_planimetria: '',
    planimetria_formato: '',
    planimetria_altro: '',
    
    // Dimensioni Sala
    larghezza_sala_cm: '',
    lunghezza_sala_cm: '',
    altezza_sala_cm: '',
    
    // Fotografie
    ha_fotografie: '',
    fotografie_altro: '',
    
    // Struttura
    parete_strutturale: '',
    materiale_pavimento: '',
    
    // Sistema Ancoraggio
    sistema_ancoraggio: '',
    sistema_ancoraggio_altro: '',
    
    // Rete
    rete_tipo: '',
    rete_tipo_altro: '',
    punto_rete_dispositivo: '',
    banda_rete_gbs: '',
    
    // PC
    num_pc_ambulatori: '',
    num_pc_segreteria: '',
    num_pc_amministrazione: '',
    num_pc_altro: '',
    
    // Sistemi Operativi (array)
    sistemi_operativi: [],
    
    // Server
    server_versione: '',
    
    // Contatto Informatico
    contatto_informatico_studio: ''
  })

  // Carica dati esistenti
  useEffect(() => {
    if (clienteId) {
      loadInfrastruttura()
    }
  }, [clienteId])

  const loadInfrastruttura = async () => {
    try {
      setLoadingData(true)
      const { data, error } = await supabase
        .from('infrastruttura_clienti')
        .select('*')
        .eq('id_cliente', clienteId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Errore caricamento:', error)
        return
      }

      if (data) {
        setFormData({
          tipo_apparecchiatura: data.tipo_apparecchiatura || '',
          tipo_apparecchiatura_altro: data.tipo_apparecchiatura_altro || '',
          include_planimetria: data.include_planimetria || '',
          planimetria_formato: data.planimetria_formato || '',
          planimetria_altro: data.planimetria_altro || '',
          larghezza_sala_cm: data.larghezza_sala_cm || '',
          lunghezza_sala_cm: data.lunghezza_sala_cm || '',
          altezza_sala_cm: data.altezza_sala_cm || '',
          ha_fotografie: data.ha_fotografie || '',
          fotografie_altro: data.fotografie_altro || '',
          parete_strutturale: data.parete_strutturale || '',
          materiale_pavimento: data.materiale_pavimento || '',
          sistema_ancoraggio: data.sistema_ancoraggio || '',
          sistema_ancoraggio_altro: data.sistema_ancoraggio_altro || '',
          rete_tipo: data.rete_tipo || '',
          rete_tipo_altro: data.rete_tipo_altro || '',
          punto_rete_dispositivo: data.punto_rete_dispositivo || '',
          banda_rete_gbs: data.banda_rete_gbs || '',
          num_pc_ambulatori: data.num_pc_ambulatori || '',
          num_pc_segreteria: data.num_pc_segreteria || '',
          num_pc_amministrazione: data.num_pc_amministrazione || '',
          num_pc_altro: data.num_pc_altro || '',
          sistemi_operativi: Array.isArray(data.sistemi_operativi) ? data.sistemi_operativi : [],
          server_versione: data.server_versione || '',
          contatto_informatico_studio: data.contatto_informatico_studio || ''
        })
      }
    } finally {
      setLoadingData(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      // Verifica se esiste già un record
      const { data: existing } = await supabase
        .from('infrastruttura_clienti')
        .select('id')
        .eq('id_cliente', clienteId)
        .maybeSingle()

      const payload = {
        id_cliente: clienteId,
        tipo_apparecchiatura: formData.tipo_apparecchiatura || null,
        tipo_apparecchiatura_altro: formData.tipo_apparecchiatura_altro || null,
        include_planimetria: formData.include_planimetria || null,
        planimetria_formato: formData.planimetria_formato || null,
        planimetria_altro: formData.planimetria_altro || null,
        larghezza_sala_cm: formData.larghezza_sala_cm ? parseFloat(formData.larghezza_sala_cm) : null,
        lunghezza_sala_cm: formData.lunghezza_sala_cm ? parseFloat(formData.lunghezza_sala_cm) : null,
        altezza_sala_cm: formData.altezza_sala_cm ? parseFloat(formData.altezza_sala_cm) : null,
        ha_fotografie: formData.ha_fotografie || null,
        fotografie_altro: formData.fotografie_altro || null,
        parete_strutturale: formData.parete_strutturale || null,
        materiale_pavimento: formData.materiale_pavimento || null,
        sistema_ancoraggio: formData.sistema_ancoraggio || null,
        sistema_ancoraggio_altro: formData.sistema_ancoraggio_altro || null,
        rete_tipo: formData.rete_tipo || null,
        rete_tipo_altro: formData.rete_tipo_altro || null,
        punto_rete_dispositivo: formData.punto_rete_dispositivo || null,
        banda_rete_gbs: formData.banda_rete_gbs ? parseFloat(formData.banda_rete_gbs) : null,
        num_pc_ambulatori: formData.num_pc_ambulatori ? parseInt(formData.num_pc_ambulatori) : 0,
        num_pc_segreteria: formData.num_pc_segreteria ? parseInt(formData.num_pc_segreteria) : 0,
        num_pc_amministrazione: formData.num_pc_amministrazione ? parseInt(formData.num_pc_amministrazione) : 0,
        num_pc_altro: formData.num_pc_altro ? parseInt(formData.num_pc_altro) : 0,
        sistemi_operativi: formData.sistemi_operativi,
        server_versione: formData.server_versione || null,
        contatto_informatico_studio: formData.contatto_informatico_studio || null
      }

      let result
      if (existing) {
        // UPDATE
        result = await supabase
          .from('infrastruttura_clienti')
          .update(payload)
          .eq('id', existing.id)
      } else {
        // INSERT
        result = await supabase
          .from('infrastruttura_clienti')
          .insert([payload])
      }

      if (result.error) throw result.error

      setMessage({ type: 'success', text: '✅ Infrastruttura salvata con successo!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Errore salvataggio:', error)
      setMessage({ type: 'error', text: '❌ Errore durante il salvataggio' })
    } finally {
      setSaving(false)
    }
  }

  const handleSOChange = (so) => {
    setFormData(prev => ({
      ...prev,
      sistemi_operativi: prev.sistemi_operativi.includes(so)
        ? prev.sistemi_operativi.filter(s => s !== so)
        : [...prev.sistemi_operativi, so]
    }))
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      
      {/* Message */}
      {message && (
        <div className={`p-2.5 rounded-lg flex items-center gap-2 text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400'
        }`}>
          {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* 🏗️ TIPO APPARECCHIATURA */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 text-xs">🏗️ Tipo Apparecchiatura</h3>
        <div className="flex flex-wrap gap-2 mb-2">
          {[
            { value: 'clinica', label: 'Clinica' },
            { value: 'struttura_sanitaria', label: 'Strutt. Sanitaria' },
            { value: 'centro_medico', label: 'Centro Medico' },
            { value: 'altro', label: 'Altro' }
          ].map(({ value, label }) => (
            <label
              key={value}
              className={`cursor-pointer px-3 py-1.5 rounded-lg border-2 transition-all text-xs ${
                formData.tipo_apparecchiatura === value
                  ? 'border-blue-600 bg-blue-100 dark:bg-blue-800 text-blue-900 dark:text-blue-100 font-semibold'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
              }`}
            >
              <input
                type="radio"
                name="tipo_apparecchiatura"
                value={value}
                checked={formData.tipo_apparecchiatura === value}
                onChange={(e) => setFormData(prev => ({ ...prev, tipo_apparecchiatura: e.target.value }))}
                className="sr-only"
              />
              {formData.tipo_apparecchiatura === value && '✓ '}
              {label}
            </label>
          ))}
        </div>
        {formData.tipo_apparecchiatura === 'altro' && (
          <input
            type="text"
            value={formData.tipo_apparecchiatura_altro}
            onChange={(e) => setFormData(prev => ({ ...prev, tipo_apparecchiatura_altro: e.target.value }))}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-xs"
            placeholder="Specifica tipo apparecchiatura..."
          />
        )}
      </div>

      {/* 📐 PLANIMETRIA */}
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
        <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-2 text-xs">📐 Planimetria</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Include Planimetria</label>
            <select
              value={formData.include_planimetria}
              onChange={(e) => setFormData(prev => ({ ...prev, include_planimetria: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white text-xs"
            >
              <option value="">Seleziona...</option>
              <option value="si">Sì</option>
              <option value="no">No</option>
              <option value="altro">Altro</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Formato</label>
            <input
              type="text"
              value={formData.planimetria_formato}
              onChange={(e) => setFormData(prev => ({ ...prev, planimetria_formato: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white text-xs"
              placeholder="es. PDF, DWG..."
            />
          </div>
        </div>
        {formData.include_planimetria === 'altro' && (
          <input
            type="text"
            value={formData.planimetria_altro}
            onChange={(e) => setFormData(prev => ({ ...prev, planimetria_altro: e.target.value }))}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white text-xs mt-2"
            placeholder="Specifica..."
          />
        )}
      </div>

      {/* 📏 DIMENSIONI SALA */}
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
        <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2 text-xs">📏 Dimensioni Sala (cm)</h3>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Larghezza</label>
            <input
              type="number"
              step="0.01"
              value={formData.larghezza_sala_cm}
              onChange={(e) => setFormData(prev => ({ ...prev, larghezza_sala_cm: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white text-xs"
              placeholder="500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Lunghezza</label>
            <input
              type="number"
              step="0.01"
              value={formData.lunghezza_sala_cm}
              onChange={(e) => setFormData(prev => ({ ...prev, lunghezza_sala_cm: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white text-xs"
              placeholder="700"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Altezza</label>
            <input
              type="number"
              step="0.01"
              value={formData.altezza_sala_cm}
              onChange={(e) => setFormData(prev => ({ ...prev, altezza_sala_cm: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white text-xs"
              placeholder="300"
            />
          </div>
        </div>
      </div>

      {/* 📸 FOTOGRAFIE */}
      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
        <h3 className="font-semibold text-orange-900 dark:text-orange-300 mb-2 text-xs">📸 Fotografie</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Ha Fotografie</label>
            <select
              value={formData.ha_fotografie}
              onChange={(e) => setFormData(prev => ({ ...prev, ha_fotografie: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-xs"
            >
              <option value="">Seleziona...</option>
              <option value="si">Sì</option>
              <option value="no">No</option>
              <option value="altro">Altro</option>
            </select>
          </div>
          {formData.ha_fotografie === 'altro' && (
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Specifica</label>
              <input
                type="text"
                value={formData.fotografie_altro}
                onChange={(e) => setFormData(prev => ({ ...prev, fotografie_altro: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-xs"
                placeholder="Dettagli..."
              />
            </div>
          )}
        </div>
      </div>

      {/* 🏗️ STRUTTURA */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
        <h3 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-2 text-xs">🏗️ Struttura</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Parete Strutturale</label>
            <textarea
              value={formData.parete_strutturale}
              onChange={(e) => setFormData(prev => ({ ...prev, parete_strutturale: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-xs"
              placeholder="Descrizione parete..."
              rows={2}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Materiale Pavimento</label>
            <input
              type="text"
              value={formData.materiale_pavimento}
              onChange={(e) => setFormData(prev => ({ ...prev, materiale_pavimento: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-xs"
              placeholder="es. Piastrelle, Parquet..."
            />
          </div>
        </div>
      </div>

      {/* 🚪 SISTEMA ANCORAGGIO */}
      <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3">
        <h3 className="font-semibold text-pink-900 dark:text-pink-300 mb-2 text-xs">🚪 Sistema Ancoraggio</h3>
        <div className="flex flex-wrap gap-2 mb-2">
          {[
            { value: 'ascensore', label: 'Ascensore' },
            { value: 'montacarichi', label: 'Montacarichi' },
            { value: 'nessuno', label: 'Nessuno' },
            { value: 'altro', label: 'Altro' }
          ].map(({ value, label }) => (
            <label
              key={value}
              className={`cursor-pointer px-3 py-1.5 rounded-lg border-2 transition-all text-xs ${
                formData.sistema_ancoraggio === value
                  ? 'border-pink-600 bg-pink-100 dark:bg-pink-800 text-pink-900 dark:text-pink-100 font-semibold'
                  : 'border-gray-300 dark:border-gray-600 hover:border-pink-400'
              }`}
            >
              <input
                type="radio"
                name="sistema_ancoraggio"
                value={value}
                checked={formData.sistema_ancoraggio === value}
                onChange={(e) => setFormData(prev => ({ ...prev, sistema_ancoraggio: e.target.value }))}
                className="sr-only"
              />
              {formData.sistema_ancoraggio === value && '✓ '}
              {label}
            </label>
          ))}
        </div>
        {formData.sistema_ancoraggio === 'altro' && (
          <input
            type="text"
            value={formData.sistema_ancoraggio_altro}
            onChange={(e) => setFormData(prev => ({ ...prev, sistema_ancoraggio_altro: e.target.value }))}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white text-xs"
            placeholder="Specifica sistema ancoraggio..."
          />
        )}
      </div>

      {/* 🌐 RETE */}
      <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3">
        <h3 className="font-semibold text-teal-900 dark:text-teal-300 mb-2 text-xs">🌐 Rete</h3>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Tipo Rete</label>
            <select
              value={formData.rete_tipo}
              onChange={(e) => setFormData(prev => ({ ...prev, rete_tipo: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white text-xs"
            >
              <option value="">Seleziona...</option>
              <option value="lan">LAN</option>
              <option value="wifi">Wi-Fi</option>
              <option value="altro">Altro</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Banda (Gbps)</label>
            <input
              type="number"
              step="0.01"
              value={formData.banda_rete_gbs}
              onChange={(e) => setFormData(prev => ({ ...prev, banda_rete_gbs: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white text-xs"
              placeholder="1.0"
            />
          </div>
        </div>
        {formData.rete_tipo === 'altro' && (
          <input
            type="text"
            value={formData.rete_tipo_altro}
            onChange={(e) => setFormData(prev => ({ ...prev, rete_tipo_altro: e.target.value }))}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white text-xs mb-2"
            placeholder="Specifica tipo rete..."
          />
        )}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Punto Rete Dispositivo</label>
          <textarea
            value={formData.punto_rete_dispositivo}
            onChange={(e) => setFormData(prev => ({ ...prev, punto_rete_dispositivo: e.target.value }))}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white text-xs"
            placeholder="Descrizione punto rete..."
            rows={2}
          />
        </div>
      </div>

      {/* 💻 POSTAZIONI PC */}
      <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3">
        <h3 className="font-semibold text-cyan-900 dark:text-cyan-300 mb-2 text-xs">💻 Postazioni PC</h3>
        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Ambulatori</label>
            <input
              type="number"
              value={formData.num_pc_ambulatori}
              onChange={(e) => setFormData(prev => ({ ...prev, num_pc_ambulatori: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-gray-700 dark:text-white text-xs"
              placeholder="5"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Segreteria</label>
            <input
              type="number"
              value={formData.num_pc_segreteria}
              onChange={(e) => setFormData(prev => ({ ...prev, num_pc_segreteria: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-gray-700 dark:text-white text-xs"
              placeholder="2"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Amministrazione</label>
            <input
              type="number"
              value={formData.num_pc_amministrazione}
              onChange={(e) => setFormData(prev => ({ ...prev, num_pc_amministrazione: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-gray-700 dark:text-white text-xs"
              placeholder="1"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Altro</label>
            <input
              type="number"
              value={formData.num_pc_altro}
              onChange={(e) => setFormData(prev => ({ ...prev, num_pc_altro: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-gray-700 dark:text-white text-xs"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* 🖥️ SISTEMI OPERATIVI */}
      <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3">
        <h3 className="font-semibold text-violet-900 dark:text-violet-300 mb-2 text-xs">🖥️ Sistemi Operativi</h3>
        <div className="flex flex-wrap gap-2">
          {['win7', 'win10', 'win11', 'server', 'linux', 'macos'].map(so => (
            <label
              key={so}
              className={`cursor-pointer px-3 py-1.5 rounded-lg border-2 transition-all text-xs ${
                formData.sistemi_operativi.includes(so)
                  ? 'border-violet-600 bg-violet-100 dark:bg-violet-800 text-violet-900 dark:text-violet-100 font-semibold'
                  : 'border-gray-300 dark:border-gray-600 hover:border-violet-400'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.sistemi_operativi.includes(so)}
                onChange={() => handleSOChange(so)}
                className="sr-only"
              />
              {formData.sistemi_operativi.includes(so) && '✓ '}
              {so.toUpperCase()}
            </label>
          ))}
        </div>
      </div>

      {/* 🖥️ SERVER */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
        <h3 className="font-semibold text-amber-900 dark:text-amber-300 mb-2 text-xs">🖥️ Server</h3>
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Versione Server</label>
          <input
            type="text"
            value={formData.server_versione}
            onChange={(e) => setFormData(prev => ({ ...prev, server_versione: e.target.value }))}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white text-xs"
            placeholder="es. Windows Server 2019, Linux Ubuntu 22.04..."
          />
        </div>
      </div>

      {/* 👤 CONTATTO INFORMATICO */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-300 mb-2 text-xs">👤 Contatto Informatico Studio</h3>
        <textarea
          value={formData.contatto_informatico_studio}
          onChange={(e) => setFormData(prev => ({ ...prev, contatto_informatico_studio: e.target.value }))}
          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-xs"
          placeholder="Nome: Mario Rossi&#10;Tel: 333 1234567&#10;Email: mario@studio.it"
          rows={3}
        />
      </div>

      {/* SUBMIT */}
      <button
        type="submit"
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-xs"
      >
        {saving ? (
          <>
            <Loader2 className="animate-spin" size={16} />
            Salvataggio...
          </>
        ) : (
          <>
            <Save size={16} />
            Salva Infrastruttura
          </>
        )}
      </button>
    </form>
  )
}
