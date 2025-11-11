// components/SafeImage.jsx - VERSIONE CORRETTA CON GESTIONE ERRORI
import React, { useState } from 'react'

export default function SafeImage({ 
  src, 
  alt = '', 
  className = '', 
  fallbackClassName = '',
  onClick 
}) {
  const [error, setError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const handleLoad = () => {
    console.log('✅ SafeImage caricata:', src)
    setIsLoading(false)
    setError(false)
  }

  const handleError = (e) => {
    console.error('❌ SafeImage errore:', src)
    setIsLoading(false)
    setError(true)
    // Previeni propagazione dell'errore
    e.stopPropagation()
  }

  // Se c'è un errore, mostra solo il fallback
  if (error) {
    return (
      <div className={fallbackClassName || 'w-full h-full flex items-center justify-center bg-gray-100'}>
        <div className="text-center p-2">
          <p className="text-xs text-red-600">❌ Errore caricamento immagine</p>
        </div>
      </div>
    )
  }

  // Durante il caricamento, mostra spinner
  if (isLoading) {
    return (
      <>
        <div className={fallbackClassName || 'w-full h-full flex items-center justify-center bg-gray-100'}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        {/* Immagine nascosta che si carica in background */}
        <img
          src={src}
          alt={alt}
          style={{ display: 'none' }}
          onLoad={handleLoad}
          onError={handleError}
        />
      </>
    )
  }

  // Quando è caricata, mostra l'immagine
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={handleError}
    />
  )
}
