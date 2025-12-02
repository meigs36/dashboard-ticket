'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  Bell, 
  Check, 
  CheckCheck,
  Clock, 
  AlertCircle, 
  Ticket, 
  Calendar,
  MessageSquare,
  FileText,
  X,
  Loader2,
  ChevronRight
} from 'lucide-react'

/**
 * NotificationDropdown Avanzato
 * 
 * Combina:
 * - Notifiche dinamiche (contratti in scadenza, ticket, ecc.)
 * - Notifiche permanenti team (da note interne)
 * 
 * Le notifiche permanenti restano visibili finché non vengono segnate come lette.
 */
export default function NotificationDropdownAdvanced({ userProfile }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notifiche, setNotifiche] = useState([])
  const [notifichePermanenti, setNotifichePermanenti] = useState([])
  const [conteggio, setConteggio] = useState(0)
  const [tab, setTab] = useState('tutte') // 'tutte', 'permanenti', 'dinamiche'
  const dropdownRef = useRef(null)
  const router = useRouter()

  // Carica notifiche all'apertura
  useEffect(() => {
    if (isOpen && userProfile) {
      loadAllNotifications()
    }
  }, [isOpen, userProfile])

  // Polling per aggiornamento conteggio (ogni 30 secondi)
  useEffect(() => {
    if (userProfile) {
      loadNotificationCount()
      const interval = setInterval(loadNotificationCount, 30000)
      return () => clearInterval(interval)
    }
  }, [userProfile])

  // Click fuori chiude dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Real-time subscription per nuove notifiche permanenti
  useEffect(() => {
    if (!userProfile) return

    const channel = supabase
      .channel('team_notifications_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_notifications'
        },
        (payload) => {
          // Nuova notifica - aggiorna conteggio
          loadNotificationCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userProfile])

  // Carica solo il conteggio (leggero)
  async function loadNotificationCount() {
    if (!userProfile) return

    try {
      // Conta notifiche permanenti non lette
      const { count, error } = await supabase
        .from('team_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('letta', false)
        .or(`destinatario_ruolo.eq.all,destinatario_ruolo.eq.${userProfile.ruolo},destinatario_id.eq.${userProfile.id}`)

      if (!error) {
        // Aggiungi conteggio notifiche dinamiche (stima)
        const dinamiche = await countDynamicNotifications()
        setConteggio((count || 0) + dinamiche)
      }
    } catch (err) {
      console.error('Errore conteggio notifiche:', err)
    }
  }

  // Conta notifiche dinamiche (semplificate)
  async function countDynamicNotifications() {
    let count = 0
    
    try {
      // Contratti in scadenza nei prossimi 30 giorni
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      
      const { count: contrattiCount } = await supabase
        .from('contratti')
        .select('*', { count: 'exact', head: true })
        .eq('stato', 'attivo')
        .lte('data_scadenza', thirtyDaysFromNow.toISOString().split('T')[0])
        .gte('data_scadenza', new Date().toISOString().split('T')[0])

      count += contrattiCount || 0

      // Ticket urgenti non assegnati (solo per admin)
      if (userProfile?.ruolo === 'admin') {
        const { count: ticketCount } = await supabase
          .from('ticket')
          .select('*', { count: 'exact', head: true })
          .eq('priorita', 'urgente')
          .eq('stato', 'aperto')
          .is('id_tecnico_assegnato', null)

        count += ticketCount || 0
      }

    } catch (err) {
      console.error('Errore conteggio dinamiche:', err)
    }
    
    return count
  }

  // Carica tutte le notifiche (completo)
  async function loadAllNotifications() {
    setLoading(true)
    
    try {
      // 1. Carica notifiche permanenti team
      await loadPermanentNotifications()
      
      // 2. Carica notifiche dinamiche
      await loadDynamicNotifications()
      
    } catch (err) {
      console.error('Errore caricamento notifiche:', err)
    } finally {
      setLoading(false)
    }
  }

  // Notifiche permanenti dal database
  async function loadPermanentNotifications() {
    const { data, error } = await supabase
      .from('team_notifications')
      .select(`
        *,
        ticket:ticket_id(numero_ticket, oggetto),
        creatore:creata_da(nome, cognome)
      `)
      .eq('letta', false)
      .or(`destinatario_ruolo.eq.all,destinatario_ruolo.eq.${userProfile.ruolo},destinatario_id.eq.${userProfile.id}`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error && data) {
      setNotifichePermanenti(data.map(n => ({
        id: n.id,
        tipo: 'permanente',
        sottotipo: n.tipo,
        titolo: n.titolo,
        descrizione: n.messaggio,
        priorita: n.priorita,
        link: n.link_url,
        timestamp: n.created_at,
        icon: MessageSquare,
        metadata: n.metadata,
        ticket: n.ticket,
        creatore: n.creatore
      })))
    }
  }

  // Notifiche dinamiche (logica esistente)
  async function loadDynamicNotifications() {
    const notificheArray = []
    
    // 1. Contratti in scadenza
    const today = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const { data: contratti } = await supabase
      .from('contratti')
      .select(`
        id,
        num_contratto,
        nome_contratto,
        data_scadenza,
        cliente:clienti!contratti_codice_cliente_fkey(ragione_sociale)
      `)
      .eq('stato', 'attivo')
      .lte('data_scadenza', thirtyDaysFromNow.toISOString().split('T')[0])
      .gte('data_scadenza', today.toISOString().split('T')[0])
      .order('data_scadenza')
      .limit(5)

    contratti?.forEach(contratto => {
      const giorniRimanenti = Math.ceil(
        (new Date(contratto.data_scadenza) - today) / (1000 * 60 * 60 * 24)
      )
      notificheArray.push({
        id: `contratto-${contratto.id}`,
        tipo: 'dinamica',
        sottotipo: 'contratto_scadenza',
        titolo: '📄 Contratto in scadenza',
        descrizione: `${contratto.nome_contratto} - ${contratto.cliente?.ragione_sociale}`,
        dettaglio: giorniRimanenti <= 7 
          ? `⚠️ Scade tra ${giorniRimanenti} giorni!`
          : `Scade il ${new Date(contratto.data_scadenza).toLocaleDateString('it-IT')}`,
        priorita: giorniRimanenti <= 7 ? 'alta' : 'media',
        icon: FileText,
        link: '/contratti',
        timestamp: contratto.data_scadenza
      })
    })

    // 2. Contratti con ore < 10%
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
          tipo: 'dinamica',
          sottotipo: 'ore_esaurite',
          titolo: '⏰ Ore quasi esaurite',
          descrizione: `${contratto.nome_contratto} - ${contratto.cliente?.ragione_sociale}`,
          dettaglio: `Solo ${contratto.ore_rimanenti.toFixed(1)}h rimanenti (${percentuale.toFixed(0)}%)`,
          priorita: 'alta',
          icon: Clock,
          link: '/contratti',
          timestamp: new Date().toISOString()
        })
      }
    })

    // 3. Ticket assegnati a me
    if (userProfile.ruolo === 'tecnico' || userProfile.ruolo === 'admin') {
      const { data: ticketAssegnati } = await supabase
        .from('ticket')
        .select(`
          id,
          numero_ticket,
          oggetto,
          priorita,
          stato,
          data_creazione,
          cliente:clienti!ticket_id_cliente_fkey(ragione_sociale)
        `)
        .eq('id_tecnico_assegnato', userProfile.id)
        .in('stato', ['aperto', 'in_lavorazione'])
        .order('data_creazione', { ascending: false })
        .limit(5)

      ticketAssegnati?.forEach(ticket => {
        const isUrgente = ticket.priorita === 'urgente' || ticket.priorita === 'critica'
        notificheArray.push({
          id: `ticket-${ticket.id}`,
          tipo: 'dinamica',
          sottotipo: 'ticket_assegnato',
          titolo: isUrgente ? '🔴 Ticket urgente' : '🎫 Ticket assegnato',
          descrizione: ticket.oggetto,
          dettaglio: `${ticket.cliente?.ragione_sociale} - #${ticket.numero_ticket}`,
          priorita: isUrgente ? 'alta' : 'normale',
          icon: Ticket,
          link: `/ticket/${ticket.id}`,
          timestamp: ticket.data_creazione
        })
      })
    }

    // 4. Ticket urgenti non assegnati (solo admin)
    if (userProfile.ruolo === 'admin') {
      const { data: ticketUrgenti } = await supabase
        .from('ticket')
        .select(`
          id,
          numero_ticket,
          oggetto,
          priorita,
          stato,
          data_creazione,
          cliente:clienti!ticket_id_cliente_fkey(ragione_sociale)
        `)
        .eq('priorita', 'urgente')
        .eq('stato', 'aperto')
        .is('id_tecnico_assegnato', null)
        .limit(3)

      ticketUrgenti?.forEach(ticket => {
        notificheArray.push({
          id: `urgente-${ticket.id}`,
          tipo: 'dinamica',
          sottotipo: 'ticket_urgente',
          titolo: '🚨 Ticket urgente non assegnato',
          descrizione: ticket.oggetto,
          dettaglio: `${ticket.cliente?.ragione_sociale} - #${ticket.numero_ticket}`,
          priorita: 'alta',
          icon: AlertCircle,
          link: `/ticket/${ticket.id}`,
          timestamp: ticket.data_creazione
        })
      })
    }

    // 5. Interventi programmati oggi
    const oggi = new Date().toISOString().split('T')[0]
    const { data: interventiOggi } = await supabase
      .from('interventi')
      .select(`
        id,
        data_intervento,
        ora_inizio,
        tipo_attivita,
        ticket:ticket_id(
          numero_ticket,
          oggetto,
          cliente:clienti!ticket_id_cliente_fkey(ragione_sociale)
        )
      `)
      .eq('tecnico_id', userProfile.id)
      .eq('data_intervento', oggi)
      .order('ora_inizio')
      .limit(5)

    interventiOggi?.forEach(intervento => {
      notificheArray.push({
        id: `intervento-${intervento.id}`,
        tipo: 'dinamica',
        sottotipo: 'intervento_oggi',
        titolo: '📅 Intervento oggi',
        descrizione: `${intervento.tipo_attivita} - ${intervento.ticket?.cliente?.ragione_sociale}`,
        dettaglio: `Ore ${intervento.ora_inizio} - ${intervento.ticket?.oggetto}`,
        priorita: 'normale',
        icon: Calendar,
        link: `/ticket/${intervento.ticket_id}`,
        timestamp: new Date().toISOString()
      })
    })

    setNotifiche(notificheArray)
  }

  // Segna notifica permanente come letta
  async function markAsRead(notificaId) {
    try {
      await supabase.rpc('mark_team_notification_read', { 
        notification_id: notificaId 
      })
      
      // Rimuovi dalla lista locale
      setNotifichePermanenti(prev => prev.filter(n => n.id !== notificaId))
      setConteggio(prev => Math.max(0, prev - 1))
      
    } catch (err) {
      console.error('Errore mark as read:', err)
    }
  }

  // Segna tutte come lette
  async function markAllAsRead() {
    try {
      await supabase.rpc('mark_all_team_notifications_read')
      setNotifichePermanenti([])
      loadNotificationCount()
    } catch (err) {
      console.error('Errore mark all as read:', err)
    }
  }

  // Click su notifica
  function handleNotificationClick(notifica) {
    if (notifica.link) {
      router.push(notifica.link)
    }
    
    // Se permanente, segna come letta
    if (notifica.tipo === 'permanente') {
      markAsRead(notifica.id)
    }
    
    setIsOpen(false)
  }

  // Combina e filtra notifiche per tab
  function getFilteredNotifications() {
    const tutte = [
      ...notifichePermanenti.map(n => ({ ...n, isPermanent: true })),
      ...notifiche.map(n => ({ ...n, isPermanent: false }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    switch (tab) {
      case 'permanenti':
        return tutte.filter(n => n.isPermanent)
      case 'dinamiche':
        return tutte.filter(n => !n.isPermanent)
      default:
        return tutte
    }
  }

  const filteredNotifications = getFilteredNotifications()
  const hasPermanentUnread = notifichePermanenti.length > 0

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifiche"
      >
        <Bell size={22} className="text-gray-600" />
        
        {/* Badge conteggio */}
        {conteggio > 0 && (
          <span className={`absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center text-xs font-bold text-white rounded-full px-1 ${
            hasPermanentUnread ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
          }`}>
            {conteggio > 99 ? '99+' : conteggio}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[80vh] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notifiche</h3>
              <div className="flex items-center gap-2">
                {hasPermanentUnread && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <CheckCheck size={14} />
                    Segna tutte lette
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-3">
              {[
                { key: 'tutte', label: 'Tutte' },
                { key: 'permanenti', label: `Note (${notifichePermanenti.length})` },
                { key: 'dinamiche', label: 'Sistema' }
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    tab === t.key
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista notifiche */}
          <div className="overflow-y-auto max-h-96">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Bell size={32} className="mb-2 text-gray-300" />
                <p className="text-sm">Nessuna notifica</p>
              </div>
            ) : (
              filteredNotifications.map((notifica) => {
                const IconComponent = notifica.icon || Bell
                return (
                  <button
                    key={notifica.id}
                    onClick={() => handleNotificationClick(notifica)}
                    className={`w-full px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left ${
                      notifica.isPermanent ? 'bg-amber-50/50' : ''
                    }`}
                  >
                    {/* Icona */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      notifica.priorita === 'alta' || notifica.priorita === 'urgente'
                        ? 'bg-red-100 text-red-600'
                        : notifica.isPermanent
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-blue-100 text-blue-600'
                    }`}>
                      <IconComponent size={18} />
                    </div>

                    {/* Contenuto */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {notifica.titolo}
                        </p>
                        {notifica.isPermanent && (
                          <span className="flex-shrink-0 w-2 h-2 bg-amber-500 rounded-full" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {notifica.descrizione}
                      </p>
                      {notifica.dettaglio && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {notifica.dettaglio}
                        </p>
                      )}
                      {notifica.creatore && (
                        <p className="text-xs text-gray-400 mt-1">
                          di {notifica.creatore.nome} {notifica.creatore.cognome}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTimestamp(notifica.timestamp)}
                      </p>
                    </div>

                    {/* Azioni */}
                    <div className="flex-shrink-0 flex items-center">
                      {notifica.isPermanent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notifica.id)
                          }}
                          className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-green-600"
                          title="Segna come letta"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      {notifica.link && (
                        <ChevronRight size={16} className="text-gray-300" />
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-center">
              <span className="text-xs text-gray-500">
                {filteredNotifications.length} notifiche
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper: formatta timestamp relativo
function formatTimestamp(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Adesso'
  if (diffMins < 60) return `${diffMins} min fa`
  if (diffHours < 24) return `${diffHours}h fa`
  if (diffDays < 7) return `${diffDays}g fa`
  
  return date.toLocaleDateString('it-IT', { 
    day: 'numeric', 
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}
