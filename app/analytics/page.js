'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, TrendingUp, Clock, Users, AlertCircle, AlertTriangle, Calendar, BarChart3, PieChart, HardDrive, Download, Search, ChevronLeft, ChevronRight, Shield, ShieldX, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30') // giorni
  const [analytics, setAnalytics] = useState({
    ticketPerGiorno: [],
    ticketPerStato: {},
    ticketPerPriorita: {},
    ticketPerCategoria: {},
    tempoMedioRisoluzione: 0,
    clientiPiuAttivi: [],
    tecnici: []
  })

  // State vetustà macchinari
  const [vetustaMacchinari, setVetustaMacchinari] = useState([])
  const [vetustaLoading, setVetustaLoading] = useState(false)
  const [vetustaSearched, setVetustaSearched] = useState(false)
  const [vetustaFilterMode, setVetustaFilterMode] = useState('preset') // 'preset' | 'range'
  const [vetustaPreset, setVetustaPreset] = useState(null) // anni
  const [vetustaDateFrom, setVetustaDateFrom] = useState('')
  const [vetustaDateTo, setVetustaDateTo] = useState('')
  const [vetustaStato, setVetustaStato] = useState('attivo')
  const [vetustaPage, setVetustaPage] = useState(0)
  const VETUSTA_PAGE_SIZE = 25

  const [authReady, setAuthReady] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(() => setAuthReady(true))
  }, [])
  useEffect(() => {
    if (authReady) loadAnalytics()
  }, [dateRange, authReady])

  async function loadAnalytics() {
    setLoading(true)
    try {
      const dataInizio = new Date()
      dataInizio.setDate(dataInizio.getDate() - parseInt(dateRange))

      // Carica ticket nel periodo
      const { data: tickets, error } = await supabase
        .from('ticket')
        .select(`
          *,
          cliente:clienti!ticket_id_cliente_fkey(ragione_sociale),
          utenti:id_tecnico_assegnato(nome, cognome)
        `)
        .gte('data_apertura', dataInizio.toISOString())
        .order('data_apertura', { ascending: true })

      if (error) throw error

      // Processa dati
      const ticketPerGiorno = processTicketPerGiorno(tickets)
      const ticketPerStato = processTicketPerStato(tickets)
      const ticketPerPriorita = processTicketPerPriorita(tickets)
      const ticketPerCategoria = processTicketPerCategoria(tickets)
      const tempoMedioRisoluzione = calcolaTempoMedio(tickets)
      const clientiPiuAttivi = processClientiAttivi(tickets)
      const tecnici = processTecnici(tickets)

      setAnalytics({
        ticketPerGiorno,
        ticketPerStato,
        ticketPerPriorita,
        ticketPerCategoria,
        tempoMedioRisoluzione,
        clientiPiuAttivi,
        tecnici
      })
    } catch (error) {
      console.error('Errore caricamento analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  function processTicketPerGiorno(tickets) {
    const grouped = {}
    tickets.forEach(ticket => {
      const data = new Date(ticket.data_apertura).toLocaleDateString('it-IT')
      grouped[data] = (grouped[data] || 0) + 1
    })
    return Object.entries(grouped).map(([data, count]) => ({ data, count }))
  }

  function processTicketPerStato(tickets) {
    const grouped = {}
    tickets.forEach(ticket => {
      grouped[ticket.stato] = (grouped[ticket.stato] || 0) + 1
    })
    return grouped
  }

  function processTicketPerPriorita(tickets) {
    const grouped = {}
    tickets.forEach(ticket => {
      grouped[ticket.priorita] = (grouped[ticket.priorita] || 0) + 1
    })
    return grouped
  }

  function processTicketPerCategoria(tickets) {
    const grouped = {}
    tickets.forEach(ticket => {
      const cat = ticket.categoria || 'altro'
      grouped[cat] = (grouped[cat] || 0) + 1
    })
    return grouped
  }

  function calcolaTempoMedio(tickets) {
    const risolti = tickets.filter(t => t.data_chiusura)
    if (risolti.length === 0) return 0

    const somma = risolti.reduce((acc, t) => {
      const diff = new Date(t.data_chiusura) - new Date(t.data_apertura)
      return acc + (diff / (1000 * 60 * 60)) // ore
    }, 0)

    return (somma / risolti.length).toFixed(1)
  }

  function processClientiAttivi(tickets) {
    const grouped = {}
    tickets.forEach(ticket => {
      if (ticket.clienti) {
        const cliente = ticket.clienti.ragione_sociale
        grouped[cliente] = (grouped[cliente] || 0) + 1
      }
    })

    return Object.entries(grouped)
      .map(([cliente, count]) => ({ cliente, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  function processTecnici(tickets) {
    const grouped = {}
    tickets.forEach(ticket => {
      if (ticket.utenti) {
        const tecnico = `${ticket.utenti.nome} ${ticket.utenti.cognome}`
        grouped[tecnico] = (grouped[tecnico] || 0) + 1
      }
    })

    return Object.entries(grouped)
      .map(([tecnico, count]) => ({ tecnico, count }))
      .sort((a, b) => b.count - a.count)
  }

  // === VETUSTÀ MACCHINARI ===
  async function searchVetusta() {
    setVetustaLoading(true)
    setVetustaPage(0)
    try {
      let dataLimite = null
      let dataDa = null
      let dataA = null

      if (vetustaFilterMode === 'preset' && vetustaPreset) {
        const oggi = new Date()
        oggi.setFullYear(oggi.getFullYear() - vetustaPreset)
        dataLimite = oggi.toISOString().split('T')[0]
      } else if (vetustaFilterMode === 'range') {
        dataDa = vetustaDateFrom || null
        dataA = vetustaDateTo || null
      }

      if (!dataLimite && !dataDa && !dataA) {
        toast.error('Seleziona un filtro per la ricerca')
        setVetustaLoading(false)
        return
      }

      // Paginazione per superare limite 1000 Supabase
      let allData = []
      let offset = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from('macchinari')
          .select('*, clienti!macchinari_id_cliente_fkey(id, ragione_sociale, codice_cliente)')

        if (dataLimite) {
          query = query.lte('data_installazione', dataLimite)
        }
        if (dataDa) {
          query = query.gte('data_installazione', dataDa)
        }
        if (dataA) {
          query = query.lte('data_installazione', dataA)
        }

        // Escludi quelli senza data installazione
        query = query.not('data_installazione', 'is', null)

        if (vetustaStato && vetustaStato !== 'tutti') {
          query = query.eq('stato', vetustaStato)
        }

        query = query.order('data_installazione', { ascending: true })
          .range(offset, offset + pageSize - 1)

        const { data, error } = await query
        if (error) throw error

        if (data && data.length > 0) {
          allData = [...allData, ...data]
          offset += pageSize
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
      }

      setVetustaMacchinari(allData)
      setVetustaSearched(true)
    } catch (error) {
      console.error('Errore ricerca vetustà:', error)
      toast.error('Errore nella ricerca')
    } finally {
      setVetustaLoading(false)
    }
  }

  function handlePresetClick(anni) {
    setVetustaFilterMode('preset')
    setVetustaPreset(anni)
    setVetustaDateFrom('')
    setVetustaDateTo('')
  }

  function calcolaEtaAnni(dataInstallazione) {
    if (!dataInstallazione) return null
    const diff = new Date() - new Date(dataInstallazione)
    return (diff / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1)
  }

  function getStatoGaranzia(m) {
    const dataGaranzia = m.garanzia_estensione_scadenza || m.garanzia_scadenza
    if (!dataGaranzia) return { label: 'N/D', color: 'gray' }
    const oggi = new Date()
    const scadenza = new Date(dataGaranzia)
    const giorniRimanenti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24))
    if (giorniRimanenti < 0) return { label: 'Scaduta', color: 'red' }
    if (giorniRimanenti <= 90) return { label: `${giorniRimanenti}gg`, color: 'amber' }
    return { label: 'Attiva', color: 'green' }
  }

  function getStatoManutenzione(m) {
    const contratto = (m.contratto_manutenzione || '').toLowerCase()
    if (contratto === 'attivo') return { label: 'Attivo', color: 'green' }
    if (contratto === 'scaduto') return { label: 'Scaduto', color: 'red' }
    return { label: 'No', color: 'gray' }
  }

  // KPI vetustà
  const vetustaKpi = (() => {
    if (vetustaMacchinari.length === 0) return null
    const clientiUnici = new Set(vetustaMacchinari.map(m => m.id_cliente)).size
    const etaMedia = vetustaMacchinari.reduce((acc, m) => {
      return acc + (parseFloat(calcolaEtaAnni(m.data_installazione)) || 0)
    }, 0) / vetustaMacchinari.length
    const senzaManut = vetustaMacchinari.filter(m => {
      const c = (m.contratto_manutenzione || '').toLowerCase()
      return c !== 'attivo'
    }).length
    const percSenzaManut = ((senzaManut / vetustaMacchinari.length) * 100).toFixed(0)
    return { totale: vetustaMacchinari.length, clienti: clientiUnici, etaMedia: etaMedia.toFixed(1), percSenzaManut }
  })()

  // Pagina corrente risultati
  const vetustaPaged = vetustaMacchinari.slice(
    vetustaPage * VETUSTA_PAGE_SIZE,
    (vetustaPage + 1) * VETUSTA_PAGE_SIZE
  )
  const vetustaTotalPages = Math.ceil(vetustaMacchinari.length / VETUSTA_PAGE_SIZE)

  // Export CSV
  function exportCSV() {
    if (vetustaMacchinari.length === 0) return
    const headers = ['Cliente', 'Codice', 'Tipo', 'Marca', 'Modello', 'N. Serie', 'Data Installazione', 'Età (anni)', 'Garanzia', 'Manutenzione', 'Stato']
    const rows = vetustaMacchinari.map(m => [
      m.clienti?.ragione_sociale || '',
      m.clienti?.codice_cliente || '',
      m.tipo_macchinario || '',
      m.marca || '',
      m.modello || '',
      m.numero_seriale || '',
      m.data_installazione ? new Date(m.data_installazione).toLocaleDateString('it-IT') : '',
      calcolaEtaAnni(m.data_installazione) || '',
      getStatoGaranzia(m).label,
      getStatoManutenzione(m).label,
      m.stato || ''
    ])
    const csv = [headers.join(';'), ...rows.map(r => r.map(c => `"${c}"`).join(';'))].join('\n')
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `vetusta_macchinari_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`Esportati ${vetustaMacchinari.length} macchinari`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Caricamento analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Torna alla Dashboard</span>
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Analytics</h1>
              <p className="text-gray-600 dark:text-gray-400">Statistiche e metriche del sistema</p>
            </div>
            
            {/* Selettore periodo */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="7">Ultimi 7 giorni</option>
              <option value="30">Ultimi 30 giorni</option>
              <option value="90">Ultimi 90 giorni</option>
              <option value="365">Ultimo anno</option>
            </select>
          </div>
        </div>

        {/* KPI principali */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="text-blue-600" size={24} />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {analytics.ticketPerGiorno.reduce((acc, d) => acc + d.count, 0)}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Ticket Totali</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="text-amber-600" size={24} />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {analytics.tempoMedioRisoluzione}h
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Tempo Medio</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-green-600" size={24} />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {analytics.clientiPiuAttivi.length}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Clienti Attivi</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="text-purple-600" size={24} />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {analytics.tecnici.length}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Tecnici Attivi</p>
          </div>
        </div>

        {/* Grafici e tabelle */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Ticket per stato */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Ticket per Stato</h3>
            <div className="space-y-3">
              {Object.entries(analytics.ticketPerStato).map(([stato, count]) => (
                <div key={stato} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {stato.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ 
                          width: `${(count / Math.max(...Object.values(analytics.ticketPerStato))) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white w-8 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ticket per priorità */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Ticket per Priorità</h3>
            <div className="space-y-3">
              {Object.entries(analytics.ticketPerPriorita).map(([priorita, count]) => (
                <div key={priorita} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {priorita}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          priorita === 'alta' || priorita === 'critica' ? 'bg-red-600' :
                          priorita === 'media' ? 'bg-yellow-600' : 'bg-green-600'
                        }`}
                        style={{ 
                          width: `${(count / Math.max(...Object.values(analytics.ticketPerPriorita))) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white w-8 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Clienti più attivi */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top 10 Clienti più Attivi</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Posizione
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Cliente
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Ticket Aperti
                  </th>
                </tr>
              </thead>
              <tbody>
                {analytics.clientiPiuAttivi.map((cliente, idx) => (
                  <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      #{idx + 1}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      {cliente.cliente}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-blue-600 dark:text-blue-400">
                      {cliente.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance tecnici */}
        {analytics.tecnici.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Performance Tecnici</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.tecnici.map((tecnico, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {tecnico.tecnico}
                    </span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {tecnico.count}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">ticket gestiti</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SEZIONE: ANALISI VETUSTÀ MACCHINARI */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="mt-12 pt-10 border-t-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <HardDrive className="text-orange-600 dark:text-orange-400" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analisi Vetustà Macchinari</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Identifica apparecchiature datate per pianificare sostituzioni e reminder</p>
            </div>
          </div>

          {/* Filtri */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            {/* Preset rapidi */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Installati da più di:
              </label>
              <div className="flex flex-wrap gap-2">
                {[5, 8, 10, 15, 20].map(anni => (
                  <button
                    key={anni}
                    onClick={() => handlePresetClick(anni)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      vetustaFilterMode === 'preset' && vetustaPreset === anni
                        ? 'bg-orange-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                    }`}
                  >
                    {'>'} {anni} anni
                  </button>
                ))}
              </div>
            </div>

            {/* Divider "oppure" */}
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">oppure range personalizzato</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
            </div>

            {/* Range personalizzato */}
            <div className="flex flex-wrap items-end gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data da</label>
                <input
                  type="date"
                  value={vetustaDateFrom}
                  onChange={(e) => {
                    setVetustaDateFrom(e.target.value)
                    setVetustaFilterMode('range')
                    setVetustaPreset(null)
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data a</label>
                <input
                  type="date"
                  value={vetustaDateTo}
                  onChange={(e) => {
                    setVetustaDateTo(e.target.value)
                    setVetustaFilterMode('range')
                    setVetustaPreset(null)
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Filtro stato */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stato</label>
                <select
                  value={vetustaStato}
                  onChange={(e) => setVetustaStato(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="tutti">Tutti</option>
                  <option value="attivo">Attivo</option>
                  <option value="obsoleto">Obsoleto</option>
                  <option value="dismesso">Dismesso</option>
                  <option value="in_manutenzione">In manutenzione</option>
                </select>
              </div>

              {/* Pulsante cerca */}
              <button
                onClick={searchVetusta}
                disabled={vetustaLoading}
                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {vetustaLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Search size={18} />
                )}
                Cerca
              </button>
            </div>
          </div>

          {/* KPI vetustà */}
          {vetustaKpi && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <HardDrive className="text-blue-600 dark:text-blue-400" size={24} />
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{vetustaKpi.totale}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Macchinari trovati</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <Users className="text-green-600 dark:text-green-400" size={24} />
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{vetustaKpi.clienti}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Clienti coinvolti</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="text-amber-600 dark:text-amber-400" size={24} />
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{vetustaKpi.etaMedia}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Età media (anni)</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{vetustaKpi.percSenzaManut}%</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Senza manutenzione</p>
              </div>
            </div>
          )}

          {/* Tabella risultati */}
          {vetustaSearched && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              {/* Header tabella con export */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Risultati ({vetustaMacchinari.length})
                </h3>
                {vetustaMacchinari.length > 0 && (
                  <button
                    onClick={exportCSV}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Download size={16} />
                    Esporta CSV
                  </button>
                )}
              </div>

              {vetustaMacchinari.length === 0 ? (
                <div className="text-center py-12">
                  <HardDrive className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
                  <p className="text-gray-600 dark:text-gray-400">Nessun macchinario trovato con i filtri selezionati</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-3 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Cliente</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Tipo</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Marca / Modello</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">N. Serie</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Installazione</th>
                          <th className="text-center py-3 px-3 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Età</th>
                          <th className="text-center py-3 px-3 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Garanzia</th>
                          <th className="text-center py-3 px-3 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Manut.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vetustaPaged.map((m, idx) => {
                          const eta = calcolaEtaAnni(m.data_installazione)
                          const garanzia = getStatoGaranzia(m)
                          const manutenzione = getStatoManutenzione(m)
                          const garanziaColors = {
                            green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                            amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
                            red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                            gray: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }
                          const manutColors = {
                            green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                            red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                            gray: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }

                          return (
                            <tr key={m.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                              <td className="py-3 px-3">
                                <Link
                                  href={`/clienti/${m.clienti?.id}`}
                                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                >
                                  {m.clienti?.ragione_sociale || '—'}
                                  <ExternalLink size={12} />
                                </Link>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{m.clienti?.codice_cliente}</p>
                              </td>
                              <td className="py-3 px-3 text-sm text-gray-900 dark:text-white">{m.tipo_macchinario || '—'}</td>
                              <td className="py-3 px-3">
                                <p className="text-sm text-gray-900 dark:text-white">{m.marca || '—'}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{m.modello || ''}</p>
                              </td>
                              <td className="py-3 px-3 text-sm text-gray-600 dark:text-gray-400 font-mono text-xs">{m.numero_seriale || '—'}</td>
                              <td className="py-3 px-3 text-sm text-gray-900 dark:text-white">
                                {m.data_installazione ? new Date(m.data_installazione).toLocaleDateString('it-IT') : '—'}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`text-sm font-bold ${parseFloat(eta) >= 10 ? 'text-red-600 dark:text-red-400' : parseFloat(eta) >= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                                  {eta}a
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${garanziaColors[garanzia.color]}`}>
                                  {garanzia.label}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${manutColors[manutenzione.color]}`}>
                                  {manutenzione.label}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginazione */}
                  {vetustaTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {vetustaPage * VETUSTA_PAGE_SIZE + 1}–{Math.min((vetustaPage + 1) * VETUSTA_PAGE_SIZE, vetustaMacchinari.length)} di {vetustaMacchinari.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setVetustaPage(p => Math.max(0, p - 1))}
                          disabled={vetustaPage === 0}
                          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {vetustaPage + 1} / {vetustaTotalPages}
                        </span>
                        <button
                          onClick={() => setVetustaPage(p => Math.min(vetustaTotalPages - 1, p + 1))}
                          disabled={vetustaPage >= vetustaTotalPages - 1}
                          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}