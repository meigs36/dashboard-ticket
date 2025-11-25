// app/portal/dashboard/page.js
// Dashboard Clienti - Versione Completa
//
// 🔧 MODIFICHE APPLICATE (12 Nov 2025):
// 1. ✅ Fix cliente_id: Usa customerProfile.cliente_id invece di customerProfile.id
//    - customerProfile.id = UUID utente auth
//    - customerProfile.cliente_id = ID nella tabella clienti
// 2. ✅ Ottimizzazione: Rimossa query inutile per ricaricare dati cliente
//    - I dati sono già in customerProfile dopo il fix del CustomerAuthContext
// 3. ✅ Sicurezza: Aggiunto check che cliente_id esista prima delle query
// 4. ✅ Debug: Aggiunto logging per tracciare caricamento dati

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { supabase } from '@/lib/supabase'
import {
  Building2, Users, Wrench, FileText, Settings, LogOut,
  Mail, Phone, MapPin, Calendar, CheckCircle2, AlertCircle,
  Download, Eye, Edit, Plus, ExternalLink, Clock, Shield
} from 'lucide-react'

export default function CustomerDashboard() {
  const router = useRouter()
  const { user, customerProfile, authLoading, signOut } = useCustomerAuth()

  // Stati
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [dashboardData, setDashboardData] = useState({
    cliente: customerProfile || null, // Inizializza con customerProfile se disponibile
    referenti: [],
    macchinari: [],
    documenti: [],
    contratti: [],
    tickets: []
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
      // 🔧 FIX: Usa cliente_id invece di id (che è l'auth user id)
      const clienteId = customerProfile.cliente_id

      if (!clienteId) {
        console.error('❌ cliente_id non trovato in customerProfile:', customerProfile)
        throw new Error('ID cliente non disponibile')
      }

      console.log('📊 Caricamento dashboard per cliente:', clienteId)

      // 🎯 NON serve ricaricare i dati cliente - sono già in customerProfile dopo il fix del context!

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

      // Carica contratti
      const { data: contrattiData } = await supabase
        .from('contratti')
        .select('*')
        .eq('id_cliente', clienteId)
        .order('data_contratto', { ascending: false })
        .limit(5)

      // Carica tickets recenti
      const { data: ticketsData } = await supabase
        .from('tickets')
        .select('*')
        .eq('id_cliente', clienteId)
        .order('data_creazione', { ascending: false })
        .limit(5)

      setDashboardData({
        cliente: customerProfile, // 🔧 Usa direttamente customerProfile (già contiene tutti i dati)
        referenti: referentiData || [],
        macchinari: macchinariData || [],
        documenti: documentiData || [],
        contratti: contrattiData || [],
        tickets: ticketsData || []
      })
      
      console.log('✅ Dashboard caricata con successo:', {
        cliente: customerProfile.ragione_sociale,
        referenti: referentiData?.length || 0,
        macchinari: macchinariData?.length || 0,
        documenti: documentiData?.length || 0
      })
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

  const { cliente, referenti, macchinari, documenti, contratti, tickets } = dashboardData

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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
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
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-blue-600">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{user?.email}</p>
                  <p className="text-xs text-gray-500">Cliente</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Esci</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 sm:p-8 mb-8 text-white">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
            Benvenuto, {cliente?.ragione_sociale || 'Cliente'}!
          </h2>
          <p className="text-blue-100 mb-4">
            Gestisci la tua assistenza tecnica in un unico posto
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors">
              📞 Richiedi Assistenza
            </button>
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-400 transition-colors">
              📄 Vedi Contratti
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Card 1: Dati Azienda */}
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Dati Azienda</h3>
            <p className="text-2xl font-bold text-gray-900">Completi</p>
          </div>

          {/* Card 2: Referenti */}
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Referenti</h3>
            <p className="text-2xl font-bold text-gray-900">{referenti.length}</p>
          </div>

          {/* Card 3: Macchinari */}
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-amber-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Macchinari</h3>
            <p className="text-2xl font-bold text-gray-900">{macchinari.length}</p>
          </div>

          {/* Card 4: Documenti */}
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Documenti</h3>
            <p className="text-2xl font-bold text-gray-900">{documenti.length}</p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto">
              {[
                { id: 'overview', label: 'Panoramica', icon: Building2 },
                { id: 'referenti', label: 'Referenti', icon: Users },
                { id: 'macchinari', label: 'Macchinari', icon: Wrench },
                { id: 'documenti', label: 'Documenti', icon: FileText }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
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
                              {contratto.nome_contratto || `Contratto ${contratto.num_contratto}`}
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
                    <p className="text-gray-500">Nessun contratto attivo</p>
                  </div>
                )}
              </div>

              {/* Ticket Recenti */}
              <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Interventi Recenti
                  </h3>
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Vedi tutti →
                  </button>
                </div>
                {tickets.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left text-xs font-semibold text-gray-600 py-3 px-4">Ticket #</th>
                          <th className="text-left text-xs font-semibold text-gray-600 py-3 px-4">Tipo</th>
                          <th className="text-left text-xs font-semibold text-gray-600 py-3 px-4">Descrizione</th>
                          <th className="text-left text-xs font-semibold text-gray-600 py-3 px-4">Data</th>
                          <th className="text-left text-xs font-semibold text-gray-600 py-3 px-4">Stato</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tickets.map((ticket) => (
                          <tr key={ticket.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">
                              {ticket.num_ticket}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {ticket.tipo_intervento}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900">
                              {ticket.descrizione_breve || ticket.descrizione?.substring(0, 50)}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {new Date(ticket.data_creazione).toLocaleDateString('it-IT')}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`
                                px-2 py-1 text-xs font-medium rounded-full
                                ${ticket.stato === 'completato' ? 'bg-green-100 text-green-700' :
                                  ticket.stato === 'in_corso' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'}
                              `}>
                                {ticket.stato}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nessun intervento recente</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* REFERENTI TAB */}
          {activeTab === 'referenti' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Referenti Aziendali
                </h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Plus className="w-4 h-4" />
                  Aggiungi Referente
                </button>
              </div>
              {referenti.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {referenti.map((referente) => (
                    <div key={referente.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {referente.nome} {referente.cognome}
                            </h4>
                            <p className="text-sm text-gray-600">{referente.ruolo || 'Referente'}</p>
                          </div>
                        </div>
                        {referente.principale && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
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

          {/* MACCHINARI TAB */}
          {activeTab === 'macchinari' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Macchinari e Attrezzature
                </h3>
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
                        {macch.ubicazione && (
                          <div className="col-span-2">
                            <p className="text-gray-500">Ubicazione</p>
                            <p className="font-medium text-gray-900">{macch.ubicazione}</p>
                          </div>
                        )}
                      </div>
                      {macch.contratto_manutenzione && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Contratto Manutenzione Attivo
                          </span>
                        </div>
                      )}
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

          {/* DOCUMENTI TAB */}
          {activeTab === 'documenti' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Documenti e Contratti
                </h3>
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
                <a href="tel:+390123456789" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
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
    </div>
  )
}
