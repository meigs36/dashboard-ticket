'use client'

import { useState } from 'react'
import { Volume2, Image as ImageIcon, Trash2, ZoomIn, X } from 'lucide-react'

export default function InterventiAllegatiInline({ allegati, onDelete }) {
  const [lightboxImage, setLightboxImage] = useState(null)

  if (!allegati || allegati.length === 0) {
    return null
  }

  const audioAllegati = allegati.filter(a => a.tipo === 'audio')
  const fotoAllegati = allegati.filter(a => a.tipo === 'foto')

  function formatFileSize(bytes) {
    if (!bytes) return 'N/A'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  function formatDuration(seconds) {
    if (!seconds) return ''
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Audio */}
      {audioAllegati.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Volume2 size={18} className="text-green-600" />
            Audio ({audioAllegati.length})
          </h4>
          <div className="space-y-3">
            {audioAllegati.map((allegato) => (
              <div
                key={allegato.id}
                className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4"
              >
                {/* Header audio */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>🎙️</span>
                    <span>
                      {new Date(allegato.caricato_il || allegato.created_at).toLocaleString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {allegato.durata_secondi && (
                      <span className="text-xs">
                        ({formatDuration(allegato.durata_secondi)})
                      </span>
                    )}
                  </div>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(allegato.id)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      title="Elimina audio"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Audio Player */}
                <audio
                  src={allegato.url || allegato.signedUrl}
                  controls
                  className="w-full mb-3"
                  style={{ height: '40px' }}
                >
                  Il tuo browser non supporta l'audio.
                </audio>

                {/* ✅ MODIFICATO: Legge da trascrizione_audio con fallback */}
                {(allegato.trascrizione_audio || allegato.trascrizione) && (
                  <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-800">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                        📝 Trascrizione:
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {allegato.trascrizione_audio || allegato.trascrizione}
                    </p>
                  </div>
                )}

                {/* Stato trascrizione pending */}
                {allegato.trascrizione_stato === 'pending' && !allegato.trascrizione_audio && !allegato.trascrizione && (
                  <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                      ⏳ Trascrizione in corso...
                    </p>
                  </div>
                )}

                {/* Errore trascrizione */}
                {allegato.trascrizione_errore && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-400">
                      ❌ Errore trascrizione: {allegato.trascrizione_errore}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Foto */}
      {fotoAllegati.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <ImageIcon size={18} className="text-blue-600" />
            Foto ({fotoAllegati.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {fotoAllegati.map((allegato) => (
              <div
                key={allegato.id}
                className="relative group bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden aspect-square"
              >
                <img
                  src={allegato.url || allegato.signedUrl}
                  alt={allegato.nome_file}
                  className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                  onClick={() => setLightboxImage(allegato)}
                />
                
                {/* Overlay con info */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end p-2">
                  <div className="w-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate mb-1">
                      {new Date(allegato.caricato_il || allegato.created_at).toLocaleDateString('it-IT')}
                    </p>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setLightboxImage(allegato)
                        }}
                        className="flex-1 px-2 py-1 bg-white/90 hover:bg-white text-gray-900 rounded text-xs font-medium flex items-center justify-center gap-1"
                      >
                        <ZoomIn size={12} />
                        Zoom
                      </button>
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(allegato.id)
                          }}
                          className="px-2 py-1 bg-red-500/90 hover:bg-red-500 text-white rounded text-xs"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <X size={32} />
          </button>
          <img
            src={lightboxImage.url || lightboxImage.signedUrl}
            alt={lightboxImage.nome_file}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-4 right-4 text-center">
            <p className="text-white text-sm">
              {new Date(lightboxImage.caricato_il || lightboxImage.created_at).toLocaleString('it-IT')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
