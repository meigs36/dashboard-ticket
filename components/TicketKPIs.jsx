// components/TicketKPIs.jsx - VERSIONE CORRETTA V2
'use client'

import { AlertCircle, Clock, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react'

/**
 * KPI Cards Interattive per Ticket
 * 
 * LOGICA FILTRI:
 * - Aperti: stato = 'aperto'
 * - In Lavorazione: stato = 'in_lavorazione' + priorità 'alta'
 * - Risolti: stato = 'risolto' o 'chiuso'
 * - Critici: priorità = 'critica' (SOLO critica, esclusa alta)
 * - Tempo Medio: informativo, non filtra
 */
export default function TicketKPIs({ stats, filtroStato, setFiltroStato, filtroPriorita, setFiltroPriorita }) {
  
  const kpis = [
    {
      id: 'aperto',
      label: 'Aperti',
      value: stats.aperti,
      icon: AlertCircle,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
      border: 'border-blue-200 dark:border-blue-800',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      textColor: 'text-blue-900 dark:text-blue-100',
      hoverBorder: 'hover:border-blue-400 dark:hover:border-blue-600',
      activeBg: 'ring-4 ring-blue-300 dark:ring-blue-700',
      description: 'Nuovi ticket',
      filtroType: 'stato'
    },
    {
      id: 'in_lavorazione',
      label: 'In Lavorazione',
      value: stats.inLavorazione,
      icon: Clock,
      gradient: 'from-amber-500 to-amber-600',
      bgGradient: 'from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20',
      border: 'border-amber-200 dark:border-amber-800',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      textColor: 'text-amber-900 dark:text-amber-100',
      hoverBorder: 'hover:border-amber-400 dark:hover:border-amber-600',
      activeBg: 'ring-4 ring-amber-300 dark:ring-amber-700',
      description: 'In corso + Alta',
      filtroType: 'stato'
    },
    {
      id: 'risolto',
      label: 'Risolti',
      value: stats.risolti,
      icon: CheckCircle,
      gradient: 'from-green-500 to-green-600',
      bgGradient: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
      border: 'border-green-200 dark:border-green-800',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      textColor: 'text-green-900 dark:text-green-100',
      hoverBorder: 'hover:border-green-400 dark:hover:border-green-600',
      activeBg: 'ring-4 ring-green-300 dark:ring-green-700',
      description: 'Completati',
      filtroType: 'stato'
    },
    {
      id: 'critici',
      label: 'Critici',
      value: stats.critici,
      icon: AlertTriangle,
      gradient: 'from-red-500 to-red-600',
      bgGradient: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20',
      border: 'border-red-200 dark:border-red-800',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      textColor: 'text-red-900 dark:text-red-100',
      hoverBorder: 'hover:border-red-400 dark:hover:border-red-600',
      activeBg: 'ring-4 ring-red-300 dark:ring-red-700',
      description: 'Solo critici',
      filtroType: 'priorita'
    },
    {
      id: 'tempo',
      label: 'Tempo Medio',
      value: stats.tempoMedio,
      icon: TrendingUp,
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
      border: 'border-purple-200 dark:border-purple-800',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      textColor: 'text-purple-900 dark:text-purple-100',
      hoverBorder: 'hover:border-purple-400 dark:hover:border-purple-600',
      activeBg: 'ring-4 ring-purple-300 dark:ring-purple-700',
      description: 'Risoluzione',
      filtroType: 'info'
    }
  ]

  const handleKPIClick = (kpi) => {
    if (kpi.filtroType === 'info') return
    
    // ✅ Gestione filtro priorità CRITICI (solo critica)
    if (kpi.filtroType === 'priorita' && kpi.id === 'critici') {
      if (filtroPriorita === 'critica') {
        // Disattiva filtro
        setFiltroPriorita('tutti')
        setFiltroStato('tutti')
      } else {
        // Attiva filtro SOLO critici
        setFiltroPriorita('critica')
        setFiltroStato('tutti')
      }
      return
    }
    
    // Gestione filtro stato
    if (filtroStato === kpi.id) {
      // Disattiva filtro
      setFiltroStato('tutti')
    } else {
      // Attiva nuovo filtro stato
      setFiltroStato(kpi.id)
      // Resetta filtro priorità
      setFiltroPriorita('tutti')
    }
  }

  const isActive = (kpiId, kpiType) => {
    if (kpiType === 'info') return false
    
    if (kpiType === 'priorita' && kpiId === 'critici') {
      return filtroPriorita === 'critica'
    }
    
    return filtroStato === kpiId
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        const active = isActive(kpi.id, kpi.filtroType)
        const isClickable = kpi.filtroType !== 'info'
        
        return (
          <div
            key={kpi.id}
            onClick={() => handleKPIClick(kpi)}
            className={`
              relative overflow-hidden rounded-2xl border-2 p-6 transition-all duration-300
              bg-gradient-to-br ${kpi.bgGradient}
              ${kpi.border}
              ${isClickable ? 'cursor-pointer' : 'cursor-default'}
              ${isClickable ? kpi.hoverBorder : ''}
              ${isClickable ? 'hover:shadow-lg hover:scale-105 active:scale-100' : ''}
              ${active ? kpi.activeBg : ''}
              ${active ? 'shadow-xl scale-105' : 'shadow-sm'}
            `}
          >
            {active && (
              <div className="absolute top-2 right-2">
                <div className={`px-2 py-1 rounded-full text-xs font-bold ${kpi.iconColor} ${kpi.iconBg}`}>
                  Attivo
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <div className={`p-3 rounded-xl ${kpi.iconBg} transition-transform duration-300 ${active ? 'scale-110' : ''}`}>
                <Icon className={kpi.iconColor} size={24} />
              </div>
              <span className={`text-4xl font-bold ${kpi.textColor} transition-all ${active ? 'scale-110' : ''}`}>
                {kpi.value}
              </span>
            </div>

            <div>
              <h3 className={`text-lg font-bold ${kpi.textColor} mb-1`}>
                {kpi.label}
              </h3>
              <p className={`text-sm ${kpi.textColor} opacity-70`}>
                {kpi.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
