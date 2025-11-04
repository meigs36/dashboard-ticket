import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Image, Mic, Trash2, X, ZoomIn, FileText, Edit3, Save, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'

/**
 * ✅ InterventiAllegatiInline - Con Trascrizione Editabile
 * 
 * Features:
 * - 🎤 Audio player sempre visibili (SOPRA)
 * - 📝 Trascrizione EDITABILE (mantieni anche senza audio)
 * - 📸 Miniature foto cliccabili con lightbox (SOTTO)
 * - 🗑️ Eliminazione intelligente (chiede se mantenere trascrizione)
 * - 💾 Auto-save trascrizione nell'intervento
 * - 🎨 Lightbox con sfondo verdino
 */
export default function InterventiAllegatiInline({ interventoId, onDelete }) {
  const [allegati, setAllegati] = useState([])
  const [lightboxImage, setLightboxImage] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // 📝 State per editing trascrizione
  const [editingAudioId, setEditingAudioId] = useState(null)
  const [editedText, setEditedText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showCopySuccess, setShowCopySuccess] = useState(null)
  
  // 🔽 State per espansione sezioni (COLLASSATE di default)
  const [isAudioExpanded, setIsAudioExpanded] = useState(false)
  const [isFotoExpanded, setIsFotoExpanded] = useState(false)

  useEffect(() => {
    if (interventoId) {
      loadAllegati()
    }
  }, [interventoId])

  const loadAllegati = async () => {
    try {
      setIsLoading(true)

      const { data, error } = await supabase
        .from('interventi_allegati')
        .select('*')
        .eq('intervento_id', interventoId)
        .order('caricato_il', { ascending: false })

      if (error) throw error

      // Genera signed URLs per tutti gli allegati
      const allegatiConUrl = await Promise.all(
        (data || []).map(async (allegato) => {
          try {
            const { data: urlData } = await supabase.storage
              .from(allegato.storage_bucket || 'interventi-media')
              .createSignedUrl(allegato.storage_path, 3600)

            return {
              ...allegato,
              signedUrl: urlData?.signedUrl
            }
          } catch (err) {
            console.error('Errore creazione URL:', err)
            return allegato
          }
        })
      )

      setAllegati(allegatiConUrl)
    } catch (error) {
      console.error('Errore caricamento allegati:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 🗑️ Eliminazione intelligente con salvataggio trascrizione
  const handleDelete = async (allegatoId, tipo, trascrizione) => {
    // Se è un audio con trascrizione, chiedi se mantenerla
    if (tipo === 'audio' && trascrizione) {
      const mantieni = window.confirm(
        '🎤 Questo audio ha una trascrizione.\n\n' +
        '✅ Vuoi MANTENERE la trascrizione anche dopo aver eliminato l\'audio?\n\n' +
        '• Sì → La trascrizione sarà salvata nella descrizione dell\'intervento\n' +
        '• No → Trascrizione eliminata insieme all\'audio'
      )

      if (mantieni) {
        // Salva trascrizione nell'intervento prima di eliminare
        await salvaTrascrizioneInDescrizione(trascrizione)
      }
    } else {
      // Conferma normale per foto o audio senza trascrizione
      if (!window.confirm('Sei sicuro di voler eliminare questo allegato?')) {
        return
      }
    }

    try {
      const { error } = await supabase
        .from('interventi_allegati')
        .delete()
        .eq('id', allegatoId)

      if (error) throw error

      // Ricarica gli allegati
      await loadAllegati()
      
      // Notifica il parent component
      if (onDelete) {
        onDelete()
      }
    } catch (error) {
      console.error('Errore eliminazione allegato:', error)
      alert('Errore durante l\'eliminazione')
    }
  }

  // 💾 Salva trascrizione nella descrizione intervento con numerazione
  const salvaTrascrizioneInDescrizione = async (trascrizione) => {
    try {
      console.log('📥 Carico intervento:', interventoId)
      
      // Carica l'intervento attuale
      const { data: intervento, error: fetchError } = await supabase
        .from('interventi')
        .select('descrizione_intervento, trascrizioni_audio')
        .eq('id', interventoId)
        .single()

      if (fetchError) {
        console.error('❌ Errore fetch intervento:', fetchError)
        throw fetchError
      }

      console.log('📄 Intervento caricato:', intervento)

      // 🔢 Conta trascrizioni esistenti per numerazione
      const trascrizioniEsistenti = intervento.trascrizioni_audio || ''
      // Conta quante volte appare il pattern di numerazione esistente (1), 2), 3), ecc.)
      const numeroTrascrizioni = (trascrizioniEsistenti.match(/\d+\)/g) || []).length
      const prossimoNumero = numeroTrascrizioni + 1

      // Prepara testo da aggiungere CON NUMERAZIONE
      const timestamp = new Date().toLocaleString('it-IT')
      const nuovaTrascrizioneFormattata = `\n\n${prossimoNumero}) Trascrizione audio (${timestamp}):\n${trascrizione}`

      console.log(`💾 Salvo trascrizione #${prossimoNumero}...`)

      // Aggiorna campo trascrizioni_audio
      const { error: updateError } = await supabase
        .from('interventi')
        .update({
          trascrizioni_audio: trascrizioniEsistenti + nuovaTrascrizioneFormattata,
          updated_at: new Date().toISOString()
        })
        .eq('id', interventoId)

      if (updateError) {
        console.error('❌ Errore update:', updateError)
        throw updateError
      }

      console.log(`✅ Trascrizione #${prossimoNumero} salvata nell'intervento`)
    } catch (error) {
      console.error('❌ Errore salvataggio trascrizione:', error)
      throw error // Re-throw per catturarlo in copyToDescrizione
    }
  }

  // ✏️ Attiva/Disattiva editing
  const toggleEdit = (audioId, currentText) => {
    if (editingAudioId === audioId) {
      // Annulla editing
      setEditingAudioId(null)
      setEditedText('')
    } else {
      // Inizia editing
      setEditingAudioId(audioId)
      setEditedText(currentText || '')
    }
  }

  // 💾 Salva trascrizione editata
  const saveTrascrizione = async (allegatoId) => {
    setIsSaving(true)
    try {
      // Aggiorna nel record allegato
      const { error } = await supabase
        .from('interventi_allegati')
        .update({
          trascrizione_audio: editedText,
          trascrizione_completata_il: new Date().toISOString()
        })
        .eq('id', allegatoId)

      if (error) throw error

      // Ricarica allegati
      await loadAllegati()
      
      // Esci da editing
      setEditingAudioId(null)
      setEditedText('')
      
      alert('✅ Trascrizione aggiornata con successo!')
    } catch (error) {
      console.error('Errore salvataggio trascrizione:', error)
      alert('❌ Errore durante il salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  // 📋 Copia trascrizione in descrizione intervento
  const copyToDescrizione = async (trascrizione) => {
    try {
      console.log('🔵 Inizio copia trascrizione')
      await salvaTrascrizioneInDescrizione(trascrizione)
      
      // Mostra feedback visivo
      setShowCopySuccess(trascrizione)
      setTimeout(() => setShowCopySuccess(null), 2000)
      
      console.log('✅ Copia completata con successo')
      alert('✅ Trascrizione copiata nella descrizione intervento!')
    } catch (error) {
      console.error('❌ Errore copia:', error)
      alert('❌ Errore durante la copia: ' + error.message)
    }
  }

  if (isLoading) {
    return (
      <div className="mt-3 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">Caricamento allegati...</p>
      </div>
    )
  }

  if (allegati.length === 0) {
    return null // Non mostrare nulla se non ci sono allegati
  }

  const foto = allegati.filter(a => a.tipo === 'foto')
  const audio = allegati.filter(a => a.tipo === 'audio')

  return (
    <div className="mt-3 space-y-3">
      {/* 🎤 AUDIO - Player sempre visibili con trascrizione EDITABILE (SOPRA) */}
      {audio.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200">
          {/* Header cliccabile */}
          <div 
            className="flex items-center justify-between cursor-pointer hover:bg-purple-100/50 rounded p-2 -m-2 mb-3"
            onClick={() => setIsAudioExpanded(!isAudioExpanded)}
          >
            <div className="flex items-center gap-2">
              <Mic className="text-purple-600" size={16} />
              <span className="text-sm font-semibold text-purple-700">
                Registrazioni Audio ({audio.length})
              </span>
            </div>
            {/* Toggle icon */}
            {isAudioExpanded ? (
              <ChevronUp size={16} className="text-purple-600" />
            ) : (
              <ChevronDown size={16} className="text-purple-600" />
            )}
          </div>

          {/* Contenuto collassabile */}
          {isAudioExpanded && (
            <div className="space-y-3">
            {audio.map((aud) => (
              <div
                key={aud.id}
                className="bg-white/80 rounded-lg p-3 border border-purple-200 hover:border-purple-400 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Mic className="text-purple-500 mt-1 flex-shrink-0" size={16} />
                  
                  <div className="flex-1 min-w-0">
                    {/* Filename e data */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700 truncate">
                        {aud.nome_file}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {new Date(aud.caricato_il).toLocaleString('it-IT', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {/* Audio Player */}
                    {aud.signedUrl && (
                      <audio
                        controls
                        className="w-full mb-2"
                        style={{ height: '32px' }}
                        preload="metadata"
                      >
                        <source src={aud.signedUrl} type={aud.mime_type || 'audio/webm'} />
                        Il tuo browser non supporta la riproduzione audio.
                      </audio>
                    )}

                    {/* 📝 TRASCRIZIONE EDITABILE */}
                    {aud.trascrizione_audio && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded relative">
                        <div className="flex items-start gap-2 mb-2">
                          <FileText className="text-amber-600 flex-shrink-0 mt-0.5" size={14} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-semibold text-amber-700">
                                Trascrizione automatica:
                              </p>
                              <div className="flex gap-2">
                                {/* Pulsante Edit */}
                                <button
                                  onClick={() => toggleEdit(aud.id, aud.trascrizione_audio)}
                                  className="p-1.5 hover:bg-amber-200 rounded transition-colors"
                                  title={editingAudioId === aud.id ? "Annulla" : "Modifica trascrizione"}
                                >
                                  {editingAudioId === aud.id ? (
                                    <X size={18} className="text-red-600" />
                                  ) : (
                                    <Edit3 size={18} className="text-amber-700" />
                                  )}
                                </button>
                                
                                {/* Pulsante Copia in Descrizione */}
                                {showCopySuccess === aud.trascrizione_audio ? (
                                  <Check size={18} className="text-green-600" />
                                ) : (
                                  <button
                                    onClick={() => copyToDescrizione(aud.trascrizione_audio)}
                                    className="p-1.5 hover:bg-amber-200 rounded transition-colors"
                                    title="Copia in descrizione intervento"
                                  >
                                    <Copy size={18} className="text-amber-700" />
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            {/* Testo trascrizione o Textarea edit */}
                            {editingAudioId === aud.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editedText}
                                  onChange={(e) => setEditedText(e.target.value)}
                                  className="w-full p-2 text-xs border border-amber-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  rows={6}
                                  placeholder="Modifica la trascrizione..."
                                />
                                <button
                                  onClick={() => saveTrascrizione(aud.id)}
                                  disabled={isSaving}
                                  className="flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded disabled:opacity-50"
                                >
                                  <Save size={12} />
                                  {isSaving ? 'Salvataggio...' : 'Salva modifiche'}
                                </button>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {aud.trascrizione_audio}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {aud.trascrizione_completata_il && !editingAudioId && (
                          <p className="text-xs text-amber-600 mt-1 italic">
                            Trascritto il {new Date(aud.trascrizione_completata_il).toLocaleString('it-IT')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Errore trascrizione */}
                    {aud.trascrizione_errore && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-xs text-red-600">
                          ⚠️ Errore trascrizione: {aud.trascrizione_errore}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Pulsante elimina */}
                  <button
                    onClick={() => handleDelete(aud.id, aud.tipo, aud.trascrizione_audio)}
                    className="p-1.5 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                    title="Elimina audio"
                  >
                    <Trash2 className="text-red-500" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* 📸 FOTO - Grid di miniature (SOTTO) */}
      {foto.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
          {/* Header cliccabile */}
          <div 
            className="flex items-center justify-between cursor-pointer hover:bg-blue-100/50 rounded p-2 -m-2 mb-2"
            onClick={() => setIsFotoExpanded(!isFotoExpanded)}
          >
            <div className="flex items-center gap-2">
              <Image className="text-blue-600" size={16} />
              <span className="text-sm font-semibold text-blue-700">
                Foto ({foto.length})
              </span>
            </div>
            {/* Toggle icon */}
            {isFotoExpanded ? (
              <ChevronUp size={16} className="text-blue-600" />
            ) : (
              <ChevronDown size={16} className="text-blue-600" />
            )}
          </div>
          
          {/* Contenuto collassabile */}
          {isFotoExpanded && (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {foto.map((img) => (
              <div
                key={img.id}
                className="relative group aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                onClick={() => setLightboxImage(img)}
              >
                <img
                  src={img.signedUrl || img.url}
                  alt={img.nome_file}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                
                {/* Overlay hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="text-white" size={24} />
                </div>

                {/* Pulsante elimina */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(img.id, img.tipo, null)
                  }}
                  className="absolute top-1 right-1 p-1 bg-red-500/90 hover:bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* 🖼️ LIGHTBOX per foto con SFONDO VERDINO */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-gradient-to-br from-teal-900/95 via-emerald-900/95 to-green-900/95 z-[9999] flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
            aria-label="Chiudi"
          >
            <X size={32} />
          </button>

          <img
            src={lightboxImage.signedUrl || lightboxImage.url}
            alt={lightboxImage.nome_file}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-4 left-4 right-4 text-center">
            <p className="text-white text-sm drop-shadow-lg">
              {lightboxImage.nome_file}
            </p>
            <p className="text-emerald-200 text-xs mt-1 drop-shadow-lg">
              {new Date(lightboxImage.caricato_il).toLocaleString('it-IT')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
