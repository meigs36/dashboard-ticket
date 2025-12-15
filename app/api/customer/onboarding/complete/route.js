import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    // Crea client Supabase con service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Estrai token dal header Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verifica utente con token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Token non valido' },
        { status: 401 }
      )
    }

    const userId = user.id

    // Estrai i dati dal body
    const body = await request.json()
    const { cliente_id, datiAziendali, referenti, macchinari, documenti, firma } = body

    console.log('📤 Ricezione dati onboarding per cliente:', cliente_id)
    console.log('   - Macchinari da aggiornare:', macchinari?.length || 0)

    if (!cliente_id) {
      return NextResponse.json(
        { error: 'cliente_id mancante' },
        { status: 400 }
      )
    }

    // ==================== 1. AGGIORNA DATI AZIENDALI ====================
    if (datiAziendali) {
      console.log('📝 Aggiornamento dati aziendali...')
      const { error: clienteError } = await supabase
        .from('clienti')
        .update({
          ragione_sociale: datiAziendali.ragione_sociale,
          partita_iva: datiAziendali.partita_iva,
          codice_fiscale: datiAziendali.codice_fiscale,
          via: datiAziendali.indirizzo,
          citta: datiAziendali.citta,
          cap: datiAziendali.cap,
          provincia: datiAziendali.provincia,
          telefono_principale: datiAziendali.telefono,
          email_principale: datiAziendali.email,
          pec: datiAziendali.pec,
          email_amministrazione: datiAziendali.email_amministrazione,
          sito_web: datiAziendali.sito_web,
          note: datiAziendali.note,
          updated_at: new Date().toISOString()
        })
        .eq('id', cliente_id)

      if (clienteError) {
        console.error('❌ Errore aggiornamento cliente:', clienteError)
      } else {
        console.log('✅ Dati aziendali aggiornati')
      }
    }

    // ==================== 2. AGGIORNA MACCHINARI ====================
    if (macchinari && macchinari.length > 0) {
      console.log('🔧 Aggiornamento macchinari...')
      console.log('🔧 Macchinari ricevuti:', JSON.stringify(macchinari, null, 2))
      
      for (const macch of macchinari) {
        console.log('🔧 Processando macchinario:', { id: macch.id, tipo: macch.tipo, ubicazione: macch.ubicazione })
        
        // Se il macchinario ha un ID, è un macchinario esistente da aggiornare
        if (macch.id) {
          console.log('🔧 UPDATE macchinario esistente:', macch.id)
          
          const updateData = {
            tipo_macchinario: macch.tipo,
            marca: macch.marca,
            modello: macch.modello,
            numero_seriale: macch.numero_seriale,
            data_installazione: macch.data_installazione || null,
            ubicazione_specifica: macch.ubicazione || null,
            numero_libro: macch.numero_libro || null,
            garanzia_scadenza: macch.garanzia_scadenza || null,
            // contratto_manutenzione: non aggiornato per preservare valore esistente (attivo/non_attivo/scaduto)
            note_tecniche: macch.note_tecniche || null
          }
          
          console.log('🔧 Dati update:', updateData)
          
          const { error: macchError } = await supabase
            .from('macchinari')
            .update(updateData)
            .eq('id', macch.id)
            .eq('id_cliente', cliente_id)

          if (macchError) {
            console.error('❌ Errore aggiornamento macchinario', macch.id, ':', macchError)
          } else {
            console.log('✅ Macchinario aggiornato:', macch.id, '-', macch.tipo, macch.marca)
          }
        } else {
          // Nuovo macchinario da inserire
          const { error: insertError } = await supabase
            .from('macchinari')
            .insert({
              id_cliente: cliente_id,
              tipo_macchinario: macch.tipo,
              marca: macch.marca,
              modello: macch.modello,
              numero_seriale: macch.numero_seriale,
              data_installazione: macch.data_installazione || null,
              ubicazione_specifica: macch.ubicazione || null,
              numero_libro: macch.numero_libro || null,
              garanzia_scadenza: macch.garanzia_scadenza || null,
              contratto_manutenzione: 'non_attivo',
              note_tecniche: macch.note_tecniche || null,
              stato: 'attivo'
            })

          if (insertError) {
            console.error('❌ Errore inserimento macchinario:', insertError)
          } else {
            console.log('✅ Nuovo macchinario inserito:', macch.tipo, macch.marca)
          }
        }
      }
    }

    // ==================== 3. GESTIONE REFERENTI ====================
    if (referenti && referenti.length > 0) {
      console.log('👥 Aggiornamento referenti...')
      
      for (const ref of referenti) {
        if (ref.id) {
          // Aggiorna referente esistente
          const { error: refError } = await supabase
            .from('customer_referenti')
            .update({
              nome: ref.nome,
              cognome: ref.cognome,
              ruolo: ref.ruolo,
              email: ref.email,
              telefono: ref.telefono,
              principale: ref.principale || false,
              updated_at: new Date().toISOString()
            })
            .eq('id', ref.id)

          if (refError) {
            console.error('❌ Errore aggiornamento referente:', refError)
          }
        } else {
          // Nuovo referente
          const { error: insertError } = await supabase
            .from('customer_referenti')
            .insert({
              cliente_id: cliente_id,
              nome: ref.nome,
              cognome: ref.cognome,
              ruolo: ref.ruolo,
              email: ref.email,
              telefono: ref.telefono,
              principale: ref.principale || false,
              attivo: true
            })

          if (insertError) {
            console.error('❌ Errore inserimento referente:', insertError)
          }
        }
      }
      console.log('✅ Referenti processati')
    }

    // ==================== 4. SALVA FIRMA DIGITALE ====================
    if (firma) {
      console.log('📝 Salvataggio firma digitale...')
      
      const { error: firmaError } = await supabase
        .from('customer_firme_digitali')
        .insert({
          cliente_id: cliente_id,
          user_id: userId,
          tipo_documento: 'onboarding',
          documento_hash: firma.documento_hash,
          certificato_json: firma.certificato_completo,
          user_agent: firma.user_agent,
          timestamp_firma: firma.timestamp_firma,
          consenso_privacy: firma.consenso_privacy,
          consenso_condizioni: firma.consenso_condizioni,
          consenso_veridicita: firma.consenso_veridicita
        })

      if (firmaError) {
        console.error('❌ Errore salvataggio firma:', firmaError)
        // Non bloccare il processo per errori sulla firma
      } else {
        console.log('✅ Firma digitale salvata')
      }
    }

    // ==================== 5. AGGIORNA STATO ONBOARDING ====================
    console.log('✅ Marcatura onboarding come completato per:', userId)

    const { error: updateError } = await supabase
      .from('customer_onboarding_status')
      .update({
        dati_aziendali_completati: true,
        referenti_completati: referenti && referenti.length > 0,
        macchinari_completati: macchinari && macchinari.length > 0,
        dati_aziendali_data: new Date().toISOString(),
        completato_data: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('❌ Errore update onboarding status:', updateError)
      // Non bloccare per questo errore
    }

    console.log('✅ Onboarding completato con successo!')

    return NextResponse.json({
      success: true,
      message: 'Onboarding completato con successo',
      stats: {
        macchinari_aggiornati: macchinari?.length || 0,
        referenti_processati: referenti?.length || 0
      }
    })

  } catch (error) {
    console.error('❌ Errore API onboarding complete:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Errore durante il completamento onboarding'
      },
      { status: 500 }
    )
  }
}
