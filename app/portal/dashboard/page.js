// app/portal/dashboard/page.js
// Dashboard Clienti - Versione con KPI Cliccabili + FATTURE + TICKET CLICCABILI
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

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { supabase } from '@/lib/supabase'
import {
  Building2, Users, Wrench, FileText, LogOut,
  Mail, Phone, MapPin, CheckCircle2, AlertCircle,
  Download, Eye, Edit, Plus, Clock, Shield, Ticket,
  ChevronRight, ArrowLeft, Receipt, Euro, Calendar,
  CreditCard, FileCheck, X
} from 'lucide-react'

export default function CustomerDashboard() {
  const router = useRouter()
  const { user, customerProfile, authLoading, signOut } = useCustomerAuth()

  // Stati
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('overview')
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [pdfViewerUrl, setPdfViewerUrl] = useState(null)
  const [pdfViewerTitle, setPdfViewerTitle] = useState('')
  const [dashboardData, setDashboardData] = useState({
    cliente: customerProfile || null,
    referenti: [],
    macchinari: [],
    documenti: [],
    contratti: [],
    tickets: [],
    fatture: []  // ✅ NUOVO
  })

  // Protezione route
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/portal')
    }
  }, [user, authLoading, router])

  // Caricamento dati dashboard
  useEffect(() => {
    if (customerProfile?.id) {
      loadDashboardData()
    }
  }, [customerProfile])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const clienteId = customerProfile.cliente_id
      const codiceCliente = customerProfile.codice_cliente

      if (!clienteId) {
        console.error('❌ cliente_id non trovato in customerProfile:', customerProfile)
        throw new Error('ID cliente non disponibile')
      }

      console.log('📊 Caricamento dashboard per cliente:', clienteId, 'codice:', codiceCliente)

      // Carica referenti
      const { data: referentiData } = await supabase
        .from('customer_referenti')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('attivo', true)
        .order('principale', { ascending: false })

      // Carica macchinari
      const { data: macchinariData } = await supabase
        .from('customer_macchinari')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('attivo', true)
        .order('created_at', { ascending: false })

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

      // Carica tickets
      const { data: ticketsData } = await supabase
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
          data_chiusura
        `)
        .eq('id_cliente', clienteId)
        .order('data_apertura', { ascending: false })
        .limit(20)

      // ✅ NUOVO: Carica fatture
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
        macchinari: macchinariData || [],
        documenti: documentiData || [],
        contratti: contrattiData || [],
        tickets: ticketsData || [],
        fatture: fattureData || []
      })
      
      console.log('✅ Dashboard caricata')
    } catch (error) {
      console.error('Errore caricamento dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/portal')
  }

  // Helper per visualizzare fattura PDF in modal
  const downloadFattura = async (fattura) => {
    try {
      // Usa storage_path dalla fattura, o costruisci il path
      const pdfPath = fattura.storage_path || `fatture/${fattura.anno || new Date().getFullYear()}/fattura_${fattura.numero_fattura.replace('/', '-')}.pdf`
      const bucket = fattura.storage_bucket || 'fatture-documenti'
      
      console.log('📄 Download fattura:', { bucket, pdfPath, fattura })
      
      // Per bucket privati usa createSignedUrl
      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(pdfPath, 300) // URL valido per 5 minuti
      
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

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Caricamento dashboard...</p>
        </div>
      </div>
    )
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

            {/* User menu */}
            <div className="flex items-center gap-4">
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
          <h2 className="text-3xl font-bold mb-2">
            Benvenuto, {cliente?.ragione_sociale}!
          </h2>
          <p className="text-blue-100 mb-6">
            Gestisci la tua assistenza tecnica in un unico posto
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

          {/* ✅ NUOVO: Card 6: Fatture */}
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
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Ticket className={`w-5 h-5 ${
                            ticket.stato === 'aperto' ? 'text-blue-600' :
                            ticket.stato === 'in_lavorazione' ? 'text-amber-600' :
                            ticket.stato === 'risolto' ? 'text-green-600' : 'text-gray-600'
                          }`} />
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{ticket.oggetto}</p>
                            <p className="text-xs text-gray-500">{ticket.numero_ticket}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatoBadge(ticket.stato)}`}>
                            {getStatoLabel(ticket.stato)}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Ticket className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Nessun ticket</p>
                  </div>
                )}
              </div>

              {/* ✅ NUOVO: Fatture Recenti - Anteprima */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Fatture Recenti
                  </h3>
                  <button
                    onClick={() => setActiveSection('fatture')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                  >
                    Vedi tutte
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                
                {fatture.length > 0 ? (
                  <div className="space-y-3">
                    {fatture.slice(0, 3).map((fattura) => (
                      <div 
                        key={fattura.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Receipt className="w-5 h-5 text-emerald-600" />
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{fattura.numero_fattura}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(fattura.data_emissione).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">€ {fattura.totale?.toFixed(2)}</p>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatoFatturaBadge(fattura.stato)}`}>
                            {getStatoFatturaLabel(fattura.stato)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Nessuna fattura</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ✅ NUOVO: FATTURE SECTION */}
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
                  <h3 className="text-lg font-semibold text-gray-900">
                    Le Mie Fatture
                  </h3>
                </div>
              </div>

              {fatture.length > 0 ? (
                <div className="space-y-4">
                  {fatture.map((fattura) => (
                    <div
                      key={fattura.id}
                      className="p-5 border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Receipt className="w-6 h-6 text-emerald-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900">
                                {fattura.numero_fattura}
                              </h4>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatoFatturaBadge(fattura.stato)}`}>
                                {getStatoFatturaLabel(fattura.stato)}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Emessa: {new Date(fattura.data_emissione).toLocaleDateString('it-IT')}
                              </span>
                              {fattura.data_scadenza && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  Scadenza: {new Date(fattura.data_scadenza).toLocaleDateString('it-IT')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Totale</p>
                            <p className="text-xl font-bold text-gray-900">
                              € {fattura.totale?.toFixed(2)}
                            </p>
                          </div>
                          <button
                            onClick={() => downloadFattura(fattura)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">PDF</span>
                          </button>
                        </div>
                      </div>

                      {/* Dettagli fattura */}
                      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Imponibile</p>
                          <p className="font-medium text-gray-900">€ {fattura.imponibile?.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">IVA ({fattura.iva_percentuale || 22}%)</p>
                          <p className="font-medium text-gray-900">€ {fattura.iva_importo?.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Ore lavorate</p>
                          <p className="font-medium text-gray-900">{fattura.ore_totali || '-'}h</p>
                        </div>
                        {fattura.stato === 'pagata' && fattura.data_pagamento && (
                          <div>
                            <p className="text-gray-500">Pagata il</p>
                            <p className="font-medium text-green-600">
                              {new Date(fattura.data_pagamento).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">Nessuna fattura disponibile</p>
                  <p className="text-sm text-gray-400">Le fatture appariranno qui dopo gli interventi</p>
                </div>
              )}
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
                <div className="space-y-4">
                  {tickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/portal/ticket/${ticket.id}`}
                      className="block p-5 border border-gray-200 rounded-xl hover:shadow-md hover:border-blue-300 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {ticket.numero_ticket}
                          </span>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatoBadge(ticket.stato)}`}>
                            {getStatoLabel(ticket.stato)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {new Date(ticket.data_apertura).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                      </div>

                      <h4 className="font-semibold text-gray-900 text-lg mb-2 group-hover:text-blue-600 transition-colors">
                        {ticket.oggetto}
                      </h4>

                      {ticket.descrizione && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {ticket.descrizione}
                        </p>
                      )}

                      <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                        {ticket.categoria && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {ticket.categoria.replace(/_/g, ' ')}
                          </span>
                        )}
                        {ticket.priorita && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            ticket.priorita === 'alta' || ticket.priorita === 'critica'
                              ? 'bg-red-100 text-red-700'
                              : ticket.priorita === 'media'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            Priorità: {ticket.priorita}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Non hai ancora aperto nessun ticket</p>
                  <Link
                    href="/portal/ticket/nuovo"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Plus className="w-5 h-5" />
                    Apri il tuo primo ticket
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {referenti.map((referente) => (
                    <div key={referente.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {referente.nome} {referente.cognome}
                          </h4>
                          <p className="text-sm text-gray-600">{referente.ruolo}</p>
                        </div>
                        {referente.principale && (
                          <span className="ml-auto px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            Principale
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        {referente.telefono && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{referente.telefono}</span>
                          </div>
                        )}
                        {referente.email && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="w-4 h-4" />
                            <span>{referente.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Nessun referente configurato</p>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Aggiungi il primo referente
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MACCHINARI SECTION */}
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
                  <h3 className="text-lg font-semibold text-gray-900">
                    Macchinari e Attrezzature
                  </h3>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Plus className="w-4 h-4" />
                  Aggiungi Macchinario
                </button>
              </div>
              {macchinari.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {macchinari.map((macch) => (
                    <div key={macch.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                            <Wrench className="w-6 h-6 text-amber-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {macch.tipo_macchinario}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {macch.marca} {macch.modello}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {macch.numero_seriale && (
                          <div>
                            <p className="text-gray-500">Seriale</p>
                            <p className="font-medium text-gray-900">{macch.numero_seriale}</p>
                          </div>
                        )}
                        {macch.data_installazione && (
                          <div>
                            <p className="text-gray-500">Installazione</p>
                            <p className="font-medium text-gray-900">
                              {new Date(macch.data_installazione).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Nessun macchinario registrato</p>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Aggiungi il primo macchinario
                  </button>
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
