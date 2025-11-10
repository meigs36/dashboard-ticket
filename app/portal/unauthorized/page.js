'use client'

import { useRouter } from 'next/navigation'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { AlertCircle } from 'lucide-react'

export default function UnauthorizedPage() {
  const router = useRouter()
  const { signOut } = useCustomerAuth()

  async function handleLogout() {
    await signOut()
    router.push('/portal')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Accesso Non Autorizzato
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-6">
            Il tuo account non ha i permessi necessari per accedere a questa area.
            <br />
            <br />
            Se ritieni che ci sia un errore, contatta il nostro supporto.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Torna al Login
            </button>
            
            <button
              onClick={() => window.location.href = 'mailto:assistenza@odontoservice.it'}
              className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Contatta Assistenza
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-sm text-gray-500 mt-6">
          OdontoService Customer Portal<br />
          Per assistenza: assistenza@odontoservice.it
        </p>
      </div>
    </div>
  )
}
