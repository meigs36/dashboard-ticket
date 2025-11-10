import { supabase } from './supabase'

/**
 * Helper functions per query customer portal
 */

// =====================================
// CUSTOMER PROFILE
// =====================================

export async function getCustomerProfile(customerId) {
  try {
    const { data, error } = await supabase
      .from('customer_portal_users')
      .select('*')
      .eq('id', customerId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error getting customer profile:', error)
    return { data: null, error }
  }
}

export async function updateCustomerProfile(customerId, updates) {
  try {
    const { data, error } = await supabase
      .from('customer_portal_users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating customer profile:', error)
    return { data: null, error }
  }
}

// =====================================
// REFERENTI
// =====================================

export async function getCustomerReferenti(customerId) {
  try {
    const { data, error } = await supabase
      .from('customer_referenti')
      .select('*')
      .eq('customer_id', customerId)
      .order('principale', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error getting referenti:', error)
    return { data: null, error }
  }
}

export async function addReferente(customerId, referenteData) {
  try {
    const { data, error } = await supabase
      .from('customer_referenti')
      .insert({
        customer_id: customerId,
        ...referenteData
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error adding referente:', error)
    return { data: null, error }
  }
}

export async function updateReferente(referenteId, updates) {
  try {
    const { data, error } = await supabase
      .from('customer_referenti')
      .update(updates)
      .eq('id', referenteId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating referente:', error)
    return { data: null, error }
  }
}

export async function deleteReferente(referenteId) {
  try {
    const { error } = await supabase
      .from('customer_referenti')
      .delete()
      .eq('id', referenteId)

    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting referente:', error)
    return { error }
  }
}

// =====================================
// MACCHINARI
// =====================================

export async function getCustomerMacchinari(customerId) {
  try {
    const { data, error } = await supabase
      .from('customer_macchinari')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error getting macchinari:', error)
    return { data: null, error }
  }
}

export async function addMacchinario(customerId, macchinarioData) {
  try {
    const { data, error } = await supabase
      .from('customer_macchinari')
      .insert({
        customer_id: customerId,
        ...macchinarioData,
        stato: 'attivo'
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error adding macchinario:', error)
    return { data: null, error }
  }
}

export async function updateMacchinario(macchinarioId, updates) {
  try {
    const { data, error } = await supabase
      .from('customer_macchinari')
      .update(updates)
      .eq('id', macchinarioId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating macchinario:', error)
    return { data: null, error }
  }
}

export async function deleteMacchinario(macchinarioId) {
  try {
    const { error } = await supabase
      .from('customer_macchinari')
      .delete()
      .eq('id', macchinarioId)

    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting macchinario:', error)
    return { error }
  }
}

// =====================================
// DOCUMENTI
// =====================================

export async function getCustomerDocuments(clienteId) {
  try {
    const { data, error } = await supabase
      .from('customer_documents')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('caricato_il', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error getting documents:', error)
    return { data: null, error }
  }
}

export async function uploadDocument(clienteId, file, metadata = {}) {
  try {
    // 1. Upload file a Supabase Storage
    const fileName = `${Date.now()}_${file.name}`
    const filePath = `${clienteId}/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('customer-documents')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    // 2. Crea record in customer_documents
    const { data, error } = await supabase
      .from('customer_documents')
      .insert({
        cliente_id: clienteId,
        tipo_documento: metadata.tipo || 'generico',
        nome_file: file.name,
        nome_originale: file.name,
        percorso_storage: uploadData.path,
        dimensione_file: file.size,
        mime_type: file.type,
        categoria: metadata.categoria || 'altro',
        visibile_cliente: true,
        ...metadata
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error uploading document:', error)
    return { data: null, error }
  }
}

export async function deleteDocument(documentId) {
  try {
    // 1. Get document info
    const { data: doc, error: getError } = await supabase
      .from('customer_documents')
      .select('percorso_storage')
      .eq('id', documentId)
      .single()

    if (getError) throw getError

    // 2. Delete from storage
    if (doc.percorso_storage) {
      const { error: storageError } = await supabase.storage
        .from('customer-documents')
        .remove([doc.percorso_storage])

      if (storageError) {
        console.warn('Storage delete warning:', storageError)
      }
    }

    // 3. Delete from database
    const { error } = await supabase
      .from('customer_documents')
      .delete()
      .eq('id', documentId)

    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting document:', error)
    return { error }
  }
}

export async function getDocumentDownloadUrl(storagePath) {
  try {
    const { data, error } = await supabase.storage
      .from('customer-documents')
      .createSignedUrl(storagePath, 3600) // 1 hour

    if (error) throw error
    return { url: data.signedUrl, error: null }
  } catch (error) {
    console.error('Error getting download URL:', error)
    return { url: null, error }
  }
}

// =====================================
// ONBOARDING STATUS
// =====================================

export async function getOnboardingStatus(customerId) {
  try {
    const { data, error } = await supabase
      .from('customer_onboarding_status')
      .select('*')
      .eq('customer_id', customerId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error getting onboarding status:', error)
    return { data: null, error }
  }
}

export async function isOnboardingComplete(customerId) {
  try {
    const { data, error } = await getOnboardingStatus(customerId)
    
    if (error || !data) return false

    return (
      data.dati_aziendali_completati &&
      data.referenti_completati &&
      data.macchinari_completati &&
      data.documenti_completati
    )
  } catch (error) {
    console.error('Error checking onboarding:', error)
    return false
  }
}

export async function markOnboardingComplete(customerId) {
  try {
    const { data, error } = await supabase
      .from('customer_onboarding_status')
      .upsert({
        customer_id: customerId,
        completato: true,
        completato_il: new Date().toISOString()
      }, {
        onConflict: 'customer_id'
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error marking onboarding complete:', error)
    return { data: null, error }
  }
}

// =====================================
// TICKETS (Read-only per clienti)
// =====================================

export async function getCustomerTickets(clienteId) {
  try {
    const { data, error } = await supabase
      .from('ticket')
      .select('*')
      .eq('id_cliente', clienteId)
      .order('data_apertura', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error getting customer tickets:', error)
    return { data: null, error }
  }
}

export async function getTicketById(ticketId) {
  try {
    const { data, error } = await supabase
      .from('ticket')
      .select('*, clienti(*), macchinari(*)')
      .eq('id', ticketId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error getting ticket:', error)
    return { data: null, error }
  }
}

// =====================================
// STATS & ANALYTICS
// =====================================

export async function getCustomerStats(customerId, clienteId) {
  try {
    // Conta referenti
    const { count: referentiCount } = await supabase
      .from('customer_referenti')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)

    // Conta macchinari
    const { count: macchinariCount } = await supabase
      .from('customer_macchinari')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)

    // Conta documenti
    const { count: documentiCount } = await supabase
      .from('customer_documents')
      .select('*', { count: 'exact', head: true })
      .eq('cliente_id', clienteId)

    // Conta ticket
    const { count: ticketCount } = await supabase
      .from('ticket')
      .select('*', { count: 'exact', head: true })
      .eq('id_cliente', clienteId)
      .neq('stato', 'chiuso')

    return {
      data: {
        referenti: referentiCount || 0,
        macchinari: macchinariCount || 0,
        documenti: documentiCount || 0,
        ticket: ticketCount || 0
      },
      error: null
    }
  } catch (error) {
    console.error('Error getting customer stats:', error)
    return {
      data: { referenti: 0, macchinari: 0, documenti: 0, ticket: 0 },
      error
    }
  }
}
