'use client'

import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import DashboardAdmin from '@/components/DashboardAdmin'
import DashboardTecnico from '@/components/DashboardTecnico'

function DashboardPage() {
  const { userProfile } = useAuth()

  // Mostra dashboard appropriata in base al ruolo
  if (userProfile?.ruolo === 'admin') {
    return <DashboardAdmin />
  }

  return <DashboardTecnico />
}

export default function Page() {
  return (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  )
}
