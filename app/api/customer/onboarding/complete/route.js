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

    console.log('✅ Marcatura onboarding come completato per:', userId)

    // Segna l'onboarding come completato
    const { error: updateError } = await supabase
      .from('customer_onboarding_status')
      .update({
        completato: true,
        completato_il: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('❌ Errore update onboarding status:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    console.log('✅ Onboarding completato con successo')

    return NextResponse.json({
      success: true,
      message: 'Onboarding completato con successo'
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
