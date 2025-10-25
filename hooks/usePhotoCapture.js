// hooks/usePhotoCapture.js
import { useState, useCallback } from 'react';

export function usePhotoCapture() {
  const [photos, setPhotos] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);

  // Cattura foto da input file o camera
  const capturePhoto = useCallback(async (file) => {
    try {
      setIsCapturing(true);

      // Validazione tipo file
      if (!file.type.startsWith('image/')) {
        throw new Error('Il file deve essere un\'immagine');
      }

      // Validazione dimensione (max 10MB)
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        throw new Error('L\'immagine è troppo grande (max 10MB)');
      }

      // Crea preview
      const reader = new FileReader();
      
      return new Promise((resolve, reject) => {
        reader.onload = (e) => {
          const photoData = {
            id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            file: file,
            preview: e.target.result,
            name: file.name,
            size: file.size,
            type: file.type,
            timestamp: new Date().toISOString()
          };

          setPhotos(prev => [...prev, photoData]);
          setIsCapturing(false);
          resolve(photoData);
        };

        reader.onerror = () => {
          setIsCapturing(false);
          reject(new Error('Errore lettura file'));
        };

        reader.readAsDataURL(file);
      });

    } catch (error) {
      setIsCapturing(false);
      console.error('❌ Errore cattura foto:', error);
      throw error;
    }
  }, []);

  // Cattura multiple foto
  const captureMultiplePhotos = useCallback(async (files) => {
    const results = [];
    
    for (const file of Array.from(files)) {
      try {
        const photo = await capturePhoto(file);
        results.push(photo);
      } catch (error) {
        console.error('Errore su file:', file.name, error);
      }
    }
    
    return results;
  }, [capturePhoto]);

  // Rimuovi una foto
  const removePhoto = useCallback((photoId) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  }, []);

  // Pulisci tutte le foto
  const clearPhotos = useCallback(() => {
    setPhotos([]);
  }, []);

  // Comprimi immagine (opzionale, per ridurre dimensioni)
  const compressImage = useCallback(async (file, maxWidth = 1920, quality = 0.8) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Ridimensiona se necessario
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              resolve(new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              }));
            },
            'image/jpeg',
            quality
          );
        };

        img.src = e.target.result;
      };

      reader.readAsDataURL(file);
    });
  }, []);

  // Formatta dimensione file
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return {
    photos,
    isCapturing,
    capturePhoto,
    captureMultiplePhotos,
    removePhoto,
    clearPhotos,
    compressImage,
    formatFileSize,
    totalPhotos: photos.length
  };
}
