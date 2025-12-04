import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const result = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    config: {
      hasSupabaseUrl: !!supabaseUrl,
      supabaseUrlPreview: supabaseUrl ? supabaseUrl.substring(0, 40) + '...' : 'MANCANTE',
      hasServiceRoleKey: !!serviceRoleKey,
      hasAnonKey: !!anonKey,
    },
    tests: {}
  }

  // Test 1: Fetch diretto all'endpoint REST di Supabase
  if (supabaseUrl && anonKey) {
    try {
      const restUrl = `${supabaseUrl}/rest/v1/clienti?select=id&limit=1`
      const response = await fetch(restUrl, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        result.tests.directFetch = {
          status: 'OK',
          statusCode: response.status,
          dataReceived: Array.isArray(data),
          count: data?.length || 0
        }
      } else {
        result.tests.directFetch = {
          status: 'ERRORE',
          statusCode: response.status,
          statusText: response.statusText
        }
      }
    } catch (e) {
      result.tests.directFetch = {
        status: 'ERRORE',
        error: e.message,
        cause: e.cause?.message || 'unknown'
      }
    }
  }

  // Test 2: Client Supabase con anon key
  if (supabaseUrl && anonKey) {
    try {
      const supabaseAnon = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
      
      const { data, error } = await supabaseAnon
        .from('clienti')
        .select('id')
        .limit(1)

      if (error) {
        result.tests.supabaseAnonClient = {
          status: 'ERRORE',
          error: error.message
        }
      } else {
        result.tests.supabaseAnonClient = {
          status: 'OK',
          count: data?.length || 0
        }
      }
    } catch (e) {
      result.tests.supabaseAnonClient = {
        status: 'ERRORE',
        error: e.message
      }
    }
  }

  // Test 3: Client Supabase con service role key
  if (supabaseUrl && serviceRoleKey) {
    try {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
      
      const { data, error } = await supabaseAdmin
        .from('clienti')
        .select('id')
        .limit(1)

      if (error) {
        result.tests.supabaseAdminClient = {
          status: 'ERRORE',
          error: error.message
        }
      } else {
        result.tests.supabaseAdminClient = {
          status: 'OK',
          count: data?.length || 0
        }
      }
    } catch (e) {
      result.tests.supabaseAdminClient = {
        status: 'ERRORE',
        error: e.message
      }
    }
  }

  // Test 4: Verifica tabella customer_portal_users
  if (supabaseUrl && serviceRoleKey) {
    try {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
      
      const { error } = await supabaseAdmin
        .from('customer_portal_users')
        .select('id')
        .limit(1)

      if (error) {
        result.tests.portalUsersTable = {
          status: 'ERRORE',
          error: error.message,
          hint: error.hint || 'Tabella potrebbe non esistere'
        }
      } else {
        result.tests.portalUsersTable = {
          status: 'OK'
        }
      }
    } catch (e) {
      result.tests.portalUsersTable = {
        status: 'ERRORE',
        error: e.message
      }
    }
  }

  const allOk = Object.values(result.tests).every(t => t.status === 'OK')
  
  return NextResponse.json(result, { 
    status: allOk ? 200 : 500 
  })
}
