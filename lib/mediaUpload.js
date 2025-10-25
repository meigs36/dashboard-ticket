// lib/mediaUpload.js
import { supabase } from './supabase';

/**
 * Upload di un file audio su Supabase Storage
 * @param {Blob} audioBlob - Blob del file audio
 * @param {string} interventoId - ID dell'intervento
 * @param {string} userId - ID dell'utente che carica
 * @returns {Promise<Object>} - Dati dell'allegato creato
 */
export async function uploadAudio(audioBlob, interventoId, userId) {
  try {
    const timestamp = Date.now();
    const fileName = `audio_${interventoId}_${timestamp}.webm`;
    const filePath = `${userId}/${interventoId}/${fileName}`;

    console.log('🎙️ Upload audio:', fileName);

    // 1. Upload su Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('interventi-media')
      .upload(filePath, audioBlob, {
        contentType: audioBlob.type || 'audio/webm',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Errore upload storage:', uploadError);
      throw uploadError;
    }

    console.log('✅ Audio caricato su storage:', uploadData.path);

    // 2. Crea record in database
    const { data: allegatoData, error: dbError } = await supabase
      .from('interventi_allegati')
      .insert({
        intervento_id: interventoId,
        tipo: 'audio',
        nome_file: fileName,
        storage_path: uploadData.path,
        storage_bucket: 'interventi-media',
        mime_type: audioBlob.type || 'audio/webm',
        dimensione_bytes: audioBlob.size,
        durata_secondi: null, // Calcolato dopo se necessario
        caricato_da: userId,
        trascrizione_stato: 'pending'
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Errore inserimento DB:', dbError);
      
      // Rollback: elimina file da storage
      await supabase.storage
        .from('interventi-media')
        .remove([uploadData.path]);
      
      throw dbError;
    }

    console.log('✅ Record allegato creato:', allegatoData);

    // 3. Genera URL firmato per accesso (valido 1 ora)
    const { data: urlData } = await supabase.storage
      .from('interventi-media')
      .createSignedUrl(uploadData.path, 3600);

    return {
      ...allegatoData,
      signedUrl: urlData?.signedUrl
    };

  } catch (error) {
    console.error('❌ Errore upload audio:', error);
    throw error;
  }
}

/**
 * Upload di una foto su Supabase Storage
 * @param {File} photoFile - File della foto
 * @param {string} interventoId - ID dell'intervento
 * @param {string} userId - ID dell'utente che carica
 * @returns {Promise<Object>} - Dati dell'allegato creato
 */
export async function uploadPhoto(photoFile, interventoId, userId) {
  try {
    const timestamp = Date.now();
    const extension = photoFile.name.split('.').pop();
    const fileName = `foto_${interventoId}_${timestamp}.${extension}`;
    const filePath = `${userId}/${interventoId}/${fileName}`;

    console.log('📸 Upload foto:', fileName);

    // 1. Upload su Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('interventi-media')
      .upload(filePath, photoFile, {
        contentType: photoFile.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Errore upload storage:', uploadError);
      throw uploadError;
    }

    console.log('✅ Foto caricata su storage:', uploadData.path);

    // 2. Crea record in database
    const { data: allegatoData, error: dbError } = await supabase
      .from('interventi_allegati')
      .insert({
        intervento_id: interventoId,
        tipo: 'foto',
        nome_file: fileName,
        storage_path: uploadData.path,
        storage_bucket: 'interventi-media',
        mime_type: photoFile.type,
        dimensione_bytes: photoFile.size,
        caricato_da: userId
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Errore inserimento DB:', dbError);
      
      // Rollback: elimina file da storage
      await supabase.storage
        .from('interventi-media')
        .remove([uploadData.path]);
      
      throw dbError;
    }

    console.log('✅ Record allegato creato:', allegatoData);

    // 3. Genera URL pubblico per accesso
    const { data: urlData } = await supabase.storage
      .from('interventi-media')
      .createSignedUrl(uploadData.path, 3600);

    return {
      ...allegatoData,
      signedUrl: urlData?.signedUrl
    };

  } catch (error) {
    console.error('❌ Errore upload foto:', error);
    throw error;
  }
}

/**
 * Upload multiplo di foto
 * @param {File[]} photoFiles - Array di file foto
 * @param {string} interventoId - ID dell'intervento
 * @param {string} userId - ID dell'utente
 * @param {Function} onProgress - Callback per progress (opzionale)
 * @returns {Promise<Object[]>} - Array di allegati creati
 */
export async function uploadMultiplePhotos(photoFiles, interventoId, userId, onProgress = null) {
  const results = [];
  const total = photoFiles.length;

  for (let i = 0; i < total; i++) {
    try {
      const result = await uploadPhoto(photoFiles[i], interventoId, userId);
      results.push({ success: true, data: result });
      
      if (onProgress) {
        onProgress(i + 1, total);
      }
    } catch (error) {
      results.push({ 
        success: false, 
        error: error.message,
        fileName: photoFiles[i].name 
      });
    }
  }

  return results;
}

/**
 * Carica allegati di un intervento
 * @param {string} interventoId - ID dell'intervento
 * @returns {Promise<Object[]>} - Array di allegati con URL firmati
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

    // Genera URL firmati per ogni allegato
    const allegatiConUrl = await Promise.all(
      data.map(async (allegato) => {
        const { data: urlData } = await supabase.storage
          .from('interventi-media')
          .createSignedUrl(allegato.storage_path, 3600);

        return {
          ...allegato,
          signedUrl: urlData?.signedUrl
        };
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
 * @param {string} allegatoId - ID dell'allegato
 * @returns {Promise<void>}
 */
export async function deleteAllegato(allegatoId) {
  try {
    // 1. Recupera info allegato
    const { data: allegato, error: fetchError } = await supabase
      .from('interventi_allegati')
      .select('storage_path, storage_bucket')
      .eq('id', allegatoId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Elimina da storage
    const { error: storageError } = await supabase.storage
      .from(allegato.storage_bucket)
      .remove([allegato.storage_path]);

    if (storageError) {
      console.warn('⚠️ Errore eliminazione storage:', storageError);
    }

    // 3. Elimina record da database
    const { error: dbError } = await supabase
      .from('interventi_allegati')
      .delete()
      .eq('id', allegatoId);

    if (dbError) throw dbError;

    console.log('✅ Allegato eliminato:', allegatoId);

  } catch (error) {
    console.error('❌ Errore eliminazione allegato:', error);
    throw error;
  }
}

/**
 * Formatta dimensione file in modo leggibile
 * @param {number} bytes - Dimensione in bytes
 * @returns {string} - Dimensione formattata
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Formatta durata audio in mm:ss
 * @param {number} seconds - Durata in secondi
 * @returns {string} - Durata formattata
 */
export function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
