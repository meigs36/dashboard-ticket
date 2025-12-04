// app/api/portal-access/reset-password/route.js
// 
// 🔧 FIX (4 Dic 2025): Spostato createClient dentro la funzione POST
// per evitare errore "supabaseKey is required" durante build Vercel

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// ✅ NON inizializzare qui - le env vars non sono disponibili durante la build
// const supabaseAdmin = createClient(...)

export async function POST(request) {
  try {
    // ✅ Crea client DENTRO la funzione
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const body = await request.json()
    const { userId, newPassword } = body

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'userId e newPassword sono obbligatori' },
        { status: 400 }
      )
    }

    // Verifica che l'utente esista
    const { data: portalUser, error: userError } = await supabaseAdmin
      .from('customer_portal_users')
      .select('id, email')
      .eq('id', userId)
      .single()

    if (userError || !portalUser) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    // Aggiorna password in Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (authError) {
      console.error('Errore reset password:', authError)
      return NextResponse.json(
        { error: `Errore reset: ${authError.message}` },
        { status: 500 }
      )
    }

    // Imposta primo_accesso a true per forzare cambio password
    await supabaseAdmin
      .from('customer_portal_users')
      .update({ primo_accesso: true })
      .eq('id', userId)

    // Log
    await supabaseAdmin
      .from('customer_portal_access_log')
      .insert({
        user_id: userId,
        action: 'password_reset_by_admin',
        success: true
      })

    return NextResponse.json({
      success: true,
      message: 'Password resettata con successo'
    })

  } catch (error) {
    console.error('Errore generale:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
