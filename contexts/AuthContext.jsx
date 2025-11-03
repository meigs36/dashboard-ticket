'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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

  useEffect(() => {
    // Verifica sessione iniziale
    checkSession()

    // Listener per cambio auth
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth event:', event)
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          await loadUserProfile(session.user.id)
        } 
        else if (event === 'SIGNED_OUT') {
          setUser(null)
          setUserProfile(null)
        }
        // ✅ Gestisci refresh automatico del token
        else if (event === 'TOKEN_REFRESHED') {
          console.log('✅ Token refreshed successfully')
          if (session?.user) {
            setUser(session.user)
            // Non ricaricare profilo ogni volta, solo se serve
          }
        }
      }
    )

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, []) // ✅ FIX: Array vuoto - esegue solo una volta!

  async function checkSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      // ✅ Gestisci errore refresh_token_not_found
      if (error) {
        console.error('❌ Errore verifica sessione:', error)
        
        // Se errore di refresh token, pulisci tutto e vai a login
        if (error.message?.includes('refresh_token_not_found') || 
            error.message?.includes('Invalid Refresh Token')) {
          console.error('❌ Refresh token not found, clearing session')
          await supabase.auth.signOut()
          setUser(null)
          setUserProfile(null)
          setLoading(false)
          router.push('/login')
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

  // 🆕 CARICA PROFILO REALE DAL DATABASE
  async function loadUserProfile(userId) {
    try {
      console.log('📊 Caricamento profilo utente:', userId)
      
      const { data, error } = await supabase
        .from('utenti')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // Se il profilo non esiste nel DB, potrebbe essere un utente appena creato
        console.warn('⚠️ Profilo non trovato nel DB:', error.message)
        
        // Verifica se l'utente esiste in auth
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        
        if (!authError && authUser) {
          // Crea profilo virtuale temporaneo (per retrocompatibilità)
          const virtualProfile = {
            id: authUser.id,
            email: authUser.email,
            nome: authUser.email.split('@')[0],
            cognome: '',
            ruolo: 'tecnico', // Default
            attivo: true,
            _isVirtual: true
          }
          console.log('⚠️ Usando profilo virtuale temporaneo')
          setUserProfile(virtualProfile)
        }
        return
      }

      console.log('✅ Profilo caricato:', data)
      setUserProfile(data)
    } catch (error) {
      console.error('❌ Errore caricamento profilo:', error)
    }
  }

  async function refreshProfile() {
    if (!user?.id) {
      console.warn('⚠️ Impossibile ricaricare profilo: utente non loggato')
      return
    }
    
    console.log('🔄 Ricaricamento profilo...')
    await loadUserProfile(user.id)
  }

  async function signIn(email, password) {
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
      
      // Carica profilo reale
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
    try {
      console.log('📝 Registrazione nuovo utente:', email)
      
      // 1. Crea utente auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome: userData.nome,
            cognome: userData.cognome
          }
        }
      })

      if (authError) throw authError

      // 2. Crea profilo nel DB
      if (authData.user) {
        console.log('👤 Creazione profilo DB...')
        
        const { error: dbError } = await supabase
          .from('utenti')
          .insert({
            id: authData.user.id,
            email: email,
            nome: userData.nome,
            cognome: userData.cognome,
            ruolo: userData.ruolo || 'tecnico',
            telefono: userData.telefono || null,
            attivo: true
          })
        
        if (dbError) {
          console.error('❌ Errore creazione profilo DB:', dbError)
          // Non blocchiamo la registrazione se il DB fallisce
        } else {
          console.log('✅ Profilo DB creato')
          await loadUserProfile(authData.user.id)
        }
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

  // ✅ Funzione per forzare refresh sessione (debug)
  async function refreshSession() {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('❌ Error refreshing session:', error)
        // Se fallisce, logout
        await signOut()
        return { session: null, error }
      }

      console.log('✅ Session refreshed manually')
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

  // 🔒 HELPER PER PERMESSI
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
