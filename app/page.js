'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Se autenticato, vai alla dashboard
        router.push('/dashboard')
      } else {
        // Se non autenticato, vai al login
        router.push('/login')
      }
    }
  }, [user, loading, router])

  // Mostra loading durante il check
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Loader2 className="animate-spin mx-auto text-blue-600 dark:text-blue-400 mb-4" size={48} />
        <p className="text-gray-600 dark:text-gray-400">Caricamento...</p>
      </div>
    </div>
  )
}
