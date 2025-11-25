// app/api/customer/onboarding/complete/route.js
// Endpoint per completare l'onboarding del cliente con firma digitale

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      )
    }

    // Parse body
    const wizardData = await request.json()
    console.log('📥 Ricevuti dati onboarding per cliente:', user.id)

    // Raccogli IP address per firma (server-side è più affidabile)
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : 
                      request.headers.get('x-real-ip') || null

    // ==================== 1. AGGIORNA/CREA CLIENTE ====================
    
    console.log('💾 Step 1: Salvataggio dati aziendali...')
    
    // Cerca se cliente esiste già (potrebbe essere già nel DB da migrazioni precedenti)
    const { data: clienteEsistente } = await supabase
      .from('clienti')
      .select('id')
      .or(`email_principale.eq.${wizardData.datiAziendali.email},email_amministrazione.eq.${wizardData.datiAziendali.email_amministrazione}`)
      .single()

    let clienteId = clienteEsistente?.id || user.id

    // Prepara dati cliente per il database
    const clienteData = {
      ragione_sociale: wizardData.datiAziendali.ragione_sociale,
      partita_iva: wizardData.datiAziendali.partita_iva,
      codice_fiscale: wizardData.datiAziendali.codice_fiscale,
      via: wizardData.datiAziendali.indirizzo,
      citta: wizardData.datiAziendali.citta,
      cap: wizardData.datiAziendali.cap,
      provincia: wizardData.datiAziendali.provincia,
      telefono_principale: wizardData.datiAziendali.telefono,
      email_principale: wizardData.datiAziendali.email,
      email_pec: wizardData.datiAziendali.pec,
      email_amministrazione: wizardData.datiAziendali.email_amministrazione,
      sito_web: wizardData.datiAziendali.sito_web,
      note: wizardData.datiAziendali.note,
      onboarding_completato: true,
      onboarding_completato_il: new Date().toISOString()
    }

    // Upsert cliente
    const { error: clienteError } = await supabase
      .from('clienti')
      .upsert({
        id: clienteId,
        ...clienteData
      })

    if (clienteError) {
      console.error('❌ Errore salvataggio cliente:', clienteError)
      throw new Error('Errore salvataggio dati aziendali: ' + clienteError.message)
    }

    console.log('✅ Dati aziendali salvati')

    // ==================== 2. SALVA REFERENTI ====================
    
    console.log('💾 Step 2: Salvataggio referenti...')
    
    // Elimina referenti esistenti (se update)
    await supabase
      .from('customer_referenti')
      .delete()
      .eq('cliente_id', clienteId)

    // Inserisci nuovi referenti
    if (wizardData.referenti && wizardData.referenti.length > 0) {
      const referentiToInsert = wizardData.referenti
        .filter(ref => ref.nome && ref.cognome) // Solo referenti completi
        .map(ref => ({
          cliente_id: clienteId,
          nome: ref.nome,
          cognome: ref.cognome,
          ruolo: ref.ruolo,
          telefono: ref.telefono,
          email: ref.email,
          principale: ref.principale,
          attivo: true
        }))

      if (referentiToInsert.length > 0) {
        const { error: referentiError } = await supabase
          .from('customer_referenti')
          .insert(referentiToInsert)

        if (referentiError) {
          console.error('❌ Errore salvataggio referenti:', referentiError)
          throw new Error('Errore salvataggio referenti: ' + referentiError.message)
        }

        console.log(`✅ ${referentiToInsert.length} referenti salvati`)
      }
    }

    // ==================== 3. SALVA MACCHINARI ====================
    
    console.log('💾 Step 3: Salvataggio macchinari...')
    
    // Elimina macchinari esistenti (se update)
    await supabase
      .from('macchinari')
      .delete()
      .eq('id_cliente', clienteId)

    // Inserisci nuovi macchinari
    if (wizardData.macchinari && wizardData.macchinari.length > 0) {
      const macchinariToInsert = wizardData.macchinari
        .filter(macc => macc.tipo && macc.marca) // Solo macchinari completi
        .map(macc => ({
          id_cliente: clienteId,
          tipo_macchinario: macc.tipo,
          marca: macc.marca,
          modello: macc.modello,
          numero_seriale: macc.numero_seriale,
          data_installazione: macc.data_installazione || null,
          ubicazione_specifica: macc.ubicazione,
          numero_libro: macc.numero_libro,
          garanzia_scadenza: macc.garanzia_scadenza || null,
          contratto_manutenzione: macc.contratto_manutenzione ? 'attivo' : 'inattivo',
          note_tecniche: macc.note_tecniche,
          stato: 'attivo'
        }))

      if (macchinariToInsert.length > 0) {
        const { error: macchinariError } = await supabase
          .from('macchinari')
          .insert(macchinariToInsert)

        if (macchinariError) {
          console.error('❌ Errore salvataggio macchinari:', macchinariError)
          throw new Error('Errore salvataggio macchinari: ' + macchinariError.message)
        }

        console.log(`✅ ${macchinariToInsert.length} macchinari salvati`)
      }
    }

    // ==================== 4. SALVA DOCUMENTI ====================
    
    console.log('💾 Step 4: Collegamento documenti...')
    
    // I documenti sono già stati caricati su Storage dal wizard
    // Qui dobbiamo solo collegarli alla tabella customer_documents
    if (wizardData.documenti && wizardData.documenti.length > 0) {
      const documentiToInsert = wizardData.documenti.map(doc => ({
        cliente_id: clienteId,
        nome_file: doc.nome_file,
        tipo_file: doc.tipo_file,
        dimensione: doc.dimensione,
        percorso: doc.percorso,
        categoria: doc.categoria,
        caricato_da: 'cliente',
        caricato_il: new Date().toISOString()
      }))

      const { error: documentiError } = await supabase
        .from('customer_documents')
        .insert(documentiToInsert)

      if (documentiError) {
        console.error('❌ Errore collegamento documenti:', documentiError)
        // Non blocchiamo per errori sui documenti
        console.warn('⚠️ Documenti non collegati, ma onboarding continua')
      } else {
        console.log(`✅ ${documentiToInsert.length} documenti collegati`)
      }
    }

    // ==================== 5. SALVA FIRMA DIGITALE ====================
    
    console.log('💾 Step 5: Salvataggio firma digitale...')
    
    if (wizardData.firma) {
      // Aggiungi IP address raccolto server-side al certificato
      const certificatoCompleto = {
        ...wizardData.firma.certificato_completo,
        firma: {
          ...wizardData.firma.certificato_completo.firma,
          ip_address: ipAddress // Aggiunto server-side per sicurezza
        }
      }

      const { error: firmaError } = await supabase
        .from('customer_onboarding_signatures')
        .upsert({
          cliente_id: clienteId,
          documento_hash: wizardData.firma.documento_hash,
          user_agent: wizardData.firma.user_agent,
          ip_address: ipAddress,
          timestamp_firma: wizardData.firma.timestamp_firma,
          consenso_privacy: wizardData.firma.consenso_privacy,
          consenso_condizioni: wizardData.firma.consenso_condizioni,
          consenso_veridicita: wizardData.firma.consenso_veridicita,
          certificato_completo: certificatoCompleto
        })

      if (firmaError) {
        console.error('❌ Errore salvataggio firma:', firmaError)
        // Verifica se la tabella esiste
        if (firmaError.code === '42P01') {
          console.warn('⚠️ Tabella customer_onboarding_signatures non esiste')
          console.warn('⚠️ Esegui lo script SQL per crearla')
        }
        // Non blocchiamo per errori sulla firma (tabella potrebbe non esistere ancora)
        console.warn('⚠️ Firma non salvata, ma onboarding continua')
      } else {
        console.log('✅ Firma digitale salvata con successo')
      }
    }

    // ==================== 6. AGGIORNA CUSTOMER_PORTAL_USERS ====================
    
    console.log('💾 Step 6: Aggiornamento stato customer portal...')
    
    const { error: portalError } = await supabase
      .from('customer_portal_users')
      .update({
        onboarding_completato: true,
        onboarding_completato_at: new Date().toISOString(),
        ragione_sociale: wizardData.datiAziendali.ragione_sociale
      })
      .eq('id', user.id)

    if (portalError) {
      console.warn('⚠️ Errore aggiornamento customer_portal_users:', portalError)
      // Non blocchiamo se questa tabella non esiste o ha problemi
    } else {
      console.log('✅ Customer portal aggiornato')
    }

    // ==================== 7. ELIMINA BOZZA ====================
    
    console.log('💾 Step 7: Pulizia bozze...')
    
    await supabase
      .from('customer_onboarding_drafts')
      .delete()
      .eq('cliente_id', clienteId)

    console.log('✅ Bozze eliminate')

    // ==================== 8. LOG EVENTO ====================
    
    // Opzionale: log dell'evento per audit trail
    await supabase
      .from('customer_activity_log')
      .insert({
        cliente_id: clienteId,
        user_id: user.id,
        action: 'onboarding_completato',
        details: {
          num_referenti: wizardData.referenti?.length || 0,
          num_macchinari: wizardData.macchinari?.length || 0,
          num_documenti: wizardData.documenti?.length || 0,
          firma_hash: wizardData.firma?.documento_hash?.substring(0, 16)
        },
        ip_address: ipAddress
      })
      .then(() => console.log('✅ Evento loggato'))
      .catch(err => console.warn('⚠️ Log non salvato:', err.message))

    // ==================== SUCCESSO ====================
    
    console.log('🎉 Onboarding completato con successo!')

    return NextResponse.json({
      success: true,
      message: 'Onboarding completato con successo',
      data: {
        cliente_id: clienteId,
        onboarding_completato: true,
        firma_salvata: !!wizardData.firma
      }
    })

  } catch (error) {
    console.error('💥 Errore critico durante onboarding:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Errore durante il completamento dell\'onboarding',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// GET endpoint per verificare stato onboarding
export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      )
    }

    // Verifica stato onboarding
    const { data: cliente } = await supabase
      .from('clienti')
      .select('id, ragione_sociale, onboarding_completato, onboarding_completato_il')
      .eq('email_principale', user.email)
      .single()

    return NextResponse.json({
      success: true,
      onboarding_completato: cliente?.onboarding_completato || false,
      onboarding_data: cliente?.onboarding_completato_il,
      cliente_id: cliente?.id
    })

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
