'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Search, Phone, Mail, MapPin, FileText, AlertCircle, CheckCircle } from 'lucide-react'

export default function ClientiPage() {
  const [clienti, setClienti] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadClienti()
  }, [])

  async function loadClienti() {
    try {
      // Carica clienti con i loro contratti
      const { data, error } = await supabase
        .from('clienti')
        .select(`
          *,
          contratti:contratti(
            id,
            num_contratto,
            nome_contratto,
            tipo_contratto,
            stato,
            ore_incluse,
            ore_utilizzate,
            ore_rimanenti,
            data_scadenza
          )
        `)
        .order('ragione_sociale')

      if (error) throw error
      
      console.log('Clienti caricati:', data)
      setClienti(data || [])
    } catch (error) {
      console.error('Errore caricamento clienti:', error)
      alert('Errore nel caricamento dei clienti')
    } finally {
      setLoading(false)
    }
  }

  const filteredClienti = clienti.filter((cliente) => {
    const search = searchTerm.toLowerCase()
    return (
      cliente.ragione_sociale?.toLowerCase().includes(search) ||
      cliente.codice_cliente?.toLowerCase().includes(search) ||
      cliente.citta?.toLowerCase().includes(search) ||
      cliente.email_riparazioni?.toLowerCase().includes(search)
    )
  })

  function getContrattoAttivo(contratti) {
    if (!contratti || contratti.length === 0) return null
    return contratti.find(c => c.stato === 'attivo') || contratti[0]
  }

  function getStatoContrattoColor(stato) {
    switch (stato) {
      case 'attivo':
        return 'bg-green-100 text-green-800'
      case 'scaduto':
        return 'bg-red-100 text-red-800'
      case 'sospeso':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  function isContrattoInScadenza(dataScadenza) {
    if (!dataScadenza) return false
    const oggi = new Date()
    const scadenza = new Date(dataScadenza)
    const diffGiorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24))
    return diffGiorni > 0 && diffGiorni <= 30
  }

  function getOreWarningClass(oreRimanenti, oreIncluse) {
    if (!oreRimanenti || !oreIncluse) return ''
    const percentuale = (oreRimanenti / oreIncluse) * 100
    if (percentuale <= 10) return 'text-red-600 font-bold'
    if (percentuale <= 25) return 'text-orange-600 font-semibold'
    return 'text-green-600'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600">Caricamento clienti...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Clienti</h1>
          <p className="text-gray-600">Gestisci i tuoi clienti e i loro contratti</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Cerca per ragione sociale, codice cliente, città..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
          </div>
        </div>

        {/* Statistiche Rapide */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Totale Clienti</p>
            <p className="text-2xl font-bold text-gray-900">{clienti.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Clienti Attivi</p>
            <p className="text-2xl font-bold text-green-600">
              {clienti.filter(c => c.attivo).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Contratti Attivi</p>
            <p className="text-2xl font-bold text-blue-600">
              {clienti.reduce((sum, c) => sum + (c.contratti?.filter(ct => ct.stato === 'attivo').length || 0), 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">In Scadenza (30gg)</p>
            <p className="text-2xl font-bold text-orange-600">
              {clienti.reduce((sum, c) => {
                const contratto = getContrattoAttivo(c.contratti)
                return sum + (contratto && isContrattoInScadenza(contratto.data_scadenza) ? 1 : 0)
              }, 0)}
            </p>
          </div>
        </div>

        {/* Clienti Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClienti.map((cliente) => {
            const contrattoAttivo = getContrattoAttivo(cliente.contratti)
            const hasContratto = contrattoAttivo !== null
            const inScadenza = hasContratto && isContrattoInScadenza(contrattoAttivo.data_scadenza)

            return (
              <Link
                key={cliente.id}
                href={`/clienti/${cliente.id}`}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                {/* Header Card */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900 mb-1">
                        {cliente.ragione_sociale}
                      </h3>
                      <span className="text-sm text-gray-500">
                        Cod. {cliente.codice_cliente}
                      </span>
                    </div>
                    {cliente.attivo ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                        Attivo
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full font-medium">
                        Inattivo
                      </span>
                    )}
                  </div>

                  {/* Contatti */}
                  <div className="space-y-2">
                    {cliente.telefono_principale && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone size={14} />
                        <span>{cliente.telefono_principale}</span>
                      </div>
                    )}
                    {cliente.email_riparazioni && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail size={14} />
                        <span className="truncate">{cliente.email_riparazioni}</span>
                      </div>
                    )}
                    {cliente.citta && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin size={14} />
                        <span>{cliente.citta} {cliente.provincia ? `(${cliente.provincia})` : ''}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sezione Contratto */}
                <div className="p-6 bg-gray-50">
                  {hasContratto ? (
                    <>
                      {/* Alert Scadenza */}
                      {inScadenza && (
                        <div className="mb-3 flex items-center gap-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                          <AlertCircle size={14} />
                          <span className="font-medium">Contratto in scadenza</span>
                        </div>
                      )}

                      {/* Info Contratto */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-blue-600" />
                            <span className="font-semibold text-gray-900">
                              {contrattoAttivo.nome_contratto || 'Contratto'}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getStatoContrattoColor(contrattoAttivo.stato)}`}>
                            {contrattoAttivo.stato}
                          </span>
                        </div>

                        <div className="text-xs text-gray-600">
                          #{contrattoAttivo.num_contratto}
                        </div>

                        {/* Ore Rimanenti */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600">Ore disponibili</span>
                            <span className={`text-sm font-bold ${getOreWarningClass(contrattoAttivo.ore_rimanenti, contrattoAttivo.ore_incluse)}`}>
                              {parseFloat(contrattoAttivo.ore_rimanenti || 0).toFixed(1)}h / {parseFloat(contrattoAttivo.ore_incluse || 0).toFixed(1)}h
                            </span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                (contrattoAttivo.ore_rimanenti / contrattoAttivo.ore_incluse) * 100 <= 10
                                  ? 'bg-red-500'
                                  : (contrattoAttivo.ore_rimanenti / contrattoAttivo.ore_incluse) * 100 <= 25
                                  ? 'bg-orange-500'
                                  : 'bg-green-500'
                              }`}
                              style={{
                                width: `${Math.max(0, Math.min(100, (contrattoAttivo.ore_rimanenti / contrattoAttivo.ore_incluse) * 100))}%`
                              }}
                            ></div>
                          </div>

                          <div className="text-xs text-gray-500 mt-1">
                            {parseFloat(contrattoAttivo.ore_utilizzate || 0).toFixed(1)}h utilizzate
                          </div>
                        </div>

                        {/* Data Scadenza */}
                        {contrattoAttivo.data_scadenza && (
                          <div className="text-xs text-gray-600 mt-2">
                            Scadenza: {new Date(contrattoAttivo.data_scadenza).toLocaleDateString('it-IT')}
                          </div>
                        )}
                      </div>

                      {/* Contratti Totali */}
                      {cliente.contratti.length > 1 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                          +{cliente.contratti.length - 1} altro{cliente.contratti.length - 1 > 1 ? 'i' : ''} contratt{cliente.contratti.length - 1 > 1 ? 'i' : 'o'}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <AlertCircle className="mx-auto text-gray-400 mb-2" size={24} />
                      <p className="text-sm text-gray-500">Nessun contratto attivo</p>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredClienti.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nessun cliente trovato</p>
          </div>
        )}
      </div>
    </div>
  )
}
