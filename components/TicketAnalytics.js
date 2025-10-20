'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, Clock, CheckCircle } from 'lucide-react'

export default function TicketAnalytics({ tickets }) {
  const [analytics, setAnalytics] = useState({
    ticketPerGiorno: [],
    ticketPerStato: [],
    ticketPerPriorita: [],
    ticketPerCategoria: [],
    performanceTecnici: []
  })

  useEffect(() => {
    if (tickets && tickets.length > 0) {
      calcolaAnalytics()
    }
  }, [tickets])

  function calcolaAnalytics() {
    // 1. Ticket per giorno (ultimi 7 giorni)
    const oggi = new Date()
    const ticketPerGiorno = []
    
    for (let i = 6; i >= 0; i--) {
      const data = new Date(oggi)
      data.setDate(data.getDate() - i)
      const dataStr = data.toISOString().split('T')[0]
      
      const count = tickets.filter(t => {
        const ticketData = new Date(t.data_apertura).toISOString().split('T')[0]
        return ticketData === dataStr
      }).length
      
      ticketPerGiorno.push({
        giorno: data.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' }),
        ticket: count
      })
    }

    // 2. Ticket per stato
    const statiCount = {}
    tickets.forEach(t => {
      statiCount[t.stato] = (statiCount[t.stato] || 0) + 1
    })
    
    const ticketPerStato = Object.entries(statiCount).map(([stato, count]) => ({
      name: stato.replace('_', ' ').toUpperCase(),
      value: count,
      stato
    }))

    // 3. Ticket per priorità
    const prioritaCount = {}
    tickets.forEach(t => {
      prioritaCount[t.priorita] = (prioritaCount[t.priorita] || 0) + 1
    })
    
    const ticketPerPriorita = Object.entries(prioritaCount).map(([priorita, count]) => ({
      name: priorita.toUpperCase(),
      value: count
    }))

    // 4. Ticket per categoria
    const categoriaCount = {}
    tickets.forEach(t => {
      const cat = t.categoria || 'altro'
      categoriaCount[cat] = (categoriaCount[cat] || 0) + 1
    })
    
    const ticketPerCategoria = Object.entries(categoriaCount)
      .map(([categoria, count]) => ({
        categoria: categoria.replace('_', ' '),
        ticket: count
      }))
      .sort((a, b) => b.ticket - a.ticket)
      .slice(0, 5)

    // 5. Performance tecnici (top 5)
    const tecniciStats = {}
    tickets.forEach(t => {
      if (t.id_tecnico_assegnato) {
        if (!tecniciStats[t.id_tecnico_assegnato]) {
          tecniciStats[t.id_tecnico_assegnato] = {
            totali: 0,
            risolti: 0,
            inCorso: 0
          }
        }
        tecniciStats[t.id_tecnico_assegnato].totali++
        if (t.stato === 'risolto' || t.stato === 'chiuso') {
          tecniciStats[t.id_tecnico_assegnato].risolti++
        } else if (t.stato === 'in_lavorazione') {
          tecniciStats[t.id_tecnico_assegnato].inCorso++
        }
      }
    })

    const performanceTecnici = Object.entries(tecniciStats)
      .map(([id, stats]) => ({
        tecnico: `Tecnico #${id}`,
        risolti: stats.risolti,
        inCorso: stats.inCorso
      }))
      .sort((a, b) => b.risolti - a.risolti)
      .slice(0, 5)

    setAnalytics({
      ticketPerGiorno,
      ticketPerStato,
      ticketPerPriorita,
      ticketPerCategoria,
      performanceTecnici
    })
  }

  // Colori per i grafici
  const COLORS_STATO = {
    aperto: '#3B82F6',
    assegnato: '#8B5CF6',
    in_lavorazione: '#F59E0B',
    in_attesa_cliente: '#6B7280',
    risolto: '#10B981',
    chiuso: '#9CA3AF'
  }

  const COLORS_PRIORITA = ['#94A3B8', '#FCD34D', '#F87171', '#DC2626']

  return (
    <div className="space-y-6">
      {/* Trend Ticket Giornaliero */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="text-blue-600" size={24} />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Trend Apertura Ticket</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.ticketPerGiorno}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="giorno" 
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: '8px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="ticket" 
              stroke="#3B82F6" 
              strokeWidth={3}
              dot={{ fill: '#3B82F6', r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuzione per Stato */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle className="text-green-600" size={24} />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Distribuzione Stati</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.ticketPerStato}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.ticketPerStato.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS_STATO[entry.stato] || '#9CA3AF'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuzione per Priorità */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="text-amber-600" size={24} />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Priorità Ticket</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.ticketPerPriorita}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.ticketPerPriorita.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS_PRIORITA[index % COLORS_PRIORITA.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ticket per Categoria */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Users className="text-purple-600" size={24} />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Top 5 Categorie</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics.ticketPerCategoria}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="categoria" 
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="ticket" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Tecnici */}
      {analytics.performanceTecnici.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="text-indigo-600" size={24} />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Performance Tecnici</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.performanceTecnici}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="tecnico" 
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="risolti" fill="#10B981" name="Risolti" radius={[8, 8, 0, 0]} />
              <Bar dataKey="inCorso" fill="#F59E0B" name="In Corso" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Statistiche Rapide */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">Ticket Totali</p>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{tickets.length}</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-300 font-medium mb-1">Tasso Risoluzione</p>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">
            {tickets.length > 0 
              ? `${((tickets.filter(t => t.stato === 'risolto' || t.stato === 'chiuso').length / tickets.length) * 100).toFixed(0)}%`
              : '0%'
            }
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-300 font-medium mb-1">In Lavorazione</p>
          <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">
            {tickets.filter(t => t.stato === 'in_lavorazione' || t.stato === 'assegnato').length}
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-1">Alta Priorità</p>
          <p className="text-3xl font-bold text-red-900 dark:text-red-100">
            {tickets.filter(t => t.priorita === 'alta' || t.priorita === 'critica').length}
          </p>
        </div>
      </div>
    </div>
  )
}
