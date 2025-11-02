// File: app/api/admin/create-user/route.js
// API Route per creare utenti (solo admin, usa Service Role Key)

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    // ✅ Usa SOLO Service Role client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 1. Verifica autenticazione dall'header Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verifica token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    // 2. Verifica che sia admin
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('utenti')
      .select('ruolo')
      .eq('id', user.id)
      .single()

    if (profileError || userProfile?.ruolo !== 'admin') {
      return NextResponse.json({ error: 'Solo admin possono creare utenti' }, { status: 403 })
    }

    // 3. Leggi dati dal body
    const body = await request.json()
    const { email, password, nome, cognome, ruolo, telefono } = body

    // 4. Validazioni
    if (!email || !password || !nome || !cognome || !ruolo) {
      return NextResponse.json({ 
        error: 'Campi obbligatori mancanti' 
      }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ 
        error: 'Password deve essere almeno 6 caratteri' 
      }, { status: 400 })
    }

    // 5. Crea utente in Supabase Auth
    const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        nome: nome,
        cognome: cognome
      }
    })

    if (authCreateError) {
      console.error('❌ Errore creazione auth:', authCreateError)
      return NextResponse.json({ 
        error: authCreateError.message 
      }, { status: 500 })
    }

    console.log('✅ Utente auth creato:', authData.user.id)

    // 6. Crea profilo nella tabella utenti
    const { error: dbError } = await supabaseAdmin
      .from('utenti')
      .insert({
        id: authData.user.id,
        email: email,
        nome: nome,
        cognome: cognome,
        ruolo: ruolo,
        telefono: telefono || null,
        attivo: true
      })

    if (dbError) {
      console.error('❌ Errore creazione profilo DB:', dbError)
      
      // Rollback: elimina utente auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return NextResponse.json({ 
        error: 'Errore creazione profilo: ' + dbError.message 
      }, { status: 500 })
    }

    console.log('✅ Profilo DB creato')

    // 7. Successo!
    return NextResponse.json({ 
      success: true, 
      user: {
        id: authData.user.id,
        email: authData.user.email
      }
    })

  } catch (error) {
    console.error('❌ Errore generale:', error)
    return NextResponse.json({ 
      error: error.message || 'Errore interno server' 
    }, { status: 500 })
  }
}