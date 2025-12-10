// contexts/CustomerAuthContext.jsx
// Context di autenticazione per il Portale Clienti
// ✅ FIX 10 Dic 2025: Risolto loop infinito su visibilitychange

'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
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

  // Stati per gestione multi-sede
  const [sediCollegate, setSediCollegate] = useState([])
  const [sedeAttiva, setSedeAttiva] = useState(null)

  // ✅ FIX: Refs per evitare loop
  const isCheckingSession = useRef(false)
  const lastCheckTime = useRef(0)
  const profileLoadedRef = useRef(false)

  // ✅ FIX: Check sessione senza loop
  const checkSession = useCallback(async () => {
    // Evita check multipli simultanei
    if (isCheckingSession.current) {
      console.log('⏳ Check sessione già in corso, skip')
      return
    }

    // Evita check troppo frequenti (minimo 10 secondi)
    const now = Date.now()
    if (now - lastCheckTime.current < 10000) {
      console.log('⏳ Check recente, skip')
      return
    }

    isCheckingSession.current = true
    lastCheckTime.current = now

    try {
      console.log('🔍 Verifica sessione customer...')
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ Errore verifica sessione customer:', error)
        
        if (error.message?.includes('refresh_token_not_found') || 
            error.message?.includes('Invalid Refresh Token')) {
          await supabase.auth.signOut()
          setUser(null)
          setCustomerProfile(null)
          setSediCollegate([])
          setSedeAttiva(null)
          profileLoadedRef.current = false
        }
        setLoading(false)
        isCheckingSession.current = false
        return
      }
      
      if (session?.user) {
        console.log('✅ Customer sessione attiva:', session.user.email)
        setUser(session.user)
        
        // ✅ FIX: Carica profilo SOLO se non già caricato
        if (!profileLoadedRef.current) {
          await loadCustomerProfile(session.user.id)
          profileLoadedRef.current = true
        }
      } else {
        console.log('❌ Nessuna customer sessione attiva')
        setUser(null)
        setCustomerProfile(null)
        profileLoadedRef.current = false
      }
    } catch (error) {
      console.error('❌ Errore verifica customer sessione:', error)
    } finally {
      setLoading(false)
      isCheckingSession.current = false
    }
  }, [])

  // Setup iniziale
  useEffect(() => {
    // Verifica sessione iniziale
    checkSession()

    // Listener per cambio auth
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Customer Auth event:', event)
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          if (!profileLoadedRef.current) {
            await loadCustomerProfile(session.user.id)
            profileLoadedRef.current = true
          }
        } 
        else if (event === 'SIGNED_OUT') {
          setUser(null)
          setCustomerProfile(null)
          setSediCollegate([])
          setSedeAttiva(null)
          profileLoadedRef.current = false
        }
        else if (event === 'TOKEN_REFRESHED') {
          console.log('✅ Customer token refreshed')
          if (session?.user) {
            setUser(session.user)
          }
        }
        else if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            setUser(session.user)
            if (!profileLoadedRef.current) {
              await loadCustomerProfile(session.user.id)
              profileLoadedRef.current = true
            }
          }
          setLoading(false)
        }
      }
    )

    // ✅ FIX: Visibility change semplificato - NO reload profilo
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ App tornata visibile')
        // Solo forza fine loading, NON ricaricare profilo
        if (loading) {
          setLoading(false)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Timeout di sicurezza
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Timeout loading auth, forcing completion')
        setLoading(false)
      }
    }, 8000)

    return () => {
      authListener?.subscription?.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearTimeout(timeout)
    }
  }, [])

  async function loadCustomerProfile(userId) {
    try {
      console.log('📊 Caricamento profilo cliente:', userId)
      
      const { data: customerUser, error: userError } = await supabase
        .from('customer_portal_users')
        .select(`
          *,
          cliente:clienti(*)
        `)
        .eq('id', userId)
        .maybeSingle()

      if (userError) {
        console.error('❌ Profilo non trovato nel DB:', userError)
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

      console.log('✅ Dati utente caricati:', customerUser.cliente?.ragione_sociale)
      
      if (!customerUser.attivo) {
        console.error('❌ Account cliente disattivato')
        setCustomerProfile(null)
        router.push('/portal/unauthorized')
        return
      }

      const profile = {
        id: customerUser.id,
        cliente_id: customerUser.cliente_id,
        email: customerUser.email,
        attivo: customerUser.attivo,
        created_at: customerUser.created_at,
        updated_at: customerUser.updated_at,
        ragione_sociale: customerUser.cliente?.ragione_sociale || '',
        partita_iva: customerUser.cliente?.partita_iva || '',
        codice_fiscale: customerUser.cliente?.codice_fiscale || '',
        codice_cliente: customerUser.cliente?.codice_cliente || '',
        indirizzo: customerUser.cliente?.indirizzo || '',
        citta: customerUser.cliente?.citta || '',
        cap: customerUser.cliente?.cap || '',
        provincia: customerUser.cliente?.provincia || '',
        telefono: customerUser.cliente?.telefono_principale || '',
        email_cliente: customerUser.cliente?.email_principale || customerUser.email,
        pec: customerUser.cliente?.email_pec || '',
        email_amministrazione: customerUser.cliente?.email_amministrazione || '',
        sito_web: customerUser.cliente?.sito_web || '',
        note: customerUser.cliente?.note || '',
        onboarding_completato: customerUser.cliente?.onboarding_completato || false,
        cliente: customerUser.cliente
      }

      setCustomerProfile(profile)

      if (customerUser.cliente?.partita_iva) {
        await loadSediCollegate(customerUser.cliente.partita_iva, customerUser.cliente_id)
      } else {
        setSediCollegate([])
        setSedeAttiva(null)
      }
      
      await checkOnboardingStatus(userId, customerUser.cliente_id)

    } catch (error) {
      console.error('❌ Errore caricamento profilo cliente:', error)
      setCustomerProfile(null)
    }
  }

  async function loadSediCollegate(partitaIva, clienteIdPrincipale) {
    try {
      console.log('🏢 Ricerca sedi collegate per P.IVA:', partitaIva)

      const { data: sedi, error } = await supabase
        .from('clienti')
        .select(`
          id,
          codice_cliente,
          ragione_sociale,
          partita_iva,
          indirizzo,
          citta,
          cap,
          provincia,
          telefono_principale,
          email_principale
        `)
        .eq('partita_iva', partitaIva)
        .eq('attivo', true)
        .order('ragione_sociale')

      if (error) {
        console.error('❌ Errore caricamento sedi:', error)
        setSediCollegate([])
        setSedeAttiva(null)
        return
      }

      console.log(`✅ Trovate ${sedi?.length || 0} sedi`)

      if (sedi && sedi.length > 0) {
        const sediFormattate = sedi.map(sede => ({
          ...sede,
          label: `${sede.citta || 'N/D'} - ${sede.indirizzo || sede.ragione_sociale}`,
          isPrincipale: sede.id === clienteIdPrincipale
        }))

        setSediCollegate(sediFormattate)

        // Ripristina sede da localStorage o usa principale
        let sedeIniziale = sediFormattate.find(s => s.isPrincipale) || sediFormattate[0]
        
        if (typeof window !== 'undefined') {
          const sedeIdSalvata = localStorage.getItem('sedeAttiva')
          if (sedeIdSalvata) {
            const sedeSalvata = sediFormattate.find(s => s.id === sedeIdSalvata)
            if (sedeSalvata) {
              sedeIniziale = sedeSalvata
            }
          }
        }

        setSedeAttiva(sedeIniziale)
        console.log('📍 Sede attiva:', sedeIniziale?.codice_cliente)
      } else {
        setSediCollegate([])
        setSedeAttiva(null)
      }

    } catch (error) {
      console.error('❌ Errore caricamento sedi:', error)
      setSediCollegate([])
      setSedeAttiva(null)
    }
  }

  function cambiaSedeAttiva(clienteId) {
    const nuovaSede = sediCollegate.find(s => s.id === clienteId)
    
    if (nuovaSede) {
      console.log('🔄 Cambio sede attiva:', nuovaSede.codice_cliente)
      setSedeAttiva(nuovaSede)
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('sedeAttiva', clienteId)
      }
      
      return true
    }
    
    return false
  }

  async function checkOnboardingStatus(userId, clienteId) {
    try {
      const { data, error } = await supabase
        .from('customer_onboarding_status')
        .select('*')
        .eq('cliente_id', clienteId)
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') {
        console.error('❌ Errore check onboarding:', error)
        return
      }

      if (!data) {
        setCustomerProfile(prev => ({ 
          ...prev, 
          _needsOnboarding: true,
          _onboardingStatus: null
        }))
        return
      }

      const isComplete = data.dati_aziendali_completati && 
                        data.referenti_completati && 
                        data.macchinari_completati &&
                        data.documenti_completati

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
    if (!user?.id) return
    console.log('🔄 Ricaricamento profilo cliente...')
    profileLoadedRef.current = false
    await loadCustomerProfile(user.id)
    profileLoadedRef.current = true
  }

  async function signIn(email, password) {
    try {
      console.log('🔑 Tentativo login cliente:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error
      
      if (data.user) {
        profileLoadedRef.current = false
        await loadCustomerProfile(data.user.id)
        profileLoadedRef.current = true
      }
      
      return { data, error: null }
    } catch (error) {
      console.error('❌ Errore login cliente:', error)
      return { data: null, error }
    }
  }

  async function signUp(email, password, customerData) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { tipo_account: 'customer' }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        const { error: dbError } = await supabase
          .from('customer_portal_users')
          .insert({
            id: authData.user.id,
            cliente_id: customerData.cliente_id,
            email: email,
            attivo: true
          })
        
        if (dbError) throw dbError
        
        profileLoadedRef.current = false
        await loadCustomerProfile(authData.user.id)
        profileLoadedRef.current = true
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
      setSediCollegate([])
      setSedeAttiva(null)
      profileLoadedRef.current = false
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sedeAttiva')
      }
      
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
      return { error }
    }
  }

  async function updatePassword(newPassword) {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  async function updateProfile(updates) {
    try {
      if (!customerProfile?.id) throw new Error('Nessun profilo cliente')

      const { data, error } = await supabase
        .from('customer_portal_users')
        .update(updates)
        .eq('id', customerProfile.id)
        .select()
        .single()

      if (error) throw error

      setCustomerProfile(data)
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const needsOnboarding = customerProfile?._needsOnboarding === true
  const isActive = customerProfile?.attivo === true
  const isMultiSede = sediCollegate.length > 1

  const value = {
    user,
    customerProfile,
    loading,
    authLoading: loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile,
    needsOnboarding,
    isActive,
    sediCollegate,
    sedeAttiva,
    cambiaSedeAttiva,
    isMultiSede
  }

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>
}
