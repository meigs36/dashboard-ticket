// components/InterventoMediaCapture.jsx
'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { usePhotoCapture } from '@/hooks/usePhotoCapture';
import {
  uploadAudio,
  uploadPhoto,
  uploadMultiplePhotos,
  loadInterventoAllegati,
  deleteAllegato,
  formatFileSize,
  formatDuration
} from '@/lib/mediaUpload';
import {
  Mic,
  MicOff,
  Camera,
  Pause,
  Play,
  Square,
  Trash2,
  Upload,
  Volume2,
  Image as ImageIcon,
  X,
  Download,
  Loader2
} from 'lucide-react';

export default function InterventoMediaCapture({ interventoId, onMediaUploaded }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('audio'); // 'audio' | 'foto' | 'gallery'
  const [allegati, setAllegati] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  // Hook per audio
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
  } = useAudioRecorder();

  // Hook per foto
  const {
    photos,
    capturePhoto,
    captureMultiplePhotos,
    removePhoto,
    clearPhotos,
    compressImage
  } = usePhotoCapture();

  // Carica allegati esistenti
  useEffect(() => {
    if (interventoId) {
      loadAllegati();
    }
  }, [interventoId]);

  async function loadAllegati() {
    try {
      const data = await loadInterventoAllegati(interventoId);
      setAllegati(data);
    } catch (error) {
      console.error('Errore caricamento allegati:', error);
    }
  }

  // === GESTIONE AUDIO ===

  async function handleUploadAudio() {
    if (!audioBlob || !user) return;

    setLoading(true);
    try {
      const result = await uploadAudio(audioBlob, interventoId, user.id);
      
      // Aggiorna lista allegati
      await loadAllegati();
      
      // Pulisci registrazione
      cancelRecording();
      
      // Callback opzionale
      if (onMediaUploaded) {
        onMediaUploaded({ tipo: 'audio', ...result });
      }

      alert('✅ Audio caricato con successo!\n\nSarà trascritto automaticamente a breve.');
      
    } catch (error) {
      console.error('Errore upload audio:', error);
      alert('❌ Errore caricamento audio: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  // === GESTIONE FOTO ===

  async function handlePhotoInput(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      await captureMultiplePhotos(files);
    } catch (error) {
      console.error('Errore cattura foto:', error);
      alert('❌ Errore cattura foto: ' + error.message);
    }
  }

  async function handleUploadPhotos() {
    if (photos.length === 0 || !user) return;

    setLoading(true);
    setUploadProgress({ current: 0, total: photos.length });

    try {
      const results = await uploadMultiplePhotos(
        photos.map(p => p.file),
        interventoId,
        user.id,
        (current, total) => {
          setUploadProgress({ current, total });
        }
      );

      // Conta successi e errori
      const successi = results.filter(r => r.success).length;
      const errori = results.filter(r => !r.success).length;

      // Aggiorna lista allegati
      await loadAllegati();
      
      // Pulisci foto
      clearPhotos();
      
      // Callback
      if (onMediaUploaded) {
        onMediaUploaded({ tipo: 'foto', results });
      }

      if (errori === 0) {
        alert(`✅ ${successi} foto caricate con successo!`);
      } else {
        alert(`⚠️ ${successi} foto caricate, ${errori} con errori.`);
      }

    } catch (error) {
      console.error('Errore upload foto:', error);
      alert('❌ Errore caricamento foto: ' + error.message);
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  }

  // === ELIMINAZIONE ALLEGATO ===

  async function handleDeleteAllegato(allegatoId) {
    if (!confirm('Sei sicuro di voler eliminare questo allegato?')) {
      return;
    }

    try {
      await deleteAllegato(allegatoId);
      await loadAllegati();
      alert('✅ Allegato eliminato');
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('❌ Errore eliminazione: ' + error.message);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header con Tab */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4 px-6 py-4">
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'audio'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            <Mic size={18} />
            Registra Audio
          </button>

          <button
            onClick={() => setActiveTab('foto')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'foto'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            <Camera size={18} />
            Aggiungi Foto
          </button>

          <button
            onClick={() => {
              setActiveTab('gallery');
              loadAllegati();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'gallery'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            <ImageIcon size={18} />
            Allegati ({allegati.length})
          </button>
        </div>
      </div>

      {/* Contenuto Tab */}
      <div className="p-6">
        {/* TAB AUDIO */}
        {activeTab === 'audio' && (
          <div className="space-y-6">
            {/* Controlli Registrazione */}
            <div className="text-center">
              {!isRecording && !audioBlob && (
                <button
                  onClick={startRecording}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold shadow-lg transition-all"
                >
                  <Mic size={24} />
                  Inizia Registrazione
                </button>
              )}

              {isRecording && (
                <div className="space-y-4">
                  {/* Timer */}
                  <div className="text-4xl font-bold text-red-500 animate-pulse">
                    {recordingTime}
                  </div>

                  {/* Controlli */}
                  <div className="flex justify-center gap-3">
                    {!isPaused ? (
                      <button
                        onClick={pauseRecording}
                        className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium"
                      >
                        <Pause size={20} />
                      </button>
                    ) : (
                      <button
                        onClick={resumeRecording}
                        className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium"
                      >
                        <Play size={20} />
                      </button>
                    )}

                    <button
                      onClick={stopRecording}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                    >
                      <Square size={20} />
                    </button>

                    <button
                      onClick={cancelRecording}
                      className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <p className="text-sm text-gray-500">
                    {isPaused ? '⏸️ In pausa' : '🎙️ Registrazione in corso...'}
                  </p>
                </div>
              )}

              {audioBlob && !isRecording && (
                <div className="space-y-4">
                  {/* Player Audio */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <audio
                      src={audioUrl}
                      controls
                      className="w-full"
                    />
                  </div>

                  {/* Azioni */}
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={handleUploadAudio}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
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

        {/* TAB FOTO */}
        {activeTab === 'foto' && (
          <div className="space-y-6">
            {/* Input Foto */}
            <div className="text-center">
              <label className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold cursor-pointer shadow-lg transition-all">
                <Camera size={24} />
                {photos.length === 0 ? 'Scatta/Seleziona Foto' : `Aggiungi altre foto (${photos.length})`}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handlePhotoInput}
                  className="hidden"
                />
              </label>
            </div>

            {/* Preview Foto */}
            {photos.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Foto da caricare:
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.preview}
                        alt={photo.name}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removePhoto(photo.id)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={16} />
                      </button>
                      <div className="text-xs text-gray-500 mt-1 truncate">
                        {formatFileSize(photo.size)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Azioni */}
                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleUploadPhotos}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        {uploadProgress && `${uploadProgress.current}/${uploadProgress.total}`}
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
                    className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB GALLERY */}
        {activeTab === 'gallery' && (
          <div className="space-y-4">
            {allegati.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ImageIcon size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Nessun allegato presente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Audio */}
                {allegati.filter(a => a.tipo === 'audio').length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <Volume2 size={18} />
                      Registrazioni Audio
                    </h4>
                    <div className="space-y-2">
                      {allegati
                        .filter(a => a.tipo === 'audio')
                        .map((allegato) => (
                          <div
                            key={allegato.id}
                            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {new Date(allegato.caricato_il).toLocaleString('it-IT')}
                              </span>
                              <button
                                onClick={() => handleDeleteAllegato(allegato.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            
                            <audio
                              src={allegato.signedUrl}
                              controls
                              className="w-full"
                            />

                            {allegato.trascrizione && (
                              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                                <strong>Trascrizione:</strong>
                                <p className="mt-1">{allegato.trascrizione}</p>
                              </div>
                            )}

                            {allegato.trascrizione_stato === 'pending' && (
                              <p className="mt-2 text-xs text-yellow-600">
                                ⏳ In attesa di trascrizione...
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Foto */}
                {allegati.filter(a => a.tipo === 'foto').length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <ImageIcon size={18} />
                      Foto
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {allegati
                        .filter(a => a.tipo === 'foto')
                        .map((allegato) => (
                          <div key={allegato.id} className="relative group">
                            <a
                              href={allegato.signedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={allegato.signedUrl}
                                alt={allegato.nome_file}
                                className="w-full h-32 object-cover rounded-lg hover:opacity-90 transition"
                              />
                            </a>
                            <button
                              onClick={() => handleDeleteAllegato(allegato.id)}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={16} />
                            </button>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(allegato.caricato_il).toLocaleDateString('it-IT')}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
