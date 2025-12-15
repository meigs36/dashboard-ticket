'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Save, Loader2, Check, AlertCircle, Plus, Trash2, MapPin, Building2, ChevronDown, ChevronUp, Copy } from 'lucide-react'

export default function InfrastrutturaForm({ clienteId }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [message, setMessage] = useState(null)
  
  // ✅ NUOVO: Gestione multi-sede
  const [sediCollegate, setSediCollegate] = useState([])
  const [sedeSelezionata, setSedeSelezionata] = useState(null)
  const [isMultiSede, setIsMultiSede] = useState(false)
  
  // ✅ NUOVO: Sale/Ubicazioni
  const [sale, setSale] = useState([])
  const [ubicazioniSuggerite, setUbicazioniSuggerite] = useState([])
  const [salaExpanded, setSalaExpanded] = useState(null)
  const [savingSala, setSavingSala] = useState(null)
  
  // Dati infrastruttura generale (per sede)
  const [formData, setFormData] = useState({
    // Apparecchiatura
    tipo_apparecchiatura: '',
    tipo_apparecchiatura_altro: '',
    
    // Planimetria generale
    include_planimetria: '',
    planimetria_formato: '',
    planimetria_altro: '',
    
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

  // Carica dati iniziali
  useEffect(() => {
    if (clienteId) {
      loadSediCollegate()
    }
  }, [clienteId])

  // Quando cambia sede selezionata, ricarica dati
  useEffect(() => {
    if (sedeSelezionata) {
      loadInfrastruttura(sedeSelezionata.id)
      loadSale(sedeSelezionata.id)
      loadUbicazioniMacchinari(sedeSelezionata.id)
    }
  }, [sedeSelezionata])

  // ✅ Carica sedi collegate (stessa partita_iva)
  const loadSediCollegate = async () => {
    try {
      setLoadingData(true)
      
      // Prima carica il cliente corrente per ottenere la partita_iva
      const { data: clienteCorrente, error: errCliente } = await supabase
        .from('clienti')
        .select('id, ragione_sociale, codice_cliente, citta, partita_iva, indirizzo, provincia')
        .eq('id', clienteId)
        .single()
      
      if (errCliente) throw errCliente
      
      // Cerca tutte le sedi con stessa partita_iva
      const { data: sedi, error: errSedi } = await supabase
        .from('clienti')
        .select('id, ragione_sociale, codice_cliente, citta, indirizzo, provincia')
        .eq('partita_iva', clienteCorrente.partita_iva)
        .order('citta')
      
      if (errSedi) throw errSedi
      
      if (sedi && sedi.length > 1) {
        setIsMultiSede(true)
        setSediCollegate(sedi)
        // Seleziona la sede corrente di default
        const sedeCurrent = sedi.find(s => s.id === clienteId) || sedi[0]
        setSedeSelezionata(sedeCurrent)
      } else {
        setIsMultiSede(false)
        setSediCollegate([clienteCorrente])
        setSedeSelezionata(clienteCorrente)
      }
    } catch (error) {
      console.error('Errore caricamento sedi:', error)
      // Fallback: usa solo il cliente corrente
      setSedeSelezionata({ id: clienteId })
    }
  }

  // Carica infrastruttura generale per sede
  const loadInfrastruttura = async (sedeId) => {
    try {
      const { data, error } = await supabase
        .from('infrastruttura_clienti')
        .select('*')
        .eq('id_cliente', sedeId)
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
      } else {
        // Reset form se non ci sono dati
        setFormData({
          tipo_apparecchiatura: '',
          tipo_apparecchiatura_altro: '',
          include_planimetria: '',
          planimetria_formato: '',
          planimetria_altro: '',
          rete_tipo: '',
          rete_tipo_altro: '',
          punto_rete_dispositivo: '',
          banda_rete_gbs: '',
          num_pc_ambulatori: '',
          num_pc_segreteria: '',
          num_pc_amministrazione: '',
          num_pc_altro: '',
          sistemi_operativi: [],
          server_versione: '',
          contatto_informatico_studio: ''
        })
      }
    } finally {
      setLoadingData(false)
    }
  }

  // ✅ Carica sale per sede
  const loadSale = async (sedeId) => {
    try {
      const { data, error } = await supabase
        .from('infrastruttura_sale')
        .select('*')
        .eq('id_cliente', sedeId)
        .order('nome_sala')

      if (error) {
        // Se la tabella non esiste ancora, ignora l'errore
        if (error.code === '42P01') {
          console.log('Tabella infrastruttura_sale non ancora creata')
          setSale([])
          return
        }
        throw error
      }

      setSale(data || [])
    } catch (error) {
      console.error('Errore caricamento sale:', error)
      setSale([])
    }
  }

  // ✅ Carica ubicazioni dai macchinari per suggerimenti
  const loadUbicazioniMacchinari = async (sedeId) => {
    try {
      const { data, error } = await supabase
        .from('macchinari')
        .select('ubicazione_specifica')
        .eq('id_cliente', sedeId)
        .not('ubicazione_specifica', 'is', null)

      if (error) throw error

      // Estrai ubicazioni uniche
      const ubicazioni = [...new Set(
        (data || [])
          .map(m => m.ubicazione_specifica)
          .filter(u => u && u.trim())
      )].sort()

      setUbicazioniSuggerite(ubicazioni)
    } catch (error) {
      console.error('Errore caricamento ubicazioni:', error)
      setUbicazioniSuggerite([])
    }
  }

  // Salva infrastruttura generale
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!sedeSelezionata) return
    
    setSaving(true)
    setMessage(null)

    try {
      const { data: existing } = await supabase
        .from('infrastruttura_clienti')
        .select('id')
        .eq('id_cliente', sedeSelezionata.id)
        .maybeSingle()

      const payload = {
        id_cliente: sedeSelezionata.id,
        tipo_apparecchiatura: formData.tipo_apparecchiatura || null,
        tipo_apparecchiatura_altro: formData.tipo_apparecchiatura_altro || null,
        include_planimetria: formData.include_planimetria || null,
        planimetria_formato: formData.planimetria_formato || null,
        planimetria_altro: formData.planimetria_altro || null,
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
        result = await supabase
          .from('infrastruttura_clienti')
          .update(payload)
          .eq('id', existing.id)
      } else {
        result = await supabase
          .from('infrastruttura_clienti')
          .insert([payload])
      }

      if (result.error) throw result.error

      setMessage({ type: 'success', text: '✅ Infrastruttura generale salvata!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Errore salvataggio:', error)
      setMessage({ type: 'error', text: '❌ Errore durante il salvataggio' })
    } finally {
      setSaving(false)
    }
  }

  // ✅ Aggiungi nuova sala
  const addSala = () => {
    const nuovaSala = {
      id: `temp-${Date.now()}`,
      isNew: true,
      id_cliente: sedeSelezionata.id,
      nome_sala: '',
      descrizione: '',
      larghezza_sala_cm: '',
      lunghezza_sala_cm: '',
      altezza_sala_cm: '',
      parete_strutturale: '',
      materiale_pavimento: '',
      sistema_ancoraggio: '',
      sistema_ancoraggio_altro: '',
      ha_fotografie: '',
      fotografie_note: '',
      ha_planimetria: '',
      planimetria_formato: '',
      punto_acqua: false,
      punto_aria_compressa: false,
      punto_aspirazione: false,
      punti_elettrici: '',
      punti_rete: '',
      note: ''
    }
    setSale([...sale, nuovaSala])
    setSalaExpanded(nuovaSala.id)
  }

  // ✅ Aggiorna campo sala
  const updateSala = (salaId, field, value) => {
    setSale(sale.map(s => 
      s.id === salaId ? { ...s, [field]: value } : s
    ))
  }

  // ✅ Salva sala
  const saveSala = async (sala) => {
    if (!sala.nome_sala?.trim()) {
      setMessage({ type: 'error', text: '❌ Inserisci un nome per la sala' })
      return
    }

    setSavingSala(sala.id)
    try {
      const payload = {
        id_cliente: sedeSelezionata.id,
        nome_sala: sala.nome_sala.trim(),
        descrizione: sala.descrizione || null,
        larghezza_sala_cm: sala.larghezza_sala_cm ? parseFloat(sala.larghezza_sala_cm) : null,
        lunghezza_sala_cm: sala.lunghezza_sala_cm ? parseFloat(sala.lunghezza_sala_cm) : null,
        altezza_sala_cm: sala.altezza_sala_cm ? parseFloat(sala.altezza_sala_cm) : null,
        parete_strutturale: sala.parete_strutturale || null,
        materiale_pavimento: sala.materiale_pavimento || null,
        sistema_ancoraggio: sala.sistema_ancoraggio || null,
        sistema_ancoraggio_altro: sala.sistema_ancoraggio_altro || null,
        ha_fotografie: sala.ha_fotografie || null,
        fotografie_note: sala.fotografie_note || null,
        ha_planimetria: sala.ha_planimetria || null,
        planimetria_formato: sala.planimetria_formato || null,
        punto_acqua: sala.punto_acqua || false,
        punto_aria_compressa: sala.punto_aria_compressa || false,
        punto_aspirazione: sala.punto_aspirazione || false,
        punti_elettrici: sala.punti_elettrici ? parseInt(sala.punti_elettrici) : null,
        punti_rete: sala.punti_rete ? parseInt(sala.punti_rete) : null,
        note: sala.note || null
      }

      let result
      if (sala.isNew) {
        result = await supabase
          .from('infrastruttura_sale')
          .insert([payload])
          .select()
          .single()
        
        if (result.data) {
          // Sostituisci la sala temporanea con quella salvata
          setSale(sale.map(s => 
            s.id === sala.id ? { ...result.data, isNew: false } : s
          ))
        }
      } else {
        result = await supabase
          .from('infrastruttura_sale')
          .update(payload)
          .eq('id', sala.id)
      }

      if (result.error) throw result.error

      setMessage({ type: 'success', text: `✅ Sala "${sala.nome_sala}" salvata!` })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Errore salvataggio sala:', error)
      setMessage({ type: 'error', text: '❌ Errore durante il salvataggio della sala' })
    } finally {
      setSavingSala(null)
    }
  }

  // ✅ Elimina sala
  const deleteSala = async (sala) => {
    if (!confirm(`Eliminare la sala "${sala.nome_sala || 'senza nome'}"?`)) return

    try {
      if (!sala.isNew) {
        const { error } = await supabase
          .from('infrastruttura_sale')
          .delete()
          .eq('id', sala.id)
        
        if (error) throw error
      }

      setSale(sale.filter(s => s.id !== sala.id))
      setMessage({ type: 'success', text: '✅ Sala eliminata' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Errore eliminazione sala:', error)
      setMessage({ type: 'error', text: '❌ Errore durante l\'eliminazione' })
    }
  }

  // ✅ Copia sala da altra sede
  const copySalaFromOtherSede = async (sourceSedeId, salaToCopy) => {
    const nuovaSala = {
      ...salaToCopy,
      id: `temp-${Date.now()}`,
      isNew: true,
      id_cliente: sedeSelezionata.id,
      nome_sala: `${salaToCopy.nome_sala} (copia)`
    }
    setSale([...sale, nuovaSala])
    setSalaExpanded(nuovaSala.id)
    setMessage({ type: 'success', text: '✅ Sala copiata! Modifica e salva.' })
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
    <div className="space-y-4">
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

      {/* ✅ SELETTORE SEDE (se multi-sede) */}
      {isMultiSede && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={18} className="text-purple-600" />
            <h3 className="font-semibold text-purple-900 dark:text-purple-300">
              Seleziona Sede ({sediCollegate.length} sedi)
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {sediCollegate.map(sede => (
              <button
                key={sede.id}
                onClick={() => {
                  setSedeSelezionata(sede)
                  setLoadingData(true)
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  sedeSelezionata?.id === sede.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 border border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span>{sede.citta}</span>
                  <span className="text-xs opacity-70">({sede.codice_cliente})</span>
                </div>
              </button>
            ))}
          </div>
          {sedeSelezionata && (
            <p className="mt-2 text-sm text-purple-700 dark:text-purple-400">
              📍 {sedeSelezionata.indirizzo}, {sedeSelezionata.citta} ({sedeSelezionata.provincia})
            </p>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* SEZIONE SALE/UBICAZIONI */}
      {/* ============================================ */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-amber-600" />
            <h3 className="font-semibold text-amber-900 dark:text-amber-300">
              Sale / Ubicazioni ({sale.length})
            </h3>
          </div>
          <button
            onClick={addSala}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Aggiungi Sala
          </button>
        </div>

        {/* Suggerimenti ubicazioni dai macchinari */}
        {ubicazioniSuggerite.length > 0 && sale.length === 0 && (
          <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-300 mb-2">
              💡 Ubicazioni trovate dai macchinari:
            </p>
            <div className="flex flex-wrap gap-2">
              {ubicazioniSuggerite.map(ubicazione => (
                <button
                  key={ubicazione}
                  onClick={() => {
                    const nuovaSala = {
                      id: `temp-${Date.now()}`,
                      isNew: true,
                      id_cliente: sedeSelezionata.id,
                      nome_sala: ubicazione,
                      descrizione: '',
                      larghezza_sala_cm: '',
                      lunghezza_sala_cm: '',
                      altezza_sala_cm: '',
                      parete_strutturale: '',
                      materiale_pavimento: '',
                      sistema_ancoraggio: '',
                      ha_fotografie: '',
                      note: ''
                    }
                    setSale([...sale, nuovaSala])
                    setSalaExpanded(nuovaSala.id)
                  }}
                  className="px-3 py-1 bg-white dark:bg-gray-700 text-amber-700 dark:text-amber-300 rounded-full text-sm hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors border border-amber-300"
                >
                  + {ubicazione}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lista Sale */}
        {sale.length === 0 ? (
          <p className="text-center text-amber-600 dark:text-amber-400 py-4">
            Nessuna sala configurata. Clicca "Aggiungi Sala" per iniziare.
          </p>
        ) : (
          <div className="space-y-3">
            {sale.map(sala => (
              <div 
                key={sala.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-700 overflow-hidden"
              >
                {/* Header Sala */}
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  onClick={() => setSalaExpanded(salaExpanded === sala.id ? null : sala.id)}
                >
                  <div className="flex items-center gap-3">
                    {salaExpanded === sala.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {sala.nome_sala || '(senza nome)'}
                      </span>
                      {sala.larghezza_sala_cm && sala.lunghezza_sala_cm && (
                        <span className="ml-2 text-sm text-gray-500">
                          {sala.larghezza_sala_cm}x{sala.lunghezza_sala_cm}x{sala.altezza_sala_cm || '?'} cm
                        </span>
                      )}
                      {sala.isNew && (
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                          Nuova
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); saveSala(sala) }}
                      disabled={savingSala === sala.id}
                      className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                      title="Salva"
                    >
                      {savingSala === sala.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSala(sala) }}
                      className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                      title="Elimina"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Contenuto Sala (espandibile) */}
                {salaExpanded === sala.id && (
                  <div className="p-4 border-t border-amber-100 dark:border-amber-800 space-y-4">
                    {/* Nome e Descrizione */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Nome Sala *
                        </label>
                        <input
                          type="text"
                          value={sala.nome_sala}
                          onChange={(e) => updateSala(sala.id, 'nome_sala', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                          placeholder="Es: Sala 1, Studio 2, Ambulatorio A..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Descrizione
                        </label>
                        <input
                          type="text"
                          value={sala.descrizione || ''}
                          onChange={(e) => updateSala(sala.id, 'descrizione', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                          placeholder="Descrizione opzionale..."
                        />
                      </div>
                    </div>

                    {/* Dimensioni */}
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                      <h4 className="text-xs font-semibold text-green-800 dark:text-green-300 mb-2">📐 Dimensioni (cm)</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Larghezza</label>
                          <input
                            type="number"
                            value={sala.larghezza_sala_cm || ''}
                            onChange={(e) => updateSala(sala.id, 'larghezza_sala_cm', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                            placeholder="cm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Lunghezza</label>
                          <input
                            type="number"
                            value={sala.lunghezza_sala_cm || ''}
                            onChange={(e) => updateSala(sala.id, 'lunghezza_sala_cm', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                            placeholder="cm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Altezza</label>
                          <input
                            type="number"
                            value={sala.altezza_sala_cm || ''}
                            onChange={(e) => updateSala(sala.id, 'altezza_sala_cm', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                            placeholder="cm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Struttura */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                      <h4 className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 mb-2">🏗️ Struttura</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Parete Strutturale</label>
                          <input
                            type="text"
                            value={sala.parete_strutturale || ''}
                            onChange={(e) => updateSala(sala.id, 'parete_strutturale', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                            placeholder="Descrizione parete..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Materiale Pavimento</label>
                          <input
                            type="text"
                            value={sala.materiale_pavimento || ''}
                            onChange={(e) => updateSala(sala.id, 'materiale_pavimento', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                            placeholder="Es: Piastrelle, Parquet..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Sistema Ancoraggio</label>
                          <select
                            value={sala.sistema_ancoraggio || ''}
                            onChange={(e) => updateSala(sala.id, 'sistema_ancoraggio', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">Seleziona...</option>
                            <option value="pavimento">A Pavimento</option>
                            <option value="parete">A Parete</option>
                            <option value="soffitto">A Soffitto</option>
                            <option value="altro">Altro</option>
                          </select>
                        </div>
                        {sala.sistema_ancoraggio === 'altro' && (
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Specifica</label>
                            <input
                              type="text"
                              value={sala.sistema_ancoraggio_altro || ''}
                              onChange={(e) => updateSala(sala.id, 'sistema_ancoraggio_altro', e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Impianti Sala */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2">⚡ Impianti Sala</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sala.punto_acqua || false}
                            onChange={(e) => updateSala(sala.id, 'punto_acqua', e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300">💧 Acqua</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sala.punto_aria_compressa || false}
                            onChange={(e) => updateSala(sala.id, 'punto_aria_compressa', e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300">💨 Aria</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sala.punto_aspirazione || false}
                            onChange={(e) => updateSala(sala.id, 'punto_aspirazione', e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300">🌀 Aspirazione</span>
                        </label>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Punti Elettrici</label>
                          <input
                            type="number"
                            value={sala.punti_elettrici || ''}
                            onChange={(e) => updateSala(sala.id, 'punti_elettrici', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Punti Rete</label>
                          <input
                            type="number"
                            value={sala.punti_rete || ''}
                            onChange={(e) => updateSala(sala.id, 'punti_rete', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                            min="0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Fotografie e Planimetria */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3">
                        <h4 className="text-xs font-semibold text-pink-800 dark:text-pink-300 mb-2">📷 Fotografie</h4>
                        <select
                          value={sala.ha_fotografie || ''}
                          onChange={(e) => updateSala(sala.id, 'ha_fotografie', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white mb-2"
                        >
                          <option value="">Seleziona...</option>
                          <option value="si">Sì, disponibili</option>
                          <option value="no">No</option>
                          <option value="da_fare">Da fare</option>
                        </select>
                        {sala.ha_fotografie === 'si' && (
                          <input
                            type="text"
                            value={sala.fotografie_note || ''}
                            onChange={(e) => updateSala(sala.id, 'fotografie_note', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                            placeholder="Note sulle foto..."
                          />
                        )}
                      </div>
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                        <h4 className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 mb-2">📐 Planimetria Sala</h4>
                        <select
                          value={sala.ha_planimetria || ''}
                          onChange={(e) => updateSala(sala.id, 'ha_planimetria', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white mb-2"
                        >
                          <option value="">Seleziona...</option>
                          <option value="si">Sì</option>
                          <option value="no">No</option>
                        </select>
                        {sala.ha_planimetria === 'si' && (
                          <input
                            type="text"
                            value={sala.planimetria_formato || ''}
                            onChange={(e) => updateSala(sala.id, 'planimetria_formato', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                            placeholder="Formato (PDF, DWG...)"
                          />
                        )}
                      </div>
                    </div>

                    {/* Note */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Note Sala</label>
                      <textarea
                        value={sala.note || ''}
                        onChange={(e) => updateSala(sala.id, 'note', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                        rows={2}
                        placeholder="Note aggiuntive sulla sala..."
                      />
                    </div>

                    {/* Pulsante Salva Sala */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => saveSala(sala)}
                        disabled={savingSala === sala.id}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors text-sm font-medium"
                      >
                        {savingSala === sala.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Save size={16} />
                        )}
                        Salva Sala
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* INFRASTRUTTURA GENERALE SEDE */}
      {/* ============================================ */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            ⚙️ Infrastruttura Generale {isMultiSede && sedeSelezionata ? `- ${sedeSelezionata.citta}` : ''}
          </h3>
        </div>

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

        {/* 📐 PLANIMETRIA GENERALE */}
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
          <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-2 text-xs">📐 Planimetria Generale</h3>
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
        </div>

        {/* 🌐 RETE */}
        <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3">
          <h3 className="font-semibold text-cyan-900 dark:text-cyan-300 mb-2 text-xs">🌐 Rete</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Tipo Rete</label>
              <select
                value={formData.rete_tipo}
                onChange={(e) => setFormData(prev => ({ ...prev, rete_tipo: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs dark:bg-gray-700 dark:text-white"
              >
                <option value="">Seleziona...</option>
                <option value="cablata">Cablata</option>
                <option value="wifi">WiFi</option>
                <option value="mista">Mista</option>
                <option value="altro">Altro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Banda (Gbps)</label>
              <input
                type="number"
                step="0.1"
                value={formData.banda_rete_gbs}
                onChange={(e) => setFormData(prev => ({ ...prev, banda_rete_gbs: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs dark:bg-gray-700 dark:text-white"
                placeholder="es. 1"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Punto Rete Dispositivo</label>
              <input
                type="text"
                value={formData.punto_rete_dispositivo}
                onChange={(e) => setFormData(prev => ({ ...prev, punto_rete_dispositivo: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs dark:bg-gray-700 dark:text-white"
                placeholder="Descrizione punto rete..."
              />
            </div>
          </div>
        </div>

        {/* 💻 PC */}
        <div className="bg-slate-50 dark:bg-slate-900/20 rounded-lg p-3">
          <h3 className="font-semibold text-slate-900 dark:text-slate-300 mb-2 text-xs">💻 Postazioni PC</h3>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Ambulatori</label>
              <input
                type="number"
                value={formData.num_pc_ambulatori}
                onChange={(e) => setFormData(prev => ({ ...prev, num_pc_ambulatori: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs dark:bg-gray-700 dark:text-white"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Segreteria</label>
              <input
                type="number"
                value={formData.num_pc_segreteria}
                onChange={(e) => setFormData(prev => ({ ...prev, num_pc_segreteria: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs dark:bg-gray-700 dark:text-white"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Amministrazione</label>
              <input
                type="number"
                value={formData.num_pc_amministrazione}
                onChange={(e) => setFormData(prev => ({ ...prev, num_pc_amministrazione: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs dark:bg-gray-700 dark:text-white"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Altro</label>
              <input
                type="number"
                value={formData.num_pc_altro}
                onChange={(e) => setFormData(prev => ({ ...prev, num_pc_altro: e.target.value }))}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs dark:bg-gray-700 dark:text-white"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* 🖥️ SISTEMI OPERATIVI */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
          <h3 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-2 text-xs">🖥️ Sistemi Operativi</h3>
          <div className="flex flex-wrap gap-2">
            {['Windows 10', 'Windows 11', 'macOS', 'Linux', 'Altro'].map(so => (
              <label
                key={so}
                className={`cursor-pointer px-3 py-1.5 rounded-lg border-2 transition-all text-xs ${
                  formData.sistemi_operativi.includes(so)
                    ? 'border-indigo-600 bg-indigo-100 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-100 font-semibold'
                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.sistemi_operativi.includes(so)}
                  onChange={() => handleSOChange(so)}
                  className="sr-only"
                />
                {formData.sistemi_operativi.includes(so) && '✓ '}
                {so}
              </label>
            ))}
          </div>
        </div>

        {/* 🖧 SERVER */}
        <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-3">
          <h3 className="font-semibold text-rose-900 dark:text-rose-300 mb-2 text-xs">🖧 Server</h3>
          <input
            type="text"
            value={formData.server_versione}
            onChange={(e) => setFormData(prev => ({ ...prev, server_versione: e.target.value }))}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs dark:bg-gray-700 dark:text-white"
            placeholder="Versione Server (es. Windows Server 2019, NAS Synology...)"
          />
        </div>

        {/* 👤 CONTATTO INFORMATICO */}
        <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3">
          <h3 className="font-semibold text-teal-900 dark:text-teal-300 mb-2 text-xs">👤 Contatto Informatico Studio</h3>
          <textarea
            value={formData.contatto_informatico_studio}
            onChange={(e) => setFormData(prev => ({ ...prev, contatto_informatico_studio: e.target.value }))}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs dark:bg-gray-700 dark:text-white"
            rows={2}
            placeholder="Nome, telefono, email del responsabile IT..."
          />
        </div>

        {/* 💾 PULSANTE SALVA */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all font-medium text-sm shadow-lg"
          >
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save size={18} />
                Salva Infrastruttura Generale
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
