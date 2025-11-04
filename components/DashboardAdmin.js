'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  AlertCircle, Users, HardDrive, Ticket, TrendingUp, 
  Zap, Plus, BarChart3, ArrowRight 
} from 'lucide-react'
import Link from 'next/link'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import TicketActionsModal from '@/components/TicketActionsModal'

export default function DashboardAdmin() {
  const [stats, setStats] = useState({
    totalClienti: 0,
    totalMacchinari: 0,
    clientiAttivi: 0,
    ticketAperti: 0,
    loading: true
  })

  const [miniChart, setMiniChart] = useState([])
  const [recentTickets, setRecentTickets] = useState([])
  const [ticketSelezionato, setTicketSelezionato] = useState(null)
  const [mostraModalAzioni, setMostraModalAzioni] = useState(false)

  useEffect(() => {
    loadStats()
    loadMiniChart()
    loadRecentTickets()
  }, [])

  async function loadStats() {
    try {
      const { count: clientiCount } = await supabase
        .from('clienti')
        .select('*', { count: 'exact', head: true })

      const { count: clientiAttiviCount } = await supabase
        .from('clienti')
        .select('*', { count: 'exact', head: true })
        .eq('attivo', true)

      const { count: macchinariCount } = await supabase
        .from('macchinari')
        .select('*', { count: 'exact', head: true })

      const { count: ticketApertiCount } = await supabase
        .from('ticket')
        .select('*', { count: 'exact', head: true })
        .in('stato', ['aperto', 'assegnato', 'in_lavorazione'])

      setStats({
        totalClienti: clientiCount || 0,
        totalMacchinari: macchinariCount || 0,
        clientiAttivi: clientiAttiviCount || 0,
        ticketAperti: ticketApertiCount || 0,
        loading: false
      })
    } catch (error) {
      console.error('Errore caricamento stats:', error)
      setStats(prev => ({ ...prev, loading: false }))
    }
  }

  async function loadMiniChart() {
    try {
      const { data: ticketsData } = await supabase
        .from('ticket')
        .select('data_apertura')
        .order('data_apertura', { ascending: true })

      if (ticketsData && ticketsData.length > 0) {
        // Ultimi 7 giorni
        const oggi = new Date()
        const chartData = []
        
        for (let i = 6; i >= 0; i--) {
          const currentDate = new Date(oggi)
          currentDate.setDate(currentDate.getDate() - i)
          const dataStr = currentDate.toISOString().split('T')[0]
          
          const count = ticketsData.filter(t => {
            const ticketData = new Date(t.data_apertura).toISOString().split('T')[0]
            return ticketData === dataStr
          }).length || 0
          
          chartData.push({ value: count })
        }
        
        setMiniChart(chartData)
      }
    } catch (error) {
      console.error('Errore caricamento mini chart:', error)
    }
  }

  async function loadRecentTickets() {
    try {
      const { data } = await supabase
        .from('ticket')
        .select('id, numero_ticket, oggetto, stato, priorita, data_apertura, cliente:clienti!ticket_id_cliente_fkey(ragione_sociale)')
        .order('data_apertura', { ascending: false })
        .limit(5)

      setRecentTickets(data || [])
    } catch (error) {
      console.error('Errore caricamento recent tickets:', error)
    }
  }

  const getPrioritaBadge = (priorita) => {
    const badges = {
      bassa: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
      media: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      alta: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      critica: 'bg-red-600 text-white dark:bg-red-700'
    }
    return badges[priorita] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }

  const getStatoBadge = (stato) => {
    const badges = {
      aperto: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      assegnato: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      in_lavorazione: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      risolto: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      chiuso: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
    return badges[stato] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }

  function handleAzioniClick(ticket, e) {
    if (e) e.stopPropagation()
    setTicketSelezionato(ticket)
    setMostraModalAzioni(true)
  }

  function handleModalClose() {
    setMostraModalAzioni(false)
    setTicketSelezionato(null)
  }

  function handleTicketUpdate() {
    loadRecentTickets()
    loadStats()
  }

  if (stats.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Header con Gradient */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-500 dark:via-purple-500 dark:to-pink-500 rounded-2xl p-8 shadow-2xl mb-6">
            <h1 className="text-4xl font-bold text-white mb-2">Dashboard Amministratore</h1>
            <p className="text-blue-100 dark:text-blue-200">Sistema gestione clienti, macchinari e ticket</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Link href="/clienti">
            <div className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 border border-gray-200/50 dark:border-gray-700/50 hover:scale-105 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-400/20 dark:to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg">
                    <Users className="text-white" size={24} />
                  </div>
                  <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                    {stats.totalClienti}
                  </span>
                </div>
                <h3 className="text-gray-900 dark:text-white text-lg font-semibold mb-1">Clienti</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{stats.clientiAttivi} attivi</p>
              </div>
            </div>
          </Link>

          <Link href="/macchinari">
            <div className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 border border-gray-200/50 dark:border-gray-700/50 hover:scale-105 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-400/20 dark:to-emerald-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl shadow-lg">
                    <HardDrive className="text-white" size={24} />
                  </div>
                  <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                    {stats.totalMacchinari}
                  </span>
                </div>
                <h3 className="text-gray-900 dark:text-white text-lg font-semibold mb-1">Macchinari</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Installati</p>
              </div>
            </div>
          </Link>

          <Link href="/ticket">
            <div className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 border border-gray-200/50 dark:border-gray-700/50 hover:scale-105 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-400/20 dark:to-orange-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-xl shadow-lg">
                    <AlertCircle className="text-white" size={24} />
                  </div>
                  <span className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                    {stats.ticketAperti}
                  </span>
                </div>
                <h3 className="text-gray-900 dark:text-white text-lg font-semibold mb-1">Ticket Aperti</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">In gestione</p>
              </div>
            </div>
          </Link>

          <Link href="/analytics">
            <div className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 border border-gray-200/50 dark:border-gray-700/50 hover:scale-105 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-400/20 dark:to-pink-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-xl shadow-lg">
                    <BarChart3 className="text-white" size={24} />
                  </div>
                  {miniChart.length > 0 && (
                    <div className="w-20 h-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={miniChart}>
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#A855F7" 
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                <h3 className="text-gray-900 dark:text-white text-lg font-semibold mb-1">Analytics</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Report completi</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Azioni Rapide</h2>
            <div className="space-y-3">
              <Link
                href="/clienti"
                className="group flex items-center gap-3 p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
              >
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-lg">
                  <Users size={18} className="text-white" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">Gestisci Clienti</span>
              </Link>
              
              <Link
                href="/ticket/nuovo"
                className="group flex items-center gap-3 p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all"
              >
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2 rounded-lg">
                  <Plus size={18} className="text-white" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">Nuovo Ticket</span>
              </Link>
              
              <Link
                href="/macchinari"
                className="group flex items-center gap-3 p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
              >
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-2 rounded-lg">
                  <HardDrive size={18} className="text-white" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">Gestisci Macchinari</span>
              </Link>
            </div>
          </div>

          {/* Ticket Recenti - 🆕 CON LINK CLICCABILI */}
          <div className="lg:col-span-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ticket Recenti</h2>
              <Link
                href="/ticket"
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1 group"
              >
                Vedi tutti
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            
            {recentTickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Ticket size={48} className="mx-auto mb-2 opacity-50" />
                <p>Nessun ticket recente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => handleAzioniClick(ticket, null)}
                    className="block cursor-pointer"
                  >
                    <div className="group p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                              {ticket.numero_ticket}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatoBadge(ticket.stato)}`}>
                              {ticket.stato}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getPrioritaBadge(ticket.priorita)}`}>
                              {ticket.priorita}
                            </span>
                          </div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {ticket.oggetto}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {ticket.clienti?.ragione_sociale || 'Cliente sconosciuto'}
                          </p>
                        </div>
                        <ArrowRight 
                          size={20} 
                          className="text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Azioni Ticket */}
      {mostraModalAzioni && ticketSelezionato && (
        <TicketActionsModal
          ticket={ticketSelezionato}
          onClose={handleModalClose}
          onUpdate={handleTicketUpdate}
        />
      )}
    </div>
  )
}
