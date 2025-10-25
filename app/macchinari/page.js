'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Search, HardDrive, MapPin, Calendar, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function MacchinariPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [risultati, setRisultati] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    totali: 0,
    attivi: 0,
    tipi: []
  })

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchMacchinari()
    } else {
      setRisultati([])
    }
  }, [searchTerm])

  async function loadStats() {
    try {
      // Conta totali
      const { count: totali } = await supabase
        .from('macchinari')
        .select('*', { count: 'exact', head: true })

      const { count: attivi } = await supabase
        .from('macchinari')
        .select('*', { count: 'exact', head: true })
        .eq('stato', 'attivo')

      // Tipi macchinari più comuni
      const { data: tipiData } = await supabase
        .from('macchinari')
        .select('tipo_macchinario')
        .not('tipo_macchinario', 'is', null)
        .limit(1000)

      // Conta occorrenze
      const tipiCount = {}
      tipiData?.forEach(item => {
        if (item.tipo_macchinario) {
          tipiCount[item.tipo_macchinario] = (tipiCount[item.tipo_macchinario] || 0) + 1
        }
      })

      // Top 10 tipi
      const tipiSorted = Object.entries(tipiCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tipo, count]) => ({ tipo, count }))

      setStats({
        totali: totali || 0,
        attivi: attivi || 0,
        tipi: tipiSorted
      })
    } catch (error) {
      console.error('Errore caricamento stats:', error)
    }
  }

  async function searchMacchinari() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('macchinari')
        .select(`
          *,
          cliente:clienti!ticket_id_cliente_fkey(
            id,
            ragione_sociale,
            codice_cliente,
            citta,
            provincia,
            telefono_principale,
            email_riparazioni
          )
        `)
        .or(`tipo_macchinario.ilike.%${searchTerm}%,modello.ilike.%${searchTerm}%,marca.ilike.%${searchTerm}%,numero_seriale.ilike.%${searchTerm}%`)
        .order('tipo_macchinario')
        .limit(50)

      if (error) throw error
      setRisultati(data || [])
    } catch (error) {
      console.error('Errore ricerca:', error)
      setRisultati([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Torna alla Dashboard</span>
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Ricerca Macchinari</h1>
          <p className="text-gray-600 dark:text-gray-400">Trova quali clienti hanno un determinato tipo di macchinario</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Macchinari Totali</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totali}</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                <HardDrive className="text-green-600 dark:text-green-400" size={24} />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {stats.attivi} attivi
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Tipi Più Comuni</h3>
            <div className="space-y-2">
              {stats.tipi.slice(0, 5).map((tipo, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <button
                    onClick={() => setSearchTerm(tipo.tipo)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline text-left"
                  >
                    {tipo.tipo}
                  </button>
                  <span className="text-gray-500 dark:text-gray-400">({tipo.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Cerca per tipo, modello, marca o numero seriale..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-3.5 text-gray-400 dark:text-gray-500" size={20} />
          </div>
          {searchTerm.length > 0 && searchTerm.length < 2 && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Digita almeno 2 caratteri per cercare...
            </p>
          )}
        </div>

        {/* Risultati */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Ricerca in corso...</p>
          </div>
        ) : risultati.length > 0 ? (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-4">
              <p className="text-gray-700 dark:text-gray-300">
                Trovati <strong>{risultati.length}</strong> macchinari corrispondenti a &quot;{searchTerm}&quot;
              </p>
            </div>

            <div className="space-y-4">
              {risultati.map((macchinario) => (
                <div
                  key={macchinario.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {macchinario.tipo_macchinario}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          macchinario.stato === 'attivo' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
                        }`}>
                          {macchinario.stato.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {macchinario.marca} - {macchinario.modello}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Matricola:</span>
                          <p className="font-mono text-gray-900 dark:text-white">{macchinario.numero_seriale}</p>
                        </div>
                        {macchinario.data_installazione && (
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-gray-400 dark:text-gray-500" />
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Installato:</span>
                              <p className="text-gray-900 dark:text-white">
                                {new Date(macchinario.data_installazione).toLocaleDateString('it-IT')}
                              </p>
                            </div>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Manutenzione:</span>
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                            macchinario.contratto_manutenzione === 'attivo'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
                          }`}>
                            {macchinario.contratto_manutenzione}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info Cliente */}
                  {macchinario.clienti && (
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Installato presso:</p>
                          <div className="flex items-start gap-4">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {macchinario.clienti.ragione_sociale}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Cod. {macchinario.clienti.codice_cliente}
                              </p>
                            </div>
                            {macchinario.clienti.citta && (
                              <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                <MapPin size={14} />
                                <span>{macchinario.clienti.citta} ({macchinario.clienti.provincia})</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/clienti/${macchinario.clienti.id}`}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium"
                        >
                          <span>Vedi Cliente</span>
                          <ExternalLink size={16} />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : searchTerm.length >= 2 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Search className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Nessun macchinario trovato
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Prova con altri termini di ricerca
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <HardDrive className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Cerca un macchinario
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Utilizza la barra di ricerca per trovare macchinari specifici
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Puoi cercare per tipo, modello, marca o numero seriale
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
