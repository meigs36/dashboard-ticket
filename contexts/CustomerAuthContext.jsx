'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const CustomerAuthContext = createContext({})

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext)
  if (!context) {
    throw new Error('useCustomerAuth deve essere usato dentro CustomerAuthProvider')
  }
  return context
}

export function CustomerAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [customerProfile, setCustomerProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Verifica sessione iniziale
    checkSession()

    // Listener per cambio auth
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Customer Auth event:', event)
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          await loadCustomerProfile(session.user.id)
        } 
        else if (event === 'SIGNED_OUT') {
          setUser(null)
          setCustomerProfile(null)
        }
        else if (event === 'TOKEN_REFRESHED') {
          console.log('✅ Customer token refreshed')
          if (session?.user) {
            setUser(session.user)
          }
        }
        else if (event === 'INITIAL_SESSION') {
          console.log('🔑 Customer Auth event: INITIAL_SESSION')
          if (session?.user) {
            setUser(session.user)
            await loadCustomerProfile(session.user.id)
          }
        }
      }
    )

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  async function checkSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ Errore verifica sessione customer:', error)
        
        // Gestisci errori refresh token
        if (error.message?.includes('refresh_token_not_found') || 
            error.message?.includes('Invalid Refresh Token')) {
          console.error('❌ Refresh token not found, clearing customer session')
          await supabase.auth.signOut()
          setUser(null)
          setCustomerProfile(null)
          setLoading(false)
          return
        }
        
        throw error
      }
      
      if (session?.user) {
        console.log('✅ Customer sessione attiva:', session.user.email)
        setUser(session.user)
        await loadCustomerProfile(session.user.id)
      } else {
        console.log('❌ Nessuna customer sessione attiva')
      }
    } catch (error) {
      console.error('❌ Errore verifica customer sessione:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadCustomerProfile(userId) {
    try {
      console.log('📊 Caricamento profilo cliente:', userId)
      
      // ✅ QUERY CORRETTA: Cerca in customer_portal_users
      const { data: customerUser, error: userError } = await supabase
        .from('customer_portal_users')
        .select(`
          *,
          cliente:clienti(*)
        `)
        .eq('id', userId)
        .maybeSingle() // Usa maybeSingle per evitare errori se non esiste

      if (userError) {
        console.error('❌ Profilo non trovato nel DB:', userError)
        
        // Se il profilo non esiste, potrebbe essere un nuovo utente
        // che deve completare l'onboarding
        console.log('⚠️ Usando profilo virtuale temporaneo')
        setCustomerProfile({
          id: userId,
          _needsOnboarding: true,
          _isVirtual: true
        })
        return
      }

      if (!customerUser) {
        console.error('❌ Customer user data è null')
        setCustomerProfile(null)
        return
      }

      console.log('✅ Profilo cliente caricato:', customerUser)
      
      // Verifica se ha accesso attivo
      if (!customerUser.attivo) {
        console.error('❌ Account cliente disattivato')
        setCustomerProfile(null)
        router.push('/portal/unauthorized')
        return
      }

      // Combina i dati
      const profile = {
        ...customerUser,
        // Dati aziendali dal gestionale (tabella clienti)
        ragione_sociale: customerUser.cliente?.ragione_sociale || customerUser.ragione_sociale,
        partita_iva: customerUser.cliente?.partita_iva,
        codice_fiscale: customerUser.cliente?.codice_fiscale,
        indirizzo: customerUser.cliente?.indirizzo,
        citta: customerUser.cliente?.citta,
        cap: customerUser.cliente?.cap,
        provincia: customerUser.cliente?.provincia,
        telefono: customerUser.cliente?.telefono || customerUser.telefono,
        email: customerUser.email,
        pec: customerUser.cliente?.pec,
        // Metadata
        cliente_id: customerUser.cliente_id,
        onboarding_completato: customerUser.cliente?.onboarding_completato || false
      }

      setCustomerProfile(profile)
      
      // Verifica stato onboarding
      await checkOnboardingStatus(userId, customerUser.cliente_id)

    } catch (error) {
      console.error('❌ Errore caricamento profilo cliente:', error)
      setCustomerProfile(null)
    }
  }

  async function checkOnboardingStatus(userId, clienteId) {
    try {
      // Verifica se esiste un record nella tabella customer_onboarding_status
      const { data, error } = await supabase
        .from('customer_onboarding_status')
        .select('*')
        .eq('cliente_id', clienteId)
        .maybeSingle() // Usa maybeSingle invece di single per evitare errore se non esiste
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found (ok)
        console.error('❌ Errore check onboarding:', error)
        return
      }

      if (!data) {
        console.log('⚠️ Onboarding status non trovato, necessario completare')
        setCustomerProfile(prev => ({ 
          ...prev, 
          _needsOnboarding: true,
          _onboardingStatus: null
        }))
        return
      }

      // Controlla se tutti gli step sono completati
      const isComplete = data.dati_aziendali_completati && 
                        data.referenti_completati && 
                        data.macchinari_completati &&
                        data.documenti_completati

      console.log('📋 Onboarding status:', isComplete ? 'Completato' : 'Da completare')
      
      setCustomerProfile(prev => ({ 
        ...prev, 
        _needsOnboarding: !isComplete,
        _onboardingStatus: data
      }))
      
    } catch (error) {
      console.error('❌ Errore check onboarding:', error)
    }
  }

  async function refreshProfile() {
    if (!user?.id) {
      console.warn('⚠️ Impossibile ricaricare profilo: cliente non loggato')
      return
    }
    
    console.log('🔄 Ricaricamento profilo cliente...')
    await loadCustomerProfile(user.id)
  }

  async function signIn(email, password) {
    try {
      console.log('🔑 Tentativo login cliente:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('❌ Errore auth cliente:', error)
        throw error
      }
      
      console.log('✅ Auth cliente successful:', data.user.email)
      
      // Carica profilo cliente
      if (data.user) {
        await loadCustomerProfile(data.user.id)
      }
      
      return { data, error: null }
    } catch (error) {
      console.error('❌ Errore login cliente:', error)
      return { data: null, error }
    }
  }

  async function signUp(email, password, customerData) {
    try {
      console.log('📝 Registrazione nuovo cliente:', email)
      
      // 1. Crea utente auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            tipo_account: 'customer'
          }
        }
      })

      if (authError) throw authError

      // 2. Crea profilo cliente nel DB
      if (authData.user) {
        console.log('👤 Creazione profilo cliente DB...')
        
        const { error: dbError } = await supabase
          .from('customer_portal_users')
          .insert({
            id: authData.user.id,
            cliente_id: customerData.cliente_id,
            email: email,
            attivo: true
          })
        
        if (dbError) {
          console.error('❌ Errore creazione profilo cliente DB:', dbError)
          throw dbError
        }
        
        console.log('✅ Profilo cliente DB creato')
        await loadCustomerProfile(authData.user.id)
      }

      return { data: authData, error: null }
    } catch (error) {
      console.error('❌ Errore registrazione cliente:', error)
      return { data: null, error }
    }
  }

  async function signOut() {
    try {
      console.log('👋 Logout cliente...')
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      setCustomerProfile(null)
      router.push('/portal')
    } catch (error) {
      console.error('❌ Errore logout cliente:', error)
    }
  }

  async function resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/portal/reset-password`
      })
      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('❌ Errore reset password cliente:', error)
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
      console.error('❌ Errore update password cliente:', error)
      return { error }
    }
  }

  async function updateProfile(updates) {
    try {
      if (!customerProfile?.id) {
        throw new Error('Nessun profilo cliente caricato')
      }

      console.log('📝 Aggiornamento profilo cliente...')
      
      const { data, error } = await supabase
        .from('customer_portal_users')
        .update(updates)
        .eq('id', customerProfile.id)
        .select()
        .single()

      if (error) throw error

      console.log('✅ Profilo cliente aggiornato')
      setCustomerProfile(data)
      return { data, error: null }
    } catch (error) {
      console.error('❌ Errore update profilo cliente:', error)
      return { data: null, error }
    }
  }

  // Helper per verificare stato onboarding
  const needsOnboarding = customerProfile?._needsOnboarding === true
  const isActive = customerProfile?.attivo === true

  const value = {
    user,
    customerProfile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile,
    needsOnboarding,
    isActive
  }

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>
}
