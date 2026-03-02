// app/api/consensi/salva/route.js
// API pubblica per salvare il consenso firmato
// Riceve: dati cliente, tecnico, consensi, firma grafica, certificato

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      cliente_id,
      tecnico_id,
      consenso_accesso_remoto,
      consenso_dati_sanitari,
      consenso_modalita_accesso,
      consenso_autorizzazione_titolare,
      firma_grafica_base64,
      documento_hash,
      certificato_json,
      firmato_da_nome,
      firmato_da_ruolo,
      note
    } = body

    // Validazioni
    if (!cliente_id || !tecnico_id) {
      return NextResponse.json({ error: 'Cliente e tecnico obbligatori' }, { status: 400 })
    }
    if (!consenso_accesso_remoto || !consenso_dati_sanitari ||
        !consenso_modalita_accesso || !consenso_autorizzazione_titolare) {
      return NextResponse.json({ error: 'Tutti i consensi devono essere accettati' }, { status: 400 })
    }
    if (!firma_grafica_base64) {
      return NextResponse.json({ error: 'Firma grafica obbligatoria' }, { status: 400 })
    }
    if (!firmato_da_nome || firmato_da_nome.trim().length < 2) {
      return NextResponse.json({ error: 'Nome del firmatario obbligatorio' }, { status: 400 })
    }
    if (!documento_hash) {
      return NextResponse.json({ error: 'Hash documento obbligatorio' }, { status: 400 })
    }

    // Recupera IP dal request
    const headersList = await headers()
    const ip_address = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                       headersList.get('x-real-ip') ||
                       'unknown'

    // Salva firma grafica su Supabase Storage
    let firma_grafica_url = null
    try {
      const base64Data = firma_grafica_base64.replace(/^data:image\/png;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')
      const fileName = `consensi/${cliente_id}/firma_${Date.now()}.png`

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('customer-documents')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: false
        })

      if (uploadError) {
        console.error('Errore upload firma:', uploadError)
      } else {
        firma_grafica_url = uploadData.path
      }
    } catch (uploadErr) {
      console.error('Errore processing firma:', uploadErr)
    }

    // Salva nel database
    const { data: consenso, error: insertError } = await supabaseAdmin
      .from('consensi_accesso_remoto')
      .insert({
        cliente_id,
        tecnico_id,
        consenso_accesso_remoto,
        consenso_dati_sanitari,
        consenso_modalita_accesso,
        consenso_autorizzazione_titolare,
        firma_grafica_url,
        documento_hash,
        certificato_json: certificato_json || {},
        ip_address,
        user_agent: certificato_json?.user_agent || '',
        firmato_da_nome: firmato_da_nome.trim(),
        firmato_da_ruolo: firmato_da_ruolo?.trim() || null,
        note: note?.trim() || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Errore salvataggio consenso:', insertError)
      return NextResponse.json(
        { error: 'Errore nel salvataggio del consenso: ' + insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      consenso_id: consenso.id,
      message: 'Consenso salvato con successo'
    })

  } catch (err) {
    console.error('Errore salvataggio consenso:', err)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
