'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { AlertCircle, CheckCircle, Clock, TrendingUp, Zap, User, Settings } from 'lucide-react'
import Link from 'next/link'
import TicketActionsModal from '@/components/TicketActionsModal'

export default function DashboardTecnico() {
  const { userProfile } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [ticketSelezionato, setTicketSelezionato] = useState(null)
  const [mostraModalAzioni, setMostraModalAzioni] = useState(false)

  const [stats, setStats] = useState({
    totaliAssegnati: 0,
    aperti: 0,
    inLavorazione: 0,
    risoltiOggi: 0,
    critici: 0,
    tempoMedioRisoluzione: '-'
  })

  useEffect(() => {
    if (userProfile?.id) {
      loadTicketsTecnico()
    }
  }, [userProfile])

  useEffect(() => {
    calcolaStats()
  }, [tickets])

  async function loadTicketsTecnico() {
    try {
      const { data, error } = await supabase
        .from('ticket')
        .select(`
          *,
          cliente:clienti!ticket_id_cliente_fkey(
            id,
            ragione_sociale,
            codice_cliente,
            telefono_principale,
            email_riparazioni,
            citta,
            provincia
          ),
          macchinari(
            tipo_macchinario,
            numero_seriale,
            marca,
            modello
          )
        `)
        .eq('id_tecnico_assegnato', userProfile.id)
        .order('priorita', { ascending: false })
        .order('data_apertura', { ascending: false })

      if (error) throw error
      setTickets(data || [])
    } catch (error) {
      console.error('Errore caricamento ticket:', error)
    } finally {
      setLoading(false)
    }
  }

  function calcolaStats() {
    const aperti = tickets.filter(t => t.stato === 'aperto' || t.stato === 'assegnato').length
    const inLavorazione = tickets.filter(t => t.stato === 'in_lavorazione').length
    const critici = tickets.filter(t => 
      (t.priorita === 'alta' || t.priorita === 'critica') && 
      (t.stato !== 'risolto' && t.stato !== 'chiuso')
    ).length

    // Risolti oggi
    const oggi = new Date()
    oggi.setHours(0, 0, 0, 0)
    const risoltiOggi = tickets.filter(t => {
      if (!t.data_chiusura) return false
      const dataChiusura = new Date(t.data_chiusura)
      return dataChiusura >= oggi && (t.stato === 'risolto' || t.stato === 'chiuso')
    }).length

    // Tempo medio risoluzione (ultimi 30 giorni)
    const trentaGiorniFa = new Date()
    trentaGiorniFa.setDate(trentaGiorniFa.getDate() - 30)
    const ticketRisoltiRecenti = tickets.filter(t => 
      t.data_chiusura && 
      new Date(t.data_chiusura) >= trentaGiorniFa &&
      (t.stato === 'risolto' || t.stato === 'chiuso')
    )

    let tempoMedioRisoluzione = '-'
    if (ticketRisoltiRecenti.length > 0) {
      const sommaOre = ticketRisoltiRecenti.reduce((acc, t) => {
        const diff = new Date(t.data_chiusura) - new Date(t.data_apertura)
        return acc + (diff / (1000 * 60 * 60))
      }, 0)
      tempoMedioRisoluzione = `${(sommaOre / ticketRisoltiRecenti.length).toFixed(1)}h`
    }

    setStats({
      totaliAssegnati: tickets.length,
      aperti,
      inLavorazione,
      risoltiOggi,
      critici,
      tempoMedioRisoluzione
    })
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
    loadTicketsTecnico()
  }

  const getStatoBadge = (stato) => {
    const badges = {
      aperto: 'bg-blue-100 text-blue-800 border-blue-200',
      assegnato: 'bg-purple-100 text-purple-800 border-purple-200',
      in_lavorazione: 'bg-amber-100 text-amber-800 border-amber-200',
      in_attesa_cliente: 'bg-gray-100 text-gray-800 border-gray-200',
      risolto: 'bg-green-100 text-green-800 border-green-200',
      chiuso: 'bg-gray-100 text-gray-600 border-gray-200'
    }
    return badges[stato] || 'bg-gray-100 text-gray-800'
  }

  const getPrioritaBadge = (priorita) => {
    const badges = {
      bassa: 'bg-slate-100 text-slate-800',
      media: 'bg-yellow-100 text-yellow-800',
      alta: 'bg-red-100 text-red-800',
      critica: 'bg-red-600 text-white'
    }
    return badges[priorita] || 'bg-gray-100 text-gray-800'
  }

  const getStatoLabel = (stato) => {
    const labels = {
      'aperto': 'Aperto',
      'assegnato': 'Assegnato',
      'in_lavorazione': 'In Lavorazione',
      'in_attesa_cliente': 'Attesa Cliente',
      'risolto': 'Risolto',
      'chiuso': 'Chiuso'
    }
    return labels[stato] || stato
  }

  const getTempoDaApertura = (dataApertura) => {
    const diff = new Date() - new Date(dataApertura)
    const ore = Math.floor(diff / (1000 * 60 * 60))
    const giorni = Math.floor(ore / 24)
    
    if (giorni > 0) return `${giorni}g fa`
    if (ore > 0) return `${ore}h fa`
    return 'Appena aperto'
  }

  // Separa ticket per urgenza
  const ticketCritici = tickets.filter(t => 
    (t.priorita === 'alta' || t.priorita === 'critica') && 
    (t.stato !== 'risolto' && t.stato !== 'chiuso')
  )
  const ticketInLavorazione = tickets.filter(t => t.stato === 'in_lavorazione')
  const ticketDaGestire = tickets.filter(t => t.stato === 'aperto' || t.stato === 'assegnato')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Caricamento dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Personalizzato */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-500 dark:via-purple-500 dark:to-pink-500 rounded-2xl p-8 shadow-2xl mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <User className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">
                  Ciao, {userProfile?.nome}! 👋
                </h1>
                <p className="text-blue-100 dark:text-blue-200">
                  Ecco i tuoi ticket assegnati
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards Tecnico */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                <AlertCircle className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.aperti}</span>
            </div>
            <h3 className="text-gray-900 dark:text-white text-lg font-semibold mb-1">Da Gestire</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Ticket aperti/assegnati</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-lg">
                <Clock className="text-amber-600 dark:text-amber-400" size={24} />
              </div>
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.inLavorazione}</span>
            </div>
            <h3 className="text-gray-900 dark:text-white text-lg font-semibold mb-1">In Lavorazione</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Attualmente gestiti</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.risoltiOggi}</span>
            </div>
            <h3 className="text-gray-900 dark:text-white text-lg font-semibold mb-1">Risolti Oggi</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Completati con successo</p>
            <div className="mt-3 flex items-center text-sm text-green-600 dark:text-green-400">
              <TrendingUp size={16} className="mr-1" />
              <span>Ottimo lavoro!</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
                <Zap className="text-red-600 dark:text-red-400" size={24} />
              </div>
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.critici}</span>
            </div>
            <h3 className="text-gray-900 dark:text-white text-lg font-semibold mb-1">Critici/Urgenti</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Priorità alta</p>
            {stats.critici > 0 && (
              <div className="mt-3 flex items-center text-sm text-red-600 dark:text-red-400">
                <AlertCircle size={16} className="mr-1" />
                <span>Richiede attenzione!</span>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg">
                <TrendingUp className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.tempoMedioRisoluzione}</span>
            </div>
            <h3 className="text-gray-900 dark:text-white text-lg font-semibold mb-1">Tempo Medio</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Risoluzione (30gg)</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-lg">
                <User className="text-indigo-600 dark:text-indigo-400" size={24} />
              </div>
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totaliAssegnati}</span>
            </div>
            <h3 className="text-gray-900 dark:text-white text-lg font-semibold mb-1">Totale Assegnati</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Tutti i tuoi ticket</p>
          </div>
        </div>

        {/* Sezione Ticket Critici/Urgenti */}
        {ticketCritici.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-red-600" size={24} />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                ⚠️ Ticket Urgenti ({ticketCritici.length})
              </h2>
            </div>
            <div className="space-y-4">
              {ticketCritici.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => handleAzioniClick(ticket, null)}
                  className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAzioniClick(ticket, e)
                          }}
                          className="font-mono text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline"
                        >
                          {ticket.numero_ticket}
                        </button>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPrioritaBadge(ticket.priorita)}`}>
                          {ticket.priorita?.toUpperCase()}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatoBadge(ticket.stato)}`}>
                          {getStatoLabel(ticket.stato)}
                        </span>
                      </div>
                      
                      {/* 👤 NOME CLIENTE PROMINENTE */}
                      <div className="flex items-center gap-2 mb-2">
                        <User size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {ticket.cliente?.ragione_sociale || 'Cliente sconosciuto'}
                        </h3>
                      </div>
                      
                      {/* Oggetto come Sottotitolo */}
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                        {ticket.oggetto}
                      </h4>
                      
                      <p className="text-gray-700 dark:text-gray-300 mb-3 line-clamp-2 text-sm">
                        {ticket.descrizione}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                        <span>
                          <strong>Tempo:</strong> {getTempoDaApertura(ticket.data_apertura)}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAzioniClick(ticket, e)
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg font-medium"
                    >
                      <Settings size={18} />
                      <span>Gestisci</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sezione In Lavorazione */}
        {ticketInLavorazione.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              🔧 In Lavorazione ({ticketInLavorazione.length})
            </h2>
            <div className="space-y-4">
              {ticketInLavorazione.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => handleAzioniClick(ticket, null)}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAzioniClick(ticket, e)
                          }}
                          className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                        >
                          {ticket.numero_ticket}
                        </button>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPrioritaBadge(ticket.priorita)}`}>
                          {ticket.priorita?.toUpperCase()}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatoBadge(ticket.stato)}`}>
                          {getStatoLabel(ticket.stato)}
                        </span>
                      </div>
                      
                      {/* 👤 NOME CLIENTE PROMINENTE */}
                      <div className="flex items-center gap-2 mb-2">
                        <User size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {ticket.cliente?.ragione_sociale || 'Cliente sconosciuto'}
                        </h3>
                      </div>
                      
                      {/* Oggetto come Sottotitolo */}
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                        {ticket.oggetto}
                      </h4>
                      
                      <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 text-sm">
                        {ticket.descrizione}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          <strong>Tempo:</strong> {getTempoDaApertura(ticket.data_apertura)}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAzioniClick(ticket, e)
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg font-medium"
                    >
                      <Settings size={18} />
                      <span>Gestisci</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sezione Da Gestire */}
        {ticketDaGestire.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              📋 Da Gestire ({ticketDaGestire.length})
            </h2>
            <div className="space-y-4">
              {ticketDaGestire.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => handleAzioniClick(ticket, null)}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAzioniClick(ticket, e)
                          }}
                          className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                        >
                          {ticket.numero_ticket}
                        </button>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPrioritaBadge(ticket.priorita)}`}>
                          {ticket.priorita?.toUpperCase()}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatoBadge(ticket.stato)}`}>
                          {getStatoLabel(ticket.stato)}
                        </span>
                      </div>
                      
                      {/* 👤 NOME CLIENTE PROMINENTE */}
                      <div className="flex items-center gap-2 mb-2">
                        <User size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {ticket.cliente?.ragione_sociale || 'Cliente sconosciuto'}
                        </h3>
                      </div>
                      
                      {/* Oggetto come Sottotitolo */}
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                        {ticket.oggetto}
                      </h4>
                      
                      <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 text-sm">
                        {ticket.descrizione}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          <strong>Tempo:</strong> {getTempoDaApertura(ticket.data_apertura)}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAzioniClick(ticket, e)
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg font-medium"
                    >
                      <Settings size={18} />
                      <span>Gestisci</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {tickets.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Ottimo lavoro! 🎉
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Non hai ticket assegnati al momento. Goditi la pausa! ☕
            </p>
          </div>
        )}
      </div>

      {/* Modal Azioni */}
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
