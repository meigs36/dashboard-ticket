import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, Edit3, Save, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

/**
 * 📝 TrascrizioniSalvate - Mostra trascrizioni permanenti salvate nell'intervento
 * 
 * Features:
 * - 📜 Visualizza tutte le trascrizioni salvate
 * - ✏️ Editabile (modifica trascrizione completa)
 * - 🗑️ Eliminabile (rimuove trascrizione)
 * - 🔽 Espandibile/Collapsabile
 */
export default function TrascrizioniSalvate({ interventoId, onUpdate }) {
  console.log('🟢 TrascrizioniSalvate - Componente caricato! interventoId:', interventoId)
  
  const [trascrizioni, setTrascrizioni] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedText, setEditedText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false) // Collassato di default

  useEffect(() => {
    console.log('🔵 TrascrizioniSalvate - useEffect chiamato, interventoId:', interventoId)
    if (interventoId) {
      loadTrascrizioni()
    }
  }, [interventoId])

  const loadTrascrizioni = async () => {
    try {
      console.log('📥 TrascrizioniSalvate - Carico trascrizioni per:', interventoId)
      setIsLoading(true)

      const { data, error } = await supabase
        .from('interventi')
        .select('trascrizioni_audio')
        .eq('id', interventoId)
        .single()

      if (error) throw error

      console.log('✅ TrascrizioniSalvate - Trascrizioni caricate:', data?.trascrizioni_audio ? 'PRESENTI' : 'VUOTE')
      setTrascrizioni(data?.trascrizioni_audio || '')
    } catch (error) {
      console.error('Errore caricamento trascrizioni:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startEdit = () => {
    setEditedText(trascrizioni)
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditedText('')
  }

  const saveTrascrizioni = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('interventi')
        .update({
          trascrizioni_audio: editedText,
          updated_at: new Date().toISOString()
        })
        .eq('id', interventoId)

      if (error) throw error

      setTrascrizioni(editedText)
      setIsEditing(false)
      setEditedText('')

      if (onUpdate) onUpdate()

      alert('✅ Trascrizioni aggiornate con successo!')
    } catch (error) {
      console.error('Errore salvataggio:', error)
      alert('❌ Errore durante il salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteTrascrizioni = async () => {
    if (!window.confirm('⚠️ Sei sicuro di voler eliminare TUTTE le trascrizioni salvate?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('interventi')
        .update({
          trascrizioni_audio: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', interventoId)

      if (error) throw error

      setTrascrizioni('')

      if (onUpdate) onUpdate()

      alert('✅ Trascrizioni eliminate')
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('❌ Errore durante l\'eliminazione')
    }
  }

  // Funzione per pulire il testo delle trascrizioni (rimuove timestamp)
  const cleanTrascrizioni = (text) => {
    if (!text) return ''
    
    // Rimuove le righe con emoji 🎤 e timestamp
    return text
      .split('\n')
      .filter(line => !line.match(/^🎤\s*Audio trascritto il/i))
      .join('\n')
      .trim()
  }

  // Non mostrare nulla se non ci sono trascrizioni
  if (!isLoading && !trascrizioni) {
    console.log('⚪ TrascrizioniSalvate - Nessuna trascrizione salvata, componente nascosto')
    return null
  }

  if (isLoading) {
    console.log('⏳ TrascrizioniSalvate - Caricamento in corso...')
    return (
      <div className="mt-3 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">Caricamento trascrizioni...</p>
      </div>
    )
  }

  console.log('🟢 TrascrizioniSalvate - Render componente completo')

  return (
    <div className="mt-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
      {/* Header con toggle expand/collapse */}
      <div 
        className="flex items-center justify-between cursor-pointer hover:bg-green-100/50 rounded p-2 -m-2 mb-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <FileText className="text-green-600" size={16} />
          <span className="text-sm font-semibold text-green-700">
            📝 Trascrizioni Salvate
          </span>
          <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
            {(trascrizioni.match(/🎤/g) || []).length} registrazione/i
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Pulsanti azione (visibili solo se expanded) */}
          {isExpanded && !isEditing && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  startEdit()
                }}
                className="p-1.5 hover:bg-green-200 rounded transition-colors"
                title="Modifica trascrizioni"
              >
                <Edit3 size={16} className="text-green-700" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteTrascrizioni()
                }}
                className="p-1.5 hover:bg-red-100 rounded transition-colors"
                title="Elimina tutte le trascrizioni"
              >
                <Trash2 size={16} className="text-red-600" />
              </button>
            </>
          )}

          {/* Toggle icon */}
          {isExpanded ? (
            <ChevronUp size={16} className="text-green-600" />
          ) : (
            <ChevronDown size={16} className="text-green-600" />
          )}
        </div>
      </div>

      {/* Contenuto trascrizioni */}
      {isExpanded && (
        <div className="mt-3">
          {isEditing ? (
            // Modalità editing
            <div className="space-y-2">
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full p-3 text-sm border border-green-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                rows={12}
                placeholder="Modifica tutte le trascrizioni..."
              />
              <div className="flex gap-2">
                <button
                  onClick={saveTrascrizioni}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded disabled:opacity-50"
                >
                  <Save size={14} />
                  {isSaving ? 'Salvataggio...' : 'Salva modifiche'}
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded disabled:opacity-50"
                >
                  <X size={14} />
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            // Modalità visualizzazione
            <div className="bg-white/80 rounded-lg p-3 border border-green-200">
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {cleanTrascrizioni(trascrizioni)}
              </div>
            </div>
          )}

          {/* Info badge */}
          <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
            <FileText size={12} />
            <span>
              Queste trascrizioni sono permanenti e rimarranno anche dopo l'eliminazione dei file audio
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
