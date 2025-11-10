import { NextResponse } from 'next/server'
import { getCustomerStats } from '@/lib/customerQueries'
import { supabase } from '@/lib/supabase'

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

    // Get customer profile per ottenere cliente_id
    const { data: profile, error: profileError } = await supabase
      .from('customer_portal_users')
      .select('cliente_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profilo non trovato' },
        { status: 404 }
      )
    }

    // Get stats
    const { data: stats, error: statsError } = await getCustomerStats(
      user.id,
      profile.cliente_id
    )

    if (statsError) throw statsError

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('❌ Errore API stats:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
