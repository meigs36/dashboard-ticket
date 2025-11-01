// components/PWAAudioPlayer.jsx - Player audio ottimizzato per PWA iOS
'use client'

import { useEffect, useRef, useState } from 'react';

export default function PWAAudioPlayer({ src, className = '' }) {
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || 
                              window.navigator.standalone === true;

  // Unlock audio context al mount (necessario per iOS PWA)
  useEffect(() => {
    if (isIOS() && isStandalone() && !isUnlocked) {
      const unlock = async () => {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext();
          }

          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
          }

          setIsUnlocked(true);
          console.log('✅ Audio context sbloccato per PWA iOS');
        } catch (error) {
          console.error('❌ Errore unlock audio:', error);
        }
      };

      // Unlock al primo touch/click
      const handleInteraction = () => {
        unlock();
        document.removeEventListener('touchstart', handleInteraction);
        document.removeEventListener('click', handleInteraction);
      };

      document.addEventListener('touchstart', handleInteraction);
      document.addEventListener('click', handleInteraction);

      return () => {
        document.removeEventListener('touchstart', handleInteraction);
        document.removeEventListener('click', handleInteraction);
      };
    }
  }, [isUnlocked]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      // iOS PWA: Unlock audio context se necessario
      if (isIOS() && isStandalone() && !isUnlocked) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        setIsUnlocked(true);
      }

      if (isPlaying) {
        audio.pause();
      } else {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
      }
    } catch (error) {
      console.error('❌ Errore riproduzione audio:', error);
      
      if (isIOS() && isStandalone()) {
        alert('⚠️ Errore riproduzione audio.\n\nProva:\n1. Tocca lo schermo prima di riprodurre\n2. Oppure apri in Safari invece che dall\'app');
      }
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    audio.currentTime = percentage * duration;
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        playsInline // Importante per iOS!
      />
      
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
          aria-label={isPlaying ? 'Pausa' : 'Play'}
        >
          {isPlaying ? (
            // Pause icon
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            // Play icon
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Progress Bar */}
        <div className="flex-1 flex flex-col gap-1">
          <div
            className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer relative overflow-hidden"
            onClick={handleSeek}
          >
            <div
              className="absolute top-0 left-0 h-full bg-blue-600 transition-all"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Avviso PWA iOS */}
      {isIOS() && isStandalone() && !isUnlocked && (
        <div className="text-xs text-amber-600 dark:text-amber-400">
          💡 Tocca lo schermo per sbloccare l'audio
        </div>
      )}
    </div>
  );
}
