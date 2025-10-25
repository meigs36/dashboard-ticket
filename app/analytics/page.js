'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, TrendingUp, Clock, Users, AlertCircle, Calendar, BarChart3, PieChart } from 'lucide-react'
import Link from 'next/link'

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

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

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
      </div>
    </div>
  )
}