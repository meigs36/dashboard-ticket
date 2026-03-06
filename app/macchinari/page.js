'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Search, HardDrive, MapPin, Calendar, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function MacchinariPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [exactTipo, setExactTipo] = useState(null) // filtro esatto tipo_macchinario (da click su stats)
  const [risultati, setRisultati] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 30
  const [stats, setStats] = useState({
    totali: 0,
    attivi: 0,
    tipi: []
  })

  useEffect(() => {
    supabase.auth.getSession().then(() => {
      loadStats()
    })
  }, [])

  useEffect(() => {
    setPage(0)
    if (searchTerm.length >= 2) {
      setExactTipo(null) // ricerca libera annulla filtro esatto
      searchMacchinari()
    } else if (!exactTipo) {
      setRisultati([])
    }
  }, [searchTerm])

  // Quando si clicca un tipo da "Tipi Più Comuni", cerca per tipo esatto
  useEffect(() => {
    if (exactTipo) {
      setPage(0)
      searchByExactTipo(exactTipo)
    }
  }, [exactTipo])

  async function loadStats() {
    try {
      // ⚡ Query parallele
      const [
        { count: totali },
        { count: attivi },
        tipiData
      ] = await Promise.all([
        supabase.from('macchinari').select('*', { count: 'exact', head: true }),
        supabase.from('macchinari').select('*', { count: 'exact', head: true }).eq('stato', 'attivo'),
        // Carica TUTTI i tipi (paginazione per superare limite 1000)
        (async () => {
          let allTipi = []
          let offset = 0
          const pageSize = 1000
          let hasMore = true
          while (hasMore) {
            const { data } = await supabase
              .from('macchinari')
              .select('tipo_macchinario')
              .not('tipo_macchinario', 'is', null)
              .range(offset, offset + pageSize - 1)
            if (data && data.length > 0) {
              allTipi = [...allTipi, ...data]
              offset += pageSize
              hasMore = data.length === pageSize
            } else {
              hasMore = false
            }
          }
          return allTipi
        })()
      ])

      // Conta occorrenze per tipo
      const tipiCount = {}
      tipiData.forEach(item => {
        if (item.tipo_macchinario) {
          tipiCount[item.tipo_macchinario] = (tipiCount[item.tipo_macchinario] || 0) + 1
        }
      })

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
      // Paginazione per caricare TUTTI i risultati (supera limite 1000 Supabase)
      let allData = []
      let offset = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('macchinari')
          .select(`
            *,
            cliente:clienti!macchinari_id_cliente_fkey(
              id,
              ragione_sociale,
              codice_cliente,
              comune,
              provincia,
              telefono_principale,
              email_riparazioni
            )
          `)
          .or(`tipo_macchinario.ilike.%${searchTerm}%,modello.ilike.%${searchTerm}%,marca.ilike.%${searchTerm}%,numero_seriale.ilike.%${searchTerm}%`)
          .order('tipo_macchinario')
          .range(offset, offset + pageSize - 1)

        if (error) throw error

        if (data && data.length > 0) {
          allData = [...allData, ...data]
          offset += pageSize
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
      }

      setRisultati(allData)
    } catch (error) {
      console.error('Errore ricerca:', error)
      setRisultati([])
    } finally {
      setLoading(false)
    }
  }

  // Ricerca per tipo_macchinario esatto (click su stats)
  async function searchByExactTipo(tipo) {
    setLoading(true)
    try {
      let allData = []
      let offset = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('macchinari')
          .select(`
            *,
            cliente:clienti!macchinari_id_cliente_fkey(
              id,
              ragione_sociale,
              codice_cliente,
              comune,
              provincia,
              telefono_principale,
              email_riparazioni
            )
          `)
          .eq('tipo_macchinario', tipo)
          .order('tipo_macchinario')
          .range(offset, offset + pageSize - 1)

        if (error) throw error

        if (data && data.length > 0) {
          allData = [...allData, ...data]
          offset += pageSize
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
      }

      setRisultati(allData)
    } catch (error) {
      console.error('Errore ricerca per tipo:', error)
      setRisultati([])
    } finally {
      setLoading(false)
    }
  }

  // Cancella filtro esatto e torna alla ricerca libera
  function clearExactTipo() {
    setExactTipo(null)
    setSearchTerm('')
    setRisultati([])
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
                    onClick={() => { setSearchTerm(''); setExactTipo(tipo.tipo) }}
                    className={`hover:text-blue-700 dark:hover:text-blue-300 hover:underline text-left ${
                      exactTipo === tipo.tipo
                        ? 'text-blue-800 dark:text-blue-300 font-semibold'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <p className="text-gray-700 dark:text-gray-300">
                    {exactTipo ? (
                      <>Trovati <strong>{risultati.length}</strong> macchinari di tipo <strong>&quot;{exactTipo}&quot;</strong></>
                    ) : (
                      <>Trovati <strong>{risultati.length}</strong> macchinari corrispondenti a &quot;{searchTerm}&quot;</>
                    )}
                  </p>
                  {exactTipo && (
                    <button
                      onClick={clearExactTipo}
                      className="px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      ✕ Rimuovi filtro
                    </button>
                  )}
                </div>
                {risultati.length > PAGE_SIZE && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, risultati.length)} di {risultati.length}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(Math.ceil(risultati.length / PAGE_SIZE) - 1, p + 1))}
                      disabled={page >= Math.ceil(risultati.length / PAGE_SIZE) - 1}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {risultati.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((macchinario) => (
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
                  {macchinario.cliente && (
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Installato presso:</p>
                          <div className="flex items-start gap-4">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {macchinario.cliente.ragione_sociale}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Cod. {macchinario.cliente.codice_cliente}
                              </p>
                            </div>
                            {macchinario.cliente.comune && (
                              <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                <MapPin size={14} />
                                <span>{macchinario.cliente.comune} ({macchinario.cliente.provincia})</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/clienti/${macchinario.cliente.id}`}
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

            {/* Paginazione in fondo */}
            {risultati.length > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, risultati.length)} di {risultati.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setPage(p => Math.max(0, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    disabled={page === 0}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pagina {page + 1} / {Math.ceil(risultati.length / PAGE_SIZE)}
                  </span>
                  <button
                    onClick={() => { setPage(p => Math.min(Math.ceil(risultati.length / PAGE_SIZE) - 1, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    disabled={page >= Math.ceil(risultati.length / PAGE_SIZE) - 1}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (searchTerm.length >= 2 || exactTipo) ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Search className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Nessun macchinario trovato
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Prova con altri termini di ricerca
            </p>
            {exactTipo && (
              <button
                onClick={clearExactTipo}
                className="mt-4 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Rimuovi filtro
              </button>
            )}
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
