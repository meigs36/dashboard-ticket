// app/api/libro-macchine/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get('clienteId')
    
    if (!clienteId) {
      return NextResponse.json(
        { error: 'clienteId è obbligatorio' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Recupera dati cliente
    const { data: cliente, error: clienteError } = await supabase
      .from('clienti')
      .select('*')
      .eq('id', clienteId)
      .single()

    if (clienteError || !cliente) {
      return NextResponse.json(
        { error: 'Cliente non trovato' },
        { status: 404 }
      )
    }

    // Query macchinari
    const { data: macchinari, error: macchinariError } = await supabase
      .from('macchinari')
      .select('*')
      .eq('id_cliente', clienteId)

    if (macchinariError) {
      console.error('Errore query macchinari:', macchinariError)
      return NextResponse.json(
        { error: 'Errore recupero macchinari' },
        { status: 500 }
      )
    }

    // ✅ Ordina numericamente per numero_libro
    const macchinariOrdinati = (macchinari || []).sort((a, b) => {
      const numA = parseInt(a.numero_libro) || 0
      const numB = parseInt(b.numero_libro) || 0
      return numA - numB
    })

    // Prepara dati per il PDF
    const pdfData = {
      cliente: {
        ragione_sociale: cliente.ragione_sociale,
        indirizzo: cliente.indirizzo,
        citta: cliente.citta,
        cap: cliente.cap,
        provincia: cliente.provincia
      },
      sede: {
        nome: cliente.ragione_sociale,
        indirizzo: `${cliente.indirizzo || ''}, ${cliente.citta || ''}`
      },
      macchinari: macchinariOrdinati.map((m, index) => ({
        num_libro_macchina: m.numero_libro || index + 1,
        tipo_apparecchiatura: m.tipo_macchinario || '',
        marca: m.marca || '',
        modello: m.modello || '',
        matricola: m.numero_seriale || '',
        data_installazione: m.data_installazione || '',
        manutenzione: m.manutenzione || 'Si',
        tecn: m.tecn || 'Si',
        ce: m.ce || 'Si'
      }))
    }

    return NextResponse.json({
      success: true,
      data: pdfData,
      totaleMacchinari: macchinari.length
    })

  } catch (error) {
    console.error('Errore API libro-macchine:', error)
    return NextResponse.json(
      { error: error.message || 'Errore interno del server' },
      { status: 500 }
    )
  }
}
