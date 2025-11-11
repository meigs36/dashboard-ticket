// components/InterventiAllegatiInline.jsx - TEST CON IMG NORMALE
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { deleteAllegato, loadInterventoAllegati } from '@/lib/mediaUpload'
// import SafeImage from './SafeImage' // ❌ COMMENTATO PER TEST
import { Image, Mic, Trash2, X, ZoomIn, ChevronDown, ChevronUp } from 'lucide-react'

export default function InterventiAllegatiInline({ interventoId, onDelete }) {
  const [allegati, setAllegati] = useState([])
  const [lightboxImage, setLightboxImage] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(null)
  
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
      const allegatiConUrl = await loadInterventoAllegati(interventoId)
      setAllegati(allegatiConUrl)
    } catch (error) {
      console.error('❌ Errore caricamento allegati:', error)
      alert('Errore durante il caricamento degli allegati')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (allegatoId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo allegato? Questa azione è irreversibile.')) {
      return
    }

    setIsDeleting(allegatoId)
    try {
      await deleteAllegato(allegatoId)
      
      setAllegati(prev => prev.filter(a => a.id !== allegatoId))
      
      if (onDelete) {
        onDelete(allegatoId)
      }

      alert('✅ Allegato eliminato con successo!')
    } catch (error) {
      console.error('❌ Errore eliminazione:', error)
      alert('❌ Errore durante l\'eliminazione: ' + error.message)
    } finally {
      setIsDeleting(null)
    }
  }

  const audio = allegati.filter(a => a.tipo === 'audio')
  const foto = allegati.filter(a => a.tipo === 'foto')

  if (isLoading) {
    return <div className="text-sm text-gray-500">Caricamento allegati...</div>
  }

  if (allegati.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* 🎤 AUDIO */}
      {audio.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200">
          <div 
            className="flex items-center justify-between cursor-pointer hover:bg-purple-100/50 rounded p-2 -m-2 mb-2"
            onClick={() => setIsAudioExpanded(!isAudioExpanded)}
          >
            <div className="flex items-center gap-2">
              <Mic className="text-purple-600" size={16} />
              <span className="text-sm font-semibold text-purple-700">
                Registrazioni Audio ({audio.length})
              </span>
            </div>
            {isAudioExpanded ? (
              <ChevronUp size={16} className="text-purple-600" />
            ) : (
              <ChevronDown size={16} className="text-purple-600" />
            )}
          </div>

          {isAudioExpanded && (
            <div className="space-y-2">
              {audio.map((aud) => (
                <div key={aud.id} className="bg-white rounded-lg p-2 border border-purple-200">
                  {aud.signedUrl && (
                    <audio controls className="w-full mb-2" preload="metadata">
                      <source src={aud.signedUrl} type={aud.mime_type || 'audio/webm'} />
                      Il tuo browser non supporta l'audio.
                    </audio>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-600 truncate flex-1">
                      {new Date(aud.caricato_il).toLocaleString('it-IT')}
                    </div>
                    <button
                      onClick={() => handleDelete(aud.id)}
                      disabled={isDeleting === aud.id}
                      className={`p-1 hover:bg-red-50 rounded transition-colors ${
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

      {/* 📸 FOTO - TEST CON IMG NORMALE */}
      {foto.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
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
            {isFotoExpanded ? (
              <ChevronUp size={16} className="text-blue-600" />
            ) : (
              <ChevronDown size={16} className="text-blue-600" />
            )}
          </div>

          {isFotoExpanded && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {foto.map((img) => (
                <div
                  key={img.id}
                  className="relative group bg-white rounded-lg overflow-hidden border border-blue-200 hover:border-blue-400 transition-all aspect-square"
                >
                  {/* ✅ USA IMG NORMALE PER TEST */}
                  {img.signedUrl ? (
                    <img
                      src={img.signedUrl}
                      alt={img.nome_file}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setLightboxImage(img)}
                      onError={(e) => {
                        console.error('❌ IMG error:', img.signedUrl, e);
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-100"><p class="text-xs text-red-600 p-2 text-center">Errore caricamento</p></div>';
                      }}
                      onLoad={() => console.log('✅ IMG loaded:', img.signedUrl)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <p className="text-xs text-red-600 p-2 text-center">
                        Foto non disponibile
                      </p>
                    </div>
                  )}

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

                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {img.nome_file}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 🖼️ LIGHTBOX - TEST CON IMG NORMALE */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-green-900/90 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-6xl max-h-full">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
              title="Chiudi"
            >
              <X size={24} className="text-gray-700" />
            </button>

            {/* ✅ USA IMG NORMALE NEL LIGHTBOX */}
            {lightboxImage.signedUrl ? (
              <img
                src={lightboxImage.signedUrl}
                alt={lightboxImage.nome_file}
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                onError={(e) => console.error('❌ Lightbox IMG error:', lightboxImage.signedUrl, e)}
                onLoad={() => console.log('✅ Lightbox IMG loaded:', lightboxImage.signedUrl)}
              />
            ) : (
              <div className="bg-white p-8 rounded-lg">
                <p className="text-red-600">Immagine non disponibile</p>
              </div>
            )}

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
