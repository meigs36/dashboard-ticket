import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { deleteAllegato } from '@/lib/mediaUpload' // ✅ IMPORTA LA FUNZIONE CORRETTA
import { Image, Mic, Trash2, X, ZoomIn, ChevronDown, ChevronUp } from 'lucide-react'

/**
 * ✅ InterventiAllegatiInline - VERSIONE CORRETTA
 * 
 * Features:
 * - 🎤 Audio player sempre visibili (SENZA trascrizione inline)
 * - 📸 Miniature foto cliccabili con lightbox
 * - 🗑️ Eliminazione COMPLETA (database + storage)
 * - 🎨 Lightbox con sfondo verdino
 * 
 * FIX: Ora usa deleteAllegato() da mediaUpload.js per eliminare correttamente
 */
export default function InterventiAllegatiInline({ interventoId, onDelete }) {
  const [allegati, setAllegati] = useState([])
  const [lightboxImage, setLightboxImage] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(null) // ✅ Stato per disabilitare pulsante durante eliminazione
  
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
            console.error('❌ Errore creazione URL per allegato:', allegato.id, err)
            return {
              ...allegato,
              signedUrl: null // ✅ Previene crash se URL non generabile
            }
          }
        })
      )

      setAllegati(allegatiConUrl)
    } catch (error) {
      console.error('❌ Errore caricamento allegati:', error)
      alert('Errore durante il caricamento degli allegati')
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ FIX: Usa la funzione deleteAllegato da mediaUpload.js
  const handleDelete = async (allegatoId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo allegato? Questa azione è irreversibile.')) {
      return
    }

    try {
      setIsDeleting(allegatoId)
      
      // ✅ USA LA FUNZIONE CORRETTA che elimina sia database che storage
      await deleteAllegato(allegatoId)

      console.log('✅ Allegato eliminato con successo:', allegatoId)
      
      // Ricarica gli allegati
      await loadAllegati()
      
      // Notifica il parent component
      if (onDelete) {
        onDelete()
      }

      alert('✅ Allegato eliminato con successo')
      
    } catch (error) {
      console.error('❌ Errore eliminazione allegato:', error)
      alert('❌ Errore durante l\'eliminazione: ' + error.message)
    } finally {
      setIsDeleting(null)
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
      {/* 🎤 AUDIO - Solo player, SENZA trascrizione inline */}
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

          {/* Lista audio collassabile */}
          {isAudioExpanded && (
            <div className="space-y-2">
              {audio.map((aud) => (
                <div 
                  key={aud.id} 
                  className="bg-white rounded-lg p-3 border border-purple-200 hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Nome file */}
                      <p className="text-xs font-medium text-gray-700 truncate mb-1">
                        {aud.nome_file}
                      </p>

                      {/* Player audio */}
                      {aud.signedUrl ? (
                        <audio 
                          controls 
                          className="w-full h-8"
                          preload="metadata"
                        >
                          <source src={aud.signedUrl} type={aud.mime_type || 'audio/webm'} />
                          Il tuo browser non supporta l'audio.
                        </audio>
                      ) : (
                        <div className="p-2 bg-red-50 border border-red-200 rounded">
                          <p className="text-xs text-red-600">
                            ⚠️ Audio non disponibile (URL scaduto o file mancante)
                          </p>
                        </div>
                      )}

                      {/* Info durata se disponibile */}
                      {aud.durata_secondi && (
                        <p className="text-xs text-gray-500 mt-1">
                          Durata: {Math.floor(aud.durata_secondi / 60)}:{(aud.durata_secondi % 60).toString().padStart(2, '0')}
                        </p>
                      )}

                      {/* Stato trascrizione (informativo) */}
                      {aud.trascrizione_stato === 'processing' && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-xs text-blue-600">
                            ⏳ Trascrizione in corso...
                          </p>
                        </div>
                      )}

                      {aud.trascrizione_stato === 'completed' && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                          <p className="text-xs text-green-600">
                            ✅ Trascrizione completata - Vedi sopra in "Trascrizioni Salvate"
                          </p>
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
                      onClick={() => handleDelete(aud.id)}
                      disabled={isDeleting === aud.id}
                      className={`p-1.5 hover:bg-red-100 rounded transition-colors flex-shrink-0 ${
                        isDeleting === aud.id ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      title="Elimina audio"
                    >
                      {isDeleting === aud.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="text-red-500" size={14} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 📸 FOTO - Grid di miniature */}
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

          {/* Grid foto collassabile */}
          {isFotoExpanded && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {foto.map((img) => (
                <div
                  key={img.id}
                  className="relative group bg-white rounded-lg overflow-hidden border border-blue-200 hover:border-blue-400 transition-all aspect-square"
                >
                  {/* Miniatura */}
                  {img.signedUrl ? (
                    <img
                      src={img.signedUrl}
                      alt={img.nome_file}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setLightboxImage(img)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <p className="text-xs text-red-600 p-2 text-center">
                        Foto non disponibile
                      </p>
                    </div>
                  )}

                  {/* Overlay hover con icone */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {img.signedUrl && (
                      <button
                        onClick={() => setLightboxImage(img)}
                        className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                        title="Ingrandisci"
                      >
                        <ZoomIn size={16} className="text-blue-600" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(img.id)}
                      disabled={isDeleting === img.id}
                      className={`p-2 bg-white rounded-full hover:bg-gray-100 transition-colors ${
                        isDeleting === img.id ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      title="Elimina"
                    >
                      {isDeleting === img.id ? (
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 size={16} className="text-red-500" />
                      )}
                    </button>
                  </div>

                  {/* Nome file (tooltip) */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {img.nome_file}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 🖼️ LIGHTBOX VERDINO per foto */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-green-900/90 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-6xl max-h-full">
            {/* Pulsante chiudi */}
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
              title="Chiudi"
            >
              <X size={24} className="text-gray-700" />
            </button>

            {/* Immagine grande */}
            {lightboxImage.signedUrl ? (
              <img
                src={lightboxImage.signedUrl}
                alt={lightboxImage.nome_file}
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="bg-white p-8 rounded-lg">
                <p className="text-red-600">Immagine non disponibile</p>
              </div>
            )}

            {/* Info foto */}
            <div className="absolute -bottom-16 left-0 right-0 bg-white/90 p-3 rounded-lg">
              <p className="text-sm font-medium text-gray-800 truncate">
                {lightboxImage.nome_file}
              </p>
              <p className="text-xs text-gray-600">
                {new Date(lightboxImage.caricato_il).toLocaleString('it-IT')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
