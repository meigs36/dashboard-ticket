// lib/mediaUpload.js - VERSIONE FINALE SEMPLIFICATA
import { supabase } from './supabase';

/**
 * 🔧 FIX DEFINITIVO: Crea nuovo Blob con MIME type corretto
 * Questo evita tutti i problemi di contentType
 */
function createCleanBlob(file) {
  // Determina MIME type corretto dall'estensione
  const extension = file.name.split('.').pop().toLowerCase();
  
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'heic': 'image/heic',
    'heif': 'image/heif',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4',
    'ogg': 'audio/ogg',
    'webm': 'audio/webm'
  };

  const correctMimeType = mimeTypes[extension] || file.type || 'application/octet-stream';
  
  console.log('🔧 Creazione blob pulito:');
  console.log('  - File originale type:', file.type);
  console.log('  - Estensione:', extension);
  console.log('  - MIME type corretto:', correctMimeType);

  // Crea un nuovo Blob con il MIME type corretto
  return new Blob([file], { type: correctMimeType });
}

/**
 * Upload di un file audio su Supabase Storage
 */
export async function uploadAudio(audioBlob, interventoId, userId) {
  try {
    const timestamp = Date.now();
    
    // Determina estensione dal MIME type
    let extension = 'webm';
    let mimeType = audioBlob.type || 'audio/webm';
    
    if (mimeType.includes('mp4')) extension = 'm4a';
    else if (mimeType.includes('mpeg')) extension = 'mp3';
    else if (mimeType.includes('wav')) extension = 'wav';
    
    const fileName = `audio_${interventoId}_${timestamp}.${extension}`;
    const filePath = `${userId}/${interventoId}/${fileName}`;

    console.log('🎙️ ========== UPLOAD AUDIO ==========');
    console.log('🎙️ Nome file:', fileName);
    console.log('🎙️ MIME type:', mimeType);
    console.log('🎙️ Size:', audioBlob.size, 'bytes');

    // Upload diretto senza opzioni contentType
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('interventi-media')
      .upload(filePath, audioBlob, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Errore upload storage:', uploadError);
      throw uploadError;
    }

    console.log('✅ Audio caricato:', uploadData.path);

    // Crea record in database
    const { data: allegatoData, error: dbError } = await supabase
      .from('interventi_allegati')
      .insert({
        intervento_id: interventoId,
        tipo: 'audio',
        nome_file: fileName,
        storage_path: uploadData.path,
        storage_bucket: 'interventi-media',
        mime_type: mimeType,
        dimensione_bytes: audioBlob.size,
        durata_secondi: null,
        caricato_da: userId,
        trascrizione_stato: 'pending'
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Errore DB:', dbError);
      await supabase.storage.from('interventi-media').remove([uploadData.path]);
      throw dbError;
    }

    console.log('✅ Record creato:', allegatoData.id);

    // Genera URL firmato
    const { data: urlData } = await supabase.storage
      .from('interventi-media')
      .createSignedUrl(uploadData.path, 3600);

    return {
      ...allegatoData,
      signedUrl: urlData?.signedUrl
    };

  } catch (error) {
    console.error('❌ ERRORE upload audio:', error);
    throw error;
  }
}

/**
 * Upload di una foto su Supabase Storage
 * 🔧 FIX DEFINITIVO: Crea blob pulito prima dell'upload
 */
export async function uploadPhoto(photoFile, interventoId, userId) {
  try {
    const timestamp = Date.now();
    const extension = photoFile.name.split('.').pop().toLowerCase();
    const fileName = `foto_${interventoId}_${timestamp}.${extension}`;
    const filePath = `${userId}/${interventoId}/${fileName}`;

    console.log('📸 ========== UPLOAD FOTO ==========');
    console.log('📸 Nome file:', fileName);
    console.log('📸 File originale:', {
      name: photoFile.name,
      type: photoFile.type,
      size: photoFile.size
    });

    // 🔧 FIX CRITICO: Crea blob pulito con MIME type corretto
    const cleanBlob = createCleanBlob(photoFile);
    console.log('📸 Blob pulito creato:', {
      type: cleanBlob.type,
      size: cleanBlob.size
    });

    // Upload usando il blob pulito - SENZA contentType
    console.log('📸 Avvio upload...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('interventi-media')
      .upload(filePath, cleanBlob, {
        cacheControl: '3600',
        upsert: false
        // ❌ NO contentType - Supabase lo prende dal blob
      });

    if (uploadError) {
      console.error('❌ Errore upload:', uploadError);
      throw uploadError;
    }

    console.log('✅ Foto caricata:', uploadData.path);

    // Crea record in database
    const { data: allegatoData, error: dbError } = await supabase
      .from('interventi_allegati')
      .insert({
        intervento_id: interventoId,
        tipo: 'foto',
        nome_file: fileName,
        storage_path: uploadData.path,
        storage_bucket: 'interventi-media',
        mime_type: cleanBlob.type,
        dimensione_bytes: cleanBlob.size,
        caricato_da: userId
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Errore DB:', dbError);
      await supabase.storage.from('interventi-media').remove([uploadData.path]);
      throw dbError;
    }

    console.log('✅ Record creato:', allegatoData.id);
    console.log('📸 ========== UPLOAD COMPLETATO ==========');

    // Genera URL firmato
    const { data: urlData } = await supabase.storage
      .from('interventi-media')
      .createSignedUrl(uploadData.path, 3600);

    return {
      ...allegatoData,
      signedUrl: urlData?.signedUrl
    };

  } catch (error) {
    console.error('❌ ERRORE FINALE upload foto:', error);
    throw error;
  }
}

/**
 * Upload multiplo di foto
 */
export async function uploadMultiplePhotos(photoFiles, interventoId, userId, onProgress = null) {
  const results = [];
  const total = photoFiles.length;

  console.log(`📸 Upload multiplo: ${total} foto`);

  for (let i = 0; i < total; i++) {
    try {
      console.log(`📸 Upload foto ${i + 1}/${total}`);
      const result = await uploadPhoto(photoFiles[i], interventoId, userId);
      results.push(result);
      
      if (onProgress) {
        onProgress(i + 1, total);
      }
      
      console.log(`✅ Foto ${i + 1}/${total} completata`);
    } catch (error) {
      console.error(`❌ Errore foto ${i + 1}:`, error);
      // Continua con le altre
    }
  }

  console.log(`📸 Completato: ${results.length}/${total} successi`);
  return results;
}

/**
 * Carica allegati di un intervento
 */
export async function loadInterventoAllegati(interventoId) {
  try {
    const { data, error } = await supabase
      .from('interventi_allegati')
      .select(`
        *,
        caricato_da_utente:caricato_da(nome, cognome)
      `)
      .eq('intervento_id', interventoId)
      .order('caricato_il', { ascending: false });

    if (error) throw error;

    // Genera URL firmati
    const allegatiConUrl = await Promise.all(
      (data || []).map(async (allegato) => {
        try {
          const { data: urlData } = await supabase.storage
            .from(allegato.storage_bucket || 'interventi-media')
            .createSignedUrl(allegato.storage_path, 3600);

          return {
            ...allegato,
            signedUrl: urlData?.signedUrl
          };
        } catch (err) {
          console.error('❌ Errore URL:', err);
          return { ...allegato, signedUrl: null };
        }
      })
    );

    return allegatiConUrl;

  } catch (error) {
    console.error('❌ Errore caricamento allegati:', error);
    throw error;
  }
}

/**
 * Elimina un allegato
 */
export async function deleteAllegato(allegatoId) {
  try {
    const { data: allegato, error: fetchError } = await supabase
      .from('interventi_allegati')
      .select('storage_path, storage_bucket')
      .eq('id', allegatoId)
      .single();

    if (fetchError) throw fetchError;

    const { error: storageError } = await supabase.storage
      .from(allegato.storage_bucket)
      .remove([allegato.storage_path]);

    if (storageError) {
      console.warn('⚠️ Errore storage:', storageError);
    }

    const { error: dbError } = await supabase
      .from('interventi_allegati')
      .delete()
      .eq('id', allegatoId);

    if (dbError) throw dbError;

    console.log('✅ Allegato eliminato:', allegatoId);

  } catch (error) {
    console.error('❌ Errore eliminazione:', error);
    throw error;
  }
}

/**
 * Formatta dimensione file
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Formatta durata audio
 */
export function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
