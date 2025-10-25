'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Camera, Mic, MicOff, Play, Pause, Trash2, Download, 
  Image as ImageIcon, Volume2, X, ZoomIn, AlertCircle,
  CheckCircle, Loader, XCircle
} from 'lucide-react'

// ⚠️ CONFIGURAZIONE - Cambia solo se il tuo bucket ha un nome diverso
const BUCKET_NAME = 'interventi-media'

export default function InterventoMediaCapture({ interventoId }) {
  const [allegati, setAllegati] = useState([])
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [lightboxImage, setLightboxImage] = useState(null)
  const [error, setError] = useState(null)
  
  // Refs
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (interventoId) {
      loadAllegati()
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [interventoId])

  async function loadAllegati() {
    setLoading(true)
    setError(null)
    
    try {
      console.log('📂 Carico allegati per intervento:', interventoId)
      
      const { data, error: dbError } = await supabase
        .from('interventi_allegati')
        .select('*')
        .eq('intervento_id', interventoId)
        .order('caricato_il', { ascending: false })

      if (dbError) {
        console.error('❌ Errore query database:', dbError)
        throw dbError
      }

      console.log(`✅ Trovati ${data?.length || 0} allegati nel database`)

      if (data && data.length > 0) {
        // Genera URL pubblici per ogni allegato
        const allegatiConUrl = data.map(allegato => {
          const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(allegato.storage_path)
          
          const url = urlData?.publicUrl
          console.log(`🔗 URL generato per ${allegato.nome_file}:`, url)
          
          return {
            ...allegato,
            url: url
          }
        })

        setAllegati(allegatiConUrl)
        console.log('✅ Allegati caricati con URL pubblici')
      } else {
        setAllegati([])
      }
    } catch (error) {
      console.error('❌ Errore caricamento allegati:', error)
      setError('Errore caricamento allegati: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 📸 CATTURA FOTO
  async function handleCatturaFoto() {
    try {
      console.log('📸 Avvio cattura foto...')
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      
      const video = document.createElement('video')
      video.srcObject = stream
      video.autoplay = true
      
      // Mostra preview in un modal
      const modal = document.createElement('div')
      modal.className = 'fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4'
      modal.innerHTML = `
        <div class="relative max-w-lg w-full">
          <button id="closeCamera" class="absolute -top-12 right-0 text-white">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      `
      modal.querySelector('div').prepend(video)
      
      const captureBtn = document.createElement('button')
      captureBtn.textContent = '📸 Scatta Foto'
      captureBtn.className = 'mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold'
      modal.querySelector('div').appendChild(captureBtn)
      
      document.body.appendChild(modal)
      
      // Gestione chiusura
      modal.querySelector('#closeCamera').onclick = () => {
        stream.getTracks().forEach(track => track.stop())
        document.body.removeChild(modal)
      }
      
      // Scatta foto
      captureBtn.onclick = async () => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)
        
        canvas.toBlob(async (blob) => {
          await uploadFile(blob, 'image/jpeg', 'foto')
          stream.getTracks().forEach(track => track.stop())
          document.body.removeChild(modal)
        }, 'image/jpeg', 0.9)
      }
      
    } catch (error) {
      console.error('❌ Errore cattura foto:', error)
      alert('Impossibile accedere alla fotocamera: ' + error.message)
    }
  }

  // 📂 SELEZIONA FOTO DA GALLERIA
  function handleSelezionaFoto() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e) {
    const files = e.target.files
    if (!files || files.length === 0) return

    console.log(`📂 Selezionate ${files.length} foto`)
    
    for (let file of files) {
      if (file.type.startsWith('image/')) {
        await uploadFile(file, file.type, 'foto')
      }
    }
    
    // Reset input
    e.target.value = ''
  }

  // 🎙️ REGISTRAZIONE AUDIO
  async function toggleRecording() {
    if (isRecording) {
      await stopRecording()
    } else {
      await startRecording()
    }
  }

  async function startRecording() {
    try {
      console.log('🎙️ Inizio registrazione audio...')
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await uploadFile(audioBlob, 'audio/webm', 'audio')
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
      setRecordingTime(0)
      
      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
      console.log('✅ Registrazione avviata')
    } catch (error) {
      console.error('❌ Errore avvio registrazione:', error)
      alert('Impossibile accedere al microfono: ' + error.message)
    }
  }

  async function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      console.log('⏹️ Stop registrazione...')
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  // ⬆️ UPLOAD FILE
  async function uploadFile(blob, mimeType, tipo) {
    try {
      setLoading(true)
      setError(null)
      console.log(`⬆️ Upload ${tipo} - Size: ${(blob.size / 1024).toFixed(1)} KB`)
      
      // Genera nome file univoco
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const extension = tipo === 'foto' ? 'jpg' : 'webm'
      const fileName = `${tipo}_${timestamp}.${extension}`
      const storagePath = `${interventoId}/${fileName}`
      
      console.log(`📁 Path Storage: ${storagePath}`)
      
      // Upload a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, blob, {
          contentType: mimeType,
          upsert: false
        })

      if (uploadError) {
        console.error('❌ Errore upload Storage:', uploadError)
        throw uploadError
      }

      console.log('✅ File caricato su Storage:', uploadData.path)

      // Genera URL pubblico
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath)

      const publicUrl = urlData?.publicUrl
      console.log('🔗 URL pubblico generato:', publicUrl)

      // Salva metadata nel database
      const { data: dbData, error: dbError } = await supabase
        .from('interventi_allegati')
        .insert({
          intervento_id: interventoId,
          tipo: tipo,
          nome_file: fileName,
          storage_path: storagePath,
          dimensione_bytes: blob.size,
          mime_type: mimeType
        })
        .select()
        .single()

      if (dbError) {
        console.error('❌ Errore salvataggio database:', dbError)
        throw dbError
      }

      console.log('✅ Metadata salvato nel database')

      // Ricarica allegati
      await loadAllegati()
      
      alert(`✅ ${tipo === 'foto' ? 'Foto' : 'Audio'} salvato!`)
      
    } catch (error) {
      console.error(`❌ Errore upload ${tipo}:`, error)
      setError(`Errore salvataggio ${tipo}: ` + error.message)
      alert(`Errore salvataggio ${tipo}: ` + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 🗑️ ELIMINA ALLEGATO
  async function handleDelete(allegatoId, storagePath) {
    if (!confirm('Eliminare questo allegato?')) return

    try {
      setLoading(true)
      setError(null)
      console.log(`🗑️ Elimino allegato: ${storagePath}`)

      // Elimina da Storage
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([storagePath])

      if (storageError) {
        console.error('⚠️ Errore eliminazione Storage:', storageError)
        // Continua comunque a eliminare dal database
      }

      // Elimina dal database
      const { error: dbError } = await supabase
        .from('interventi_allegati')
        .delete()
        .eq('id', allegatoId)

      if (dbError) throw dbError

      console.log('✅ Allegato eliminato')
      await loadAllegati()
      
    } catch (error) {
      console.error('❌ Errore eliminazione:', error)
      setError('Errore eliminazione: ' + error.message)
      alert('Errore eliminazione: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Formattazione
  function formatFileName(fileName, tipo, data) {
    const date = new Date(data).toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    return `${tipo === 'foto' ? '📸' : '🎙️'} ${date}`
  }

  function formatFileSize(bytes) {
    return (bytes / 1024).toFixed(1) + ' KB'
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Separa audio e foto
  const audioAllegati = allegati.filter(a => a.tipo === 'audio')
  const fotoAllegati = allegati.filter(a => a.tipo === 'foto')

  return (
    <>
      <div className="space-y-4">
        {/* ERRORE */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* PULSANTI AZIONI */}
        <div className="flex flex-wrap gap-2">
          {/* Pulsante Cattura Foto */}
          <button
            onClick={handleCatturaFoto}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Camera size={18} />
            <span className="font-medium">Scatta Foto</span>
          </button>

          {/* Pulsante Seleziona Foto */}
          <button
            onClick={handleSelezionaFoto}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ImageIcon size={18} />
            <span className="font-medium">Galleria</span>
          </button>

          {/* Pulsante Registra Audio */}
          <button
            onClick={toggleRecording}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isRecording ? (
              <>
                <MicOff size={18} />
                <span>Stop ({formatTime(recordingTime)})</span>
              </>
            ) : (
              <>
                <Mic size={18} />
                <span>Registra Audio</span>
              </>
            )}
          </button>

          {/* Input file nascosto */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* LOADING */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Loader className="animate-spin" size={16} />
            <span>Caricamento in corso...</span>
          </div>
        )}

        {/* LISTA ALLEGATI */}
        <div className="space-y-4">
          {allegati.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              <ImageIcon size={32} className="mx-auto mb-2 opacity-30" />
              <p>Nessun allegato</p>
              <p className="text-xs mt-1">Scatta foto o registra audio per iniziare</p>
            </div>
          ) : (
            <>
              {/* AUDIO */}
              {audioAllegati.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                    <Volume2 size={14} />
                    Audio ({audioAllegati.length})
                  </h3>
                  <div className="space-y-2">
                    {audioAllegati.map((allegato) => (
                      <div
                        key={allegato.id}
                        className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 flex items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-gray-900 dark:text-white">
                              {formatFileName(allegato.nome_file, allegato.tipo, allegato.caricato_il)}
                            </p>
                            <span className="text-[10px] text-gray-500">
                              {formatFileSize(allegato.dimensione_bytes)}
                            </span>
                          </div>
                          <audio
                            controls
                            className="w-full"
                            style={{ height: '32px' }}
                          >
                            <source src={allegato.url} type={allegato.mime_type} />
                            Il tuo browser non supporta l'audio.
                          </audio>
                        </div>
                        <button
                          onClick={() => handleDelete(allegato.id, allegato.storage_path)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                          title="Elimina"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FOTO */}
              {fotoAllegati.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                    <ImageIcon size={14} />
                    Foto ({fotoAllegati.length})
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {fotoAllegati.map((allegato) => (
                      <div
                        key={allegato.id}
                        className="relative aspect-square group rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800"
                      >
                        <img
                          src={allegato.url}
                          alt={formatFileName(allegato.nome_file, allegato.tipo, allegato.caricato_il)}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setLightboxImage(allegato)}
                          onError={(e) => {
                            console.error('❌ Errore caricamento immagine:', allegato.url)
                            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23ddd"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">❌</text></svg>'
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <ZoomIn 
                            size={20} 
                            className="text-white opacity-0 group-hover:opacity-100 transition-opacity" 
                          />
                        </div>
                        <button
                          onClick={() => handleDelete(allegato.id, allegato.storage_path)}
                          className="absolute -top-1 -right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* LIGHTBOX FOTO */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"
            onClick={() => setLightboxImage(null)}
          >
            <X size={24} />
          </button>
          <img
            src={lightboxImage.url}
            alt="Preview"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
