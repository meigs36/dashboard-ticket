'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Users, Check } from 'lucide-react'

export default function AssegnaContrattoModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [clienti, setClienti] = useState([])
  const [clientiSelezionati, setClientiSelezionati] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  
  const [configContratto, setConfigContratto] = useState({
    tipo_contratto: 'Informatica',
    nome_contratto: 'Freedom',
    durata_mesi: 24,
    ore_incluse: 10.0,
    data_inizio: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadClienti()
  }, [])

  async function loadClienti() {
    try {
      const { data, error } = await supabase
        .from('clienti')
        .select(`
          id,
          codice_cliente,
          ragione_sociale,
          citta,
          provincia,
          contratti:contratti(id, stato)
        `)
        .eq('attivo', true)
        .order('ragione_sociale')

      if (error) throw error
      setClienti(data || [])
    } catch (error) {
      console.error('Errore caricamento clienti:', error)
    }
  }

  function toggleCliente(codiceCliente) {
    setClientiSelezionati(prev => {
      if (prev.includes(codiceCliente)) {
        return prev.filter(c => c !== codiceCliente)
      } else {
        return [...prev, codiceCliente]
      }
    })
  }

  function selezionaTutti() {
    const filtrati = clientiFiltrati.map(c => c.codice_cliente)
    setClientiSelezionati(filtrati)
  }

  function deselezionaTutti() {
    setClientiSelezionati([])
  }

  const clientiFiltrati = clienti.filter(cliente => {
    const search = searchTerm.toLowerCase()
    return (
      cliente.ragione_sociale?.toLowerCase().includes(search) ||
      cliente.codice_cliente?.toLowerCase().includes(search) ||
      cliente.citta?.toLowerCase().includes(search)
    )
  })

  function calcolaDataScadenza() {
    const dataInizio = new Date(configContratto.data_inizio)
    dataInizio.setMonth(dataInizio.getMonth() + parseInt(configContratto.durata_mesi))
    return dataInizio.toISOString().split('T')[0]
  }

  async function handleAssegna() {
    if (clientiSelezionati.length === 0) {
      alert('⚠️ Seleziona almeno un cliente')
      return
    }

    if (!confirm(`Vuoi creare ${clientiSelezionati.length} contratti per i clienti selezionati?`)) {
      return
    }

    setLoading(true)

    try {
      const anno = new Date().getFullYear()
      
      // Ottieni l'ultimo numero progressivo dell'anno corrente
      const { data: ultimi, error: errQuery } = await supabase
        .from('contratti')
        .select('num_contratto')
        .like('num_contratto', `CNT-${anno}-%`)
        .order('num_contratto', { ascending: false })
        .limit(1)
      
      let numeroProgressivo = 1
      if (ultimi && ultimi.length > 0) {
        const ultimoNumero = ultimi[0].num_contratto.split('-')[2]
        numeroProgressivo = parseInt(ultimoNumero) + 1
      }

      // Crea array di contratti
      const contratti = clientiSelezionati.map((codiceCliente) => {
        const numContratto = `CNT-${anno}-${numeroProgressivo.toString().padStart(4, '0')}`
        numeroProgressivo++

        return {
          num_contratto: numContratto,
          codice_cliente: codiceCliente,
          tipo_contratto: configContratto.tipo_contratto,
          nome_contratto: configContratto.nome_contratto,
          data_contratto: configContratto.data_inizio,
          data_scadenza: calcolaDataScadenza(),
          ore_incluse: parseFloat(configContratto.ore_incluse),
          ore_utilizzate: 0,
          stato: 'attivo'
        }
      })

      console.log('Creazione multipla contratti:', contratti)

      // Inserisci tutti i contratti
      const { data, error } = await supabase
        .from('contratti')
        .insert(contratti)
        .select()

      if (error) throw error

      alert(`✅ ${data.length} contratti creati con successo!`)
      onSuccess()
    } catch (error) {
      console.error('Errore assegnazione contratti:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              👥 Assegna Contratto a Clienti
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Crea lo stesso contratto per più clienti contemporaneamente
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Configurazione Contratto */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-4">⚙️ Configurazione Contratto</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo Contratto
                </label>
                <select
                  value={configContratto.tipo_contratto}
                  onChange={(e) => setConfigContratto(prev => ({ ...prev, tipo_contratto: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Informatica">Informatica</option>
                  <option value="Elettronica">Elettronica</option>
                  <option value="Macchine">Macchine</option>
                  <option value="Misto">Misto</option>
                  <option value="Altro">Altro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Contratto
                </label>
                <input
                  type="text"
                  value={configContratto.nome_contratto}
                  onChange={(e) => setConfigContratto(prev => ({ ...prev, nome_contratto: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Inizio
                </label>
                <input
                  type="date"
                  value={configContratto.data_inizio}
                  onChange={(e) => setConfigContratto(prev => ({ ...prev, data_inizio: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durata
                </label>
                <select
                  value={configContratto.durata_mesi}
                  onChange={(e) => setConfigContratto(prev => ({ ...prev, durata_mesi: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="12">12 mesi</option>
                  <option value="24">24 mesi</option>
                  <option value="36">36 mesi</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ore Incluse
                </label>
                <div className="flex gap-2">
                  {[5, 10, 20, 50].map((ore) => (
                    <button
                      key={ore}
                      type="button"
                      onClick={() => setConfigContratto(prev => ({ ...prev, ore_incluse: ore }))}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                        configContratto.ore_incluse == ore
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {ore}h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm text-blue-900 bg-blue-100 rounded p-3">
              📆 Scadenza: {new Date(calcolaDataScadenza()).toLocaleDateString('it-IT')}
            </div>
          </div>

          {/* Selezione Clienti */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                Seleziona Clienti ({clientiSelezionati.length} selezionati)
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={selezionaTutti}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Seleziona tutti
                </button>
                <span className="text-gray-400">•</span>
                <button
                  onClick={deselezionaTutti}
                  className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                >
                  Deseleziona tutti
                </button>
              </div>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Cerca cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />

            {/* Lista Clienti */}
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-200">
              {clientiFiltrati.map((cliente) => {
                const isSelezionato = clientiSelezionati.includes(cliente.codice_cliente)
                const hasContrattoAttivo = cliente.contratti?.some(c => c.stato === 'attivo')

                return (
                  <label
                    key={cliente.id}
                    className={`flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      isSelezionato ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelezionato}
                      onChange={() => toggleCliente(cliente.codice_cliente)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {cliente.ragione_sociale}
                        </span>
                        {hasContrattoAttivo && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            Ha già contratto
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{cliente.codice_cliente}</span>
                        {cliente.citta && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span>{cliente.citta} {cliente.provincia && `(${cliente.provincia})`}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {isSelezionato && (
                      <Check className="text-blue-600" size={20} />
                    )}
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleAssegna}
            disabled={loading || clientiSelezionati.length === 0}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creazione...
              </>
            ) : (
              <>
                <Users size={18} />
                Assegna a {clientiSelezionati.length} Client{clientiSelezionati.length !== 1 ? 'i' : 'e'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
