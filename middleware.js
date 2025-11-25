import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Costanti
const PROTECTED_ROUTES = ['/portal/dashboard', '/portal/onboarding', '/portal/dati', '/portal/macchinari', '/portal/documenti', '/portal/ticket']
const PUBLIC_PORTAL_ROUTES = ['/portal', '/portal/login', '/portal/register', '/portal/reset-password', '/portal/unauthorized']

export async function middleware(req) {
  const pathname = req.nextUrl.pathname
  
  // Debug logging
  const isDebug = process.env.NODE_ENV === 'development'
  if (isDebug) {
    console.log(`🔍 Middleware: ${pathname}`)
  }

  // Skip per route pubbliche del portale
  if (PUBLIC_PORTAL_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    if (isDebug) console.log('✅ Route pubblica, skip middleware')
    return NextResponse.next()
  }

  // Verifica se è una route protetta
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route))
  
  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  if (isDebug) console.log('🔒 Route protetta, verifico autenticazione...')

  // Verifica env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase env vars mancanti nel middleware')
    return NextResponse.redirect(new URL('/portal', req.url))
  }

  // Crea client Supabase
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // ===================================================================
  // STEP 1: Verifica Cookie e Sessione
  // ===================================================================
  
  // I cookie di Supabase hanno questo formato:
  // - sb-{project-ref}-auth-token (contiene sia access che refresh token)
  // Oppure separati:
  // - sb-access-token
  // - sb-refresh-token
  
  let authToken = null
  
  // Prova diversi formati di cookie
  const cookies = req.cookies
  
  // Formato 1: Cookie combinato (più recente)
  const combinedCookie = cookies.getAll().find(c => 
    c.name.includes('auth-token') && c.name.startsWith('sb-')
  )
  
  if (combinedCookie) {
    try {
      const parsed = JSON.parse(combinedCookie.value)
      authToken = parsed.access_token || parsed[0] // Può essere un array
    } catch (e) {
      authToken = combinedCookie.value
    }
  }
  
  // Formato 2: Cookie separati (legacy)
  if (!authToken) {
    authToken = cookies.get('sb-access-token')?.value
  }

  if (!authToken) {
    if (isDebug) console.log('❌ Nessun token trovato nei cookie')
    const redirectUrl = new URL('/portal', req.url)
    redirectUrl.searchParams.set('redirect', pathname)
    redirectUrl.searchParams.set('reason', 'no_session')
    return NextResponse.redirect(redirectUrl)
  }

  // ===================================================================
  // STEP 2: Verifica Utente con Token
  // ===================================================================
  
  let user = null
  try {
    const { data, error } = await supabase.auth.getUser(authToken)
    
    if (error || !data.user) {
      if (isDebug) console.log('❌ Token non valido o scaduto:', error?.message)
      const redirectUrl = new URL('/portal', req.url)
      redirectUrl.searchParams.set('redirect', pathname)
      redirectUrl.searchParams.set('reason', 'invalid_token')
      return NextResponse.redirect(redirectUrl)
    }
    
    user = data.user
    if (isDebug) console.log('✅ Utente autenticato:', user.email)
    
  } catch (error) {
    console.error('❌ Errore verifica token:', error)
    return NextResponse.redirect(new URL('/portal', req.url))
  }

  // ===================================================================
  // STEP 3: Verifica Profilo Customer + Onboarding (Query Combinata)
  // ===================================================================
  
  try {
    // Query combinata per ridurre le chiamate al DB
    const { data: customerProfile, error: profileError } = await supabase
      .from('customer_portal_users')
      .select(`
        id,
        cliente_id,
        attivo,
        email,
        primo_accesso,
        onboarding:customer_onboarding_status!customer_onboarding_status_user_id_fkey(
          id,
          dati_aziendali_completati,
          referenti_completati,
          macchinari_completati,
          documenti_completati,
          completato_data
        )
      `)
      .eq('id', user.id)
      .single()

    // Verifica 1: Utente non esiste in customer_portal_users
    if (profileError || !customerProfile) {
      if (isDebug) console.log('❌ Utente non trovato in customer_portal_users')
      return NextResponse.redirect(new URL('/portal/unauthorized', req.url))
    }

    // Verifica 2: Utente non è attivo
    if (!customerProfile.attivo) {
      if (isDebug) console.log('❌ Utente customer disattivato')
      return NextResponse.redirect(new URL('/portal/unauthorized?reason=inactive', req.url))
    }

    if (isDebug) console.log('✅ Profilo customer valido:', customerProfile.email)

    // ===================================================================
    // STEP 4: Gestione Onboarding
    // ===================================================================
    
    // Se sta cercando di accedere alla dashboard, verifica onboarding
    if (pathname.startsWith('/portal/dashboard')) {
      const onboarding = customerProfile.onboarding?.[0] || customerProfile.onboarding
      
      // Se non esiste record onboarding o non è completato
      if (!onboarding || !onboarding.completato_data) {
        if (isDebug) console.log('⚠️ Onboarding non completato, redirect a /portal/onboarding')
        return NextResponse.redirect(new URL('/portal/onboarding', req.url))
      }

      // Verifica campi obbligatori completati
      const isComplete = 
        onboarding.dati_aziendali_completati &&
        onboarding.referenti_completati &&
        onboarding.macchinari_completati

      if (!isComplete) {
        if (isDebug) {
          console.log('⚠️ Onboarding incompleto:', {
            dati_aziendali: onboarding.dati_aziendali_completati,
            referenti: onboarding.referenti_completati,
            macchinari: onboarding.macchinari_completati
          })
        }
        return NextResponse.redirect(new URL('/portal/onboarding', req.url))
      }

      if (isDebug) console.log('✅ Onboarding completato, accesso dashboard consentito')
    }

    // Se sta accedendo all'onboarding ma è già completato, redirect a dashboard
    if (pathname.startsWith('/portal/onboarding')) {
      const onboarding = customerProfile.onboarding?.[0] || customerProfile.onboarding
      
      if (onboarding && onboarding.completato_data) {
        const isComplete = 
          onboarding.dati_aziendali_completati &&
          onboarding.referenti_completati &&
          onboarding.macchinari_completati

        if (isComplete) {
          if (isDebug) console.log('✅ Onboarding già completato, redirect a dashboard')
          return NextResponse.redirect(new URL('/portal/dashboard', req.url))
        }
      }
    }

    // ===================================================================
    // STEP 5: Accesso Consentito
    // ===================================================================
    
    if (isDebug) console.log('✅ Accesso consentito a:', pathname)
    return NextResponse.next()

  } catch (error) {
    console.error('❌ Errore middleware customer:', error)
    return NextResponse.redirect(new URL('/portal', req.url))
  }
}

export const config = {
  matcher: [
    '/portal/dashboard/:path*',
    '/portal/onboarding/:path*',
    '/portal/dati/:path*',
    '/portal/macchinari/:path*',
    '/portal/documenti/:path*',
    '/portal/ticket/:path*',
  ]
}
