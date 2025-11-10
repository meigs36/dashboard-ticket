'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { supabase } from '@/lib/supabase'
import CustomerOnboardingWizard from '@/components/CustomerOnboardingWizard'
import toast from 'react-hot-toast'

export default function OnboardingPage() {
  const router = useRouter()
  const { user, customerProfile, loading: authLoading } = useCustomerAuth()
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Verifica autenticazione
    if (!authLoading) {
      if (!user || !customerProfile) {
        toast.error('Devi effettuare il login')
        router.push('/portal')
      } else {
        setLoading(false)
      }
    }
  }, [user, customerProfile, authLoading, router])
  
  async function handleComplete(wizardData) {
    try {
      console.log('💾 Salvataggio dati onboarding...', wizardData)
      
      // Ottieni token per autenticazione API
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Sessione non valida')
      }

      // Chiama API per salvare dati
      const response = await fetch('/api/customer/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          datiAziendali: wizardData.datiAziendali,
          referenti: wizardData.referenti,
          macchinari: wizardData.macchinari,
          documenti: wizardData.documenti
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Errore durante il salvataggio')
      }

      console.log('✅ Onboarding salvato con successo:', result)
      
      toast.success('Onboarding completato con successo!')
      
      // Attendi un momento per vedere il toast
      setTimeout(() => {
        router.push('/portal/dashboard')
      }, 1500)
      
    } catch (error) {
      console.error('❌ Errore salvataggio onboarding:', error)
      toast.error(error.message || 'Errore durante il salvataggio. Riprova.')
    }
  }
  
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Caricamento...</p>
        </div>
      </div>
    )
  }
  
  if (!user || !customerProfile) {
    return null // Redirect gestito da useEffect
  }
  
  return (
    <CustomerOnboardingWizard
      clienteId={customerProfile.id}
      onComplete={handleComplete}
    />
  )
}
