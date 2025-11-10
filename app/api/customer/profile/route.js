import { NextResponse } from 'next/server'
import { getCustomerProfile, updateCustomerProfile } from '@/lib/customerQueries'
import { supabase } from '@/lib/supabase'

// GET - Recupera profilo cliente
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

    const { data, error } = await getCustomerProfile(user.id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('❌ Errore GET profile:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// PUT - Aggiorna profilo cliente
export async function PUT(request) {
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

    const body = await request.json()

    // Campi aggiornabili
    const allowedFields = [
      'ragione_sociale',
      'telefono',
      'email',
      'pec',
      'indirizzo',
      'citta',
      'cap',
      'provincia',
      'regione',
      'sito_web',
      'note'
    ]

    // Filtra solo campi permessi
    const updates = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Nessun campo da aggiornare' },
        { status: 400 }
      )
    }

    const { data, error } = await updateCustomerProfile(user.id, updates)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Profilo aggiornato con successo',
      data
    })

  } catch (error) {
    console.error('❌ Errore PUT profile:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
