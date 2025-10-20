'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, ArrowLeft, Phone, Mail, MapPin } from 'lucide-react'
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
      const { data, error } = await supabase
        .from('clienti')
        .select(`
          *,
          macchinari(count)
        `)
        .order('ragione_sociale', { ascending: true })

      if (error) throw error
      setClienti(data || [])
    } catch (error) {
      console.error('Errore caricamento clienti:', error)
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento clienti...</p>
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
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Torna alla Dashboard</span>
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Clienti</h1>
          <p className="text-gray-600">{clienti.length} clienti totali</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Cerca per ragione sociale, codice cliente, città..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
          </div>
        </div>

        {/* Clienti Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClienti.map((cliente) => (
            <Link
              key={cliente.id}
              href={`/clienti/${cliente.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              {/* Header Card */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">
                    {cliente.ragione_sociale}
                  </h3>
                  <span className="text-sm text-gray-500">
                    Cod. {cliente.codice_cliente}
                  </span>
                </div>
                {cliente.attivo ? (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Attivo
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                    Inattivo
                  </span>
                )}
              </div>

              {/* Contatti */}
              <div className="space-y-2 mb-4">
                {cliente.telefono_principale && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={16} />
                    <span>{cliente.telefono_principale}</span>
                  </div>
                )}
                {cliente.email_riparazioni && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={16} />
                    <span className="truncate">{cliente.email_riparazioni}</span>
                  </div>
                )}
                {cliente.citta && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin size={16} />
                    <span>{cliente.citta} ({cliente.provincia})</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {cliente.macchinari?.[0]?.count || 0} macchinari
                  </span>
                  <span className="text-blue-600 font-medium">
                    Dettagli →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {filteredClienti.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Search className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nessun cliente trovato
            </h3>
            <p className="text-gray-600">
              Prova a modificare i termini di ricerca
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
