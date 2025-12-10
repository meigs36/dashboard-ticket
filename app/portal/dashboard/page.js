// app/portal/dashboard/page.js
// Dashboard Clienti - Versione con KPI Cliccabili + FATTURE + TICKET CLICCABILI + MACCHINARI + MULTI-SEDE
//
// 🔧 MODIFICHE APPLICATE (28 Nov 2025):
// 1. ✅ KPI Cards cliccabili per navigare tra le sezioni
// 2. ✅ Rimossa barra tab duplicata - navigazione solo via KPI
// 3. ✅ NUOVO: Sezione Fatture con download PDF
// 4. ✅ Fix query ticket e contratti
//
// 🔧 MODIFICHE APPLICATE (2 Dic 2025):
// 5. ✅ Ticket cliccabili nella preview (Ticket Recenti)
// 6. ✅ Ticket cliccabili nella lista completa (I Miei Ticket)
// 7. ✅ Link a pagina dettaglio: /portal/ticket/[id]
//
// 🔧 MODIFICHE APPLICATE (4 Dic 2025):
// 8. ✅ Query macchinari dalla tabella "macchinari" (non customer_macchinari)
// 9. ✅ Nuova sezione Macchinari Installati con tabella compatta
// 10. ✅ Badge numerico ticket aperti per ogni macchinario
// 11. ✅ Modal per consultare ticket del macchinario specifico
// 12. ✅ Indicatore scadenza manutenzione con alert visivo
// 13. ✅ MULTI-SEDE: Supporto clienti con più sedi (stessa P.IVA)
// 14. ✅ MULTI-SEDE: SedePicker per switch sede senza ri-login
// 15. ✅ MULTI-SEDE: Filtro dati per sede attiva

'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import SedePicker, { SedeBadge } from '@/components/SedePicker'
import { supabase } from '@/lib/supabase'
import {
  Building2, Users, Wrench, FileText, LogOut,
  Mail, Phone, MapPin, CheckCircle2, AlertCircle,
  Download, Eye, Edit, Plus, Clock, Shield, Ticket,
  ChevronRight, ArrowLeft, Receipt, Euro, Calendar,
  CreditCard, FileCheck, X, AlertTriangle, Settings
} from 'lucide-react'

export default function CustomerDashboard() {
  const router = useRouter()
  const { 
    user, 
    customerProfile, 
    authLoading, 
    signOut,
    // ✅ MULTI-SEDE
    sedeAttiva,
    sediCollegate,
    isMultiSede 
  } = useCustomerAuth()

  // Stati
  const [loading, setLoading] = useState(true)
  
  // ✅ FIX: Refs per evitare loop e freeze
  const isLoadingData = useRef(false)
  const dataLoadedForClient = useRef(null)
  
  const [activeSection, setActiveSection] = useState('overview')
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [pdfViewerUrl, setPdfViewerUrl] = useState(null)
  const [pdfViewerTitle, setPdfViewerTitle] = useState('')
  
  // ✅ NUOVO: Stati per modal ticket macchinario
  const [ticketModalOpen, setTicketModalOpen] = useState(false)
  const [selectedMacchinario, setSelectedMacchinario] = useState(null)
  const [macchinarioTickets, setMacchinarioTickets] = useState([])
  
  const [dashboardData, setDashboardData] = useState({
    cliente: customerProfile || null,
    referenti: [],
    macchinari: [],        // ✅ Ora usa tabella "macchinari"
    macchinariInstallati: [], // ✅ NUOVO: macchinari con conteggio ticket
    documenti: [],
    contratti: [],
    tickets: [],
    fatture: []
  })

  // Protezione route
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/portal')
    }
  }, [user, authLoading, router])

  // Caricamento dati dashboard
  useEffect(() => {
    // ✅ FIX: Evita loop - carica solo se cliente valido e non già in caricamento
    const clienteId = sedeAttiva?.id || customerProfile?.cliente_id
    
    if (clienteId && !isLoadingData.current) {
      // Carica solo se è un cliente diverso da quello già caricato
      if (dataLoadedForClient.current !== clienteId) {
        loadDashboardData()
      } else {
        // Dati già caricati per questo cliente
        setLoading(false)
      }
    }
  }, [customerProfile?.cliente_id, sedeAttiva?.id])

  const loadDashboardData = async () => {
    // ✅ FIX: Evita chiamate multiple
    if (isLoadingData.current) {
      console.log('⏳ Caricamento già in corso, skip')
      return
    }
    
    const clienteId = sedeAttiva?.id || customerProfile?.cliente_id
    const codiceCliente = sedeAttiva?.codice_cliente || customerProfile?.codice_cliente

    if (!clienteId) {
      console.error('❌ cliente_id non trovato')
      setLoading(false)
      return
    }

    // ✅ FIX: Evita ricaricamento se già caricato per questo cliente
    if (dataLoadedForClient.current === clienteId && dashboardData.cliente) {
      console.log('⏳ Dati già caricati per cliente:', clienteId)
      setLoading(false)
      return
    }

    isLoadingData.current = true
    
    try {
      setLoading(true)
      // ✅ MULTI-SEDE: Usa sedeAttiva se disponibile, altrimenti fallback a customerProfile
      console.log('📊 Caricamento dashboard per cliente:', clienteId, 'codice:', codiceCliente)

      if (!clienteId) {
        console.error('❌ cliente_id non trovato in customerProfile:', customerProfile)
        throw new Error('ID cliente non disponibile')
      }

      console.log('📊 Caricamento dashboard per cliente:', clienteId, 'codice:', codiceCliente, isMultiSede ? '(multi-sede)' : '')

      // Carica referenti
      const { data: referentiData } = await supabase
        .from('customer_referenti')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('attivo', true)
        .order('principale', { ascending: false })

      // ✅ MODIFICATO: Carica macchinari dalla tabella "macchinari" (non customer_macchinari)
      const { data: macchinariData, error: macchinariError } = await supabase
        .from('macchinari')
        .select(`
          id,
          numero_seriale,
          numero_libro,
          tipo_macchinario,
          marca,
          modello,
          data_installazione,
          garanzia_scadenza,
          garanzia_estensione_scadenza,
          contratto_manutenzione,
          stato,
          ubicazione_specifica,
          note_tecniche,
          data_ultimo_intervento
        `)
        .eq('id_cliente', clienteId)
        .neq('stato', 'dismesso')
        .order('marca', { ascending: true })

      if (macchinariError) {
        console.error('❌ Errore caricamento macchinari:', macchinariError)
      } else {
        console.log('✅ Macchinari installati caricati:', macchinariData?.length || 0)
      }

      // ✅ NUOVO: Carica tickets e raggruppa per macchinario
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('ticket')
        .select(`
          id,
          numero_ticket,
          oggetto,
          descrizione,
          stato,
          priorita,
          categoria,
          canale_origine,
          data_apertura,
          data_chiusura,
          id_macchinario
        `)
        .eq('id_cliente', clienteId)
        .order('data_apertura', { ascending: false })
        .limit(50)

      if (ticketsError) {
        console.error('❌ Errore caricamento ticket:', ticketsError)
      }

      // ✅ NUOVO: Calcola conteggio ticket aperti per ogni macchinario
      const ticketApertiPerMacchinario = {}
      const ticketTotaliPerMacchinario = {}
      
      ;(ticketsData || []).forEach(ticket => {
        if (ticket.id_macchinario) {
          // Conta totali
          ticketTotaliPerMacchinario[ticket.id_macchinario] = 
            (ticketTotaliPerMacchinario[ticket.id_macchinario] || 0) + 1
          
          // Conta solo aperti (non chiusi/risolti/annullati)
          if (!['chiuso', 'risolto', 'annullato'].includes(ticket.stato)) {
            ticketApertiPerMacchinario[ticket.id_macchinario] = 
              (ticketApertiPerMacchinario[ticket.id_macchinario] || 0) + 1
          }
        }
      })

      // ✅ NUOVO: Arricchisci macchinari con conteggio ticket
      const macchinariConTickets = (macchinariData || []).map(macch => ({
        ...macch,
        ticketAperti: ticketApertiPerMacchinario[macch.id] || 0,
        ticketTotali: ticketTotaliPerMacchinario[macch.id] || 0
      }))

      // Carica documenti
      const { data: documentiData } = await supabase
        .from('customer_documents')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('visibile_cliente', true)
        .order('caricato_il', { ascending: false })
        .limit(10)

      // Carica contratti usando codice_cliente
      const { data: contrattiData } = await supabase
        .from('contratti')
        .select('*')
        .eq('codice_cliente', codiceCliente)
        .order('data_contratto', { ascending: false })
        .limit(5)

      // ✅ Carica fatture
      const { data: fattureData, error: fattureError } = await supabase
        .from('fatture')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('data_emissione', { ascending: false })
        .limit(20)

      if (fattureError) {
        console.error('❌ Errore caricamento fatture:', fattureError)
      } else {
        console.log('✅ Fatture caricate:', fattureData?.length || 0)
      }

      setDashboardData({
        cliente: customerProfile,
        referenti: referentiData || [],
        macchinari: macchinariConTickets,           // ✅ Macchinari con conteggio ticket
        macchinariInstallati: macchinariConTickets, // ✅ Alias per retrocompatibilità
        documenti: documentiData || [],
        contratti: contrattiData || [],
        tickets: ticketsData || [],
        fatture: fattureData || []
      })
      
      console.log('✅ Dashboard caricata')
      
      // ✅ FIX: Segna come caricato per questo cliente
      dataLoadedForClient.current = clienteId
    } catch (error) {
      console.error('Errore caricamento dashboard:', error)
    } finally {
      setLoading(false)
      isLoadingData.current = false
    }
  }

  // ✅ NUOVO: Funzione per aprire modal ticket di un macchinario
  const openTicketModal = (macchinario) => {
    const { tickets } = dashboardData
    const ticketsMacchinario = tickets.filter(t => t.id_macchinario === macchinario.id)
    setSelectedMacchinario(macchinario)
    setMacchinarioTickets(ticketsMacchinario)
    setTicketModalOpen(true)
  }

  // ✅ NUOVO: Helper per verificare scadenza manutenzione
  const getScadenzaManutenzione = (macchinario) => {
    // Usa garanzia_scadenza come data riferimento per manutenzione
    // Puoi modificare questo campo se hai un campo dedicato
    const dataScadenza = macchinario.garanzia_scadenza || macchinario.garanzia_estensione_scadenza
    
    if (!dataScadenza) return { status: 'unknown', label: 'N/D', className: 'text-gray-400' }
    
    const oggi = new Date()
    const scadenza = new Date(dataScadenza)
    const giorniRimanenti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24))
    
    if (giorniRimanenti < 0) {
      return { 
        status: 'expired', 
        label: 'Scaduta', 
        className: 'text-red-600 bg-red-50',
        icon: AlertTriangle
      }
    } else if (giorniRimanenti <= 30) {
      return { 
        status: 'warning', 
        label: `${giorniRimanenti}gg`, 
        className: 'text-amber-600 bg-amber-50',
        icon: AlertCircle
      }
    } else {
      return { 
        status: 'ok', 
        label: new Date(dataScadenza).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' }), 
        className: 'text-green-600',
        icon: CheckCircle2
      }
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/portal')
  }

  // Helper per visualizzare fattura PDF in modal
  const downloadFattura = async (fattura) => {
    try {
      const pdfPath = fattura.storage_path || `fatture/${fattura.anno || new Date().getFullYear()}/fattura_${fattura.numero_fattura.replace('/', '-')}.pdf`
      const bucket = fattura.storage_bucket || 'fatture-documenti'
      
      console.log('📄 Download fattura:', { bucket, pdfPath, fattura })
      
      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(pdfPath, 300)
      
      console.log('📄 Signed URL response:', { signedData, signedError })
      
      if (signedError) {
        console.error('Errore creazione signed URL:', signedError)
        alert(`Errore nel download della fattura: ${signedError.message}`)
        return
      }
      
      if (signedData?.signedUrl) {
        console.log('📄 Apertura modal con URL:', signedData.signedUrl)
        setPdfViewerUrl(signedData.signedUrl)
        setPdfViewerTitle(`Fattura ${fattura.numero_fattura}`)
        setPdfViewerOpen(true)
        return
      }
      
      alert('Impossibile generare il link per il download')
    } catch (err) {
      console.error('Errore download fattura:', err)
      alert('Errore nel download della fattura')
    }
  }

  // Helper per badge stato ticket
  const getStatoBadge = (stato) => {
    const badges = {
      aperto: 'bg-blue-100 text-blue-800',
      assegnato: 'bg-purple-100 text-purple-800',
      in_lavorazione: 'bg-amber-100 text-amber-800',
      in_attesa_cliente: 'bg-gray-100 text-gray-800',
      in_attesa_parti: 'bg-orange-100 text-orange-800',
      risolto: 'bg-green-100 text-green-800',
      chiuso: 'bg-gray-100 text-gray-600',
      annullato: 'bg-red-100 text-red-800'
    }
    return badges[stato] || 'bg-gray-100 text-gray-800'
  }

  const getStatoLabel = (stato) => {
    const labels = {
      aperto: 'Aperto',
      assegnato: 'Assegnato',
      in_lavorazione: 'In Lavorazione',
      in_attesa_cliente: 'In Attesa',
      in_attesa_parti: 'Attesa Parti',
      risolto: 'Risolto',
      chiuso: 'Chiuso',
      annullato: 'Annullato'
    }
    return labels[stato] || stato
  }

  // Helper per badge stato fattura
  const getStatoFatturaBadge = (stato) => {
    const badges = {
      emessa: 'bg-blue-100 text-blue-800',
      inviata: 'bg-purple-100 text-purple-800',
      pagata: 'bg-green-100 text-green-800',
      scaduta: 'bg-red-100 text-red-800',
      annullata: 'bg-gray-100 text-gray-600'
    }
    return badges[stato] || 'bg-gray-100 text-gray-800'
  }

  const getStatoFatturaLabel = (stato) => {
    const labels = {
      emessa: 'Emessa',
      inviata: 'Inviata',
      pagata: 'Pagata',
      scaduta: 'Scaduta',
      annullata: 'Annullata'
    }
    return labels[stato] || stato
  }

  // Loading state - ✅ FIX: Solo se non abbiamo dati
  if (loading && !dashboardData.cliente) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Caricamento dashboard...</p>
        </div>
      </div>
    )
  }

  // ✅ FIX: Se non c'è user, redirect
  if (!user) {
    router.push('/portal')
    return null
  }

  const { cliente, referenti, macchinari, documenti, contratti, tickets, fatture } = dashboardData

  // Calcola ticket aperti
  const ticketAperti = tickets.filter(t => 
    !['chiuso', 'risolto', 'annullato'].includes(t.stato)
  ).length

  // Calcola fatture non pagate
  const fattureNonPagate = fatture.filter(f => 
    f.stato !== 'pagata' && f.stato !== 'annullata'
  ).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Back */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/portal')}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Torna al Menu"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <Image 
                src="/Logo.webp" 
                alt="OdontoService" 
                width={100}
                height={75}
                className="object-contain"
              />
              <div className="hidden sm:block h-8 w-px bg-gray-300" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900">
                  {cliente?.ragione_sociale || 'Dashboard Cliente'}
                </h1>
                <p className="text-xs text-gray-500">
                  Portale Assistenza Tecnica
                </p>
              </div>
            </div>

            {/* User menu + SedePicker */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* ✅ FIX: SedePicker ORA VISIBILE SU MOBILE */}
              {isMultiSede && (
                <SedePicker className="max-w-[130px] sm:max-w-[200px]" />
              )}
              <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gray-100 rounded-lg">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                  <p className="text-xs text-gray-500">Cliente</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Esci"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 mb-8 text-white">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h2 className="text-3xl font-bold">
              Benvenuto, {cliente?.ragione_sociale}!
            </h2>
            {/* ✅ MULTI-SEDE: Badge sede corrente */}
            {isMultiSede && sedeAttiva && (
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                📍 {sedeAttiva.citta} ({sediCollegate.length} sedi)
              </span>
            )}
          </div>
          <p className="text-blue-100 mb-6">
            {isMultiSede && sedeAttiva
              ? `Stai visualizzando: ${sedeAttiva.indirizzo || sedeAttiva.citta} (${sedeAttiva.codice_cliente})`
              : 'Gestisci la tua assistenza tecnica in un unico posto'
            }
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/portal/ticket/nuovo"
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              <Ticket className="w-5 h-5" />
              Apri Ticket
            </Link>
            <Link
              href="/portal/contratti"
              className="flex items-center gap-2 px-5 py-2.5 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors font-medium"
            >
              <FileText className="w-5 h-5" />
              Vedi Contratti
            </Link>
          </div>
        </div>

        {/* KPI Cards CLICCABILI - 6 CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          
          {/* Card 1: Dati Azienda */}
          <button
            onClick={() => setActiveSection('overview')}
            className={`bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500 text-left transition-all hover:shadow-md hover:scale-[1.02] ${
              activeSection === 'overview' ? 'ring-2 ring-blue-500 ring-offset-2' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <h3 className="text-xs font-medium text-gray-600 mb-1">Dati Azienda</h3>
            <p className="text-xl font-bold text-gray-900">Completi</p>
          </button>

          {/* Card 2: Referenti */}
          <button
            onClick={() => setActiveSection('referenti')}
            className={`bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500 text-left transition-all hover:shadow-md hover:scale-[1.02] ${
              activeSection === 'referenti' ? 'ring-2 ring-green-500 ring-offset-2' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <h3 className="text-xs font-medium text-gray-600 mb-1">Referenti</h3>
            <p className="text-xl font-bold text-gray-900">{referenti.length}</p>
          </button>

          {/* Card 3: Macchinari */}
          <button
            onClick={() => setActiveSection('macchinari')}
            className={`bg-white rounded-xl shadow-sm p-5 border-l-4 border-amber-500 text-left transition-all hover:shadow-md hover:scale-[1.02] ${
              activeSection === 'macchinari' ? 'ring-2 ring-amber-500 ring-offset-2' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-amber-600" />
              </div>
              {/* ✅ Badge per macchinari con ticket aperti */}
              {macchinari.filter(m => m.ticketAperti > 0).length > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                  {macchinari.filter(m => m.ticketAperti > 0).length}
                </span>
              )}
            </div>
            <h3 className="text-xs font-medium text-gray-600 mb-1">Macchinari</h3>
            <p className="text-xl font-bold text-gray-900">{macchinari.length}</p>
          </button>

          {/* Card 4: Documenti */}
          <button
            onClick={() => setActiveSection('documenti')}
            className={`bg-white rounded-xl shadow-sm p-5 border-l-4 border-purple-500 text-left transition-all hover:shadow-md hover:scale-[1.02] ${
              activeSection === 'documenti' ? 'ring-2 ring-purple-500 ring-offset-2' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <h3 className="text-xs font-medium text-gray-600 mb-1">Documenti</h3>
            <p className="text-xl font-bold text-gray-900">{documenti.length}</p>
          </button>

          {/* Card 5: Ticket */}
          <button
            onClick={() => setActiveSection('tickets')}
            className={`bg-white rounded-xl shadow-sm p-5 border-l-4 border-red-500 text-left transition-all hover:shadow-md hover:scale-[1.02] ${
              activeSection === 'tickets' ? 'ring-2 ring-red-500 ring-offset-2' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Ticket className="w-5 h-5 text-red-600" />
              </div>
              {ticketAperti > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                  {ticketAperti}
                </span>
              )}
            </div>
            <h3 className="text-xs font-medium text-gray-600 mb-1">Ticket</h3>
            <p className="text-xl font-bold text-gray-900">{tickets.length}</p>
          </button>

          {/* Card 6: Fatture */}
          <button
            onClick={() => setActiveSection('fatture')}
            className={`bg-white rounded-xl shadow-sm p-5 border-l-4 border-emerald-500 text-left transition-all hover:shadow-md hover:scale-[1.02] ${
              activeSection === 'fatture' ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-5 h-5 text-emerald-600" />
              </div>
              {fattureNonPagate > 0 && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                  {fattureNonPagate}
                </span>
              )}
            </div>
            <h3 className="text-xs font-medium text-gray-600 mb-1">Fatture</h3>
            <p className="text-xl font-bold text-gray-900">{fatture.length}</p>
          </button>
        </div>

        {/* Contenuto Dinamico basato su activeSection */}
        <div className="space-y-6">
          
          {/* OVERVIEW SECTION */}
          {activeSection === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Dati Aziendali */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Dati Aziendali
                  </h3>
                  <button className="text-blue-600 hover:text-blue-700">
                    <Edit className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Ragione Sociale</p>
                    <p className="font-medium text-gray-900">{cliente?.ragione_sociale || '-'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">P.IVA</p>
                      <p className="font-medium text-gray-900">{cliente?.partita_iva || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Codice Fiscale</p>
                      <p className="font-medium text-gray-900">{cliente?.codice_fiscale || '-'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Indirizzo
                    </p>
                    <p className="font-medium text-gray-900">
                      {cliente?.via || '-'}<br />
                      {cliente?.cap} {cliente?.citta} ({cliente?.provincia})
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Phone className="w-4 h-4" /> Telefono
                      </p>
                      <p className="font-medium text-gray-900">{cliente?.telefono_principale || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Mail className="w-4 h-4" /> Email
                      </p>
                      <p className="font-medium text-gray-900">{cliente?.email_principale || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contratti Attivi */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Contratti Attivi
                  </h3>
                  <Shield className="w-5 h-5 text-green-500" />
                </div>
                {contratti.length > 0 ? (
                  <div className="space-y-4">
                    {contratti.slice(0, 3).map((contratto) => (
                      <div key={contratto.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-gray-900">
                              {contratto.nome_contratto || contratto.tipo_contratto || `Contratto ${contratto.num_contratto}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              {contratto.tipo_contratto}
                            </p>
                          </div>
                          <span className={`
                            px-2 py-1 text-xs font-medium rounded-full
                            ${contratto.stato === 'attivo' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                            }
                          `}>
                            {contratto.stato}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                          <div>
                            <p className="text-xs text-gray-500">Ore Incluse</p>
                            <p className="text-sm font-semibold text-gray-900">{contratto.ore_incluse}h</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Ore Rimanenti</p>
                            <p className="text-sm font-semibold text-green-600">{contratto.ore_rimanenti}h</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Nessun contratto attivo</p>
                  </div>
                )}
              </div>

              {/* Ticket Recenti - Anteprima */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Ticket Recenti
                  </h3>
                  <button
                    onClick={() => setActiveSection('tickets')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                  >
                    Vedi tutti
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {tickets.length > 0 ? (
                  <div className="space-y-3">
                    {tickets.slice(0, 3).map((ticket) => (
                      <Link 
                        key={ticket.id} 
                        href={`/portal/ticket/${ticket.id}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {ticket.oggetto}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            #{ticket.numero_ticket} • {new Date(ticket.data_apertura).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                        <span className={`
                          ml-3 px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap
                          ${getStatoBadge(ticket.stato)}
                        `}>
                          {getStatoLabel(ticket.stato)}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Nessun ticket</p>
                  </div>
                )}
              </div>

              {/* ✅ NUOVO: Preview Macchinari nell'Overview */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Macchinari Installati
                  </h3>
                  <button
                    onClick={() => setActiveSection('macchinari')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                  >
                    Vedi tutti
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {macchinari.length > 0 ? (
                  <div className="space-y-3">
                    {macchinari.slice(0, 3).map((macch) => {
                      const scadenza = getScadenzaManutenzione(macch)
                      return (
                        <div 
                          key={macch.id} 
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                              <Wrench className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {macch.tipo_macchinario || 'N/D'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {macch.marca && `${macch.marca} `}{macch.modello || ''} • SN: {macch.numero_seriale || 'N/D'}
                              </p>
                            </div>
                          </div>
                          {/* Badge ticket */}
                          {macch.ticketAperti > 0 && (
                            <button
                              onClick={() => openTicketModal(macch)}
                              className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full hover:bg-red-200 transition-colors"
                            >
                              {macch.ticketAperti} ticket
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Nessun macchinario registrato</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TICKETS SECTION */}
          {activeSection === 'tickets' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <h3 className="text-lg font-semibold text-gray-900">
                    I Miei Ticket
                  </h3>
                </div>
                <Link
                  href="/portal/ticket/nuovo"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nuovo Ticket
                </Link>
              </div>
              {tickets.length > 0 ? (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <Link 
                      key={ticket.id}
                      href={`/portal/ticket/${ticket.id}`}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-mono text-gray-500">
                            #{ticket.numero_ticket}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatoBadge(ticket.stato)}`}>
                            {getStatoLabel(ticket.stato)}
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">
                          {ticket.oggetto}
                        </h4>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {ticket.descrizione}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(ticket.data_apertura).toLocaleDateString('it-IT')}
                          </span>
                          {ticket.categoria && (
                            <span className="capitalize">{ticket.categoria.replace('_', ' ')}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 ml-4" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Nessun ticket presente</p>
                  <Link
                    href="/portal/ticket/nuovo"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Apri il primo ticket
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* REFERENTI SECTION */}
          {activeSection === 'referenti' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Referenti Aziendali
                  </h3>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Plus className="w-4 h-4" />
                  Aggiungi Referente
                </button>
              </div>
              {referenti.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {referenti.map((ref) => (
                    <div key={ref.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-bold text-lg">
                              {ref.nome?.charAt(0)}{ref.cognome?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {ref.nome} {ref.cognome}
                            </h4>
                            <p className="text-sm text-gray-600">{ref.ruolo}</p>
                          </div>
                        </div>
                        {ref.principale && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            Principale
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        {ref.email && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="w-4 h-4" />
                            <a href={`mailto:${ref.email}`} className="hover:text-blue-600">
                              {ref.email}
                            </a>
                          </div>
                        )}
                        {ref.telefono && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4" />
                            <a href={`tel:${ref.telefono}`} className="hover:text-blue-600">
                              {ref.telefono}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Nessun referente registrato</p>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Aggiungi il primo referente
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ✅ MACCHINARI SECTION - Versione Tabellare Completa */}
          {activeSection === 'macchinari' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Macchinari Installati
                    </h3>
                    <p className="text-sm text-gray-500">
                      {macchinari.length} macchinari registrati
                    </p>
                  </div>
                </div>
              </div>

              {macchinari.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Tipo Apparecchiatura
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Matricola
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Installazione
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Scad. Manutenzione
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Ticket
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Azioni
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {macchinari.map((macch) => {
                        const scadenza = getScadenzaManutenzione(macch)
                        const ScadenzaIcon = scadenza.icon
                        
                        return (
                          <tr 
                            key={macch.id} 
                            className="hover:bg-gray-50 transition-colors"
                          >
                            {/* Tipo Apparecchiatura */}
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Wrench className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {macch.tipo_macchinario || 'N/D'}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {macch.marca && `${macch.marca} `}{macch.modello || ''}
                                  </p>
                                </div>
                              </div>
                            </td>
                            
                            {/* Matricola (ex Seriale) */}
                            <td className="py-4 px-4">
                              <span className="font-mono text-sm text-gray-700">
                                {macch.numero_seriale || 'N/D'}
                              </span>
                              {macch.numero_libro && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  Libro: {macch.numero_libro}
                                </p>
                              )}
                            </td>
                            
                            {/* Data Installazione */}
                            <td className="py-4 px-4">
                              {macch.data_installazione ? (
                                <span className="text-sm text-gray-700">
                                  {new Date(macch.data_installazione).toLocaleDateString('it-IT', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  })}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">N/D</span>
                              )}
                            </td>
                            
                            {/* Scadenza Manutenzione */}
                            <td className="py-4 px-4">
                              {scadenza.status === 'unknown' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium text-gray-400 bg-gray-100">
                                  Scaduto
                                </span>
                              ) : (
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${scadenza.className}`}>
                                  {ScadenzaIcon && <ScadenzaIcon className="w-3.5 h-3.5" />}
                                  {scadenza.label}
                                </div>
                              )}
                            </td>
                            
                            {/* Ticket Badge Cliccabile */}
                            <td className="py-4 px-4 text-center">
                              {macch.ticketAperti > 0 ? (
                                <button
                                  onClick={() => openTicketModal(macch)}
                                  className="inline-flex items-center justify-center min-w-[2.5rem] h-8 px-3 bg-red-100 text-red-700 font-bold text-sm rounded-full hover:bg-red-200 transition-colors"
                                  title={`${macch.ticketAperti} ticket aperti - Clicca per vedere`}
                                >
                                  {macch.ticketAperti}
                                </button>
                              ) : macch.ticketTotali > 0 ? (
                                <button
                                  onClick={() => openTicketModal(macch)}
                                  className="inline-flex items-center justify-center min-w-[2.5rem] h-8 px-3 bg-gray-100 text-gray-500 font-medium text-sm rounded-full hover:bg-gray-200 transition-colors"
                                  title={`${macch.ticketTotali} ticket totali - Clicca per vedere`}
                                >
                                  {macch.ticketTotali}
                                </button>
                              ) : (
                                <span className="inline-flex items-center justify-center min-w-[2.5rem] h-8 px-3 bg-gray-50 text-gray-400 text-sm rounded-full">
                                  0
                                </span>
                              )}
                            </td>
                            
                            {/* Pulsante Nuovo Ticket */}
                            <td className="py-4 px-4 text-center">
                              <Link
                                href={`/portal/ticket/nuovo?macchinario=${macch.id}`}
                                className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                title={`Apri nuovo ticket per ${macch.tipo_macchinario || 'questo macchinario'}`}
                              >
                                <Plus className="w-4 h-4" />
                              </Link>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">Nessun macchinario registrato</p>
                  <p className="text-sm text-gray-400">
                    I macchinari verranno visualizzati qui una volta registrati nel sistema
                  </p>
                </div>
              )}
            </div>
          )}

          {/* FATTURE SECTION */}
          {activeSection === 'fatture' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Le Mie Fatture
                    </h3>
                    <p className="text-sm text-gray-500">
                      {fatture.length} fatture • {fattureNonPagate} da pagare
                    </p>
                  </div>
                </div>
              </div>

              {fatture.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Numero
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Descrizione
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Importo
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Stato
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Azioni
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {fatture.map((fattura) => (
                        <tr key={fattura.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <span className="font-mono text-sm font-medium text-gray-900">
                              {fattura.numero_fattura}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-gray-600">
                              {new Date(fattura.data_emissione).toLocaleDateString('it-IT')}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-gray-900 line-clamp-1">
                              {fattura.descrizione || 'Fattura servizi'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="font-semibold text-gray-900">
                              € {(fattura.importo_totale || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatoFatturaBadge(fattura.stato)}`}>
                              {getStatoFatturaLabel(fattura.stato)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <button
                              onClick={() => downloadFattura(fattura)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Visualizza PDF"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nessuna fattura presente</p>
                </div>
              )}
            </div>
          )}

          {/* DOCUMENTI SECTION */}
          {activeSection === 'documenti' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Documenti
                  </h3>
                </div>
              </div>
              {documenti.length > 0 ? (
                <div className="space-y-3">
                  {documenti.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{doc.nome_file}</h4>
                          <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                            <span className="capitalize">{doc.tipo}</span>
                            <span>•</span>
                            <span>{new Date(doc.caricato_il).toLocaleDateString('it-IT')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Eye className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nessun documento disponibile</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Info */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">
                Hai bisogno di assistenza?
              </h4>
              <p className="text-blue-800 text-sm mb-3">
                Il nostro team è a tua disposizione per qualsiasi necessità tecnica o amministrativa.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link 
                  href="/portal/ticket/nuovo"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Ticket className="w-4 h-4" />
                  Apri Ticket
                </Link>
                <a href="tel:+390544949554" className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium">
                  <Phone className="w-4 h-4" />
                  Chiama Ora
                </a>
                <a href="mailto:assistenza@odontoservice.it" className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium">
                  <Mail className="w-4 h-4" />
                  Invia Email
                </a>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* ✅ NUOVO: Modal Ticket Macchinario */}
      {ticketModalOpen && selectedMacchinario && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Wrench className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Ticket - {selectedMacchinario.tipo_macchinario || 'Macchinario'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedMacchinario.marca && `${selectedMacchinario.marca} `}{selectedMacchinario.modello || ''} • Matr: {selectedMacchinario.numero_seriale || 'N/D'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setTicketModalOpen(false)
                  setSelectedMacchinario(null)
                  setMacchinarioTickets([])
                }}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            {/* Contenuto Modal */}
            <div className="flex-1 overflow-y-auto p-6">
              {macchinarioTickets.length > 0 ? (
                <div className="space-y-3">
                  {macchinarioTickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/portal/ticket/${ticket.id}`}
                      onClick={() => setTicketModalOpen(false)}
                      className="block p-4 border border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-gray-500">
                            #{ticket.numero_ticket}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatoBadge(ticket.stato)}`}>
                            {getStatoLabel(ticket.stato)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(ticket.data_apertura).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        {ticket.oggetto}
                      </h4>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {ticket.descrizione}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nessun ticket per questo macchinario</p>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {macchinarioTickets.length} ticket trovati
                </p>
                <Link
                  href={`/portal/ticket/nuovo?macchinario=${selectedMacchinario.id}`}
                  onClick={() => setTicketModalOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Nuovo Ticket per questo macchinario
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal PDF Viewer */}
      {pdfViewerOpen && pdfViewerUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{pdfViewerTitle}</h3>
              </div>
              <div className="flex items-center gap-2">
                {/* Pulsante Download */}
                <a
                  href={pdfViewerUrl}
                  download={`${pdfViewerTitle.replace(/\s+/g, '_')}.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Scarica
                </a>
                {/* Pulsante Chiudi */}
                <button
                  onClick={() => {
                    setPdfViewerOpen(false)
                    setPdfViewerUrl(null)
                    setPdfViewerTitle('')
                  }}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            
            {/* PDF Viewer */}
            <div className="flex-1 bg-gray-100">
              <iframe
                src={pdfViewerUrl}
                className="w-full h-full"
                title={pdfViewerTitle}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
