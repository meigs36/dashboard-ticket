'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import CustomerOnboardingWizard from '@/components/CustomerOnboardingWizard'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [cliente, setCliente] = useState(null)
  
  useEffect(() => {
    // Per ora mock - in futuro verificherà autenticazione
    loadMockCliente()
  }, [])
  
  function loadMockCliente() {
    // Simula caricamento cliente
    setTimeout(() => {
      setCliente({
        id: 'mock-cliente-id',
        ragione_sociale: 'Cliente Test'
      })
      setLoading(false)
    }, 500)
  }
  
  function handleComplete() {
    alert('✅ Onboarding completato! In produzione, verrai reindirizzato alla dashboard.')
    // In futuro: router.push('/portal/dashboard')
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Caricamento...</p>
        </div>
      </div>
    )
  }
  
  if (!cliente) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Errore caricamento dati cliente</p>
          <button
            onClick={() => router.push('/portal')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Torna alla home
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <CustomerOnboardingWizard
      clienteId={cliente.id}
      onComplete={handleComplete}
    />
  )
}
