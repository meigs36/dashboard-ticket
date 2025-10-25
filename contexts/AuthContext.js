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
  console.log('==================================')
  console.log('👤 STEP 1: Inizio caricamento profilo')
  console.log('User ID:', userId)
  console.log('==================================')
  
  try {
    console.log('👤 STEP 2: Preparazione query Supabase...')
    console.log('Tabella: utenti')
    console.log('Filtro: id =', userId)
    
    const startTime = Date.now()
    
    const { data, error } = await supabase
      .from('utenti')
      .select('*')
      .eq('id', userId)
      .single()
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    console.log('==================================')
    console.log('👤 STEP 3: Risposta ricevuta')
    console.log('Tempo impiegato:', duration, 'ms')
    console.log('Data ricevuta:', data)
    console.log('Error ricevuto:', error)
    console.log('==================================')

    if (error) {
      console.error('❌ STEP 4: ERRORE nel caricamento profilo')
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      console.error('Error details:', error.details)
      console.error('Error hint:', error.hint)
      
      // Se l'errore è che il profilo non esiste
      if (error.code === 'PGRST116') {
        console.error('❌ PROFILO NON TROVATO per user:', userId)
        alert('⚠️ Il tuo profilo utente non è stato trovato nel database. Contatta l\'amministratore.')
      }
      
      throw error
    }
    
    if (!data) {
      console.error('❌ STEP 4: ERRORE - Dati vuoti')
      throw new Error('Profilo vuoto dalla query')
    }
    
    console.log('✅ STEP 4: SUCCESSO - Profilo caricato!')
    console.log('Nome:', data.nome)
    console.log('Cognome:', data.cognome)
    console.log('Ruolo:', data.ruolo)
    console.log('==================================')
    
    setUserProfile(data)
    
  } catch (error) {
    console.error('==================================')
    console.error('❌ ERRORE GENERALE caricamento profilo')
    console.error('Tipo errore:', error.constructor.name)
    console.error('Messaggio:', error.message)
    console.error('Stack:', error.stack)
    console.error('==================================')
    setUserProfile(null)
  }
}

  // ✅ NUOVA FUNZIONE: Ricarica profilo senza reload pagina
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
    refreshProfile, // ✅ AGGIUNTA: Esporta la nuova funzione
    isAdmin,
    isTecnico
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
