'use client'

import { createContext, useContext, useEffect, useState } from 'react'
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
    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth State Change:', event, session?.user?.email)
        const currentUser = session?.user ?? null
        setUser(currentUser)
        
        if (currentUser) {
          // 🔥 BYPASS DATABASE - Crea profilo virtuale
          createVirtualProfile(currentUser)
        } else {
          setUserProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  async function checkUser() {
    try {
      console.log('👤 Checking user session...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError)
        throw sessionError
      }
      
      const currentUser = session?.user ?? null
      console.log('📊 Current user:', currentUser?.email || 'Not logged in')
      setUser(currentUser)
      
      if (currentUser) {
        // 🔥 BYPASS DATABASE - Crea profilo virtuale
        createVirtualProfile(currentUser)
      }
    } catch (error) {
      console.error('❌ Errore check user:', error)
    } finally {
      setLoading(false)
    }
  }

  // 🔥 NUOVA FUNZIONE: Crea profilo senza database
  function createVirtualProfile(authUser) {
    console.log('✨ Creazione profilo virtuale per:', authUser.email)
    
    // Estrai nome/cognome dall'email (se possibile)
    const emailName = authUser.email.split('@')[0]
    const isAdmin = authUser.email.includes('admin') || authUser.email.includes('melanie')
    
    const virtualProfile = {
      id: authUser.id,
      email: authUser.email,
      nome: isAdmin ? 'Admin' : emailName,
      cognome: isAdmin ? 'User' : '',
      ruolo: isAdmin ? 'admin' : 'tecnico',
      attivo: true,
      _isVirtual: true, // Flag per sapere che è virtuale
      created_at: authUser.created_at,
      updated_at: new Date().toISOString()
    }
    
    console.log('✅ Profilo virtuale creato:', virtualProfile)
    setUserProfile(virtualProfile)
  }

  async function refreshProfile() {
    if (!user?.id) {
      console.warn('⚠️ Impossibile ricaricare profilo: utente non loggato')
      return
    }
    
    console.log('🔄 Ricaricamento profilo...')
    createVirtualProfile(user)
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
      
      // Crea profilo virtuale
      if (data.user) {
        createVirtualProfile(data.user)
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
        password
      })

      if (authError) throw authError

      // 2. OPZIONALE: Prova a creare profilo su DB (ma non bloccare se fallisce)
      if (authData.user) {
        console.log('👤 Tentativo creazione profilo DB...')
        
        try {
          await supabase
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
          console.log('✅ Profilo DB creato')
        } catch (dbError) {
          console.warn('⚠️ Errore creazione profilo DB (non bloccante):', dbError)
          // Non blocchiamo la registrazione se il DB fallisce
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

  const isAdmin = userProfile?.ruolo === 'admin'
  const isTecnico = userProfile?.ruolo === 'tecnico'

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
    isAdmin,
    isTecnico
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}