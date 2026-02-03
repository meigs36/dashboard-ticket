'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Phone, Mail, MapPin, HardDrive, Calendar, Shield, Ticket, Clock, Settings, FileText, Edit2, Trash2, Plus, Search, Filter, X, ChevronDown, Landmark, GitBranch } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import TicketActionsModal from '@/components/TicketActionsModal'
import ContrattoModal from '@/components/ContrattoModal'
import InfrastrutturaForm from '@/components/InfrastrutturaForm'
import LibroMacchinePDF from '@/components/LibroMacchinePDF'

export default function ClienteDettaglio() {
  const params = useParams()
  const [cliente, setCliente] = useState(null)
  const [macchinari, setMacchinari] = useState([])
  const [contratti, setContratti] = useState([])
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('macchinari') // macchinari | ticket | contratti | infrastruttura
  
  // Stati per modal ticket
  const [ticketSelezionato, setTicketSelezionato] = useState(null)
  const [mostraModalAzioni, setMostraModalAzioni] = useState(false)
  
  // Stati per modal contratto
  const [mostraModalContratto, setMostraModalContratto] = useState(false)
  const [contrattoSelezionato, setContrattoSelezionato] = useState(null)
  const [modalMode, setModalMode] = useState('view') // view | edit

  // ✅ NUOVO: Stati per filtri macchinari
  const [searchMacchinari, setSearchMacchinari] = useState('')
  const [filtroTipoMacchinario, setFiltroTipoMacchinario] = useState('tutti')
  const [filtroContrattoManutenzione, setFiltroContrattoManutenzione] = useState('tutti')
  const [mostraFiltriMacchinari, setMostraFiltriMacchinari] = useState(false)

  useEffect(() => {
    if (params.id) {
      loadCliente()
    }
  }, [params.id])

  async function loadCliente() {
    try {
      // Carica cliente
      const { data: clienteData, error: clienteError} = await supabase
        .from('clienti')
        .select('*')
        .eq('id', params.id)
        .single()

      if (clienteError) throw clienteError
      setCliente(clienteData)

      // Carica macchinari
      const { data: macchinariData, error: macchinariError } = await supabase
        .from('macchinari')
        .select('*')
        .eq('id_cliente', params.id)
        .order('data_installazione', { ascending: false })

      if (macchinariError) throw macchinariError
      setMacchinari(macchinariData || [])

      // Carica contratti usando codice_cliente
const { data: contrattiData, error: contrattiError } = await supabase
  .from('contratti')
  .select('*')
  .eq('codice_cliente', clienteData.codice_cliente)  // ✅ CORRETTO
  .order('data_contratto', { ascending: false })  // ✅ CORRETTO

if (contrattiError) {
  console.error('❌ Errore caricamento contratti:', contrattiError)
} else {
  console.log('✅ Contratti caricati:', contrattiData?.length || 0, contrattiData)
  setContratti(contrattiData || [])
}

      if (contrattiError) throw contrattiError
      setContratti(contrattiData || [])

      // Carica ticket con tutte le relazioni necessarie
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('ticket')
        .select(`
          *,
          cliente:clienti!ticket_id_cliente_fkey(
            id,
            ragione_sociale, 
            codice_cliente,
            telefono_principale,
            email_riparazioni,
            comune,
            provincia
          ),
          macchinari(
            tipo_macchinario, 
            numero_seriale,
            marca,
            modello
          )
        `)
        .eq('id_cliente', params.id)
        .order('data_apertura', { ascending: false })

      if (ticketsError) throw ticketsError
      setTickets(ticketsData || [])

    } catch (error) {
      console.error('Errore caricamento:', error)
    } finally {
      setLoading(false)
    }
  }

  // ✅ NUOVO: Tipi macchinario unici per dropdown filtro
  const tipiMacchinarioUnici = [...new Set(
    macchinari.map(m => m.tipo_macchinario).filter(Boolean)
  )].sort()

  // ✅ Funzione per calcolare stato manutenzione (usa campo testuale contratto_manutenzione)
  const getStatoManutenzione = (macchinario) => {
    const contratto = macchinario.contratto_manutenzione?.toLowerCase()
    
    if (contratto === 'attivo') {
      return { stato: 'attivo', label: 'Coperto', color: 'green' }
    } else if (contratto === 'scaduto') {
      return { stato: 'scaduto', label: 'Scaduto', color: 'red' }
    } else {
      return { stato: 'non_coperto', label: 'Non coperto', color: 'gray' }
    }
  }

  // ✅ Funzione per calcolare stato garanzia (con date reali)
  const getStatoGaranzia = (macchinario) => {
    // Usa garanzia estesa se presente, altrimenti garanzia base
    const dataGaranzia = macchinario.garanzia_estensione_scadenza || macchinario.garanzia_scadenza
    
    if (!dataGaranzia) {
      return { stato: 'non_disponibile', label: null, color: 'gray', data: null }
    }
    
    const oggi = new Date()
    const scadenza = new Date(dataGaranzia)
    const giorniRimanenti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24))
    
    if (giorniRimanenti < 0) {
      return { stato: 'scaduta', label: `Scaduta da ${Math.abs(giorniRimanenti)}g`, color: 'red', giorni: Math.abs(giorniRimanenti), data: dataGaranzia }
    } else if (giorniRimanenti <= 30) {
      return { stato: 'in_scadenza', label: `Scade tra ${giorniRimanenti}g`, color: 'amber', giorni: giorniRimanenti, data: dataGaranzia }
    } else if (giorniRimanenti <= 90) {
      return { stato: 'attenzione', label: `${giorniRimanenti}g rimasti`, color: 'yellow', giorni: giorniRimanenti, data: dataGaranzia }
    } else {
      return { stato: 'attiva', label: 'Attiva', color: 'green', giorni: giorniRimanenti, data: dataGaranzia }
    }
  }

  // ✅ NUOVO: Filtra macchinari
  const macchinariFiltered = macchinari.filter(macchinario => {
    // Filtro ricerca (tipo, matricola, modello, marca)
    const searchLower = searchMacchinari.toLowerCase()
    const matchSearch = !searchMacchinari || 
      macchinario.tipo_macchinario?.toLowerCase().includes(searchLower) ||
      macchinario.numero_seriale?.toLowerCase().includes(searchLower) ||
      macchinario.modello?.toLowerCase().includes(searchLower) ||
      macchinario.marca?.toLowerCase().includes(searchLower) ||
      macchinario.ubicazione_specifica?.toLowerCase().includes(searchLower)
    
    // Filtro tipo macchinario
    const matchTipo = filtroTipoMacchinario === 'tutti' || 
      macchinario.tipo_macchinario === filtroTipoMacchinario
    
    // Filtro contratto manutenzione (basato su campo testuale)
    let matchContratto = true
    if (filtroContrattoManutenzione !== 'tutti') {
      const statoMan = getStatoManutenzione(macchinario)
      if (filtroContrattoManutenzione === 'attivo') {
        matchContratto = statoMan.stato === 'attivo'
      } else if (filtroContrattoManutenzione === 'scaduto') {
        matchContratto = statoMan.stato === 'scaduto'
      } else if (filtroContrattoManutenzione === 'non_coperto') {
        matchContratto = statoMan.stato === 'non_coperto'
      }
    }
    
    return matchSearch && matchTipo && matchContratto
  })

  // ✅ NUOVO: Reset filtri macchinari
  const resetFiltriMacchinari = () => {
    setSearchMacchinari('')
    setFiltroTipoMacchinario('tutti')
    setFiltroContrattoManutenzione('tutti')
  }

  // ✅ Statistiche manutenzione (basate su campo testuale contratto_manutenzione)
  const statsMacchinari = {
    totali: macchinari.length,
    filtrati: macchinariFiltered.length,
    // Manutenzione (campo testuale)
    coperti: macchinari.filter(m => m.contratto_manutenzione?.toLowerCase() === 'attivo').length,
    scaduti: macchinari.filter(m => m.contratto_manutenzione?.toLowerCase() === 'scaduto').length,
    nonCoperti: macchinari.filter(m => !m.contratto_manutenzione || (m.contratto_manutenzione?.toLowerCase() !== 'attivo' && m.contratto_manutenzione?.toLowerCase() !== 'scaduto')).length,
    // Garanzia (basata su date)
    garanziaAttiva: macchinari.filter(m => {
      const dataGar = m.garanzia_estensione_scadenza || m.garanzia_scadenza
      return dataGar && new Date(dataGar) > new Date()
    }).length,
    garanziaInScadenza: macchinari.filter(m => {
      const dataGar = m.garanzia_estensione_scadenza || m.garanzia_scadenza
      if (!dataGar) return false
      const giorni = Math.ceil((new Date(dataGar) - new Date()) / (1000 * 60 * 60 * 24))
      return giorni >= 0 && giorni <= 30
    }).length,
    garanziaScaduta: macchinari.filter(m => {
      const dataGar = m.garanzia_estensione_scadenza || m.garanzia_scadenza
      return dataGar && new Date(dataGar) < new Date()
    }).length
  }

  function handleTicketClick(ticket, e) {
    if (e) e.stopPropagation()
    setTicketSelezionato(ticket)
    setMostraModalAzioni(true)
  }

  function handleModalClose() {
    setMostraModalAzioni(false)
    setTicketSelezionato(null)
  }

  function handleTicketUpdate() {
    loadCliente()
  }

  function handleContrattoClick(contratto) {
    setContrattoSelezionato(contratto)
    setModalMode('view')
    setMostraModalContratto(true)
  }

  function handleEditContratto(contratto) {
    setContrattoSelezionato(contratto)
    setModalMode('edit')
    setMostraModalContratto(true)
  }

  async function handleDeleteContratto(contratto) {
    if (!confirm(`Sei sicuro di voler eliminare il contratto "${contratto.nome_contratto}"?\n\nQuesta operazione non può essere annullata.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('contratti')
        .delete()
        .eq('id', contratto.id)

      if (error) throw error

      alert('✅ Contratto eliminato con successo')
      loadCliente()
    } catch (error) {
      console.error('Errore eliminazione contratto:', error)
      alert('❌ Errore durante l\'eliminazione del contratto: ' + error.message)
    }
  }

  function closeModalContratto() {
    setMostraModalContratto(false)
    setContrattoSelezionato(null)
    setModalMode('view')
  }

  function getStatoContrattoColor(stato) {
    switch (stato) {
      case 'attivo':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'scaduto':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'sospeso':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!cliente) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Cliente non trovato</h2>
          <Link href="/clienti" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            ← Torna ai clienti
          </Link>
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
            href="/clienti"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Torna ai Clienti</span>
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {cliente.ragione_sociale}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Codice Cliente: {cliente.codice_cliente}</p>
            </div>
            <div className="flex gap-3">
              {cliente.attivo ? (
                <span className="px-4 py-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full font-medium">
                  ✓ Attivo
                </span>
              ) : (
                <span className="px-4 py-2 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full font-medium">
                  Inattivo
                </span>
              )}
              <Link
                href={`/ticket/nuovo?cliente=${cliente.id}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors"
              >
                + Nuovo Ticket
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Macchinari</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{macchinari.length}</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                <HardDrive className="text-green-600 dark:text-green-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ticket Totali</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{tickets.length}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                <Ticket className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ticket Aperti</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {tickets.filter(t => ['aperto', 'assegnato', 'in_lavorazione'].includes(t.stato)).length}
                </p>
              </div>
              <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-lg">
                <Clock className="text-amber-600 dark:text-amber-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Info Cliente */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Contatti */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Contatti</h2>
            <div className="space-y-3">
              {cliente.telefono_principale && (
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                    <Phone className="text-blue-600 dark:text-blue-400" size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Telefono Principale</p>
                    <p className="font-medium text-gray-900 dark:text-white">{cliente.telefono_principale}</p>
                  </div>
                </div>
              )}
              {cliente.email_riparazioni && (
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                    <Mail className="text-green-600 dark:text-green-400" size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Email Riparazioni</p>
                    <p className="font-medium text-gray-900 dark:text-white">{cliente.email_riparazioni}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Indirizzi */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Indirizzi</h2>
            <div className="space-y-4">
              {/* Sede Legale */}
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                  <Landmark className="text-blue-600 dark:text-blue-400" size={18} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Sede Legale</p>
                  <p className="font-medium text-gray-900 dark:text-white">{cliente.indirizzo || '-'}</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {cliente.cap} {cliente.comune} {cliente.provincia && `(${cliente.provincia})`}
                  </p>
                </div>
              </div>

              {/* Sede Operativa/Filiale - mostra solo se diversa */}
              {cliente.indirizzo_operativo && cliente.indirizzo_operativo !== cliente.indirizzo && (
                <div className="flex items-start gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
                    <GitBranch className="text-orange-600 dark:text-orange-400" size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mb-1 font-medium">Sede Operativa (Filiale)</p>
                    {cliente.ragione_sociale_operativa && cliente.ragione_sociale_operativa !== cliente.ragione_sociale && (
                      <p className="font-medium text-orange-700 dark:text-orange-300 text-sm mb-1">
                        {cliente.ragione_sociale_operativa}
                      </p>
                    )}
                    <p className="font-medium text-gray-900 dark:text-white">{cliente.indirizzo_operativo}</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {cliente.cap_operativo} {cliente.comune_operativo} {cliente.provincia_operativa && `(${cliente.provincia_operativa})`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs: Macchinari, Contratti, Ticket, Infrastruttura */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-t-xl shadow-sm border border-gray-200 dark:border-gray-700 border-b-0">
            <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab('macchinari')}
                className={`flex-shrink-0 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'macchinari'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <HardDrive size={18} />
                  <span>Macchinari ({macchinari.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('contratti')}
                className={`flex-shrink-0 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'contratti'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FileText size={18} />
                  <span>Contratti ({contratti.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('ticket')}
                className={`flex-shrink-0 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'ticket'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Ticket size={18} />
                  <span>Ticket ({tickets.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('infrastruttura')}
                className={`flex-shrink-0 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'infrastruttura'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Settings size={18} />
                  <span>Infrastruttura</span>
                </div>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-800 rounded-b-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            {/* Tab Macchinari */}
            {activeTab === 'macchinari' && (
              <>
                {/* ✅ NUOVO: Barra ricerca e filtri macchinari */}
                {macchinari.length > 0 && (
                  <div className="mb-6 space-y-4">
                    {/* Header con conteggio e Libro Macchine */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {macchinariFiltered.length === macchinari.length 
                            ? `${macchinari.length} macchinari installati`
                            : `${macchinariFiltered.length} di ${macchinari.length} macchinari`
                          }
                        </p>
                        {/* Badge statistiche rapide - Manutenzione */}
                        <div className="hidden md:flex items-center gap-2 flex-wrap">
                          {statsMacchinari.coperti > 0 && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs">
                              🛡️ {statsMacchinari.coperti} man. attiva
                            </span>
                          )}
                          {statsMacchinari.scaduti > 0 && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs">
                              ❌ {statsMacchinari.scaduti} man. scaduta
                            </span>
                          )}
                          {/* Badge Garanzia */}
                          {statsMacchinari.garanziaInScadenza > 0 && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full text-xs animate-pulse">
                              ⚠️ {statsMacchinari.garanziaInScadenza} gar. in scadenza
                            </span>
                          )}
                        </div>
                      </div>
                      <LibroMacchinePDF 
                        clienteId={cliente?.id}
                        clienteNome={cliente?.ragione_sociale}
                        sedeNome={cliente?.comune}
                      />
                    </div>

                    {/* Barra ricerca + pulsante filtri */}
                    <div className="flex flex-col md:flex-row gap-3">
                      {/* Campo ricerca */}
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="Cerca per tipo, matricola, modello, marca, ubicazione..."
                          value={searchMacchinari}
                          onChange={(e) => setSearchMacchinari(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                        />
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        {searchMacchinari && (
                          <button 
                            onClick={() => setSearchMacchinari('')}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>

                      {/* Pulsante filtri */}
                      <button 
                        onClick={() => setMostraFiltriMacchinari(!mostraFiltriMacchinari)}
                        className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors ${
                          mostraFiltriMacchinari || filtroTipoMacchinario !== 'tutti' || filtroContrattoManutenzione !== 'tutti'
                            ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-400' 
                            : 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <Filter size={18} />
                        <span>Filtri</span>
                        {(filtroTipoMacchinario !== 'tutti' || filtroContrattoManutenzione !== 'tutti') && (
                          <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded-full text-xs">
                            {(filtroTipoMacchinario !== 'tutti' ? 1 : 0) + (filtroContrattoManutenzione !== 'tutti' ? 1 : 0)}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Pannello filtri espandibile */}
                    {mostraFiltriMacchinari && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Filtro Tipo Macchinario */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                              Tipo Macchinario
                            </label>
                            <select 
                              value={filtroTipoMacchinario}
                              onChange={(e) => setFiltroTipoMacchinario(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                            >
                              <option value="tutti">🔧 Tutti i tipi ({macchinari.length})</option>
                              {tipiMacchinarioUnici.map((tipo) => {
                                const count = macchinari.filter(m => m.tipo_macchinario === tipo).length
                                return (
                                  <option key={tipo} value={tipo}>
                                    {tipo} ({count})
                                  </option>
                                )
                              })}
                            </select>
                          </div>

                          {/* Filtro Contratto Manutenzione */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                              Stato Manutenzione
                            </label>
                            <select 
                              value={filtroContrattoManutenzione}
                              onChange={(e) => setFiltroContrattoManutenzione(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                            >
                              <option value="tutti">📋 Tutti</option>
                              <option value="attivo">🛡️ Manutenzione attiva ({statsMacchinari.coperti})</option>
                              <option value="scaduto">❌ Manutenzione scaduta ({statsMacchinari.scaduti})</option>
                              <option value="non_coperto">📭 Senza manutenzione ({statsMacchinari.nonCoperti})</option>
                            </select>
                          </div>

                          {/* Reset filtri */}
                          <div className="flex items-end">
                            <button 
                              onClick={resetFiltriMacchinari}
                              className="w-full px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors font-medium"
                            >
                              Reset filtri
                            </button>
                          </div>
                        </div>

                        {/* Chip tipi macchinario per selezione rapida */}
                        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Selezione rapida:</p>
                          <div className="flex flex-wrap gap-2">
                            {tipiMacchinarioUnici.slice(0, 8).map((tipo) => {
                              const count = macchinari.filter(m => m.tipo_macchinario === tipo).length
                              const isSelected = filtroTipoMacchinario === tipo
                              return (
                                <button
                                  key={tipo}
                                  onClick={() => setFiltroTipoMacchinario(isSelected ? 'tutti' : tipo)}
                                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                    isSelected
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 border border-gray-200 dark:border-gray-500'
                                  }`}
                                >
                                  {tipo} <span className="opacity-70">({count})</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Lista macchinari filtrata */}
                {macchinariFiltered.length > 0 ? (
                  <div className="space-y-4">
                    {macchinariFiltered.map((macchinario) => {
                      const statoMan = getStatoManutenzione(macchinario)
                      const statoGar = getStatoGaranzia(macchinario)
                      return (
                        <div 
                          key={macchinario.id}
                          className={`border rounded-lg p-4 hover:shadow-md transition-all ${
                            statoMan.stato === 'scaduto' 
                              ? 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10' 
                              : statoGar.stato === 'in_scadenza'
                                ? 'border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10'
                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-gray-900 dark:text-white">
                                  {macchinario.tipo_macchinario}
                                </h3>
                                {macchinario.ubicazione_specifica && (
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded text-xs">
                                    📍 {macchinario.ubicazione_specifica}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {macchinario.marca} - {macchinario.modello}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              {/* Badge stato MANUTENZIONE (campo testuale) */}
                              {statoMan.stato === 'attivo' && (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  🛡️ Manutenzione
                                </span>
                              )}
                              {statoMan.stato === 'scaduto' && (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                  ❌ Man. Scaduta
                                </span>
                              )}
                              {/* Badge stato GARANZIA (con date) */}
                              {statoGar.stato === 'attiva' && (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                  ✅ Garanzia
                                </span>
                              )}
                              {statoGar.stato === 'attenzione' && (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                  ⚠️ Gar. {statoGar.label}
                                </span>
                              )}
                              {statoGar.stato === 'in_scadenza' && (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 animate-pulse">
                                  ⚠️ Gar. {statoGar.label}
                                </span>
                              )}
                              {statoGar.stato === 'scaduta' && (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                  Gar. scaduta
                                </span>
                              )}
                              {/* Badge stato macchinario */}
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                macchinario.stato === 'attivo' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {macchinario.stato?.toUpperCase() || 'N/D'}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Matricola:</span>
                              <p className="font-mono text-gray-900 dark:text-white">{macchinario.numero_seriale}</p>
                            </div>
                            {macchinario.data_installazione && (
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Installazione:</span>
                                <p className="text-gray-900 dark:text-white">
                                  {new Date(macchinario.data_installazione).toLocaleDateString('it-IT')}
                                </p>
                              </div>
                            )}
                            {/* Scadenza Garanzia (usa estensione se presente) */}
                            {(macchinario.garanzia_estensione_scadenza || macchinario.garanzia_scadenza) && (
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">
                                  {macchinario.garanzia_estensione_scadenza ? 'Garanzia estesa:' : 'Scadenza garanzia:'}
                                </span>
                                <p className={`font-medium ${
                                  statoGar.stato === 'scaduta' 
                                    ? 'text-red-600 dark:text-red-400' 
                                    : statoGar.stato === 'in_scadenza'
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : statoGar.stato === 'attenzione'
                                        ? 'text-yellow-600 dark:text-yellow-400'
                                        : 'text-green-600 dark:text-green-400'
                                }`}>
                                  {new Date(macchinario.garanzia_estensione_scadenza || macchinario.garanzia_scadenza).toLocaleDateString('it-IT')}
                                </p>
                              </div>
                            )}
                            {/* Stato Manutenzione */}
                            {macchinario.contratto_manutenzione && (
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Manutenzione:</span>
                                <p className={`font-medium capitalize ${
                                  macchinario.contratto_manutenzione === 'attivo' 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {macchinario.contratto_manutenzione}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : macchinari.length > 0 ? (
                  // Nessun risultato con filtri attivi
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <Search className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Nessun macchinario trovato
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Prova a modificare i filtri di ricerca
                    </p>
                    <button 
                      onClick={resetFiltriMacchinari}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Reset tutti i filtri
                    </button>
                  </div>
                ) : (
                  // Nessun macchinario
                  <div className="text-center py-12">
                    <HardDrive className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Nessun macchinario
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Questo cliente non ha ancora macchinari registrati
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Tab Contratti */}
            {activeTab === 'contratti' && (
              <>
                {contratti.length > 0 ? (
                  <div className="space-y-4">
                    {contratti.map((contratto) => {
                      const percentualeUtilizzo = contratto.ore_incluse > 0 
                        ? (contratto.ore_utilizzate / contratto.ore_incluse) * 100 
                        : 0
                      const oreRimanenti = contratto.ore_rimanenti || 0
                      const isInScadenza = contratto.data_scadenza && 
                        new Date(contratto.data_scadenza) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

                      return (
                        <div 
                          key={contratto.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          {/* Header Contratto */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                                  {contratto.nome_contratto}
                                </h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatoContrattoColor(contratto.stato)}`}>
                                  {contratto.stato.toUpperCase()}
                                </span>
                                {isInScadenza && contratto.stato === 'attivo' && (
                                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                                    ⚠️ IN SCADENZA
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Contratto #{contratto.num_contratto} - {contratto.tipo_contratto}
                              </p>
                            </div>

                            {/* Pulsanti Azioni */}
                            <div className="flex items-center gap-2 ml-4">
                              <button
                                onClick={() => handleContrattoClick(contratto)}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Visualizza"
                              >
                                <Calendar size={18} />
                              </button>
                              <button
                                onClick={() => handleEditContratto(contratto)}
                                className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                title="Modifica"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteContratto(contratto)}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Elimina"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>

                          {/* Info Contratto */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400 block mb-1">Data Inizio</span>
                              <span className="text-gray-900 dark:text-white font-medium">
                                {new Date(contratto.data_contratto).toLocaleDateString('it-IT')}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400 block mb-1">Data Scadenza</span>
                              <span className={`font-medium ${
                                isInScadenza && contratto.stato === 'attivo'
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : 'text-gray-900 dark:text-white'
                              }`}>
                                {new Date(contratto.data_scadenza).toLocaleDateString('it-IT')}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400 block mb-1">Valore Contratto</span>
                              <span className="text-gray-900 dark:text-white font-medium">
                                €{parseFloat(contratto.valore_contratto || 0).toFixed(2)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400 block mb-1">Canone</span>
                              <span className="text-gray-900 dark:text-white font-medium">
                                €{parseFloat(contratto.canone_mensile || 0).toFixed(2)}/mese
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar Ore */}
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Ore Disponibili
                              </span>
                              <span className={`text-sm font-bold ${
                                percentualeUtilizzo >= 90 
                                  ? 'text-red-600 dark:text-red-400' 
                                  : percentualeUtilizzo >= 75 
                                  ? 'text-orange-600 dark:text-orange-400' 
                                  : 'text-green-600 dark:text-green-400'
                              }`}>
                                {oreRimanenti.toFixed(1)}h / {parseFloat(contratto.ore_incluse || 0).toFixed(1)}h
                              </span>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
                              <div
                                className={`h-3 rounded-full transition-all ${
                                  percentualeUtilizzo >= 90
                                    ? 'bg-red-500'
                                    : percentualeUtilizzo >= 75
                                    ? 'bg-orange-500'
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.max(0, Math.min(100, 100 - percentualeUtilizzo))}%` }}
                              ></div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                              <span>{parseFloat(contratto.ore_utilizzate || 0).toFixed(1)}h utilizzate</span>
                              <span>{percentualeUtilizzo.toFixed(0)}% consumato</span>
                            </div>
                          </div>

                          {/* Note Contratto */}
                          {contratto.note && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-medium">Note:</span> {contratto.note}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Nessun contratto
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Questo cliente non ha ancora contratti registrati
                    </p>
                    <button
                      className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      <Plus size={18} />
                      Crea Contratto
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Tab Ticket */}
            {activeTab === 'ticket' && (
              <>
                {tickets.length > 0 ? (
                  <>
                    {/* Header con pulsante Nuovo Ticket */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Tutti i Ticket ({tickets.length})
                      </h3>
                      <Link
                        href={`/ticket/nuovo?cliente=${cliente.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                      >
                        <Plus size={16} />
                        Nuovo Ticket
                      </Link>
                    </div>

                    <div className="space-y-4">
                      {tickets.map((ticket) => (
                      <div 
                        key={ticket.id}
                        onClick={() => handleTicketClick(ticket, null)}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleTicketClick(ticket, e)
                                }}
                                className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                              >
                                {ticket.numero_ticket}
                              </button>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getPrioritaBadge(ticket.priorita)}`}>
                                {ticket.priorita?.toUpperCase()}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatoBadge(ticket.stato)}`}>
                                {getStatoLabel(ticket.stato)}
                              </span>
                            </div>
                            
                            <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                              {ticket.oggetto}
                            </h4>
                            
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                              {ticket.descrizione}
                            </p>

                            {ticket.macchinari && (
                              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <HardDrive size={14} />
                                <span>{ticket.macchinari.tipo_macchinario} (SN: {ticket.macchinari.numero_seriale})</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-start gap-3 ml-4">
                            <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1 mb-1">
                                <Clock size={12} />
                                <span>{new Date(ticket.data_apertura).toLocaleDateString('it-IT')}</span>
                              </div>
                              <span>{new Date(ticket.data_apertura).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTicketClick(ticket, e)
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm font-medium text-xs"
                            >
                              <Settings size={14} />
                              <span>Gestisci</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Ticket className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Nessun ticket
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Questo cliente non ha ancora aperto ticket
                    </p>
                    <Link
                      href={`/ticket/nuovo?cliente=${cliente.id}`}
                      className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Crea Primo Ticket
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* Tab Infrastruttura */}
            {activeTab === 'infrastruttura' && (
              <InfrastrutturaForm clienteId={params.id} />
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

      {/* Modal Contratto */}
      {mostraModalContratto && contrattoSelezionato && (
        <ContrattoModal
          contratto={contrattoSelezionato}
          mode={modalMode}
          onClose={closeModalContratto}
          onUpdate={loadCliente}
        />
      )}
    </div>
  )
}