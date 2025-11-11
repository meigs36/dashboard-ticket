'use client'

import { createContext, useContext, useState, useEffect } from 'react'
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

  // ✅ FIX: Skip AuthContext su rotte /portal
  const isPortalRoute = pathname?.startsWith('/portal')

  useEffect(() => {
    // ✅ Se siamo su /portal, usa CustomerAuthContext invece
    if (isPortalRoute) {
      setLoading(false)
      return
    }

    // Verifica sessione iniziale
    checkSession()

    // Listener per cambio auth
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // ✅ Skip se siamo su /portal
        if (isPortalRoute) return

        console.log('🔐 Auth event:', event)
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          await loadUserProfile(session.user.id)
        } 
        else if (event === 'SIGNED_OUT') {
          setUser(null)
          setUserProfile(null)
        }
        else if (event === 'TOKEN_REFRESHED') {
          console.log('✅ Token refreshed')
          if (session?.user) {
            setUser(session.user)
          }
        }
      }
    )

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [isPortalRoute])

  async function checkSession() {
    // ✅ Skip se siamo su /portal
    if (isPortalRoute) {
      setLoading(false)
      return
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ Errore verifica sessione:', error)
        
        if (error.message?.includes('refresh_token_not_found') || 
            error.message?.includes('Invalid Refresh Token')) {
          console.error('❌ Refresh token not found, clearing session')
          await supabase.auth.signOut()
          setUser(null)
          setUserProfile(null)
          setLoading(false)
          return
        }
        
        throw error
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
      setLoading(false)
    }
  }

  async function loadUserProfile(userId) {
    // ✅ Skip se siamo su /portal
    if (isPortalRoute) return

    try {
      console.log('📊 Caricamento profilo utente:', userId)
      
      // Cerca in utenti (admin/tecnici)
      const { data: userData, error: userError } = await supabase
        .from('utenti')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (userError) {
        console.error('⚠️ Profilo non trovato nel DB:', userError)
        console.log('⚠️ Usando profilo virtuale temporaneo')
        setUserProfile({
          id: userId,
          _isVirtual: true
        })
        return
      }

      if (!userData) {
        console.error('❌ User data è null')
        setUserProfile(null)
        return
      }

      console.log('✅ Profilo utente caricato:', userData)
      
      if (!userData.attivo) {
        console.error('❌ Account disattivato')
        setUserProfile(null)
        router.push('/unauthorized')
        return
      }

      setUserProfile(userData)
      
    } catch (error) {
      console.error('❌ Errore caricamento profilo utente:', error)
      setUserProfile(null)
    }
  }

  async function refreshProfile() {
    if (!user?.id || isPortalRoute) return
    
    console.log('🔄 Ricaricamento profilo utente...')
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
