import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(req) {
  // Crea client Supabase per middleware
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase env vars mancanti nel middleware')
    return NextResponse.next()
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Verifica sessione dal cookie
  const token = req.cookies.get('sb-access-token')?.value
  const refreshToken = req.cookies.get('sb-refresh-token')?.value

  let session = null
  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user) {
      session = { user }
    }
  }

  // Route da proteggere
  const protectedPortalRoutes = ['/portal/dashboard', '/portal/onboarding']
  const isProtectedRoute = protectedPortalRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  )

  // Se route protetta e no sessione → redirect a login
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/portal', req.url)
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Se ha sessione, verifica che sia un cliente (customer_portal_users)
  if (isProtectedRoute && session) {
    try {
      const { data: customerProfile, error } = await supabase
        .from('customer_portal_users')
        .select('id, attivo')
        .eq('id', session.user.id)
        .single()

      // Se non è un cliente o non è attivo → unauthorized
      if (error || !customerProfile || !customerProfile.attivo) {
        return NextResponse.redirect(new URL('/portal/unauthorized', req.url))
      }

      // Se route è dashboard, verifica onboarding completato
      if (req.nextUrl.pathname.startsWith('/portal/dashboard')) {
        const { data: onboardingStatus } = await supabase
          .from('customer_onboarding_status')
          .select('*')
          .eq('customer_id', customerProfile.id)
          .single()

        // Se onboarding non completato → redirect a onboarding
        if (!onboardingStatus || 
            !onboardingStatus.dati_aziendali_completati ||
            !onboardingStatus.referenti_completati ||
            !onboardingStatus.macchinari_completati ||
            !onboardingStatus.documenti_completati) {
          return NextResponse.redirect(new URL('/portal/onboarding', req.url))
        }
      }
    } catch (error) {
      console.error('❌ Errore middleware customer:', error)
      return NextResponse.redirect(new URL('/portal', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    '/portal/dashboard/:path*',
    '/portal/onboarding/:path*'
  ]
}
