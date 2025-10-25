'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { 
  Bell, X, AlertCircle, Clock, FileText, Ticket, 
  Calendar, CheckCircle, ChevronRight 
} from 'lucide-react'

export default function NotificationDropdown() {
  const { userProfile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [notifiche, setNotifiche] = useState([])
  const [loading, setLoading] = useState(false)
  const [totaleNonLette, setTotaleNonLette] = useState(0)

  useEffect(() => {
    if (userProfile) {
      loadNotifiche()
      
      // Ricarica ogni 5 minuti
      const interval = setInterval(loadNotifiche, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [userProfile])

  async function loadNotifiche() {
    if (!userProfile) return
    
    try {
      const notificheArray = []
      
      // 1. CONTRATTI IN SCADENZA (< 30 giorni)
      const { data: contrattiScadenza } = await supabase
        .from('contratti')
        .select(`
          id,
          num_contratto,
          nome_contratto,
          data_scadenza,
          cliente:clienti!contratti_codice_cliente_fkey(ragione_sociale)
        `)
        .eq('stato', 'attivo')
        .gte('data_scadenza', new Date().toISOString().split('T')[0])
        .lte('data_scadenza', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('data_scadenza')

      contrattiScadenza?.forEach(contratto => {
        const giorni = Math.ceil((new Date(contratto.data_scadenza) - new Date()) / (1000 * 60 * 60 * 24))
        notificheArray.push({
          id: `scadenza-${contratto.id}`,
          tipo: 'scadenza_contratto',
          titolo: 'Contratto in scadenza',
          descrizione: `${contratto.nome_contratto} - ${contratto.cliente?.ragione_sociale}`,
          dettaglio: `Scade tra ${giorni} giorni`,
          priorita: giorni <= 7 ? 'alta' : 'media',
          icon: AlertCircle,
          link: '/contratti',
          timestamp: contratto.data_scadenza
        })
      })

      // 2. CONTRATTI CON ORE < 10%
      const { data: contrattiOre } = await supabase
        .from('contratti')
        .select(`
          id,
          num_contratto,
          nome_contratto,
          ore_incluse,
          ore_rimanenti,
          cliente:clienti!contratti_codice_cliente_fkey(ragione_sociale)
        `)
        .eq('stato', 'attivo')
        .gt('ore_rimanenti', 0)

      contrattiOre?.forEach(contratto => {
        const percentuale = (contratto.ore_rimanenti / contratto.ore_incluse) * 100
        if (percentuale <= 10) {
          notificheArray.push({
            id: `ore-${contratto.id}`,
            tipo: 'ore_esaurite',
            titolo: 'Ore quasi esaurite',
            descrizione: `${contratto.nome_contratto} - ${contratto.cliente?.ragione_sociale}`,
            dettaglio: `Solo ${contratto.ore_rimanenti.toFixed(1)}h rimanenti`,
            priorita: 'alta',
            icon: Clock,
            link: '/contratti',
            timestamp: new Date().toISOString()
          })
        }
      })

      // 3. TICKET ASSEGNATI A ME (non completati)
      if (userProfile.ruolo === 'tecnico' || userProfile.ruolo === 'admin') {
        const { data: ticketAssegnati } = await supabase
          .from('ticket')
          .select(`
            id,
            numero_ticket,
            oggetto,
            priorita,
            stato,
            created_at,
            cliente:clienti!ticket_cliente_id_fkey(ragione_sociale)
          `)
          .eq('id_tecnico_assegnato', userProfile.id)
          .in('stato', ['aperto', 'in_lavorazione'])
          .order('created_at', { ascending: false })
          .limit(5)

        ticketAssegnati?.forEach(ticket => {
          const isUrgente = ticket.priorita === 'urgente'
          notificheArray.push({
            id: `ticket-${ticket.id}`,
            tipo: 'ticket_assegnato',
            titolo: isUrgente ? '🔴 Ticket urgente' : 'Ticket assegnato',
            descrizione: ticket.oggetto,
            dettaglio: `${ticket.cliente?.ragione_sociale} - #${ticket.numero_ticket}`,
            priorita: isUrgente ? 'alta' : 'normale',
            icon: Ticket,
            link: `/ticket/${ticket.id}`,
            timestamp: ticket.created_at
          })
        })
      }

      // 4. TICKET CON PRIORITÀ ALTA (per admin)
      if (userProfile.ruolo === 'admin') {
        const { data: ticketUrgenti } = await supabase
          .from('ticket')
          .select(`
            id,
            numero_ticket,
            oggetto,
            priorita,
            stato,
            created_at,
            cliente:clienti!ticket_cliente_id_fkey(ragione_sociale)
          `)
          .eq('priorita', 'urgente')
          .eq('stato', 'aperto')
          .is('id_tecnico_assegnato', null)
          .order('created_at', { ascending: false })
          .limit(3)

        ticketUrgenti?.forEach(ticket => {
          notificheArray.push({
            id: `urgente-${ticket.id}`,
            tipo: 'ticket_urgente',
            titolo: '🚨 Ticket urgente non assegnato',
            descrizione: ticket.oggetto,
            dettaglio: `${ticket.cliente?.ragione_sociale} - #${ticket.numero_ticket}`,
            priorita: 'alta',
            icon: AlertCircle,
            link: `/ticket/${ticket.id}`,
            timestamp: ticket.created_at
          })
        })
      }

      // 5. INTERVENTI PROGRAMMATI OGGI
      const oggi = new Date().toISOString().split('T')[0]
      const { data: interventiOggi } = await supabase
        .from('interventi')
        .select(`
          id,
          data_intervento,
          ora_inizio,
          tipo_attivita,
          ticket:ticket!interventi_ticket_id_fkey(
            numero_ticket,
            oggetto,
            cliente:clienti!ticket_cliente_id_fkey(ragione_sociale)
          )
        `)
        .eq('tecnico_id', userProfile.id)
        .eq('data_intervento', oggi)
        .order('ora_inizio')

      interventiOggi?.forEach(intervento => {
        notificheArray.push({
          id: `intervento-${intervento.id}`,
          tipo: 'intervento_oggi',
          titolo: 'Intervento programmato oggi',
          descrizione: `${intervento.tipo_attivita} - ${intervento.ticket?.cliente?.ragione_sociale}`,
          dettaglio: `Ore ${intervento.ora_inizio} - ${intervento.ticket?.oggetto}`,
          priorita: 'normale',
          icon: Calendar,
          link: `/ticket/${intervento.ticket?.id}`,
          timestamp: `${oggi}T${intervento.ora_inizio}`
        })
      })

      // Ordina per priorità e timestamp
      notificheArray.sort((a, b) => {
        const prioritaOrder = { alta: 0, media: 1, normale: 2 }
        if (prioritaOrder[a.priorita] !== prioritaOrder[b.priorita]) {
          return prioritaOrder[a.priorita] - prioritaOrder[b.priorita]
        }
        return new Date(b.timestamp) - new Date(a.timestamp)
      })

      setNotifiche(notificheArray)
      setTotaleNonLette(notificheArray.length)
    } catch (error) {
      console.error('Errore caricamento notifiche:', error)
    }
  }

  function getPriorityColor(priorita) {
    switch (priorita) {
      case 'alta': return 'text-red-600 bg-red-50 border-red-200'
      case 'media': return 'text-orange-600 bg-orange-50 border-orange-200'
      default: return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  function formatTimestamp(timestamp) {
    const data = new Date(timestamp)
    const oggi = new Date()
    const diffMs = oggi - data
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m fa`
    if (diffHours < 24) return `${diffHours}h fa`
    if (diffDays < 7) return `${diffDays}g fa`
    return data.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) loadNotifiche()
        }}
        className="relative p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Notifiche"
      >
        <Bell size={20} />
        {totaleNonLette > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-bold rounded-full">
            {totaleNonLette > 9 ? '9+' : totaleNonLette}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Notifiche
                </h3>
                {totaleNonLette > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {totaleNonLette} {totaleNonLette === 1 ? 'notifica' : 'notifiche'}
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Notifiche List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
                  <p className="text-sm text-gray-500 mt-2">Caricamento...</p>
                </div>
              ) : notifiche.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle className="mx-auto text-green-500 mb-3" size={48} />
                  <p className="font-medium text-gray-900 dark:text-white mb-1">
                    Tutto a posto!
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Nessuna notifica al momento
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notifiche.map((notifica) => {
                    const Icon = notifica.icon
                    return (
                      <Link
                        key={notifica.id}
                        href={notifica.link}
                        onClick={() => setIsOpen(false)}
                        className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex gap-3">
                          {/* Icon */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border ${getPriorityColor(notifica.priorita)}`}>
                            <Icon size={20} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="font-semibold text-sm text-gray-900 dark:text-white">
                                {notifica.titolo}
                              </p>
                              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {formatTimestamp(notifica.timestamp)}
                              </span>
                            </div>
                            
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1 truncate">
                              {notifica.descrizione}
                            </p>
                            
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {notifica.dettaglio}
                            </p>
                          </div>

                          {/* Arrow */}
                          <ChevronRight className="flex-shrink-0 text-gray-400" size={16} />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifiche.length > 0 && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    loadNotifiche()
                  }}
                  className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-center"
                >
                  🔄 Aggiorna notifiche
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
