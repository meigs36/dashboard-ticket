// hooks/useAudioRecorder.js
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

  // Avvia la registrazione
  const startRecording = useCallback(async () => {
    try {
      // Richiedi permessi microfono
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;

      // Configura MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4';
      
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 128000 // 128kbps - buona qualità
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Handler per i dati audio
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handler quando la registrazione si ferma
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        setAudioBlob(blob);
        setAudioUrl(url);
        
        // Ferma tutti i track dello stream
        streamRef.current?.getTracks().forEach(track => track.stop());
      };

      // Avvia registrazione
      mediaRecorder.start(100); // Salva chunk ogni 100ms
      setIsRecording(true);
      setRecordingTime(0);

      // Timer per mostrare durata
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('❌ Errore avvio registrazione:', error);
      
      // Messaggi di errore user-friendly
      if (error.name === 'NotAllowedError') {
        alert('⚠️ Permessi microfono negati. Controlla le impostazioni del browser.');
      } else if (error.name === 'NotFoundError') {
        alert('⚠️ Nessun microfono trovato sul dispositivo.');
      } else {
        alert('❌ Errore avvio registrazione: ' + error.message);
      }
      
      throw error;
    }
  }, []);

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
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      clearInterval(timerRef.current);
    }
  }, [isRecording]);

  // Cancella la registrazione
  const cancelRecording = useCallback(() => {
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
