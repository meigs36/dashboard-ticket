// hooks/useAudioRecorder.js - FIX iOS COMPLETO
'use client'

import { useState, useRef, useCallback } from 'react';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  // === FIX iOS: Rileva dispositivo ===
  const isIOS = useCallback(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }, []);

  // === FIX iOS: MIME Type corretto ===
  const getSupportedMimeType = useCallback(() => {
    // iOS Safari supporta SOLO audio/mp4
    if (isIOS()) {
      console.log('📱 iOS rilevato - uso audio/mp4');
      return 'audio/mp4';
    }

    // Prova in ordine di preferenza per altri browser
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

  // === FIX iOS: Constraints audio specifici ===
  const getAudioConstraints = useCallback(() => {
    if (isIOS()) {
      // iOS richiede sampleRate esplicito
      return {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100, // 44.1kHz standard iOS
          channelCount: 1
        }
      };
    }
    
    // Altri dispositivi
    return {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };
  }, [isIOS]);

  // Avvia la registrazione
  const startRecording = useCallback(async () => {
    try {
      console.log('🎙️ Avvio registrazione...');
      console.log('📱 iOS:', isIOS());

      // Reset
      chunksRef.current = [];
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioUrl(null);

      // === FIX iOS: Constraints specifici ===
      const constraints = getAudioConstraints();
      console.log('🔧 Constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      console.log('✅ Stream ottenuto:', stream.getAudioTracks()[0].getSettings());

      // === FIX iOS: MIME Type corretto ===
      const mimeType = getSupportedMimeType();
      console.log('🎵 MIME Type:', mimeType);

      const options = mimeType ? { 
        mimeType,
        audioBitsPerSecond: 128000 
      } : { audioBitsPerSecond: 128000 };

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      // Handler per i dati audio
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          console.log('📦 Chunk ricevuto:', event.data.size, 'bytes');
          chunksRef.current.push(event.data);
        }
      };

      // Handler quando la registrazione si ferma
      mediaRecorder.onstop = () => {
        console.log('⏹️ Registrazione fermata');
        console.log('📊 Chunks totali:', chunksRef.current.length);
        
        const totalSize = chunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);
        console.log('📏 Dimensione totale:', totalSize, 'bytes');

        if (chunksRef.current.length > 0) {
          // === FIX iOS: Usa MIME Type corretto nel Blob ===
          const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/mp4' });
          console.log('✅ Blob creato:', blob.size, 'bytes', blob.type);

          const url = URL.createObjectURL(blob);
          
          setAudioBlob(blob);
          setAudioUrl(url);
          console.log('🔗 URL creato:', url);
        } else {
          console.error('❌ Nessun chunk audio registrato!');
        }
        
        // Ferma tutti i track dello stream
        streamRef.current?.getTracks().forEach(track => {
          track.stop();
          console.log('🛑 Track fermato:', track.kind);
        });
      };

      // === FIX iOS: timeslice OBBLIGATORIO ===
      // iOS perde dati senza timeslice >= 1000ms
      const timeslice = isIOS() ? 1000 : 100; // 1 secondo per iOS, 100ms per altri
      mediaRecorder.start(timeslice);
      
      console.log('🔴 Registrazione avviata con timeslice:', timeslice, 'ms');
      setIsRecording(true);

      // Timer per mostrare durata
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('❌ Errore avvio registrazione:', error);
      
      // Messaggi di errore user-friendly
      if (error.name === 'NotAllowedError') {
        alert('⚠️ Permessi microfono negati. Vai in Impostazioni > Safari > Microfono e abilita l\'accesso.');
      } else if (error.name === 'NotFoundError') {
        alert('⚠️ Nessun microfono trovato sul dispositivo.');
      } else {
        alert('❌ Errore avvio registrazione: ' + error.message);
      }
      
      // Cleanup in caso di errore
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      throw error;
    }
  }, [isIOS, getAudioConstraints, getSupportedMimeType]);

  // Pausa la registrazione
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(timerRef.current);
    }
  }, []);

  // Riprendi la registrazione
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  }, []);

  // Ferma la registrazione
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

  // Cancella la registrazione
  const cancelRecording = useCallback(() => {
    console.log('🗑️ Cancellazione registrazione');
    
    if (isRecording) {
      stopRecording();
    }
    
    // Pulisci tutto
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    chunksRef.current = [];
  }, [isRecording, stopRecording, audioUrl]);

  // Formatta il tempo per display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    isRecording,
    isPaused,
    recordingTime: formatTime(recordingTime),
    recordingTimeRaw: recordingTime,
    audioBlob,
    audioUrl,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording
  };
}
