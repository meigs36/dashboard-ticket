'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { usePhotoCapture } from '@/hooks/usePhotoCapture'
import {
  uploadAudio,
  uploadPhoto,
  uploadMultiplePhotos,
} from '@/lib/mediaUpload'
import {
  Mic,
  Camera,
  Pause,
  Play,
  Square,
  Trash2,
  Upload,
  Loader2,
  FileAudio
} from 'lucide-react'

export default function InterventoMediaCapture({ interventoId, onMediaUploaded }) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('registra-audio') // 'registra-audio' | 'carica-audio' | 'foto'
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  
  // Per upload file audio
  const audioFileInputRef = useRef(null)
  const [selectedAudioFile, setSelectedAudioFile] = useState(null)

  // Hook per audio recorder
  const {
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    audioUrl,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording
  } = useAudioRecorder()

  // Hook per foto
  const {
    photos,
    captureMultiplePhotos,
    removePhoto,
    clearPhotos,
  } = usePhotoCapture()

  // === GESTIONE AUDIO REGISTRATO ===

  async function handleUploadRecordedAudio() {
    if (!audioBlob || !user) return

    setLoading(true)
    try {
      const result = await uploadAudio(audioBlob, interventoId, user.id)
      
      cancelRecording()
      
      if (onMediaUploaded) {
        onMediaUploaded({ tipo: 'audio', ...result })
      }

      alert('✅ Audio registrato caricato!\n\nSarà trascritto automaticamente.')
      
    } catch (error) {
      console.error('Errore upload audio:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // === GESTIONE AUDIO DA FILE ===

  function handleAudioFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Verifica che sia un file audio
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/webm']
    if (!validTypes.some(type => file.type.startsWith('audio/'))) {
      alert('❌ Seleziona un file audio valido (.mp3, .wav, .m4a, .ogg, .webm)')
      return
    }

    // Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      alert('❌ File troppo grande! Max 50MB')
      return
    }

    setSelectedAudioFile(file)
  }

  async function handleUploadAudioFile() {
    if (!selectedAudioFile || !user) return

    setLoading(true)
    try {
      // Crea blob dal file
      const blob = new Blob([selectedAudioFile], { type: selectedAudioFile.type })
      
      const result = await uploadAudio(blob, interventoId, user.id)
      
      setSelectedAudioFile(null)
      if (audioFileInputRef.current) {
        audioFileInputRef.current.value = ''
      }
      
      if (onMediaUploaded) {
        onMediaUploaded({ tipo: 'audio', ...result })
      }

      alert('✅ File audio caricato!\n\nSarà trascritto automaticamente.')
      
    } catch (error) {
      console.error('Errore upload file audio:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // === GESTIONE FOTO ===

  async function handlePhotoInput(e) {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      await captureMultiplePhotos(files)
    } catch (error) {
      console.error('Errore cattura foto:', error)
      alert('❌ Errore: ' + error.message)
    }
  }

  async function handleUploadPhotos() {
    if (photos.length === 0 || !user) return

    setLoading(true)
    setUploadProgress({ current: 0, total: photos.length })

    try {
      const results = await uploadMultiplePhotos(
        photos.map(p => p.file),
        interventoId,
        user.id,
        (current, total) => {
          setUploadProgress({ current, total })
        }
      )

      const successi = results.filter(r => r.success).length
      const errori = results.filter(r => !r.success).length

      clearPhotos()
      
      if (onMediaUploaded) {
        onMediaUploaded({ tipo: 'foto', results })
      }

      if (errori === 0) {
        alert(`✅ ${successi} foto caricate!`)
      } else {
        alert(`⚠️ ${successi} foto caricate, ${errori} con errori.`)
      }

    } catch (error) {
      console.error('Errore upload foto:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
      setUploadProgress(null)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header con Tab */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2 px-4 py-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('registra-audio')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'registra-audio'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            <Mic size={16} />
            Registra Audio
          </button>

          <button
            onClick={() => setActiveTab('carica-audio')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'carica-audio'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            <FileAudio size={16} />
            Carica Audio
          </button>

          <button
            onClick={() => setActiveTab('foto')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'foto'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            <Camera size={16} />
            Aggiungi Foto
          </button>
        </div>
      </div>

      {/* Contenuto Tab */}
      <div className="p-6">
        {/* TAB REGISTRA AUDIO */}
        {activeTab === 'registra-audio' && (
          <div className="space-y-6">
            <div className="text-center">
              {!isRecording && !audioBlob && (
                <button
                  onClick={startRecording}
                  disabled={loading}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold shadow-lg transition-all disabled:opacity-50"
                >
                  <Mic size={24} />
                  Inizia Registrazione
                </button>
              )}

              {isRecording && (
                <div className="space-y-4">
                  <div className="text-4xl font-bold text-red-500 animate-pulse">
                    {recordingTime}
                  </div>

                  <div className="flex justify-center gap-3">
                    {!isPaused ? (
                      <button
                        onClick={pauseRecording}
                        className="p-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full"
                      >
                        <Pause size={24} />
                      </button>
                    ) : (
                      <button
                        onClick={resumeRecording}
                        className="p-4 bg-green-500 hover:bg-green-600 text-white rounded-full"
                      >
                        <Play size={24} />
                      </button>
                    )}

                    <button
                      onClick={stopRecording}
                      className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-full"
                    >
                      <Square size={24} />
                    </button>
                  </div>
                </div>
              )}

              {audioBlob && !isRecording && (
                <div className="space-y-4">
                  <audio src={audioUrl} controls className="w-full" />

                  <div className="flex justify-center gap-3">
                    <button
                      onClick={handleUploadRecordedAudio}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Caricamento...
                        </>
                      ) : (
                        <>
                          <Upload size={20} />
                          Carica Audio
                        </>
                      )}
                    </button>

                    <button
                      onClick={cancelRecording}
                      className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  <p className="text-sm text-gray-500">
                    💡 L'audio verrà trascritto automaticamente
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB CARICA AUDIO DA FILE */}
        {activeTab === 'carica-audio' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  <FileAudio size={48} className="mx-auto mb-4 text-gray-400" />
                  
                  <label className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium cursor-pointer">
                    <Upload size={20} />
                    Seleziona File Audio
                    <input
                      ref={audioFileInputRef}
                      type="file"
                      accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
                      onChange={handleAudioFileSelect}
                      className="hidden"
                    />
                  </label>

                  <p className="mt-3 text-sm text-gray-500">
                    Formati supportati: MP3, WAV, M4A, OGG, WebM
                    <br />
                    Max 50MB
                  </p>
                </div>

                {selectedAudioFile && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      📁 {selectedAudioFile.name}
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      {(selectedAudioFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>

                    <div className="flex gap-2">
                      <button
                        onClick={handleUploadAudioFile}
                        disabled={loading}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Caricamento...
                          </>
                        ) : (
                          <>
                            <Upload size={18} />
                            Carica
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setSelectedAudioFile(null)
                          if (audioFileInputRef.current) {
                            audioFileInputRef.current.value = ''
                          }
                        }}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500 italic">
                  💡 L'audio verrà trascritto automaticamente dopo il caricamento
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB FOTO */}
        {activeTab === 'foto' && (
          <div className="space-y-6">
            <div className="text-center">
              <label className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold cursor-pointer shadow-lg transition-all">
                <Camera size={24} />
                {photos.length === 0 ? 'Scatta o Seleziona Foto' : `${photos.length} Foto Selezionate`}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={handlePhotoInput}
                  className="hidden"
                />
              </label>

              <p className="mt-3 text-sm text-gray-500">
                Puoi selezionare più foto contemporaneamente
              </p>
            </div>

            {photos.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative aspect-square group">
                      <img
                        src={photo.url}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {uploadProgress && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Caricamento foto...</span>
                      <span>{uploadProgress.current} / {uploadProgress.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleUploadPhotos}
                    disabled={loading}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Caricamento...
                      </>
                    ) : (
                      <>
                        <Upload size={20} />
                        Carica {photos.length} Foto
                      </>
                    )}
                  </button>

                  <button
                    onClick={clearPhotos}
                    className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
