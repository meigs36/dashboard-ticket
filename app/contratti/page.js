'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Plus, Search, FileText, Calendar, Clock, AlertCircle, 
  Edit2, Trash2, Users, Package, Filter 
} from 'lucide-react'
import CreaContrattoModal from '@/components/CreaContrattoModal'
import AssegnaContrattoModal from '@/components/AssegnaContrattoModal'
import ModificaContrattoModal from '@/components/ModificaContrattoModal'

export default function ContrattiPage() {
  const { userProfile } = useAuth()
  const [contratti, setContratti] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroStato, setFiltroStato] = useState('tutti')
  const [showCreaModal, setShowCreaModal] = useState(false)
  const [showAssegnaModal, setShowAssegnaModal] = useState(false)
  const [showModificaModal, setShowModificaModal] = useState(false)
  const [contrattoSelezionato, setContrattoSelezionato] = useState(null)

  useEffect(() => {
    loadContratti()
  }, [])

  async function loadContratti() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('contratti')
        .select(`
          *,
          cliente:clienti!contratti_codice_cliente_fkey(
            codice_cliente,
            ragione_sociale,
            citta
          )
        `)
        .order('data_contratto', { ascending: false })

      if (error) throw error
      
      console.log('Contratti caricati:', data)
      setContratti(data || [])
    } catch (error) {
      console.error('Errore caricamento contratti:', error)
      alert('❌ Errore caricamento contratti')
    } finally {
      setLoading(false)
    }
  }

  const filteredContratti = contratti.filter((contratto) => {
    const matchSearch = 
      contratto.num_contratto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contratto.nome_contratto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contratto.cliente?.ragione_sociale?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contratto.tipo_contratto?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchStato = filtroStato === 'tutti' || contratto.stato === filtroStato

    return matchSearch && matchStato
  })

  async function handleEliminaContratto(contrattoId) {
    if (!confirm('Sei sicuro di voler eliminare questo contratto?\n\nATTENZIONE: Tutti gli interventi collegati verranno scollegati!')) {
      return
    }

    try {
      // Prima scollega gli interventi
      await supabase
        .from('interventi')
        .update({ contratto_id: null, is_cortesia: true, motivo_cortesia: 'Contratto eliminato' })
        .eq('contratto_id', contrattoId)

      // Poi elimina il contratto
      const { error } = await supabase
        .from('contratti')
        .delete()
        .eq('id', contrattoId)

      if (error) throw error

      alert('✅ Contratto eliminato')
      loadContratti()
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('❌ Errore: ' + error.message)
    }
  }

  function getStatoColor(stato) {
    switch (stato) {
      case 'attivo': return 'bg-green-100 text-green-800 border-green-200'
      case 'scaduto': return 'bg-red-100 text-red-800 border-red-200'
      case 'sospeso': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'rinnovato': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  function isInScadenza(dataScadenza) {
    if (!dataScadenza) return false
    const oggi = new Date()
    const scadenza = new Date(dataScadenza)
    const diffGiorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24))
    return diffGiorni > 0 && diffGiorni <= 30
  }

  function getOreWarning(oreRimanenti, oreIncluse) {
    if (!oreRimanenti || !oreIncluse) return ''
    const percentuale = (oreRimanenti / oreIncluse) * 100
    if (percentuale <= 10) return 'text-red-600 font-bold'
    if (percentuale <= 25) return 'text-orange-600 font-semibold'
    return 'text-green-600'
  }

  const stats = {
    totali: contratti.length,
    attivi: contratti.filter(c => c.stato === 'attivo').length,
    scaduti: contratti.filter(c => c.stato === 'scaduto').length,
    inScadenza: contratti.filter(c => c.stato === 'attivo' && isInScadenza(c.data_scadenza)).length,
    oreTotali: contratti.reduce((sum, c) => sum + parseFloat(c.ore_incluse || 0), 0),
    oreUtilizzate: contratti.reduce((sum, c) => sum + parseFloat(c.ore_utilizzate || 0), 0),
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600">Caricamento contratti...</p>
        </div>
      </div>
    )
  }

  // Solo admin può creare/modificare
  const isAdmin = userProfile?.ruolo === 'admin'

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestione Contratti</h1>
            <p className="text-gray-600">Crea e gestisci i contratti di assistenza</p>
          </div>
          {isAdmin && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowAssegnaModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Users size={18} />
                Assegna Contratto
              </button>
              <button
                onClick={() => setShowCreaModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus size={18} />
                Nuovo Contratto
              </button>
            </div>
          )}
        </div>

        {/* Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Totali</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totali}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Attivi</p>
            <p className="text-2xl font-bold text-green-600">{stats.attivi}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Scaduti</p>
            <p className="text-2xl font-bold text-red-600">{stats.scaduti}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">In Scadenza</p>
            <p className="text-2xl font-bold text-orange-600">{stats.inScadenza}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Ore Totali</p>
            <p className="text-2xl font-bold text-blue-600">{stats.oreTotali.toFixed(0)}h</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Ore Utilizzate</p>
            <p className="text-2xl font-bold text-purple-600">{stats.oreUtilizzate.toFixed(0)}h</p>
          </div>
        </div>

        {/* Filtri e Ricerca */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Ricerca */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Cerca per numero contratto, nome, cliente..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            </div>

            {/* Filtro Stato */}
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-400" />
              <select
                value={filtroStato}
                onChange={(e) => setFiltroStato(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="tutti">Tutti gli stati</option>
                <option value="attivo">Attivi</option>
                <option value="scaduto">Scaduti</option>
                <option value="sospeso">Sospesi</option>
                <option value="rinnovato">Rinnovati</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista Contratti */}
        <div className="space-y-4">
          {filteredContratti.map((contratto) => {
            const inScadenza = isInScadenza(contratto.data_scadenza)
            const oreWarning = getOreWarning(contratto.ore_rimanenti, contratto.ore_incluse)
            const percentualeOre = (contratto.ore_rimanenti / contratto.ore_incluse) * 100

            return (
              <div
                key={contratto.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  {/* Info Principale */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <FileText className="text-blue-600" size={24} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">
                            {contratto.nome_contratto || 'Contratto'}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatoColor(contratto.stato)}`}>
                            {contratto.stato}
                          </span>
                          {inScadenza && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-600 text-xs rounded-full border border-orange-200">
                              <AlertCircle size={12} />
                              In scadenza
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span className="font-mono font-semibold">#{contratto.num_contratto}</span>
                          {contratto.tipo_contratto && (
                            <span className="flex items-center gap-1">
                              <Package size={14} />
                              {contratto.tipo_contratto}
                            </span>
                          )}
                        </div>

                        {/* Cliente */}
                        {contratto.cliente && (
                          <div className="flex items-center gap-2 text-sm text-gray-700 mb-4">
                            <Users size={16} />
                            <span className="font-medium">{contratto.cliente.ragione_sociale}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500">Cod. {contratto.codice_cliente}</span>
                          </div>
                        )}

                        {/* Date */}
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            <span>Inizio: {new Date(contratto.data_contratto).toLocaleDateString('it-IT')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={14} />
                            <span>Scadenza: {new Date(contratto.data_scadenza).toLocaleDateString('it-IT')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ore */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Ore disponibili</span>
                        <span className={`text-lg font-bold ${oreWarning}`}>
                          {parseFloat(contratto.ore_rimanenti || 0).toFixed(1)}h / {parseFloat(contratto.ore_incluse || 0).toFixed(1)}h
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            percentualeOre <= 10 ? 'bg-red-500' :
                            percentualeOre <= 25 ? 'bg-orange-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.max(0, Math.min(100, percentualeOre))}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>{parseFloat(contratto.ore_utilizzate || 0).toFixed(1)}h utilizzate</span>
                        <span>{percentualeOre.toFixed(0)}% disponibili</span>
                      </div>
                    </div>

                    {/* Note */}
                    {contratto.note && (
                      <div className="mt-4 text-sm text-gray-600 bg-blue-50 rounded p-3">
                        <span className="font-medium">Note: </span>
                        {contratto.note}
                      </div>
                    )}
                  </div>

                  {/* Azioni */}
                  {isAdmin && (
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => {
                          setContrattoSelezionato(contratto)
                          setShowModificaModal(true)
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modifica"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleEliminaContratto(contratto.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Elimina"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredContratti.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500 mb-4">Nessun contratto trovato</p>
            {isAdmin && (
              <button
                onClick={() => setShowCreaModal(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Crea il primo contratto →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreaModal && (
        <CreaContrattoModal
          onClose={() => setShowCreaModal(false)}
          onSuccess={() => {
            setShowCreaModal(false)
            loadContratti()
          }}
        />
      )}

      {showAssegnaModal && (
        <AssegnaContrattoModal
          onClose={() => setShowAssegnaModal(false)}
          onSuccess={() => {
            setShowAssegnaModal(false)
            loadContratti()
          }}
        />
      )}

      {showModificaModal && contrattoSelezionato && (
        <ModificaContrattoModal
          contratto={contrattoSelezionato}
          onClose={() => {
            setShowModificaModal(false)
            setContrattoSelezionato(null)
          }}
          onSuccess={() => {
            setShowModificaModal(false)
            setContrattoSelezionato(null)
            loadContratti()
          }}
        />
      )}
    </div>
  )
}
