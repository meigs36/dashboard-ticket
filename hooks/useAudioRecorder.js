// hooks/useAudioRecorder.js - FIX iOS PWA STANDALONE
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

  // === FIX iOS PWA: Rileva standalone mode ===
  const isStandalone = useCallback(() => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }, []);

  const isIOS = useCallback(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }, []);

  // === FIX iOS PWA: Unlock audio context ===
  useEffect(() => {
    if (isIOS() && isStandalone()) {
      console.log('📱 PWA iOS Standalone mode - Unlock audio context');
      unlockAudioContext();
    }
  }, []);

  async function unlockAudioContext() {
    try {
      // Crea audio context se non esiste
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
      }

      // Resume se sospeso
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('✅ Audio context sbloccato');
      }
    } catch (error) {
      console.error('❌ Errore unlock audio context:', error);
    }
  }

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

  // === FIX iOS PWA: Richiedi permessi esplicitamente ===
  const requestPermissions = useCallback(async () => {
    if (!isIOS() || !isStandalone()) {
      return true; // Non serve in altri contesti
    }

    console.log('🔐 PWA iOS: Richiesta permessi esplicita');

    try {
      // Test se i permessi sono già stati dati
      const constraints = getAudioConstraints();
      const testStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Se arriviamo qui, i permessi ci sono
      testStream.getTracks().forEach(track => track.stop());
      console.log('✅ Permessi microfono già concessi');
      return true;
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        console.error('❌ Permessi microfono negati');
        alert('⚠️ Permessi microfono richiesti!\n\nPer registrare audio in modalità app:\n1. Vai in Impostazioni > Safari > Microfono\n2. Abilita accesso per questo sito\n3. Riapri l\'app');
        return false;
      }
      throw error;
    }
  }, [isIOS, isStandalone, getAudioConstraints]);

  const startRecording = useCallback(async () => {
    try {
      console.log('🎙️ Avvio registrazione...');
      console.log('📱 iOS:', isIOS());
      console.log('📱 Standalone:', isStandalone());

      // === FIX iOS PWA: Unlock audio prima di registrare ===
      if (isIOS() && isStandalone()) {
        await unlockAudioContext();
        
        // Richiedi permessi esplicitamente
        const hasPermissions = await requestPermissions();
        if (!hasPermissions) {
          return;
        }
      }

      chunksRef.current = [];
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioUrl(null);

      const constraints = getAudioConstraints();
      console.log('🔧 Constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      console.log('✅ Stream ottenuto:', stream.getAudioTracks()[0].getSettings());

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
        
        streamRef.current?.getTracks().forEach(track => {
          track.stop();
          console.log('🛑 Track fermato:', track.kind);
        });
      };

      const timeslice = isIOS() ? 1000 : 100;
      mediaRecorder.start(timeslice);
      
      console.log('🔴 Registrazione avviata con timeslice:', timeslice, 'ms');
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('❌ Errore avvio registrazione:', error);
      
      if (error.name === 'NotAllowedError') {
        if (isIOS() && isStandalone()) {
          alert('⚠️ Permessi microfono non disponibili in modalità app.\n\nSoluzione:\n1. Apri l\'app in Safari (non dalla Home)\n2. Oppure vai in Impostazioni iOS > Safari > Microfono');
        } else {
          alert('⚠️ Permessi microfono negati. Vai in Impostazioni > Safari > Microfono e abilita l\'accesso.');
        }
      } else if (error.name === 'NotFoundError') {
        alert('⚠️ Nessun microfono trovato sul dispositivo.');
      } else {
        alert('❌ Errore avvio registrazione: ' + error.message);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      throw error;
    }
  }, [isIOS, isStandalone, getAudioConstraints, getSupportedMimeType, requestPermissions]);

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
