'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { loadInterventoAllegati, deleteAllegato } from '@/lib/mediaUpload'
import { Volume2, Image as ImageIcon, Trash2, X, Download } from 'lucide-react'

/**
 * Componente per visualizzare allegati audio e foto inline
 * Versione ottimizzata con UI pulita
 */
export default function InterventiAllegatiInline({ interventoId, onDelete }) {
  const [allegati, setAllegati] = useState([])
  const [loading, setLoading] = useState(true)
  const [playingAudio, setPlayingAudio] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)

  useEffect(() => {
    if (interventoId) {
      loadAllegati()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interventoId])  // loadAllegati non deve essere nelle dipendenze

  async function loadAllegati() {
    try {
      setLoading(true)
      console.log('🎵 InterventiAllegatiInline: Carico allegati per intervento:', interventoId)
      
      const data = await loadInterventoAllegati(interventoId)
      console.log('✅ Allegati caricati:', data)
      console.log('📊 Numero allegati:', data?.length || 0)
      
      setAllegati(data || [])
    } catch (error) {
      console.error('❌ Errore caricamento allegati:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(allegatoId) {
    if (!confirm('Sei sicuro di voler eliminare questo allegato?')) {
      return
    }

    try {
      await deleteAllegato(allegatoId)
      await loadAllegati()
      if (onDelete) onDelete()
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('❌ Errore eliminazione: ' + error.message)
    }
  }

  function handleAudioPlay(audioId) {
    setPlayingAudio(audioId)
  }

  function handleAudioPause() {
    setPlayingAudio(null)
  }

  if (loading) {
    return (
      <div className="mt-3 text-sm text-gray-500">
        Caricamento allegati...
      </div>
    )
  }

  if (!allegati || allegati.length === 0) {
    return null
  }

  // Separa audio e foto
  const audioAllegati = allegati.filter(a => a.tipo === 'audio')
  const fotoAllegati = allegati.filter(a => a.tipo === 'foto')

  return (
    <div className="mt-4 space-y-4">
      {/* SEZIONE AUDIO */}
      {audioAllegati.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Volume2 size={16} className="text-green-600 dark:text-green-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Audio ({audioAllegati.length})
            </span>
          </div>

          <div className="space-y-2">
            {audioAllegati.map((audio) => (
              <div
                key={audio.id}
                className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Audio Player */}
                    <audio
                      controls
                      src={audio.signedUrl || audio.url}
                      className="w-full mb-2"
                      onPlay={() => handleAudioPlay(audio.id)}
                      onPause={handleAudioPause}
                      preload="metadata"
                    />

                    {/* Trascrizione */}
                    {audio.trascrizione && (
                      <div className="mb-2 p-2 bg-white dark:bg-gray-800 rounded text-sm text-gray-700 dark:text-gray-300 italic border-l-2 border-green-500">
                        "{audio.trascrizione}"
                      </div>
                    )}

                    {/* Data e Ora */}
                    {audio.caricato_il && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        📅 {new Date(audio.caricato_il).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })} alle {new Date(audio.caricato_il).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                  </div>

                  {/* Pulsante Elimina */}
                  <button
                    onClick={() => handleDelete(audio.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                    title="Elimina audio"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEZIONE FOTO */}
      {fotoAllegati.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ImageIcon size={16} className="text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Foto ({fotoAllegati.length})
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {fotoAllegati.map((foto) => (
              <div
                key={foto.id}
                className="relative aspect-square group cursor-pointer"
                onClick={() => setSelectedImage(foto)}
              >
                <img
                  src={foto.signedUrl || foto.url}
                  alt={foto.nome_file || 'Foto intervento'}
                  className="w-full h-full object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                  onError={(e) => {
                    console.error('Errore caricamento foto:', foto)
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E'
                  }}
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-lg flex items-center justify-center transition-all">
                  <ImageIcon 
                    size={24} 
                    className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg transition-opacity" 
                  />
                </div>

                {/* Pulsante Elimina (solo al hover) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(foto.id)
                  }}
                  className="absolute top-1 right-1 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-700 transition-all shadow-lg"
                  title="Elimina foto"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LIGHTBOX FOTO */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          {/* Pulsante Chiudi */}
          <button
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-all"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedImage(null)
            }}
          >
            <X size={24} />
          </button>

          {/* Nome File */}
          {selectedImage.nome_file && (
            <div className="absolute top-4 left-4 px-4 py-2 bg-black/50 text-white text-sm rounded-lg backdrop-blur-sm max-w-md truncate">
              {selectedImage.nome_file}
            </div>
          )}

          {/* Immagine */}
          <img
            src={selectedImage.signedUrl || selectedImage.url}
            alt={selectedImage.nome_file || 'Foto intervento'}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Info e Azioni */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {/* Download */}
            <a
              href={selectedImage.signedUrl || selectedImage.url}
              download={selectedImage.nome_file}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Download size={16} />
              <span className="hidden sm:inline">Scarica</span>
            </a>

            {/* Elimina */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedImage(null)
                handleDelete(selectedImage.id)
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">Elimina</span>
            </button>
          </div>

          {/* Hint Mobile */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 text-white text-xs rounded-lg backdrop-blur-sm md:hidden">
            Tocca fuori dall'immagine per chiudere
          </div>
        </div>
      )}
    </div>
  )
}
