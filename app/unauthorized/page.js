import Link from 'next/link'
import { Shield } from 'lucide-react'

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Shield className="mx-auto text-red-500 mb-4" size={64} />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Accesso Negato
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Non hai i permessi per accedere a questa pagina
        </p>
        <Link
          href="/"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Torna alla Dashboard
        </Link>
      </div>
    </div>
  )
}