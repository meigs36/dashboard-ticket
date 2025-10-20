'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Phone, Mail, MapPin, HardDrive, Calendar, Shield, Ticket, Clock } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function ClienteDettaglio() {
  const params = useParams()
  const [cliente, setCliente] = useState(null)
  const [macchinari, setMacchinari] = useState([])
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('macchinari') // macchinari | ticket

  useEffect(() => {
    if (params.id) {
      loadCliente()
    }
  }, [params.id])

  async function loadCliente() {
    try {
      // Carica cliente
      const { data: clienteData, error: clienteError } = await supabase
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

      // Carica ticket
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('ticket')
        .select(`
          *,
          macchinari(tipo_macchinario, numero_seriale)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!cliente) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cliente non trovato</h2>
          <Link href="/clienti" className="text-blue-600 hover:text-blue-700">
            ← Torna ai clienti
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/clienti"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Torna ai Clienti</span>
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {cliente.ragione_sociale}
              </h1>
              <p className="text-gray-600">Codice Cliente: {cliente.codice_cliente}</p>
            </div>
            <div className="flex gap-3">
              {cliente.attivo ? (
                <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full font-medium">
                  ✓ Attivo
                </span>
              ) : (
                <span className="px-4 py-2 bg-gray-100 text-gray-800 rounded-full font-medium">
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Macchinari</p>
                <p className="text-3xl font-bold text-gray-900">{macchinari.length}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <HardDrive className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ticket Totali</p>
                <p className="text-3xl font-bold text-gray-900">{tickets.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Ticket className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ticket Aperti</p>
                <p className="text-3xl font-bold text-gray-900">
                  {tickets.filter(t => ['aperto', 'assegnato', 'in_lavorazione'].includes(t.stato)).length}
                </p>
              </div>
              <div className="bg-amber-100 p-3 rounded-lg">
                <Clock className="text-amber-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info Cliente */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Informazioni</h2>
              
              <div className="space-y-4">
                {/* Contatti */}
                {cliente.telefono_principale && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Phone size={16} />
                      <span className="font-medium">Telefono</span>
                    </div>
                    <p className="text-gray-900">{cliente.telefono_principale}</p>
                  </div>
                )}

                {cliente.email_riparazioni && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Mail size={16} />
                      <span className="font-medium">Email</span>
                    </div>
                    <p className="text-gray-900 break-all">{cliente.email_riparazioni}</p>
                  </div>
                )}

                {/* Indirizzo */}
                {cliente.via && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <MapPin size={16} />
                      <span className="font-medium">Indirizzo</span>
                    </div>
                    <p className="text-gray-900">
                      {cliente.via}<br />
                      {cliente.cap} {cliente.citta} ({cliente.provincia})
                    </p>
                  </div>
                )}

                {/* Contratto */}
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Shield size={16} />
                    <span className="font-medium">Contratto</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded capitalize">
                      {cliente.tipo_contratto}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded">
                      SLA: {cliente.livello_sla}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Macchinari e Ticket */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white rounded-t-xl shadow-sm border border-gray-200 border-b-0">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('macchinari')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeTab === 'macchinari'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <HardDrive size={18} />
                    <span>Macchinari ({macchinari.length})</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('ticket')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeTab === 'ticket'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Ticket size={18} />
                    <span>Ticket ({tickets.length})</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 p-6">
              {/* Tab Macchinari */}
              {activeTab === 'macchinari' && (
                <>
                  {macchinari.length > 0 ? (
                    <div className="space-y-4">
                      {macchinari.map((macchinario) => (
                        <div 
                          key={macchinario.id}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-bold text-gray-900">
                                {macchinario.tipo_macchinario}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {macchinario.marca} - {macchinario.modello}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              macchinario.stato === 'attivo' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {macchinario.stato.toUpperCase()}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Matricola:</span>
                              <p className="font-mono text-gray-900">{macchinario.numero_seriale}</p>
                            </div>
                            {macchinario.data_installazione && (
                              <div>
                                <span className="text-gray-500">Installazione:</span>
                                <p className="text-gray-900">
                                  {new Date(macchinario.data_installazione).toLocaleDateString('it-IT')}
                                </p>
                              </div>
                            )}
                            {macchinario.garanzia_scadenza && (
                              <div>
                                <span className="text-gray-500">Garanzia:</span>
                                <p className="text-gray-900">
                                  {new Date(macchinario.garanzia_scadenza).toLocaleDateString('it-IT')}
                                </p>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-500">Manutenzione:</span>
                              <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                macchinario.contratto_manutenzione === 'attivo'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {macchinario.contratto_manutenzione}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <HardDrive className="mx-auto text-gray-400 mb-4" size={48} />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Nessun macchinario
                      </h3>
                      <p className="text-gray-600">
                        Questo cliente non ha ancora macchinari registrati
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Tab Ticket */}
              {activeTab === 'ticket' && (
                <>
                  {tickets.length > 0 ? (
                    <div className="space-y-4">
                      {tickets.map((ticket) => (
                        <div 
                          key={ticket.id}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-mono text-sm font-semibold text-blue-600">
                                  {ticket.numero_ticket}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getPrioritaBadge(ticket.priorita)}`}>
                                  {ticket.priorita.toUpperCase()}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatoBadge(ticket.stato)}`}>
                                  {ticket.stato.replace('_', ' ').toUpperCase()}
                                </span>
                              </div>
                              
                              <h4 className="font-bold text-gray-900 mb-1">
                                {ticket.oggetto}
                              </h4>
                              
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {ticket.descrizione}
                              </p>

                              {ticket.macchinari && (
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <HardDrive size={14} />
                                  <span>{ticket.macchinari.tipo_macchinario} (SN: {ticket.macchinari.numero_seriale})</span>
                                </div>
                              )}
                            </div>

                            <div className="text-right text-xs text-gray-500 ml-4">
                              <div className="flex items-center gap-1 mb-1">
                                <Clock size={12} />
                                <span>{new Date(ticket.data_apertura).toLocaleDateString('it-IT')}</span>
                              </div>
                              <span>{new Date(ticket.data_apertura).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Ticket className="mx-auto text-gray-400 mb-4" size={48} />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Nessun ticket
                      </h3>
                      <p className="text-gray-600 mb-4">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}