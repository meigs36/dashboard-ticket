import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Supabase admin client (service role per bypass RLS)
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Verifica API Key
function checkApiKey(request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.FILEMAKER_API_KEY) {
    return false
  }
  return true
}

// Campi consentiti per la tabella macchinari
const ALLOWED_FIELDS = [
  'numero_seriale',
  'tipo_macchinario',
  'marca',
  'modello',
  'data_installazione',
  'ubicazione_specifica',
  'numero_libro',
  'stato',
  'contratto_manutenzione',
  'garanzia_scadenza',
  'garanzia_estensione_scadenza',
  'note_tecniche',
  'manutenzione',
  'tecn',
  'ce'
]

// Filtra solo i campi consentiti
function sanitizeFields(body) {
  const cleaned = {}
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) {
      cleaned[key] = body[key]
    }
  }
  return cleaned
}

/**
 * Risolve il codice_cliente → id UUID del cliente in Supabase
 */
async function resolveClienteId(supabase, codiceCliente) {
  const { data, error } = await supabase
    .from('clienti')
    .select('id')
    .eq('codice_cliente', codiceCliente)
    .single()

  if (error || !data) return null
  return data.id
}

/**
 * POST /api/sync/macchinari
 * Crea un nuovo macchinario o aggiorna se esiste (upsert su numero_seriale)
 *
 * Header: x-api-key: <FILEMAKER_API_KEY>
 * Body: { "codice_cliente": "C001", "numero_seriale": "SN123", "tipo_macchinario": "Riunito", ... }
 *
 * Nota: il campo "codice_cliente" viene risolto in id_cliente (UUID) internamente
 */
export async function POST(request) {
  if (!checkApiKey(request)) {
    return NextResponse.json(
      { error: 'API key mancante o non valida' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()

    // Validazione campi obbligatori
    if (!body.numero_seriale) {
      return NextResponse.json(
        { error: 'Campo obbligatorio mancante: numero_seriale' },
        { status: 400 }
      )
    }

    if (!body.codice_cliente) {
      return NextResponse.json(
        { error: 'Campo obbligatorio mancante: codice_cliente' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Risolvi codice_cliente → id_cliente (UUID)
    const clienteId = await resolveClienteId(supabase, body.codice_cliente)
    if (!clienteId) {
      return NextResponse.json(
        { error: `Cliente con codice_cliente "${body.codice_cliente}" non trovato. Sincronizzare prima il cliente.` },
        { status: 404 }
      )
    }

    const fields = sanitizeFields(body)
    fields.id_cliente = clienteId

    // Upsert: crea se non esiste, aggiorna se esiste (match su numero_seriale)
    const { data, error } = await supabase
      .from('macchinari')
      .upsert(fields, { onConflict: 'numero_seriale' })
      .select('id, numero_seriale, tipo_macchinario, marca, modello')
      .single()

    if (error) {
      console.error('Errore upsert macchinario:', error)
      return NextResponse.json(
        { error: 'Errore database', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      action: 'upsert',
      macchinario: data
    })

  } catch (error) {
    console.error('Errore sync macchinari:', error)
    return NextResponse.json(
      { error: 'Errore interno del server', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/sync/macchinari
 * Aggiorna un macchinario esistente (match su numero_seriale)
 *
 * Header: x-api-key: <FILEMAKER_API_KEY>
 * Body: { "numero_seriale": "SN123", "stato": "obsoleto", ... }
 *
 * Nota: se presente "codice_cliente", viene risolto in id_cliente (UUID)
 */
export async function PUT(request) {
  if (!checkApiKey(request)) {
    return NextResponse.json(
      { error: 'API key mancante o non valida' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()

    if (!body.numero_seriale) {
      return NextResponse.json(
        { error: 'Campo obbligatorio mancante: numero_seriale' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const fields = sanitizeFields(body)
    // Rimuovi numero_seriale dai campi da aggiornare (usato solo come filtro)
    const numeroSeriale = fields.numero_seriale
    delete fields.numero_seriale

    // Se viene fornito codice_cliente, risolvi in id_cliente
    if (body.codice_cliente) {
      const clienteId = await resolveClienteId(supabase, body.codice_cliente)
      if (!clienteId) {
        return NextResponse.json(
          { error: `Cliente con codice_cliente "${body.codice_cliente}" non trovato` },
          { status: 404 }
        )
      }
      fields.id_cliente = clienteId
    }

    if (Object.keys(fields).length === 0) {
      return NextResponse.json(
        { error: 'Nessun campo da aggiornare fornito' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('macchinari')
      .update(fields)
      .eq('numero_seriale', numeroSeriale)
      .select('id, numero_seriale, tipo_macchinario, marca, modello')
      .single()

    if (error) {
      console.error('Errore update macchinario:', error)
      return NextResponse.json(
        { error: 'Errore database', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: `Macchinario con numero_seriale "${numeroSeriale}" non trovato` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      action: 'update',
      macchinario: data
    })

  } catch (error) {
    console.error('Errore sync macchinari:', error)
    return NextResponse.json(
      { error: 'Errore interno del server', details: error.message },
      { status: 500 }
    )
  }
}
