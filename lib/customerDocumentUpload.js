// lib/customerDocumentUpload.js
// Versione adattata allo schema database ESISTENTE
import { supabase } from './supabase';
import DocumentUploadWizard from '@/components/DocumentUploadWizard';

<DocumentUploadWizard 
  clienteId={clienteId}
  allowMultiple={true}
/>

/**
 * Upload documento onboarding cliente
 * USO SCHEMA ESISTENTE con colonne:
 * - tipo (principale)
 * - categoria (secondario per onboarding)
 * - data_scadenza (non 'scadenza')
 * - note_interne (non 'note')
 * - stato: 'disponibile'/'pending'/'approved'/'rejected'
 */
export async function uploadCustomerDocument(file, clienteId, tipoCategoria, sottocategoria = null, metadata = {}) {
  try {
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${tipoCategoria}_${timestamp}.${extension}`;
    
    // Path: {cliente_id}/{tipo}/{filename}
    const filePath = `${clienteId}/${tipoCategoria}/${fileName}`;

    console.log('📄 Upload documento:', fileName);

    // 1. Upload su Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('customer-documents')
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Errore upload storage:', uploadError);
      throw uploadError;
    }

    console.log('✅ Documento caricato su storage:', uploadData.path);

    // 2. Crea record in database CON SCHEMA REALE
    const { data: documentData, error: dbError } = await supabase
      .from('customer_documents')
      .insert({
        cliente_id: clienteId,
        tipo: tipoCategoria, // Campo principale
        categoria: tipoCategoria, // Duplicato per compatibilità
        sottocategoria: sottocategoria,
        nome_file: fileName,
        nome_originale: sanitizedName,
        storage_path: uploadData.path,
        storage_bucket: 'customer-documents',
        mime_type: file.type,
        dimensione_bytes: file.size,
        stato: 'pending', // pending fino a validazione
        visibile_cliente: true,
        obbligatorio: metadata.obbligatorio || false,
        data_scadenza: metadata.scadenza || null, // NOME CORRETTO
        note_interne: metadata.note || null, // NOME CORRETTO
        caricato_da: null // Null = caricato dal cliente
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Errore inserimento DB:', dbError);
      
      // Rollback: elimina file da storage
      await supabase.storage
        .from('customer-documents')
        .remove([uploadData.path]);
      
      throw dbError;
    }

    console.log('✅ Record documento creato:', documentData);

    // 3. Genera URL firmato
    const { data: urlData } = await supabase.storage
      .from('customer-documents')
      .createSignedUrl(uploadData.path, 3600);

    return {
      ...documentData,
      signedUrl: urlData?.signedUrl
    };

  } catch (error) {
    console.error('❌ Errore upload documento:', error);
    throw error;
  }
}

/**
 * Upload multiplo documenti
 */
export async function uploadMultipleDocuments(files, clienteId, tipoCategoria, onProgress = null) {
  const results = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    try {
      const result = await uploadCustomerDocument(files[i], clienteId, tipoCategoria);
      results.push({ success: true, data: result });
      
      if (onProgress) {
        onProgress(i + 1, total);
      }
    } catch (error) {
      results.push({ 
        success: false, 
        error: error.message,
        fileName: files[i].name 
      });
    }
  }

  return results;
}

/**
 * Carica documenti del cliente
 */
export async function loadCustomerDocuments(clienteId, tipo = null) {
  try {
    let query = supabase
      .from('customer_documents')
      .select(`
        *,
        validato_da_utente:validato_da(nome, cognome)
      `)
      .eq('cliente_id', clienteId)
      .order('caricato_il', { ascending: false });

    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Genera URL firmati
    const documentiConUrl = await Promise.all(
      data.map(async (doc) => {
        const { data: urlData } = await supabase.storage
          .from('customer-documents')
          .createSignedUrl(doc.storage_path, 3600);

        return {
          ...doc,
          signedUrl: urlData?.signedUrl
        };
      })
    );

    return documentiConUrl;

  } catch (error) {
    console.error('❌ Errore caricamento documenti:', error);
    throw error;
  }
}

/**
 * Elimina documento
 */
export async function deleteCustomerDocument(documentId) {
  try {
    const { data: document, error: fetchError } = await supabase
      .from('customer_documents')
      .select('storage_path, storage_bucket')
      .eq('id', documentId)
      .single();

    if (fetchError) throw fetchError;

    // Elimina da storage
    const { error: storageError } = await supabase.storage
      .from(document.storage_bucket)
      .remove([document.storage_path]);

    if (storageError) {
      console.warn('⚠️ Errore eliminazione storage:', storageError);
    }

    // Elimina da database
    const { error: dbError } = await supabase
      .from('customer_documents')
      .delete()
      .eq('id', documentId);

    if (dbError) throw dbError;

    console.log('✅ Documento eliminato:', documentId);

  } catch (error) {
    console.error('❌ Errore eliminazione documento:', error);
    throw error;
  }
}

/**
 * Valida documento
 */
export async function validateDocument(documentId, stato, userId, note = null) {
  try {
    const { data, error } = await supabase
      .from('customer_documents')
      .update({
        stato: stato, // 'approved' o 'rejected'
        validato_da: userId,
        validato_il: new Date().toISOString(),
        note_validazione: note // NOME CORRETTO
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Documento validato:', data);
    return data;

  } catch (error) {
    console.error('❌ Errore validazione documento:', error);
    throw error;
  }
}

/**
 * Verifica completezza documenti onboarding
 */
export async function checkOnboardingDocumentsStatus(clienteId) {
  try {
    // Categorie obbligatorie (usa 'tipo' o 'categoria')
    const requiredTypes = ['contratto', 'identita'];
    
    const { data: documents, error } = await supabase
      .from('customer_documents')
      .select('tipo, categoria, stato')
      .eq('cliente_id', clienteId);

    if (error) throw error;

    // Documenti approvati (stato può essere 'disponibile' o 'approved')
    const approvedDocs = documents.filter(doc => 
      doc.stato === 'disponibile' || doc.stato === 'approved'
    );

    const approvedTypes = [...new Set(
      approvedDocs.map(doc => doc.tipo || doc.categoria)
    )];

    const missingTypes = requiredTypes.filter(
      type => !approvedTypes.includes(type)
    );

    const isComplete = missingTypes.length === 0;

    return {
      isComplete,
      requiredTypes,
      approvedTypes,
      missingTypes,
      totalDocuments: documents.length,
      approvedDocuments: approvedDocs.length,
      pendingDocuments: documents.filter(d => d.stato === 'pending').length,
      rejectedDocuments: documents.filter(d => d.stato === 'rejected').length
    };

  } catch (error) {
    console.error('❌ Errore verifica completezza:', error);
    throw error;
  }
}

/**
 * Valida file
 */
export function validateDocumentFile(file) {
  const maxSize = 10 * 1024 * 1024; // 10 MB
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File troppo grande. Massimo ${formatFileSize(maxSize)}`
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo file non supportato. Usa PDF, JPG, PNG, WEBP o DOCX'
    };
  }

  return { valid: true, error: null };
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
 * Icona per tipo documento
 */
export function getDocumentIcon(mimeType) {
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('word')) return '📝';
  return '📎';
}

/**
 * Badge stato documento
 * ADATTATO ALLO SCHEMA REALE: disponibile/pending/approved/rejected
 */
export function getDocumentStatusBadge(stato) {
  const badges = {
    disponibile: { color: 'bg-green-100 text-green-800', label: 'Disponibile' },
    pending: { color: 'bg-yellow-100 text-yellow-800', label: 'In Attesa' },
    approved: { color: 'bg-green-100 text-green-800', label: 'Approvato' },
    rejected: { color: 'bg-red-100 text-red-800', label: 'Rifiutato' }
  };

  return badges[stato] || badges.pending;
}
