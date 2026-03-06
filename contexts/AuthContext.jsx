'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve essere usato dentro AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // ✅ Skip AuthContext su rotte /portal
  const isPortalRoute = pathname?.startsWith('/portal')

  // ✅ FIX: Refs per evitare race condition e chiamate duplicate
  const isLoadingProfile = useRef(false)
  const profileLoadedForUser = useRef(null)
  const initDone = useRef(false)
  const mountedRef = useRef(true)

  const loadUserProfile = useCallback(async (userId) => {
    if (isPortalRoute) return

    // Guard: evita chiamate duplicate simultanee
    if (isLoadingProfile.current) {
      console.log('⏳ Profilo già in caricamento, skip')
      return
    }
    // Guard: evita ricaricamento se già caricato per questo utente
    if (profileLoadedForUser.current === userId) {
      console.log('✅ Profilo già caricato per questo utente')
      return
    }

    isLoadingProfile.current = true

    try {
      console.log('📊 Caricamento profilo utente:', userId)

      const { data: userData, error: userError } = await supabase
        .from('utenti')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!mountedRef.current) return

      if (userError) {
        console.error('⚠️ Profilo non trovato nel DB:', userError)
        setUserProfile({ id: userId, _isVirtual: true })
        return
      }

      if (!userData) {
        console.error('❌ User data è null')
        setUserProfile(null)
        return
      }

      console.log('✅ Profilo utente caricato:', userData.email)

      if (!userData.attivo) {
        console.error('❌ Account disattivato')
        setUserProfile(null)
        router.push('/unauthorized')
        return
      }

      setUserProfile(userData)
      profileLoadedForUser.current = userId

    } catch (error) {
      console.error('❌ Errore caricamento profilo utente:', error)
      if (mountedRef.current) setUserProfile(null)
    } finally {
      isLoadingProfile.current = false
    }
  }, [isPortalRoute, router])

  useEffect(() => {
    mountedRef.current = true

    if (isPortalRoute) {
      setLoading(false)
      return
    }

    // ✅ Inizializzazione auth con protezione race condition
    async function initAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!mountedRef.current) return

        if (error) {
          console.error('❌ Errore verifica sessione:', error)
          if (error.message?.includes('refresh_token_not_found') ||
              error.message?.includes('Invalid Refresh Token')) {
            await supabase.auth.signOut()
            setUser(null)
            setUserProfile(null)
          }
          return
        }

        if (session?.user) {
          console.log('✅ Sessione attiva:', session.user.email)
          setUser(session.user)
          await loadUserProfile(session.user.id)
        } else {
          console.log('❌ Nessuna sessione attiva')
        }
      } catch (error) {
        console.error('❌ Errore verifica sessione:', error)
      } finally {
        if (mountedRef.current) {
          initDone.current = true
          setLoading(false)
        }
      }
    }

    initAuth()

    // Listener per cambio auth
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current || isPortalRoute) return

        console.log('🔐 Auth event:', event)

        // ✅ FIX: INITIAL_SESSION gestito da initAuth, skip per evitare doppio load
        if (event === 'INITIAL_SESSION') {
          return
        }

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          // Carica profilo solo se initAuth è completato e non già caricato
          // NON resettare profileLoadedForUser qui - il reset avviene solo in signIn()
          if (initDone.current) {
            await loadUserProfile(session.user.id)
          }
        }
        else if (event === 'SIGNED_OUT') {
          setUser(null)
          setUserProfile(null)
          profileLoadedForUser.current = null
        }
        else if (event === 'TOKEN_REFRESHED') {
          console.log('✅ Token refreshed')
          if (session?.user) {
            setUser(session.user)
          }
        }
      }
    )

    // ✅ FIX: Timeout di sicurezza - forza fine loading dopo 6 secondi
    const safetyTimeout = setTimeout(() => {
      if (mountedRef.current && !initDone.current) {
        console.warn('⚠️ Timeout loading auth, forcing completion')
        initDone.current = true
        setLoading(false)
      }
    }, 6000)

    return () => {
      mountedRef.current = false
      authListener?.subscription?.unsubscribe()
      clearTimeout(safetyTimeout)
    }
  }, [isPortalRoute, loadUserProfile])

  async function refreshProfile() {
    if (!user?.id || isPortalRoute) return

    console.log('🔄 Ricaricamento profilo utente...')
    profileLoadedForUser.current = null
    await loadUserProfile(user.id)
  }

  async function signIn(email, password) {
    if (isPortalRoute) {
      console.warn('⚠️ signIn chiamato su rotta /portal - usa CustomerAuthContext!')
      return { data: null, error: new Error('Use CustomerAuthContext for portal') }
    }

    try {
      console.log('🔑 Tentativo login:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('❌ Errore auth:', error)
        throw error
      }
      
      console.log('✅ Auth successful:', data.user.email)
      
      if (data.user) {
        profileLoadedForUser.current = null // forza reload su nuovo login
        await loadUserProfile(data.user.id)
      }

      return { data, error: null }
    } catch (error) {
      console.error('❌ Errore login:', error)
      return { data: null, error }
    }
  }

  async function signUp(email, password, userData) {
    if (isPortalRoute) {
      console.warn('⚠️ signUp chiamato su rotta /portal - usa CustomerAuthContext!')
      return { data: null, error: new Error('Use CustomerAuthContext for portal') }
    }

    try {
      console.log('📝 Registrazione nuovo utente:', email)
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      })

      if (authError) throw authError

      if (authData.user) {
        console.log('👤 Creazione profilo utente DB...')
        
        const { error: dbError } = await supabase
          .from('utenti')
          .insert({
            id: authData.user.id,
            email: email,
            nome: userData.nome,
            cognome: userData.cognome,
            ruolo: userData.ruolo || 'tecnico',
            attivo: true
          })
        
        if (dbError) {
          console.error('❌ Errore creazione profilo DB:', dbError)
          throw dbError
        }
        
        console.log('✅ Profilo DB creato')
        await loadUserProfile(authData.user.id)
      }

      return { data: authData, error: null }
    } catch (error) {
      console.error('❌ Errore registrazione:', error)
      return { data: null, error }
    }
  }

  async function signOut() {
    try {
      console.log('👋 Logout...')
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      setUserProfile(null)
      router.push('/login')
    } catch (error) {
      console.error('❌ Errore logout:', error)
    }
  }

  async function resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('❌ Errore reset password:', error)
      return { error }
    }
  }

  async function updatePassword(newPassword) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('❌ Errore update password:', error)
      return { error }
    }
  }

  async function refreshSession() {
    if (isPortalRoute) return { session: null, error: null }

    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('❌ Error refreshing session:', error)
        await signOut()
        return { session: null, error }
      }

      console.log('✅ Session refreshed')
      if (data.session?.user) {
        setUser(data.session.user)
        await loadUserProfile(data.session.user.id)
      }
      return { session: data.session, error: null }
    } catch (error) {
      console.error('❌ Error refreshing session:', error)
      await signOut()
      return { session: null, error }
    }
  }

  const isAdmin = userProfile?.ruolo === 'admin'
  const isTecnico = userProfile?.ruolo === 'tecnico'
  const isActive = userProfile?.attivo === true

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
    refreshSession,
    isAdmin,
    isTecnico,
    isActive
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
