import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * API Route: POST /api/customer/onboarding
 * 
 * Gestisce il salvataggio completo dei dati onboarding del cliente
 * Include: dati aziendali, referenti, macchinari, documenti
 */
export async function POST(request) {
  try {
    // 1. Parse del body
    const { datiAziendali, referenti, macchinari, documenti } = await request.json()
    
    console.log('📥 Ricevuta richiesta onboarding')
    console.log('Dati Aziendali:', datiAziendali)
    console.log('Referenti:', referenti?.length || 0)
    console.log('Macchinari:', macchinari?.length || 0)
    console.log('Documenti:', documenti?.length || 0)
    
    // 2. Verifica autorizzazione
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.error('❌ Header Authorization mancante')
      return NextResponse.json({ 
        success: false,
        error: 'Non autorizzato - Token mancante' 
      }, { status: 401 })
    }

    // 3. Crea client Supabase con Service Role Key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    // 4. Verifica sessione utente
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      console.error('❌ Sessione non valida:', userError)
      return NextResponse.json({ 
        success: false,
        error: 'Sessione non valida o scaduta' 
      }, { status: 401 })
    }

    console.log('✅ Utente autenticato:', user.id)

    // 5. Ottieni cliente_id dal customer_portal_users
    const { data: customerData, error: customerError } = await supabase
      .from('customer_portal_users')
      .select('cliente_id')
      .eq('id', user.id)
      .single()

    if (customerError || !customerData) {
      console.error('❌ Cliente non trovato:', customerError)
      return NextResponse.json({ 
        success: false,
        error: 'Profilo cliente non trovato' 
      }, { status: 404 })
    }

    const clienteId = customerData.cliente_id
    console.log('✅ Cliente ID:', clienteId)

    // ========================================
    // 6. SALVATAGGIO DATI AZIENDALI
    // ========================================
    console.log('💾 Aggiornamento dati aziendali...')
    
    const { error: clienteError } = await supabase
      .from('clienti')
      .update({
        ...datiAziendali,
        onboarding_completato: true,
        onboarding_completato_il: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', clienteId)

    if (clienteError) {
      console.error('❌ Errore aggiornamento cliente:', clienteError)
      throw new Error(`Errore aggiornamento dati aziendali: ${clienteError.message}`)
    }

    console.log('✅ Dati aziendali salvati')

    // ========================================
    // 7. SALVATAGGIO REFERENTI
    // ========================================
    if (referenti && referenti.length > 0) {
      console.log(`💾 Inserimento ${referenti.length} referenti...`)
      
      const referentiToInsert = referenti.map(ref => ({
        cliente_id: clienteId,
        nome: ref.nome,
        cognome: ref.cognome,
        ruolo: ref.ruolo,
        telefono: ref.telefono,
        email: ref.email,
        principale: ref.principale || false
      }))

      const { error: referentiError } = await supabase
        .from('customer_referenti')
        .insert(referentiToInsert)
      
      if (referentiError) {
        console.error('❌ Errore inserimento referenti:', referentiError)
        throw new Error(`Errore salvataggio referenti: ${referentiError.message}`)
      }

      console.log('✅ Referenti salvati')
    }

    // ========================================
    // 8. SALVATAGGIO MACCHINARI
    // ========================================
    if (macchinari && macchinari.length > 0) {
      console.log(`💾 Inserimento ${macchinari.length} macchinari...`)
      
      const macchinariToInsert = macchinari.map(macc => ({
        cliente_id: clienteId,
        tipo_macchinario: macc.tipo,
        marca: macc.marca,
        modello: macc.modello,
        numero_seriale: macc.numero_seriale,
        data_installazione: macc.data_installazione,
        ubicazione: macc.ubicazione,
        numero_libro: macc.numero_libro,
        garanzia_scadenza: macc.garanzia_scadenza,
        contratto_manutenzione: macc.contratto_manutenzione || false,
        note_tecniche: macc.note_tecniche
      }))

      const { error: macchinariError } = await supabase
        .from('customer_macchinari')
        .insert(macchinariToInsert)
      
      if (macchinariError) {
        console.error('❌ Errore inserimento macchinari:', macchinariError)
        throw new Error(`Errore salvataggio macchinari: ${macchinariError.message}`)
      }

      console.log('✅ Macchinari salvati')
    }

    // ========================================
    // 9. SALVATAGGIO DOCUMENTI
    // ========================================
    if (documenti && documenti.length > 0) {
      console.log(`💾 Collegamento ${documenti.length} documenti...`)
      
      const documentiToInsert = documenti.map(doc => ({
        cliente_id: clienteId,
        nome_file: doc.nome_file,
        tipo_file: doc.tipo_file,
        dimensione: doc.dimensione,
        categoria: doc.categoria,
        storage_path: doc.storage_path,
        caricato_da: 'cliente',
        caricato_il: new Date().toISOString()
      }))

      const { error: documentiError } = await supabase
        .from('customer_documents')
        .insert(documentiToInsert)
      
      if (documentiError) {
        console.error('❌ Errore inserimento documenti:', documentiError)
        throw new Error(`Errore salvataggio documenti: ${documentiError.message}`)
      }

      console.log('✅ Documenti collegati')
    }

    // ========================================
    // 10. PULIZIA BOZZE
    // ========================================
    console.log('🧹 Eliminazione bozze...')
    
    const { error: deleteDraftError } = await supabase
      .from('customer_onboarding_drafts')
      .delete()
      .eq('cliente_id', clienteId)

    if (deleteDraftError) {
      console.warn('⚠️ Errore eliminazione bozze (non critico):', deleteDraftError)
      // Non blocca il processo
    } else {
      console.log('✅ Bozze eliminate')
    }

    // ========================================
    // 11. RISPOSTA SUCCESSO
    // ========================================
    console.log('🎉 Onboarding completato con successo!')
    
    return NextResponse.json({ 
      success: true,
      message: 'Onboarding completato con successo',
      data: {
        cliente_id: clienteId,
        referenti_salvati: referenti?.length || 0,
        macchinari_salvati: macchinari?.length || 0,
        documenti_salvati: documenti?.length || 0
      }
    })

  } catch (error) {
    // ========================================
    // ERROR HANDLING
    // ========================================
    console.error('❌ Errore API onboarding:', error)
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Errore interno del server',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

/**
 * Gestione richieste non supportate
 */
export async function GET() {
  return NextResponse.json({ 
    error: 'Metodo non supportato. Usa POST.' 
  }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ 
    error: 'Metodo non supportato. Usa POST.' 
  }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ 
    error: 'Metodo non supportato. Usa POST.' 
  }, { status: 405 })
}
