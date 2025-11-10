// lib/mediaUpload.js - VERSIONE ULTRA-ROBUSTA
// FIX DEFINITIVO per problemi MIME type su mobile
import { supabase } from './supabase';

/**
 * 🔧 FIX ULTRA-ROBUSTO: Upload file usando approccio diretto
 * Evita completamente i problemi di contentType usando solo il file raw
 */
async function uploadFileToStorage(bucket, filePath, file) {
  try {
    // Crea FormData per upload più sicuro
    const formData = new FormData();
    formData.append('', file);

    // Upload usando fetch diretto al endpoint Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Sessione non valida');
    }

    const projectUrl = supabase.storageUrl.split('/storage/v1')[0];
    const uploadUrl = `${projectUrl}/storage/v1/object/${bucket}/${filePath}`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        // NON includere Content-Type - lascia che il browser lo gestisca automaticamente
      },
      body: file // Invia il file direttamente, NON FormData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Upload failed: ${response.status}`);
    }

    const result = await response.json();
    return { path: result.Key || filePath };

  } catch (error) {
    console.error('❌ Errore upload storage:', error);
    throw error;
  }
}

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
    
    // Determina estensione dal MIME type
    let extension = 'webm';
    let mimeType = audioBlob.type || 'audio/webm';
    
    if (mimeType.includes('mp4')) extension = 'm4a';
    else if (mimeType.includes('mpeg')) extension = 'mp3';
    else if (mimeType.includes('wav')) extension = 'wav';
    
    const fileName = `audio_${interventoId}_${timestamp}.${extension}`;
    const filePath = `${userId}/${interventoId}/${fileName}`;

    console.log('🎙️ Upload audio:', fileName);
    console.log('🎙️ MIME type:', mimeType);
    console.log('🎙️ Size:', audioBlob.size, 'bytes');

    // 1. Upload su Storage usando metodo sicuro
    let uploadData;
    try {
      // Prova prima con il metodo standard Supabase
      const { data, error } = await supabase.storage
        .from('interventi-media')
        .upload(filePath, audioBlob, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;
      uploadData = data;
    } catch (uploadError) {
      console.warn('⚠️ Metodo standard fallito, provo metodo alternativo');
      // Fallback al metodo diretto
      uploadData = await uploadFileToStorage('interventi-media', filePath, audioBlob);
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
        mime_type: mimeType,
        dimensione_bytes: audioBlob.size,
        durata_secondi: null,
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
 * 🔧 FIX ULTRA-ROBUSTO: Gestione MIME type con fallback multipli
 * @param {File} photoFile - File della foto
 * @param {string} interventoId - ID dell'intervento
 * @param {string} userId - ID dell'utente che carica
 * @returns {Promise<Object>} - Dati dell'allegato creato
 */
export async function uploadPhoto(photoFile, interventoId, userId) {
  try {
    const timestamp = Date.now();
    const extension = photoFile.name.split('.').pop().toLowerCase();
    const fileName = `foto_${interventoId}_${timestamp}.${extension}`;
    const filePath = `${userId}/${interventoId}/${fileName}`;

    console.log('📸 ========== UPLOAD FOTO ==========');
    console.log('📸 Nome file:', fileName);
    console.log('📸 Estensione:', extension);
    console.log('📸 photoFile.type:', photoFile.type);
    console.log('📸 photoFile.size:', photoFile.size);
    console.log('📸 photoFile.name:', photoFile.name);

    // Determina MIME type dall'estensione (più affidabile del file.type su mobile)
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'heic': 'image/heic',
      'heif': 'image/heif'
    };

    const mimeType = mimeTypes[extension] || photoFile.type || 'image/jpeg';
    console.log('📸 MIME type finale:', mimeType);

    // 1. Upload su Storage - METODO ULTRA-ROBUSTO
    let uploadData;
    
    try {
      console.log('📸 Tentativo metodo standard Supabase...');
      
      // ⚡ FIX CRITICO: NON passiamo contentType
      // Lasciamo che Supabase lo determini dal file stesso
      const { data, error } = await supabase.storage
        .from('interventi-media')
        .upload(filePath, photoFile, {
          cacheControl: '3600',
          upsert: false
          // ❌ IMPORTANTE: NO contentType qui!
        });

      if (error) {
        console.error('📸 Errore metodo standard:', error);
        throw error;
      }
      
      uploadData = data;
      console.log('✅ Upload standard riuscito');
      
    } catch (standardError) {
      console.warn('⚠️ Metodo standard fallito, provo metodo alternativo');
      console.warn('⚠️ Errore:', standardError.message);
      
      // FALLBACK: Usa fetch diretto
      try {
        uploadData = await uploadFileToStorage('interventi-media', filePath, photoFile);
        console.log('✅ Upload alternativo riuscito');
      } catch (fallbackError) {
        console.error('❌ Anche metodo alternativo fallito:', fallbackError);
        throw new Error(`Upload fallito: ${fallbackError.message}`);
      }
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
        mime_type: mimeType,
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
    console.log('📸 ========== UPLOAD COMPLETATO ==========');

    // 3. Genera URL firmato per accesso
    const { data: urlData } = await supabase.storage
      .from('interventi-media')
      .createSignedUrl(uploadData.path, 3600);

    return {
      ...allegatoData,
      signedUrl: urlData?.signedUrl
    };

  } catch (error) {
    console.error('❌ ERRORE FINALE upload foto:', error);
    console.error('❌ Stack:', error.stack);
    throw error;
  }
}

/**
 * Upload multiplo di foto con gestione errori migliorata
 * @param {File[]} photoFiles - Array di file foto
 * @param {string} interventoId - ID dell'intervento
 * @param {string} userId - ID dell'utente
 * @param {Function} onProgress - Callback per progress (opzionale)
 * @returns {Promise<Object[]>} - Array di allegati creati
 */
export async function uploadMultiplePhotos(photoFiles, interventoId, userId, onProgress = null) {
  const results = [];
  const total = photoFiles.length;

  console.log(`📸 Avvio upload multiplo: ${total} foto`);

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
      console.error(`❌ Errore upload foto ${i + 1}/${total}:`, error);
      // Continua con le altre foto anche se una fallisce
    }
  }

  console.log(`📸 Upload multiplo completato: ${results.length}/${total} successi`);
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
      .order('caricato_il', { ascending: false});

    if (error) throw error;

    // Genera URL firmati per ogni allegato
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
          console.error('❌ Errore generazione URL:', err);
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
