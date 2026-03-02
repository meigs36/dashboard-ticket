// app/api/consensi/verifica-cliente/route.js
// API pubblica per verificare codice cliente e restituire dati base
// Non espone dati sensibili - solo ragione sociale, indirizzo, P.IVA (dati camerali pubblici)

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Client con service_role per accesso senza auth
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { codice_cliente } = await request.json()

    if (!codice_cliente || typeof codice_cliente !== 'string') {
      return NextResponse.json(
        { error: 'Codice cliente mancante' },
        { status: 400 }
      )
    }

    const codiceNorm = codice_cliente.trim().toUpperCase()

    // Cerca cliente
    const { data: cliente, error: clienteError } = await supabaseAdmin
      .from('clienti')
      .select('id, codice_cliente, ragione_sociale, partita_iva, indirizzo, comune, cap, provincia, attivo')
      .eq('codice_cliente', codiceNorm)
      .single()

    if (clienteError || !cliente) {
      return NextResponse.json(
        { error: 'Codice cliente non trovato' },
        { status: 404 }
      )
    }

    if (!cliente.attivo) {
      return NextResponse.json(
        { error: 'Cliente non attivo' },
        { status: 400 }
      )
    }

    // Carica lista tecnici attivi
    const { data: tecnici, error: tecniciError } = await supabaseAdmin
      .from('utenti')
      .select('id, nome, cognome')
      .eq('attivo', true)
      .order('cognome')

    if (tecniciError) {
      console.error('Errore caricamento tecnici:', tecniciError)
      return NextResponse.json(
        { error: 'Errore nel caricamento dei tecnici' },
        { status: 500 }
      )
    }

    // Verifica se esiste già un consenso attivo
    const { data: consensoEsistente } = await supabaseAdmin
      .from('consensi_accesso_remoto')
      .select('id, created_at, firmato_da_nome')
      .eq('cliente_id', cliente.id)
      .is('revocato_il', null)
      .order('created_at', { ascending: false })
      .limit(1)

    return NextResponse.json({
      cliente: {
        id: cliente.id,
        codice_cliente: cliente.codice_cliente,
        ragione_sociale: cliente.ragione_sociale,
        partita_iva: cliente.partita_iva || '',
        indirizzo: cliente.indirizzo || '',
        comune: cliente.comune || '',
        cap: cliente.cap || '',
        provincia: cliente.provincia || ''
      },
      tecnici: tecnici || [],
      consenso_esistente: consensoEsistente?.[0] || null
    })

  } catch (err) {
    console.error('Errore verifica cliente:', err)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
