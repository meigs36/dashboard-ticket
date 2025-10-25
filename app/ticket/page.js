'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Clock, CheckCircle, AlertCircle, Search, Filter, X, User, Mail, Phone, Calendar, FileText, TrendingUp, AlertTriangle, Settings } from 'lucide-react'
import Link from 'next/link'
import TicketActionsModal from '@/components/TicketActionsModal'

export default function TicketPage() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [ticketSelezionato, setTicketSelezionato] = useState(null)
  const [mostraModalAzioni, setMostraModalAzioni] = useState(false)
  
  // Filtri e ricerca
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroStato, setFiltroStato] = useState('tutti')
  const [filtroPriorita, setFiltroPriorita] = useState('tutti')
  const [filtroAgente, setFiltroAgente] = useState('tutti')
  const [mostraFiltri, setMostraFiltri] = useState(false)
  
  // Statistiche
  const [stats, setStats] = useState({
    totali: 0,
    aperti: 0,
    inLavorazione: 0,
    risolti: 0,
    critici: 0,
    tempoMedio: '-'
  })

  useEffect(() => {
    loadTickets()
  }, [])

  useEffect(() => {
    calcolaStats()
  }, [tickets])

  async function loadTickets() {
    try {
      const { data, error } = await supabase
        .from('ticket')
        .select(`
          *,
          clienti(
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
    const aperti = tickets.filter(t => t.stato === 'aperto').length
    const inLavorazione = tickets.filter(t => t.stato === 'in_lavorazione' || t.stato === 'assegnato').length
    const risolti = tickets.filter(t => t.stato === 'risolto' || t.stato === 'chiuso').length
    const critici = tickets.filter(t => t.priorita === 'alta' || t.priorita === 'critica').length
    
    const oggi = new Date()
    const ieri = new Date(oggi.getTime() - 24 * 60 * 60 * 1000)
    const ticketRisoltiOggi = tickets.filter(t => 
      (t.stato === 'risolto' || t.stato === 'chiuso') && 
      new Date(t.data_chiusura) >= ieri
    )
    
    let tempoMedio = '-'
    if (ticketRisoltiOggi.length > 0) {
      const sommaOre = ticketRisoltiOggi.reduce((acc, t) => {
        if (t.data_chiusura && t.data_apertura) {
          const diff = new Date(t.data_chiusura) - new Date(t.data_apertura)
          return acc + (diff / (1000 * 60 * 60))
        }
        return acc
      }, 0)
      tempoMedio = `${(sommaOre / ticketRisoltiOggi.length).toFixed(1)}h`
    }

    setStats({
      totali: tickets.length,
      aperti,
      inLavorazione,
      risolti,
      critici,
      tempoMedio
    })
  }

  const ticketsFiltrati = tickets.filter(ticket => {
    const matchRicerca = 
      ticket.numero_ticket?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.oggetto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.clienti?.ragione_sociale?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.descrizione?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchStato = filtroStato === 'tutti' || ticket.stato === filtroStato
    const matchPriorita = filtroPriorita === 'tutti' || ticket.priorita === filtroPriorita
    const matchAgente = filtroAgente === 'tutti' || 
      (ticket.id_tecnico_assegnato && ticket.id_tecnico_assegnato.toString() === filtroAgente)
    
    return matchRicerca && matchStato && matchPriorita && matchAgente
  })

  const resetFiltri = () => {
    setFiltroStato('tutti')
    setFiltroPriorita('tutti')
    setFiltroAgente('tutti')
    setSearchTerm('')
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

  const agentiUnici = [...new Set(tickets
    .filter(t => t.id_tecnico_assegnato)
    .map(t => t.id_tecnico_assegnato))]

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
    loadTickets()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Caricamento ticket...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Torna alla Dashboard</span>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Gestione Ticket</h1>
              <p className="text-gray-600 dark:text-gray-400">{stats.totali} ticket totali</p>
            </div>
            <Link
              href="/ticket/nuovo"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg"
            >
              + Nuovo Ticket
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="text-blue-600" size={24} />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.aperti}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Aperti</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="text-amber-600" size={24} />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.inLavorazione}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">In Lavorazione</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="text-green-600" size={24} />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.risolti}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Risolti</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="text-red-600" size={24} />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.critici}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Critici</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="text-purple-600" size={24} />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.tempoMedio}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Tempo Medio</p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[300px] relative">
              <input
                type="text"
                placeholder="Cerca per numero, cliente, oggetto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            <button 
              onClick={() => setMostraFiltri(!mostraFiltri)}
              className={`flex items-center gap-2 px-4 py-3 border rounded-lg transition-colors ${
                mostraFiltri 
                  ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-400' 
                  : 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300'
              }`}
            >
              <Filter size={20} />
              <span>Filtri</span>
            </button>
          </div>

          {mostraFiltri && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stato</label>
                  <select 
                    value={filtroStato}
                    onChange={(e) => setFiltroStato(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="tutti">Tutti gli stati</option>
                    <option value="aperto">Aperto</option>
                    <option value="assegnato">Assegnato</option>
                    <option value="in_lavorazione">In Lavorazione</option>
                    <option value="in_attesa_cliente">Attesa Cliente</option>
                    <option value="risolto">Risolto</option>
                    <option value="chiuso">Chiuso</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priorità</label>
                  <select 
                    value={filtroPriorita}
                    onChange={(e) => setFiltroPriorita(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="tutti">Tutte le priorità</option>
                    <option value="bassa">Bassa</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Critica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Agente</label>
                  <select 
                    value={filtroAgente}
                    onChange={(e) => setFiltroAgente(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="tutti">Tutti gli agenti</option>
                    {agentiUnici.map(agente => (
                      <option key={agente} value={agente}>Agente #{agente}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button 
                  onClick={resetFiltri}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  Reset tutti i filtri
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Ticket List */}
        {ticketsFiltrati.length > 0 ? (
          <div className="space-y-4">
            {ticketsFiltrati.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer"
                onClick={() => handleAzioniClick(ticket, null)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAzioniClick(ticket, e)
                        }}
                        className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
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
                    
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {ticket.oggetto}
                    </h3>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {ticket.descrizione}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User size={14} />
                        <strong>{ticket.clienti?.ragione_sociale}</strong>
                      </span>
                      {ticket.macchinari && (
                        <span className="flex items-center gap-1">
                          <AlertTriangle size={14} />
                          {ticket.macchinari.tipo_macchinario}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {getTempoDaApertura(ticket.data_apertura)}
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
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Search className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Nessun ticket trovato
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchTerm || filtroStato !== 'tutti' || filtroPriorita !== 'tutti' 
                ? 'Prova a modificare i filtri di ricerca'
                : 'Inizia creando il tuo primo ticket'}
            </p>
            {!searchTerm && filtroStato === 'tutti' && filtroPriorita === 'tutti' && (
              <Link
                href="/ticket/nuovo"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Crea Primo Ticket
              </Link>
            )}
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Visualizzati {ticketsFiltrati.length} di {tickets.length} ticket totali
        </div>
      </div>

      {/* Modale Azioni */}
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
