'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, ArrowLeft, Phone, Mail, MapPin, HardDrive, FileText, Clock } from 'lucide-react'
import Link from 'next/link'

export default function ClientiPage() {
  const [clienti, setClienti] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadClienti()
  }, [])

  async function loadClienti() {
    try {
      // Carica clienti
      const { data: clientiData, error: clientiError } = await supabase
        .from('clienti')
        .select('*')
        .order('ragione_sociale', { ascending: true })

      if (clientiError) {
        console.error('Errore Supabase clienti:', clientiError)
        throw clientiError
      }

      // Per ogni cliente, carica macchinari e contratti
      const clientiConDettagli = await Promise.all(
        (clientiData || []).map(async (cliente) => {
          // Conta macchinari
          const { count: macchinariCount } = await supabase
            .from('macchinari')
            .select('*', { count: 'exact', head: true })
            .eq('id_cliente', cliente.id)

          // Carica contratti attivi
          const { data: contratti } = await supabase
            .from('contratti')
            .select('id, num_contratto, tipo_contratto, nome_contratto, stato, ore_rimanenti')
            .eq('codice_cliente', cliente.codice_cliente)
            .eq('stato', 'attivo')

          return {
            ...cliente,
            num_macchinari: macchinariCount || 0,
            contratti: contratti || []
          }
        })
      )
      
      console.log('✅ Clienti caricati:', clientiConDettagli.length)
      setClienti(clientiConDettagli)
    } catch (error) {
      console.error('❌ Errore caricamento clienti:', error)
      setClienti([])
    } finally {
      setLoading(false)
    }
  }

  const filteredClienti = clienti.filter(c =>
    c.ragione_sociale?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.codice_cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.citta?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Caricamento clienti...</p>
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
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Torna alla Dashboard</span>
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Clienti</h1>
          <p className="text-gray-600 dark:text-gray-400">{clienti.length} clienti totali</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Cerca per ragione sociale, codice cliente o città..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
          </div>
        </div>

        {/* Clienti Grid */}
        {filteredClienti.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Search className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Nessun cliente trovato</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Prova con un altro termine di ricerca' : 'Non ci sono clienti nel database'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClienti.map((cliente) => (
              <Link
                key={cliente.id}
                href={`/clienti/${cliente.id}`}
                className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200"
              >
                {/* Header Card */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {cliente.ragione_sociale}
                    </h3>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Cod. {cliente.codice_cliente}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                    cliente.attivo 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-700' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                  }`}>
                    {cliente.attivo ? '● Attivo' : '○ Non attivo'}
                  </span>
                </div>

                {/* Info Contatti */}
                <div className="space-y-2.5 mb-4">
                  {cliente.citta && (
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <MapPin size={16} className="text-blue-500 dark:text-blue-400 flex-shrink-0" />
                      <span className="font-medium">{cliente.citta}</span>
                      {cliente.provincia && (
                        <span className="text-gray-500 dark:text-gray-400">({cliente.provincia})</span>
                      )}
                    </div>
                  )}
                  
                  {cliente.telefono_principale && (
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Phone size={16} className="text-green-500 dark:text-green-400 flex-shrink-0" />
                      <span className="font-medium">{cliente.telefono_principale}</span>
                    </div>
                  )}
                  
                  {cliente.email_riparazioni && (
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Mail size={16} className="text-purple-500 dark:text-purple-400 flex-shrink-0" />
                      <span className="truncate font-medium">{cliente.email_riparazioni}</span>
                    </div>
                  )}
                </div>

                {/* Stats Macchinari e Contratti */}
                <div className="pt-4 border-t-2 border-gray-100 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {/* Macchinari */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-1">
                        <HardDrive size={18} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Macchinari</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                        {cliente.num_macchinari || 0}
                      </div>
                    </div>

                    {/* Contratti */}
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-100 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText size={18} className="text-green-600 dark:text-green-400" />
                        <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase">Contratti</span>
                      </div>
                      <div className="text-2xl font-bold text-green-900 dark:text-green-300">
                        {cliente.contratti?.length || 0}
                      </div>
                    </div>
                  </div>

                  {/* Badge Contratti Attivi */}
                  {cliente.contratti && cliente.contratti.length > 0 && (
                    <div className="space-y-2">
                      {cliente.contratti.slice(0, 2).map((contratto) => (
                        <div 
                          key={contratto.id}
                          className="flex items-center justify-between bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700 rounded-lg px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-green-800 dark:text-green-300">
                              {contratto.nome_contratto || contratto.tipo_contratto || 'N/D'}
                            </span>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {contratto.num_contratto}
                            </span>
                          </div>
                          {contratto.ore_rimanenti !== null && (
                            <div className="flex items-center gap-1 bg-white dark:bg-gray-700 px-2 py-0.5 rounded-full border border-green-300 dark:border-green-600">
                              <Clock size={12} className="text-green-600 dark:text-green-400" />
                              <span className="text-xs font-bold text-green-700 dark:text-green-300">
                                {contratto.ore_rimanenti}h
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {cliente.contratti.length > 2 && (
                        <div className="text-center">
                          <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-full border border-gray-300 dark:border-gray-600">
                            +{cliente.contratti.length - 2} altri contratti
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Nessun contratto */}
                  {(!cliente.contratti || cliente.contratti.length === 0) && (
                    <div className="text-center py-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400 italic">Nessun contratto attivo</span>
                    </div>
                  )}
                </div>

                {/* Note Interne (se presenti) */}
                {cliente.note_interne && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic line-clamp-2">
                      💡 {cliente.note_interne}
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
