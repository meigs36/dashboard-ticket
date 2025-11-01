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
    // Controlla sessione attiva
    checkUser()

    // Ascolta cambiamenti auth
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth State Change:', event, session?.user?.email)
        const currentUser = session?.user ?? null
        setUser(currentUser)
        
        if (currentUser) {
          await loadUserProfile(currentUser.id)
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
        await loadUserProfile(currentUser.id)
      }
    } catch (error) {
      console.error('❌ Errore check user:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadUserProfile(userId) {
    try {
      console.log('👤 STEP 1: Inizio caricamento profilo')
      console.log('User ID:', userId)
      
      // ⏰ FIX: Aggiungi timeout di 10 secondi per evitare blocchi
      const queryPromise = supabase
        .from('utenti')
        .select('*')
        .eq('id', userId)
        .single()
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT_ERROR')), 10000)
      )
      
      console.log('👤 STEP 2: Esecuzione query con timeout 10s...')
      const result = await Promise.race([queryPromise, timeoutPromise])
      
      if (result.error) {
        console.error('❌ Errore database:', result.error)
        
        // Profilo non trovato
        if (result.error.code === 'PGRST116') {
          console.error('❌ PROFILO NON TROVATO per user:', userId)
          throw new Error('PROFILE_NOT_FOUND')
        }
        
        throw result.error
      }
      
      console.log('✅ STEP 3: Profilo caricato:', result.data)
      setUserProfile(result.data)
      
    } catch (error) {
      console.error('❌ Errore caricamento profilo:', error)
      
      // ⚠️ FALLBACK: Timeout o errore RLS → usa profilo minimale
      if (error.message === 'TIMEOUT_ERROR') {
        console.warn('⚠️ TIMEOUT - Possibile problema RLS su Supabase')
        console.warn('📋 Uso profilo minimale temporaneo')
        
        setUserProfile({
          id: userId,
          email: user?.email || 'unknown@email.com',
          ruolo: 'tecnico', // Ruolo default
          nome: 'Utente',
          cognome: 'Temporaneo',
          _isFallback: true,
          _error: 'timeout'
        })
        
        // Mostra alert all'utente
        setTimeout(() => {
          alert('⚠️ Problema di caricamento profilo. Funzionalità limitate. Verifica le policy RLS su Supabase.')
        }, 1000)
        
      } else if (error.message === 'PROFILE_NOT_FOUND') {
        console.error('❌ Profilo non esiste nel database')
        setUserProfile(null)
        alert('❌ Profilo utente non trovato. Contatta l\'amministratore.')
      } else {
        setUserProfile(null)
      }
    }
  }

  async function refreshProfile() {
    if (!user?.id) {
      console.warn('⚠️ Impossibile ricaricare profilo: utente non loggato')
      return
    }
    
    console.log('🔄 Ricaricamento profilo in corso...')
    try {
      await loadUserProfile(user.id)
      console.log('✅ Profilo ricaricato con successo')
    } catch (error) {
      console.error('❌ Errore ricaricamento profilo:', error)
      throw error
    }
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
      
      // Carica profilo
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
        password
      })

      if (authError) throw authError

      // 2. Crea profilo utente
      if (authData.user) {
        console.log('👤 Creazione profilo per:', authData.user.id)
        
        const { error: profileError } = await supabase
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

        if (profileError) {
          console.error('❌ Errore creazione profilo:', profileError)
          throw profileError
        }
        
        console.log('✅ Profilo creato con successo')
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
