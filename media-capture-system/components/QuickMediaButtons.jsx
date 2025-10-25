// components/QuickMediaButtons.jsx
'use client'

import { useState, useRef } from 'react';
import { Camera, Mic, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { uploadAudio, uploadPhoto } from '@/lib/mediaUpload';

/**
 * Componente compatto per azioni rapide media
 * Ideale per tecnici in campo che vogliono aggiungere velocemente foto/audio
 * 
 * USO:
 * <QuickMediaButtons 
 *   interventoId={intervento.id} 
 *   onSuccess={() => console.log('Media caricato!')}
 * />
 */
export default function QuickMediaButtons({ interventoId, onSuccess, compact = false }) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const audioInputRef = useRef(null);
  const photoInputRef = useRef(null);

  // Handler rapido per foto
  async function handleQuickPhoto(e) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    setUploadType('foto');

    try {
      await uploadPhoto(file, interventoId, user.id);
      
      // Mostra feedback successo
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      // Reset input
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }

      // Callback
      if (onSuccess) {
        onSuccess({ tipo: 'foto' });
      }

    } catch (error) {
      console.error('Errore upload foto:', error);
      alert('❌ Errore caricamento foto');
    } finally {
      setIsUploading(false);
      setUploadType(null);
    }
  }

  // Handler rapido per audio (registrazione veloce)
  async function handleQuickAudio() {
    if (!user) return;

    try {
      setIsUploading(true);
      setUploadType('audio');

      // Avvia registrazione
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

      // Auto-stop dopo 30 secondi
      const timeout = setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 30000);

      mediaRecorder.onstop = async () => {
        clearTimeout(timeout);
        stream.getTracks().forEach(track => track.stop());

        const blob = new Blob(chunks, { type: 'audio/webm' });

        try {
          await uploadAudio(blob, interventoId, user.id);
          
          // Feedback successo
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);

          // Callback
          if (onSuccess) {
            onSuccess({ tipo: 'audio' });
          }

        } catch (error) {
          console.error('Errore upload audio:', error);
          alert('❌ Errore caricamento audio');
        } finally {
          setIsUploading(false);
          setUploadType(null);
        }
      };

      // Avvio
      mediaRecorder.start();

      // Notifica utente
      const stopBtn = confirm(
        '🎙️ Registrazione avviata!\n\n' +
        'Parla liberamente per descrivere l\'intervento.\n\n' +
        '⏱️ Max 30 secondi\n\n' +
        'Premi OK quando hai finito per fermare.'
      );

      if (stopBtn && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }

    } catch (error) {
      console.error('Errore registrazione:', error);
      alert('❌ Errore microfono: ' + error.message);
      setIsUploading(false);
      setUploadType(null);
    }
  }

  if (compact) {
    // Versione compatta: solo icone
    return (
      <div className="flex gap-2">
        {/* Foto */}
        <label className={`
          flex items-center justify-center w-10 h-10 rounded-full
          ${isUploading && uploadType === 'foto' 
            ? 'bg-gray-300 cursor-not-allowed' 
            : 'bg-blue-500 hover:bg-blue-600 cursor-pointer'
          }
          text-white transition-all shadow-md active:scale-95
        `}>
          {isUploading && uploadType === 'foto' ? (
            <Loader2 size={20} className="animate-spin" />
          ) : showSuccess && uploadType === 'foto' ? (
            <CheckCircle size={20} />
          ) : (
            <>
              <Camera size={20} />
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleQuickPhoto}
                disabled={isUploading}
                className="hidden"
              />
            </>
          )}
        </label>

        {/* Audio */}
        <button
          onClick={handleQuickAudio}
          disabled={isUploading}
          className={`
            flex items-center justify-center w-10 h-10 rounded-full
            ${isUploading && uploadType === 'audio'
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-red-500 hover:bg-red-600'
            }
            text-white transition-all shadow-md active:scale-95
          `}
        >
          {isUploading && uploadType === 'audio' ? (
            <Loader2 size={20} className="animate-spin" />
          ) : showSuccess && uploadType === 'audio' ? (
            <CheckCircle size={20} />
          ) : (
            <Mic size={20} />
          )}
        </button>
      </div>
    );
  }

  // Versione completa: con testo
  return (
    <div className="flex gap-3">
      {/* Bottone Foto */}
      <label className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-medium
        ${isUploading && uploadType === 'foto'
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
        }
        transition-all shadow-md active:scale-95
      `}>
        {isUploading && uploadType === 'foto' ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Caricamento...
          </>
        ) : showSuccess && uploadType === 'foto' ? (
          <>
            <CheckCircle size={18} />
            Foto caricata!
          </>
        ) : (
          <>
            <Camera size={18} />
            Scatta Foto
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleQuickPhoto}
              disabled={isUploading}
              className="hidden"
            />
          </>
        )}
      </label>

      {/* Bottone Audio */}
      <button
        onClick={handleQuickAudio}
        disabled={isUploading}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          ${isUploading && uploadType === 'audio'
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-red-500 hover:bg-red-600 text-white'
          }
          transition-all shadow-md active:scale-95
        `}
      >
        {isUploading && uploadType === 'audio' ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Registrazione...
          </>
        ) : showSuccess && uploadType === 'audio' ? (
          <>
            <CheckCircle size={18} />
            Audio caricato!
          </>
        ) : (
          <>
            <Mic size={18} />
            Registra Nota
          </>
        )}
      </button>

      {/* Feedback visivo */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce">
          ✅ Caricato!
        </div>
      )}
    </div>
  );
}

/**
 * ESEMPI D'USO:
 * 
 * // 1. Versione completa con testo
 * <QuickMediaButtons 
 *   interventoId={intervento.id}
 *   onSuccess={() => loadInterventi()}
 * />
 * 
 * // 2. Versione compatta (solo icone)
 * <QuickMediaButtons 
 *   interventoId={intervento.id}
 *   onSuccess={() => loadInterventi()}
 *   compact
 * />
 * 
 * // 3. Integrazione in card intervento
 * <div className="flex items-center justify-between">
 *   <h3>Intervento #{intervento.numero}</h3>
 *   <QuickMediaButtons 
 *     interventoId={intervento.id}
 *     onSuccess={() => alert('Media aggiunto!')}
 *     compact
 *   />
 * </div>
 */
