import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Crea client admin con opzioni esplicite
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configurazione Supabase mancante')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function POST(request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    const body = await request.json()
    const { 
      clienteId, 
      email, 
      password, 
      nome, 
      cognome, 
      ruolo_aziendale, 
      telefono,
      inviaEmail 
    } = body

    console.log('📝 Richiesta creazione accesso:', { clienteId, email, nome })

    // Validazione
    if (!clienteId || !email || !password) {
      return NextResponse.json(
        { error: 'Dati mancanti: clienteId, email e password sono obbligatori' },
        { status: 400 }
      )
    }

    // Verifica che il cliente esista
    console.log('🔍 Cerco cliente con ID:', clienteId)
    const { data: cliente, error: clienteError } = await supabaseAdmin
      .from('clienti')
      .select('id, ragione_sociale, codice_cliente')
      .eq('id', clienteId)
      .single()

    console.log('📋 Risultato ricerca cliente:', { cliente, error: clienteError?.message })

    if (clienteError) {
      console.error('❌ Errore query cliente:', clienteError)
      return NextResponse.json(
        { error: `Errore ricerca cliente: ${clienteError.message}` },
        { status: 404 }
      )
    }

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente non trovato' },
        { status: 404 }
      )
    }

    // Verifica che non esista già un utente con questa email
    const { data: existingUser } = await supabaseAdmin
      .from('customer_portal_users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Esiste già un utente con questa email' },
        { status: 400 }
      )
    }

    // 1. Crea utente in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        cliente_id: clienteId,
        user_type: 'customer',
        nome,
        cognome
      }
    })

    if (authError) {
      console.error('❌ Errore creazione auth:', authError)
      return NextResponse.json(
        { error: `Errore creazione utente: ${authError.message}` },
        { status: 500 }
      )
    }

    // 2. Crea record in customer_portal_users
    const { error: dbError } = await supabaseAdmin
      .from('customer_portal_users')
      .insert({
        id: authData.user.id,
        cliente_id: clienteId,
        email,
        nome: nome || null,
        cognome: cognome || null,
        ruolo_aziendale: ruolo_aziendale || 'Referente',
        telefono: telefono || null,
        attivo: true,
        primo_accesso: true,
        email_verified: true
      })

    if (dbError) {
      console.error('❌ Errore inserimento DB:', dbError)
      // Rollback: elimina utente auth creato
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: `Errore database: ${dbError.message}` },
        { status: 500 }
      )
    }

    // 3. Crea record onboarding status (opzionale)
    try {
      await supabaseAdmin
        .from('customer_onboarding_status')
        .insert({
          cliente_id: clienteId,
          user_id: authData.user.id
        })
    } catch (e) {
      console.log('ℹ️ Tabella onboarding non disponibile, skip')
    }

    // 4. Log accesso (opzionale)
    try {
      await supabaseAdmin
        .from('customer_portal_access_log')
        .insert({
          user_id: authData.user.id,
          action: 'account_created',
          success: true
        })
    } catch (e) {
      console.log('ℹ️ Tabella log non disponibile, skip')
    }

    // 5. Invia email di benvenuto (se richiesto e configurato)
    if (inviaEmail && process.env.N8N_WEBHOOK_WELCOME_EMAIL) {
      try {
        console.log('📧 Invio email benvenuto a:', email)
        await fetch(process.env.N8N_WEBHOOK_WELCOME_EMAIL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            nome: nome || 'Cliente',
            ragione_sociale: cliente.ragione_sociale,
            password: password,
            portal_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://gestionale.odonto-service.it'}/portal`
          })
        })
        console.log('✅ Email benvenuto inviata')
      } catch (emailError) {
        console.error('⚠️ Errore invio email:', emailError)
      }
    }

    console.log('✅ Accesso creato con successo per:', email)

    return NextResponse.json({
      success: true,
      userId: authData.user.id,
      email,
      cliente: cliente.ragione_sociale,
      message: 'Accesso portale creato con successo'
    })

  } catch (error) {
    console.error('❌ Errore generale:', error)
    return NextResponse.json(
      { error: error.message || 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// GET - Lista utenti portale
export async function GET(request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    
    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get('clienteId')

    let query = supabaseAdmin
      .from('customer_portal_users')
      .select(`
        *,
        cliente:clienti(id, ragione_sociale, codice_cliente)
      `)
      .order('created_at', { ascending: false })

    if (clienteId) {
      query = query.eq('cliente_id', clienteId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data })

  } catch (error) {
    console.error('❌ Errore GET:', error)
    return NextResponse.json(
      { error: 'Errore recupero dati' },
      { status: 500 }
    )
  }
}
