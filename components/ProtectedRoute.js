'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute({ children, requiredRole = null }) {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // Non autenticato
      if (!user) {
        router.push('/login')
        return
      }

      // Controlla ruolo richiesto
      if (requiredRole && userProfile?.ruolo !== requiredRole) {
        router.push('/unauthorized')
        return
      }
    }
  }, [user, userProfile, loading, router, requiredRole])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto text-blue-600 dark:text-blue-400 mb-4" size={48} />
          <p className="text-gray-600 dark:text-gray-400">Caricamento...</p>
        </div>
      </div>
    )
  }

  // Non autenticato o ruolo non valido
  if (!user || (requiredRole && userProfile?.ruolo !== requiredRole)) {
    return null
  }

  // Autenticato e autorizzato
  return <>{children}</>
}

// HOC per proteggere una pagina intera
export function withProtectedRoute(Component, requiredRole = null) {
  return function ProtectedComponent(props) {
    return (
      <ProtectedRoute requiredRole={requiredRole}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}
