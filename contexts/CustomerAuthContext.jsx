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
      
      // Cerca in customer_portal_users (non in utenti!)
      const { data, error } = await supabase
        .from('customer_portal_users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('❌ Profilo cliente non trovato:', error.message)
        
        // Verifica se utente esiste in auth
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        
        if (!authError && authUser) {
          // Profilo virtuale temporaneo
          const virtualProfile = {
            id: authUser.id,
            email: authUser.email,
            ragione_sociale: authUser.email.split('@')[0],
            _isVirtual: true,
            _needsOnboarding: true
          }
          console.log('⚠️ Usando profilo virtuale cliente (onboarding necessario)')
          setCustomerProfile(virtualProfile)
        }
        return
      }

      console.log('✅ Profilo cliente caricato:', data.ragione_sociale)
      setCustomerProfile(data)
      
      // Verifica se onboarding completato
      await checkOnboardingStatus(data.id)
      
    } catch (error) {
      console.error('❌ Errore caricamento profilo cliente:', error)
    }
  }

  async function checkOnboardingStatus(customerId) {
    try {
      const { data, error } = await supabase
        .from('customer_onboarding_status')
        .select('*')
        .eq('customer_id', customerId)
        .single()

      if (error || !data) {
        console.log('⚠️ Onboarding status non trovato, necessario completare')
        setCustomerProfile(prev => ({ ...prev, _needsOnboarding: true }))
        return
      }

      // Verifica completamento
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
            ragione_sociale: customerData.ragione_sociale,
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
            cliente_id: customerData.cliente_id, // Collegamento al gestionale
            email: email,
            ragione_sociale: customerData.ragione_sociale,
            partita_iva: customerData.partita_iva || null,
            codice_fiscale: customerData.codice_fiscale || null,
            telefono: customerData.telefono || null,
            attivo: true
          })
        
        if (dbError) {
          console.error('❌ Errore creazione profilo cliente DB:', dbError)
          throw dbError
        } else {
          console.log('✅ Profilo cliente DB creato')
          await loadCustomerProfile(authData.user.id)
        }
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
