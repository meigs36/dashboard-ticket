import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request) {
  try {
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
    const body = await request.json()
    
    const {
      datiAziendali,
      referenti,
      macchinari,
      documenti
    } = body

    console.log('📝 Salvataggio onboarding per customer:', userId)

    // 1. Aggiorna dati aziendali in customer_portal_users
    if (datiAziendali) {
      const { error: updateError } = await supabase
        .from('customer_portal_users')
        .update({
          ragione_sociale: datiAziendali.ragioneSociale,
          partita_iva: datiAziendali.partitaIva,
          codice_fiscale: datiAziendali.codiceFiscale,
          indirizzo: datiAziendali.indirizzo,
          citta: datiAziendali.citta,
          cap: datiAziendali.cap,
          provincia: datiAziendali.provincia,
          regione: datiAziendali.regione,
          telefono: datiAziendali.telefono,
          email: datiAziendali.email,
          pec: datiAziendali.pec,
          sito_web: datiAziendali.sitoWeb,
          note: datiAziendali.note,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        console.error('❌ Errore update dati aziendali:', updateError)
        throw updateError
      }

      console.log('✅ Dati aziendali aggiornati')
    }

    // 2. Salva referenti
    if (referenti && referenti.length > 0) {
      // Prima elimina vecchi referenti
      await supabase
        .from('customer_referenti')
        .delete()
        .eq('customer_id', userId)

      // Poi inserisci nuovi
      const referentiData = referenti.map(ref => ({
        customer_id: userId,
        nome: ref.nome,
        cognome: ref.cognome,
        email: ref.email,
        telefono: ref.telefono,
        ruolo: ref.ruolo,
        principale: ref.principale || false
      }))

      const { error: referentiError } = await supabase
        .from('customer_referenti')
        .insert(referentiData)

      if (referentiError) {
        console.error('❌ Errore insert referenti:', referentiError)
        throw referentiError
      }

      console.log(`✅ ${referenti.length} referenti salvati`)
    }

    // 3. Salva macchinari
    if (macchinari && macchinari.length > 0) {
      // Prima elimina vecchi macchinari
      await supabase
        .from('customer_macchinari')
        .delete()
        .eq('customer_id', userId)

      // Poi inserisci nuovi
      const macchinariData = macchinari.map(macc => ({
        customer_id: userId,
        numero_seriale: macc.numeroSeriale,
        numero_libro: macc.numeroLibro,
        tipo_macchinario: macc.tipo,
        marca: macc.marca,
        modello: macc.modello,
        data_installazione: macc.dataInstallazione,
        ubicazione_specifica: macc.ubicazione,
        garanzia_scadenza: macc.garanziaScadenza,
        contratto_manutenzione: macc.contrattoManutenzione,
        note_tecniche: macc.note,
        stato: 'attivo'
      }))

      const { error: macchinariError } = await supabase
        .from('customer_macchinari')
        .insert(macchinariData)

      if (macchinariError) {
        console.error('❌ Errore insert macchinari:', macchinariError)
        throw macchinariError
      }

      console.log(`✅ ${macchinari.length} macchinari salvati`)
    }

    // 4. Aggiorna onboarding status
    const onboardingData = {
      customer_id: userId,
      user_id: userId,
      dati_aziendali_completati: !!datiAziendali,
      dati_aziendali_data: datiAziendali ? new Date().toISOString() : null,
      referenti_completati: !!(referenti && referenti.length > 0),
      referenti_data: referenti && referenti.length > 0 ? new Date().toISOString() : null,
      macchinari_completati: !!(macchinari && macchinari.length > 0),
      macchinari_data: macchinari && macchinari.length > 0 ? new Date().toISOString() : null,
      documenti_completati: !!(documenti && documenti.length > 0),
      documenti_data: documenti && documenti.length > 0 ? new Date().toISOString() : null,
      completato: true,
      completato_il: new Date().toISOString()
    }

    // Upsert (insert o update)
    const { error: statusError } = await supabase
      .from('customer_onboarding_status')
      .upsert(onboardingData, {
        onConflict: 'customer_id'
      })

    if (statusError) {
      console.error('❌ Errore update onboarding status:', statusError)
      throw statusError
    }

    console.log('✅ Onboarding status aggiornato')

    return NextResponse.json({
      success: true,
      message: 'Onboarding completato con successo',
      data: {
        userId,
        referentiCount: referenti?.length || 0,
        macchinariCount: macchinari?.length || 0
      }
    })

  } catch (error) {
    console.error('❌ Errore API onboarding:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Errore durante il salvataggio'
      },
      { status: 500 }
    )
  }
}

// GET per recuperare dati onboarding esistenti
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Token non valido' },
        { status: 401 }
      )
    }

    const userId = user.id

    // Recupera dati customer
    const { data: customerData, error: customerError } = await supabase
      .from('customer_portal_users')
      .select('*')
      .eq('id', userId)
      .single()

    if (customerError) throw customerError

    // Recupera referenti
    const { data: referenti } = await supabase
      .from('customer_referenti')
      .select('*')
      .eq('customer_id', userId)

    // Recupera macchinari
    const { data: macchinari } = await supabase
      .from('customer_macchinari')
      .select('*')
      .eq('customer_id', userId)

    // Recupera status onboarding
    const { data: onboardingStatus } = await supabase
      .from('customer_onboarding_status')
      .select('*')
      .eq('customer_id', userId)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        customerData,
        referenti: referenti || [],
        macchinari: macchinari || [],
        onboardingStatus
      }
    })

  } catch (error) {
    console.error('❌ Errore GET onboarding:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
