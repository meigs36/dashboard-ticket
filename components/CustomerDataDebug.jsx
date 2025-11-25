'use client'

import { useCustomerAuth } from '@/contexts/CustomerAuthContext'

/**
 * COMPONENTE DI DEBUG TEMPORANEO
 * 
 * Usa questo componente per vedere esattamente quali dati 
 * arrivano dal CustomerAuthContext
 * 
 * COME USARLO:
 * 1. Aggiungi questo import in app/portal/dashboard/page.js:
 *    import CustomerDataDebug from '@/components/CustomerDataDebug'
 * 
 * 2. Aggiungi il componente nella dashboard:
 *    <CustomerDataDebug />
 * 
 * 3. Ricarica la pagina
 * 
 * 4. Vedrai una sezione rossa con tutti i dati disponibili
 * 
 * 5. Una volta verificato che i dati arrivano correttamente, RIMUOVI il componente
 */
export default function CustomerDataDebug() {
  const { user, customerProfile, loading } = useCustomerAuth()

  if (loading) {
    return (
      <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-yellow-900">🔍 DEBUG: Caricamento dati...</h3>
      </div>
    )
  }

  return (
    <div className="bg-red-100 border-2 border-red-400 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-red-900 mb-4">
        🐛 DEBUG: Dati CustomerProfile
      </h2>
      
      <div className="bg-white rounded p-4 mb-4">
        <h3 className="font-semibold mb-2">👤 User Auth (da Supabase Auth):</h3>
        <pre className="text-xs overflow-auto max-h-32 bg-gray-50 p-2 rounded">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>

      <div className="bg-white rounded p-4 mb-4">
        <h3 className="font-semibold mb-2">👨‍💼 Customer Profile (dal context):</h3>
        <pre className="text-xs overflow-auto max-h-64 bg-gray-50 p-2 rounded">
          {JSON.stringify(customerProfile, null, 2)}
        </pre>
      </div>

      <div className="bg-white rounded p-4">
        <h3 className="font-semibold mb-2">✅ Verifica Accesso Dati:</h3>
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="font-mono">customerProfile.ragione_sociale:</span>
            <span className={customerProfile?.ragione_sociale ? 'text-green-600 font-bold' : 'text-red-600'}>
              {customerProfile?.ragione_sociale || '❌ NON TROVATO'}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="font-mono">customerProfile.email:</span>
            <span className={customerProfile?.email ? 'text-green-600 font-bold' : 'text-red-600'}>
              {customerProfile?.email || '❌ NON TROVATO'}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="font-mono">customerProfile.telefono:</span>
            <span className={customerProfile?.telefono ? 'text-green-600 font-bold' : 'text-red-600'}>
              {customerProfile?.telefono || '❌ NON TROVATO'}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="font-mono">customerProfile.indirizzo:</span>
            <span className={customerProfile?.indirizzo ? 'text-green-600 font-bold' : 'text-red-600'}>
              {customerProfile?.indirizzo || '❌ NON TROVATO'}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="font-mono">customerProfile.cliente (oggetto):</span>
            <span className={customerProfile?.cliente ? 'text-green-600 font-bold' : 'text-red-600'}>
              {customerProfile?.cliente ? '✅ PRESENTE' : '❌ NON TROVATO'}
            </span>
          </div>
          {customerProfile?.cliente && (
            <div className="flex gap-2">
              <span className="font-mono">customerProfile.cliente.ragione_sociale:</span>
              <span className={customerProfile?.cliente?.ragione_sociale ? 'text-green-600 font-bold' : 'text-red-600'}>
                {customerProfile?.cliente?.ragione_sociale || '❌ NON TROVATO'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded">
        <h4 className="font-bold text-yellow-900 mb-2">📌 Cosa Controllare:</h4>
        <ul className="text-sm space-y-1 text-yellow-900">
          <li>✅ Se vedi <code className="bg-white px-1">customerProfile.ragione_sociale</code> con un valore → Dashboard funziona</li>
          <li>⚠️ Se vedi <code className="bg-white px-1">customerProfile.cliente.ragione_sociale</code> ma NON <code className="bg-white px-1">customerProfile.ragione_sociale</code> → Serve il FIX del context</li>
          <li>❌ Se non vedi né l'uno né l'altro → Problema nel caricamento dati dal database</li>
        </ul>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-300 rounded">
        <p className="text-sm text-blue-900">
          <strong>📝 Nota:</strong> Questo componente è solo per debug. 
          <strong className="text-red-600"> RIMUOVILO</strong> quando i dati funzionano correttamente!
        </p>
      </div>
    </div>
  )
}
