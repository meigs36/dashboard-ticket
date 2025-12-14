// app/portal/onboarding/page.js
// Onboarding Intelligente - Carica dati esistenti se cliente già presente
//
// 🔧 MODIFICHE APPLICATE (4 Dic 2025):
// 1. ✅ MULTI-SEDE: Usa sedeAttiva invece di customerProfile.cliente_id
// 2. ✅ MULTI-SEDE: SedePicker nell'header per cambio sede
// 3. ✅ MULTI-SEDE: Ricarica dati quando cambia sede
// 4. ✅ MULTI-SEDE: Banner info sede corrente

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import CustomerOnboardingWizard from '@/components/CustomerOnboardingWizard'
import SedePicker from '@/components/SedePicker'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, Loader2, AlertCircle, Building2, MapPin } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const { 
    user, 
    customerProfile, 
    authLoading,
    // ✅ MULTI-SEDE
    sedeAttiva,
    sediCollegate,
    isMultiSede 
  } = useCustomerAuth()
  
  const [isComplete, setIsComplete] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [preloadedData, setPreloadedData] = useState(null)
  const [error, setError] = useState(null)

  // Protezione route: solo utenti loggati
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('❌ Non autenticato, redirect a /portal')
      router.push('/portal')
    }
  }, [user, authLoading, router])

  // ✅ MULTI-SEDE: Carica dati esistenti per la sede attiva
  useEffect(() => {
    async function loadExistingData() {
      // Aspetta che sedeAttiva sia disponibile (per multi-sede) o usa customerProfile
      const clienteId = sedeAttiva?.id || customerProfile?.cliente_id
      
      if (!clienteId) {
        console.log('⏳ Attendo cliente_id...')
        return
      }

      setLoadingData(true)
      setPreloadedData(null) // Reset dati precedenti
      
      try {
        console.log('🔍 Caricamento dati per sede:', clienteId, sedeAttiva?.citta || '')
        
        // 1. Carica dati cliente
        const { data: clienteData, error: clienteError } = await supabase
          .from('clienti')
          .select('*')
          .eq('id', clienteId)
          .single()

        if (clienteError) {
          throw clienteError
        }

        if (!clienteData) {
          console.log('ℹ️ Nessun cliente trovato')
          setLoadingData(false)
          return
        }

        console.log('✅ Cliente trovato:', clienteData.ragione_sociale)

        // 2. Carica referenti esistenti
        const { data: referentiData } = await supabase
          .from('customer_referenti')
          .select('*')
          .eq('cliente_id', clienteId)
          .eq('attivo', true)

        console.log(`📋 Caricati ${referentiData?.length || 0} referenti`)

        // 3. Carica macchinari esistenti
        const { data: macchinariData } = await supabase
          .from('macchinari')
          .select('*')
          .eq('id_cliente', clienteId)
          .eq('stato', 'attivo')

        console.log(`🔧 Caricati ${macchinariData?.length || 0} macchinari`)

        // 4. Prepara dati per il wizard
        const formattedData = {
          // Step 1: Dati Aziendali
          ragione_sociale: clienteData.ragione_sociale || '',
          partita_iva: clienteData.partita_iva || '',
          codice_fiscale: clienteData.codice_fiscale || '',
          indirizzo: clienteData.indirizzo || '',
          citta: clienteData.citta || '',
          cap: clienteData.cap || '',
          provincia: clienteData.provincia || '',
          telefono: clienteData.telefono_principale || '',
          email: clienteData.email_principale || user?.email || '',
          pec: clienteData.email_pec || '',
          email_amministrazione: clienteData.email_amministrazione || '',
          sito_web: clienteData.sito_web || '',
          note: clienteData.note || '',
          
          // Step 2: Referenti (formatta per il wizard)
          referenti: referentiData && referentiData.length > 0
            ? referentiData.map(ref => ({
                nome: ref.nome || '',
                cognome: ref.cognome || '',
                ruolo: ref.ruolo || '',
                telefono: ref.telefono || '',
                email: ref.email || '',
                principale: ref.principale || false
              }))
            : [{
                nome: '',
                cognome: '',
                ruolo: '',
                telefono: '',
                email: '',
                principale: true
              }],
          
          // Step 3: Macchinari (formatta per il wizard)
          macchinari: macchinariData && macchinariData.length > 0
            ? macchinariData.map(mac => ({
                tipo: mac.tipo_macchinario || '',
                marca: mac.marca || '',
                modello: mac.modello || '',
                numero_seriale: mac.numero_seriale || '',
                data_installazione: mac.data_installazione || '',
                ubicazione: mac.ubicazione_specifica || '',
                numero_libro: mac.numero_libro || '',
                garanzia_scadenza: mac.garanzia_scadenza || '',
                contratto_manutenzione: mac.contratto_manutenzione === 'attivo',
                note_tecniche: mac.note_tecniche || ''
              }))
            : [{
                tipo: '',
                marca: '',
                modello: '',
                numero_seriale: '',
                data_installazione: '',
                ubicazione: '',
                numero_libro: '',
                garanzia_scadenza: '',
                contratto_manutenzione: false,
                note_tecniche: ''
              }],
          
          // Step 4: Documenti (vuoto, da caricare nel wizard)
          documenti: [],
          
          // Metadata
          _clienteEsistente: true,
          _clienteId: clienteData.id,
          _codiceCliente: clienteData.codice_cliente,
          _sedeInfo: sedeAttiva ? {
            citta: sedeAttiva.citta,
            indirizzo: sedeAttiva.indirizzo,
            codice: sedeAttiva.codice_cliente
          } : null,
          _numeroMacchinari: macchinariData?.length || 0,
          _numeroReferenti: referentiData?.length || 0
        }

        console.log('✨ Dati pre-caricati con successo per sede:', clienteData.codice_cliente)
        setPreloadedData(formattedData)

      } catch (err) {
        console.error('❌ Errore caricamento dati:', err)
        setError('Errore nel caricamento dei dati esistenti. Puoi comunque procedere.')
      } finally {
        setLoadingData(false)
      }
    }

    if (user && !authLoading) {
      loadExistingData()
    }
  }, [user, authLoading, sedeAttiva?.id]) // ✅ Ricarica quando cambia sede

  // ==================== HANDLER COMPLETAMENTO ONBOARDING ====================
  
  const handleOnboardingComplete = async (wizardData) => {
    console.log('📤 Invio dati onboarding all\'API...')
    
    // ✅ MULTI-SEDE: Aggiungi cliente_id della sede attiva
    const dataWithClienteId = {
      ...wizardData,
      cliente_id: sedeAttiva?.id || customerProfile?.cliente_id
    }
    
    try {
      const response = await fetch('/api/customer/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataWithClienteId)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Errore durante il salvataggio')
      }

      console.log('✅ Onboarding salvato con successo:', result)
      
      // Mostra schermata successo
      setIsComplete(true)
      
      // Delay prima del redirect
      setTimeout(() => {
        router.push('/portal/dashboard')
      }, 2000)

    } catch (err) {
      console.error('❌ Errore completamento onboarding:', err)
      alert('Errore durante il salvataggio: ' + err.message + '\nRiprova o contatta il supporto.')
      throw err
    }
  }

  // Loading state iniziale
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    )
  }

  // Non autenticato
  if (!user) {
    return null
  }

  // Caricamento dati esistenti
  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-900 font-semibold mb-2">Caricamento dati...</p>
          <p className="text-gray-600 text-sm">
            {isMultiSede && sedeAttiva 
              ? `Caricamento dati per sede: ${sedeAttiva.citta}`
              : 'Stiamo controllando se hai già dei dati nel nostro sistema'
            }
          </p>
        </div>
      </div>
    )
  }

  // Messaggio di successo
  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-100">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Onboarding Completato!
          </h2>
          <p className="text-gray-600 mb-6">
            I tuoi dati sono stati salvati con successo.
            {isMultiSede && sedeAttiva && (
              <>
                <br />
                <span className="text-sm text-gray-500">
                  Sede: {sedeAttiva.citta} ({sedeAttiva.codice_cliente})
                </span>
              </>
            )}
            <br />
            Tra pochi istanti verrai reindirizzato alla dashboard...
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Reindirizzamento in corso...</span>
          </div>
        </div>
      </div>
    )
  }

  // ✅ MULTI-SEDE: Banner info sede corrente
  const SedeBanner = () => {
    if (!isMultiSede || !sedeAttiva) return null

    return (
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">
                Compilazione Infrastruttura Sede
              </h3>
              <p className="text-blue-700 text-sm">
                📍 {sedeAttiva.citta} - {sedeAttiva.indirizzo || sedeAttiva.ragione_sociale} ({sedeAttiva.codice_cliente})
              </p>
            </div>
          </div>
          <SedePicker />
        </div>
        <p className="text-blue-600 text-xs mt-2">
          💡 Hai {sediCollegate.length} sedi. Puoi compilare l'infrastruttura per ciascuna sede separatamente.
        </p>
      </div>
    )
  }

  // Banner se dati pre-caricati
  const DataLoadedBanner = () => {
    if (!preloadedData?._clienteEsistente) return null

    return (
      <div className="bg-green-50 border-l-4 border-green-500 p-6 mb-8 rounded-r-lg">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-green-900 mb-2">
              🎉 Dati Esistenti Caricati!
            </h3>
            <p className="text-green-800 text-sm mb-3 leading-relaxed">
              Abbiamo trovato i tuoi dati nel nostro sistema e li abbiamo pre-caricati per te:
            </p>
            <ul className="space-y-1 text-sm text-green-700">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                <span>Dati aziendali completi</span>
              </li>
              {preloadedData._numeroReferenti > 0 && (
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                  <span>{preloadedData._numeroReferenti} referente{preloadedData._numeroReferenti > 1 ? 'i' : ''} caricato</span>
                </li>
              )}
              {preloadedData._numeroMacchinari > 0 && (
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                  <span>{preloadedData._numeroMacchinari} {preloadedData._numeroMacchinari > 1 ? 'macchinari caricati' : 'macchinario caricato'}</span>
                </li>
              )}
            </ul>
            <p className="text-green-700 text-sm mt-3 font-medium">
              Puoi verificare i dati, modificarli o aggiungerne di nuovi prima di confermare.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Errore caricamento (non bloccante)
  const ErrorBanner = () => {
    if (!error) return null

    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-8 rounded-r-lg">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              Attenzione
            </h3>
            <p className="text-yellow-800 text-sm">
              {error}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Wizard principale
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header con pulsante back */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/portal')}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Torna al Menu</span>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span>Onboarding in corso</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ✅ MULTI-SEDE: Banner sede corrente */}
        <SedeBanner />
        
        <DataLoadedBanner />
        <ErrorBanner />
        
        <CustomerOnboardingWizard
          clienteId={sedeAttiva?.id || customerProfile?.cliente_id || preloadedData?._clienteId}
          onComplete={handleOnboardingComplete}
          initialData={preloadedData}
        />
      </div>
    </div>
  )
}
