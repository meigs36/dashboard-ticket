// hooks/useAudioRecorder.js - VERSIONE NON-BLOCCANTE
'use client'

import { useState, useRef, useCallback, useEffect } from 'react';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null); // ✅ NUOVO: stato per errori
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);

  // Rileva iOS
  const isIOS = useCallback(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }, []);

  // Rileva standalone mode (PWA)
  const isStandalone = useCallback(() => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }, []);

  // MIME type ottimale per iOS
  const getSupportedMimeType = useCallback(() => {
    if (isIOS()) {
      console.log('📱 iOS rilevato - uso audio/mp4');
      return 'audio/mp4';
    }

    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('✅ MIME Type selezionato:', type);
        return type;
      }
    }

    console.warn('⚠️ Nessun MIME Type supportato, uso default');
    return '';
  }, [isIOS]);

  // Constraints audio ottimizzate per iOS
  const getAudioConstraints = useCallback(() => {
    if (isIOS()) {
      return {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        }
      };
    }
    
    return {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };
  }, [isIOS]);

  // Unlock audio context DOPO aver ottenuto lo stream
  const unlockAudioContext = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('✅ Audio context sbloccato');
      }
    } catch (error) {
      console.error('❌ Errore unlock audio context:', error);
    }
  }, []);

  // ✅ FUNZIONE PER PULIRE L'ERRORE
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 🎙️ START RECORDING - VERSIONE CORRETTA E NON-BLOCCANTE
  const startRecording = useCallback(async () => {
    try {
      console.log('🎙️ Avvio registrazione...');
      console.log('📱 iOS:', isIOS());
      console.log('📱 Standalone:', isStandalone());

      // Reset stato
      setError(null); // Pulisce errori precedenti
      chunksRef.current = [];
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioUrl(null);

      const constraints = getAudioConstraints();
      console.log('🔧 Constraints:', constraints);
      
      // ⚡ FIX iOS: Chiamiamo getUserMedia IMMEDIATAMENTE
      // senza altre chiamate async prima, per mantenere la user gesture
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      console.log('✅ Stream ottenuto:', stream.getAudioTracks()[0].getSettings());

      // ✅ SOLO DOPO aver ottenuto lo stream, facciamo l'unlock del context
      if (isIOS() && isStandalone()) {
        await unlockAudioContext();
      }

      const mimeType = getSupportedMimeType();
      console.log('🎵 MIME Type:', mimeType);

      const options = mimeType ? { 
        mimeType,
        audioBitsPerSecond: 128000 
      } : { audioBitsPerSecond: 128000 };

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          console.log('📦 Chunk ricevuto:', event.data.size, 'bytes');
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('⏹️ Registrazione fermata');
        console.log('📊 Chunks totali:', chunksRef.current.length);
        
        const totalSize = chunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);
        console.log('📏 Dimensione totale:', totalSize, 'bytes');

        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/mp4' });
          console.log('✅ Blob creato:', blob.size, 'bytes', blob.type);

          const url = URL.createObjectURL(blob);
          
          setAudioBlob(blob);
          setAudioUrl(url);
          console.log('🔗 URL creato:', url);
        } else {
          console.error('❌ Nessun chunk audio registrato!');
          setError('Nessun audio registrato. Riprova.');
        }
        
        // Ferma tutti i track
        streamRef.current?.getTracks().forEach(track => {
          track.stop();
          console.log('🛑 Track fermato:', track.kind);
        });
      };

      // iOS richiede timeslice più grande per evitare problemi
      const timeslice = isIOS() ? 1000 : 100;
      mediaRecorder.start(timeslice);
      
      console.log('🔴 Registrazione avviata con timeslice:', timeslice, 'ms');
      setIsRecording(true);

      // Avvia timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('❌ Errore avvio registrazione:', error);
      
      // ✅ FIX: Non usiamo alert() - impostiamo solo lo stato errore
      let errorMessage = 'Errore sconosciuto durante l\'avvio della registrazione';
      
      if (error.name === 'NotAllowedError') {
        if (isIOS() && isStandalone()) {
          errorMessage = 
            '🎙️ Permessi microfono necessari!\n\n' +
            'Per registrare in modalità app:\n' +
            '1. Vai in Impostazioni > Safari > Microfono\n' +
            '2. Abilita l\'accesso per questo sito\n' +
            '3. Riapri l\'app dalla Home';
        } else if (isIOS()) {
          errorMessage = 
            '🎙️ Permessi microfono negati\n\n' +
            'Vai in Impostazioni > Safari > Microfono\n' +
            'e abilita l\'accesso per questo sito';
        } else {
          errorMessage = '🎙️ Permessi microfono negati. Controlla le impostazioni del browser.';
        }
      } else if (error.name === 'NotFoundError') {
        errorMessage = '🎙️ Nessun microfono trovato sul dispositivo.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 
          '🎙️ Microfono già in uso\n\n' +
          'Chiudi altre app che potrebbero usare il microfono e riprova.';
      } else {
        errorMessage = `🎙️ Errore: ${error.message}`;
      }
      
      // ✅ Imposta errore nello stato invece di alert bloccante
      setError(errorMessage);
      
      // Cleanup in caso di errore
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // NON facciamo throw - lasciamo che l'UI gestisca l'errore
    }
  }, [isIOS, isStandalone, getAudioConstraints, getSupportedMimeType, unlockAudioContext]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(timerRef.current);
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  }, []);

  const stopRecording = useCallback(() => {
    console.log('⏸️ Stop registrazione richiesto');
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsRecording(false);
    setIsPaused(false);
  }, []);

  const cancelRecording = useCallback(() => {
    console.log('🗑️ Cancellazione registrazione');
    
    if (isRecording) {
      stopRecording();
    }
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setError(null); // ✅ Pulisce anche errori
    chunksRef.current = [];
  }, [isRecording, stopRecording, audioUrl]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup al unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return {
    isRecording,
    isPaused,
    recordingTime: formatTime(recordingTime),
    recordingTimeRaw: recordingTime,
    audioBlob,
    audioUrl,
    error, // ✅ NUOVO: espone errori
    clearError, // ✅ NUOVO: funzione per pulire errori
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording
  };
}
