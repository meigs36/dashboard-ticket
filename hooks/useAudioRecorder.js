// hooks/useAudioRecorder.js - FIX iOS PWA COMPLETO
'use client'

import { useState, useRef, useCallback, useEffect } from 'react';

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

  // 🔧 FIX PRINCIPALE: Unlock audio context DOPO aver ottenuto lo stream
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

  // 🎙️ START RECORDING - VERSIONE CORRETTA PER iOS
  const startRecording = useCallback(async () => {
    try {
      console.log('🎙️ Avvio registrazione...');
      console.log('📱 iOS:', isIOS());
      console.log('📱 Standalone:', isStandalone());

      // Reset stato
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
      // Questo non perde la user gesture perché lo stream è già stato autorizzato
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
      
      // Messaggi di errore specifici per iOS
      if (error.name === 'NotAllowedError') {
        if (isIOS() && isStandalone()) {
          alert(
            '⚠️ Permessi microfono necessari!\n\n' +
            'Per registrare in modalità app:\n' +
            '1. Vai in Impostazioni > Safari > Microfono\n' +
            '2. Abilita l\'accesso per questo sito\n' +
            '3. Riapri l\'app dalla Home\n\n' +
            'OPPURE apri l\'app in Safari (non dalla Home)'
          );
        } else if (isIOS()) {
          alert(
            '⚠️ Permessi microfono negati\n\n' +
            'Vai in Impostazioni > Safari > Microfono\n' +
            'e abilita l\'accesso per questo sito'
          );
        } else {
          alert('⚠️ Permessi microfono negati. Controlla le impostazioni del browser.');
        }
      } else if (error.name === 'NotFoundError') {
        alert('⚠️ Nessun microfono trovato sul dispositivo.');
      } else if (error.name === 'NotReadableError') {
        alert(
          '⚠️ Microfono già in uso da un\'altra app.\n\n' +
          'Chiudi altre app che potrebbero usare il microfono e riprova.'
        );
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
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording
  };
}
