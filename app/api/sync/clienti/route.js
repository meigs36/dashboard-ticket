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

// Campi consentiti per la tabella clienti
const ALLOWED_FIELDS = [
  'codice_cliente',
  'ragione_sociale',
  'partita_iva',
  'codice_fiscale',
  'indirizzo',
  'comune',
  'cap',
  'provincia',
  'telefono_principale',
  'email_principale',
  'email_amministrazione',
  'email_pec',
  'email_riparazioni',
  'email_referente',
  'sito_web',
  'attivo',
  'tipo_contratto',
  'livello_sla',
  'note',
  'ragione_sociale_operativa',
  'indirizzo_operativo',
  'comune_operativo',
  'cap_operativo',
  'provincia_operativa'
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
 * POST /api/sync/clienti
 * Crea un nuovo cliente o aggiorna se esiste (upsert su codice_cliente)
 *
 * Header: x-api-key: <FILEMAKER_API_KEY>
 * Body: { "codice_cliente": "C001", "ragione_sociale": "...", ... }
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

    // Validazione campo obbligatorio
    if (!body.codice_cliente) {
      return NextResponse.json(
        { error: 'Campo obbligatorio mancante: codice_cliente' },
        { status: 400 }
      )
    }

    const fields = sanitizeFields(body)
    // updated_at viene gestito automaticamente dal database se presente

    const supabase = getSupabaseAdmin()

    // Upsert: crea se non esiste, aggiorna se esiste (match su codice_cliente)
    const { data, error } = await supabase
      .from('clienti')
      .upsert(fields, { onConflict: 'codice_cliente' })
      .select('id, codice_cliente, ragione_sociale')
      .single()

    if (error) {
      console.error('Errore upsert cliente:', error)
      return NextResponse.json(
        { error: 'Errore database', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      action: 'upsert',
      cliente: data
    })

  } catch (error) {
    console.error('Errore sync clienti:', error)
    return NextResponse.json(
      { error: 'Errore interno del server', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/sync/clienti
 * Aggiorna un cliente esistente (match su codice_cliente)
 *
 * Header: x-api-key: <FILEMAKER_API_KEY>
 * Body: { "codice_cliente": "C001", "ragione_sociale": "nuovo nome", ... }
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

    if (!body.codice_cliente) {
      return NextResponse.json(
        { error: 'Campo obbligatorio mancante: codice_cliente' },
        { status: 400 }
      )
    }

    const fields = sanitizeFields(body)
    // Rimuovi codice_cliente dai campi da aggiornare (usato solo come filtro)
    const codiceCliente = fields.codice_cliente
    delete fields.codice_cliente

    if (Object.keys(fields).length === 0) {
      return NextResponse.json(
        { error: 'Nessun campo da aggiornare fornito' },
        { status: 400 }
      )
    }

    // updated_at viene gestito automaticamente dal database se presente

    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('clienti')
      .update(fields)
      .eq('codice_cliente', codiceCliente)
      .select('id, codice_cliente, ragione_sociale')
      .single()

    if (error) {
      console.error('Errore update cliente:', error)
      return NextResponse.json(
        { error: 'Errore database', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: `Cliente con codice_cliente "${codiceCliente}" non trovato` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      action: 'update',
      cliente: data
    })

  } catch (error) {
    console.error('Errore sync clienti:', error)
    return NextResponse.json(
      { error: 'Errore interno del server', details: error.message },
      { status: 500 }
    )
  }
}
