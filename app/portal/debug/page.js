// app/portal/debug/page.js
// PAGINA DEBUG - Mostra tutti i dati di collegamento
// ⚠️ DISABILITATA IN PRODUZIONE

'use client'

import { useEffect, useState } from 'react'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { supabase } from '@/lib/supabase'
import { AlertCircle, CheckCircle2, XCircle, RefreshCw, ShieldAlert } from 'lucide-react'

// Blocca in produzione
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

export default function DebugPage() {
  // Blocca accesso in produzione
  if (IS_PRODUCTION) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Pagina Non Disponibile
          </h2>
          <p className="text-gray-600">
            Questa pagina di debug non è accessibile in produzione.
          </p>
        </div>
      </div>
    )
  }

  const { user, customerProfile, authLoading } = useCustomerAuth()
  const [debugData, setDebugData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadDebugData()
    }
  }, [user])

  const loadDebugData = async () => {
    if (!user?.email) return

    setLoading(true)
    const data = {
      timestamp: new Date().toISOString(),
      auth: {},
      customerPortalUser: null,
      cliente: null,
      referenti: [],
      macchinari: [],
      errors: []
    }

    try {
      // 1. Dati Auth
      data.auth = {
        user_id: user.id,
        email: user.email,
        email_confirmed: user.email_confirmed_at ? true : false,
        created_at: user.created_at
      }

      // 2. Cerca in customer_portal_users
      const { data: cpuData, error: cpuError } = await supabase
        .from('customer_portal_users')
        .select('*')
        .eq('email', user.email)
        .single()

      if (cpuError && cpuError.code !== 'PGRST116') {
        data.errors.push(`Errore customer_portal_users: ${cpuError.message}`)
      } else {
        data.customerPortalUser = cpuData
      }

      // 3. Cerca cliente per email
      const { data: clienteData, error: clienteError } = await supabase
        .from('clienti')
        .select('*')
        .or(`email_principale.eq.${user.email},email_amministrazione.eq.${user.email},email_pec.eq.${user.email}`)
        .maybeSingle()

      if (clienteError) {
        data.errors.push(`Errore clienti: ${clienteError.message}`)
      } else {
        data.cliente = clienteData
      }

      // 4. Se cliente trovato, carica referenti
      if (clienteData?.id) {
        const { data: refData, error: refError } = await supabase
          .from('customer_referenti')
          .select('*')
          .eq('cliente_id', clienteData.id)

        if (refError) {
          data.errors.push(`Errore referenti: ${refError.message}`)
        } else {
          data.referenti = refData || []
        }

        // 5. Carica macchinari
        const { data: macData, error: macError } = await supabase
          .from('macchinari')
          .select('*')
          .eq('id_cliente', clienteData.id)

        if (macError) {
          data.errors.push(`Errore macchinari: ${macError.message}`)
        } else {
          data.macchinari = macData || []
        }
      }

      setDebugData(data)
    } catch (error) {
      data.errors.push(`Errore generale: ${error.message}`)
      setDebugData(data)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Non Autenticato
          </h2>
          <p className="text-gray-600 mb-6">
            Devi essere loggato per vedere i dati di debug
          </p>
          <a
            href="/portal"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
          >
            Vai al Login
          </a>
        </div>
      </div>
    )
  }

  const StatusBadge = ({ condition, trueText, falseText }) => (
    <span className={`
      inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium
      ${condition ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
    `}>
      {condition ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      {condition ? trueText : falseText}
    </span>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                🔍 Debug Collegamento Email
              </h1>
              <p className="text-gray-600">
                Stato aggiornato: {debugData?.timestamp ? new Date(debugData.timestamp).toLocaleString('it-IT') : '-'}
              </p>
            </div>
            <button
              onClick={loadDebugData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4" />
              Ricarica
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Caricamento dati debug...</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Errori */}
            {debugData?.errors?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 mb-2">Errori Rilevati</h3>
                    <ul className="space-y-1">
                      {debugData.errors.map((error, i) => (
                        <li key={i} className="text-sm text-red-800">• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 1. AUTH */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                Utente Autenticato (auth.users)
              </h2>
              <div className="space-y-3">
                <StatusBadge 
                  condition={!!debugData?.auth?.user_id}
                  trueText="Utente esistente"
                  falseText="Utente NON trovato"
                />
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-600">ID</p>
                    <p className="font-mono text-sm">{debugData?.auth?.user_id || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{debugData?.auth?.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email Confermata</p>
                    <p className="font-medium">{debugData?.auth?.email_confirmed ? '✅ Sì' : '❌ No'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Creato il</p>
                    <p className="text-sm">{debugData?.auth?.created_at ? new Date(debugData.auth.created_at).toLocaleDateString('it-IT') : '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. CUSTOMER PORTAL USERS */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 font-bold">2</span>
                </div>
                Collegamento Portal (customer_portal_users)
              </h2>
              <div className="space-y-3">
                <StatusBadge 
                  condition={!!debugData?.customerPortalUser}
                  trueText="Record trovato"
                  falseText="Record NON trovato"
                />
                {debugData?.customerPortalUser ? (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-600">ID</p>
                      <p className="font-mono text-sm">{debugData.customerPortalUser.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Cliente ID</p>
                      <p className="font-mono text-sm">{debugData.customerPortalUser.cliente_id || '❌ NULL'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{debugData.customerPortalUser.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Attivo</p>
                      <p className="font-medium">{debugData.customerPortalUser.attivo ? '✅ Sì' : '❌ No'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ <strong>PROBLEMA:</strong> L'utente esiste in Auth ma NON in customer_portal_users.
                      Serve creare il collegamento.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 3. CLIENTE */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 font-bold">3</span>
                </div>
                Dati Cliente (clienti)
              </h2>
              <div className="space-y-3">
                <StatusBadge 
                  condition={!!debugData?.cliente}
                  trueText="Cliente trovato"
                  falseText="Cliente NON trovato"
                />
                {debugData?.cliente ? (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-600">ID</p>
                      <p className="font-mono text-sm">{debugData.cliente.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Codice Cliente</p>
                      <p className="font-medium">{debugData.cliente.codice_cliente}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Ragione Sociale</p>
                      <p className="font-bold text-lg">{debugData.cliente.ragione_sociale}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">P.IVA</p>
                      <p className="font-medium">{debugData.cliente.partita_iva || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Codice Fiscale</p>
                      <p className="font-medium">{debugData.cliente.codice_fiscale || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email Principale</p>
                      <p className="font-medium">{debugData.cliente.email_principale || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email PEC</p>
                      <p className="font-medium">{debugData.cliente.email_pec || '-'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ <strong>PROBLEMA:</strong> Nessun cliente trovato con email <strong>{user.email}</strong> nei campi email_principale, email_amministrazione o email_pec.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 4. REFERENTI */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <span className="text-amber-600 font-bold">4</span>
                </div>
                Referenti ({debugData?.referenti?.length || 0})
              </h2>
              {debugData?.referenti?.length > 0 ? (
                <div className="space-y-3">
                  {debugData.referenti.map((ref, i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-gray-900">
                          {ref.nome} {ref.cognome}
                        </span>
                        {ref.principale && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            Principale
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Ruolo:</span> {ref.ruolo || '-'}
                        </div>
                        <div>
                          <span className="text-gray-600">Tel:</span> {ref.telefono || '-'}
                        </div>
                        <div>
                          <span className="text-gray-600">Email:</span> {ref.email || '-'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Nessun referente trovato</p>
              )}
            </div>

            {/* 5. MACCHINARI */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 font-bold">5</span>
                </div>
                Macchinari ({debugData?.macchinari?.length || 0})
              </h2>
              {debugData?.macchinari?.length > 0 ? (
                <div className="space-y-3">
                  {debugData.macchinari.map((mac, i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="font-bold text-gray-900 mb-2">
                        {mac.tipo_macchinario} - {mac.marca} {mac.modello}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Seriale:</span> {mac.numero_seriale || '-'}
                        </div>
                        <div>
                          <span className="text-gray-600">Installazione:</span> {mac.data_installazione ? new Date(mac.data_installazione).toLocaleDateString('it-IT') : '-'}
                        </div>
                        <div>
                          <span className="text-gray-600">Stato:</span> {mac.stato || '-'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Nessun macchinario trovato</p>
              )}
            </div>

            {/* DIAGNOSI */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                📋 Diagnosi e Azioni
              </h2>
              <div className="space-y-3">
                {!debugData?.customerPortalUser && (
                  <div className="p-4 bg-white rounded-lg border-l-4 border-red-500">
                    <p className="font-semibold text-red-900 mb-2">❌ PROBLEMA 1: customer_portal_users mancante</p>
                    <p className="text-sm text-gray-700 mb-2">
                      L'utente esiste in Auth ma non in customer_portal_users.
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Soluzione:</strong> Esegui query di creazione collegamento (vedi SQL fornito)
                    </p>
                  </div>
                )}
                
                {!debugData?.cliente && (
                  <div className="p-4 bg-white rounded-lg border-l-4 border-yellow-500">
                    <p className="font-semibold text-yellow-900 mb-2">⚠️ PROBLEMA 2: Cliente non trovato</p>
                    <p className="text-sm text-gray-700 mb-2">
                      Nessun record in clienti con email <strong>{user.email}</strong>
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Soluzione:</strong> Aggiorna il campo email_principale del cliente con questa email
                    </p>
                  </div>
                )}

                {debugData?.customerPortalUser && !debugData?.customerPortalUser.cliente_id && (
                  <div className="p-4 bg-white rounded-lg border-l-4 border-orange-500">
                    <p className="font-semibold text-orange-900 mb-2">⚠️ PROBLEMA 3: cliente_id NULL</p>
                    <p className="text-sm text-gray-700 mb-2">
                      Il record in customer_portal_users esiste ma cliente_id è NULL
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Soluzione:</strong> Aggiorna cliente_id con l'ID del cliente corretto
                    </p>
                  </div>
                )}

                {debugData?.customerPortalUser && debugData?.cliente && 
                 debugData.customerPortalUser.cliente_id === debugData.cliente.id && (
                  <div className="p-4 bg-white rounded-lg border-l-4 border-green-500">
                    <p className="font-semibold text-green-900 mb-2">✅ TUTTO OK!</p>
                    <p className="text-sm text-gray-700">
                      Il collegamento è corretto. I dati dovrebbero caricarsi nell'onboarding.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
