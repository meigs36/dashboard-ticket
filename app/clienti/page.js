'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Search,
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ShieldCheck,
  ShieldX,
  Copy,
  Check,
  Clock,
  HardDrive,
  FileText,
  Landmark,
  GitBranch,
  Fingerprint
} from 'lucide-react'
import toast from 'react-hot-toast'

// Componente Dropdown Email
function EmailDropdown({ emails }) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const validEmails = emails.filter(e => e.email)
  
  if (validEmails.length === 0) {
    return null
  }

  const handleEmailClick = (email, e) => {
    e.stopPropagation()
    e.preventDefault()
    window.location.href = `mailto:${email}`
  }

  const copyEmail = async (email, e) => {
    e.stopPropagation()
    e.preventDefault()
    await navigator.clipboard.writeText(email)
    setCopied(email)
    toast.success('Email copiata')
    setTimeout(() => setCopied(null), 2000)
  }

  if (validEmails.length === 1) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Mail size={16} className="text-blue-500 flex-shrink-0" />
        <span 
          onClick={(e) => handleEmailClick(validEmails[0].email, e)}
          className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        >
          {validEmails[0].email}
        </span>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setIsOpen(!isOpen)
        }}
        className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
      >
        <Mail size={16} className="text-blue-500 flex-shrink-0" />
        <span>{validEmails.length} email</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 min-w-[280px] py-1 animate-in fade-in slide-in-from-top-2 duration-200">
          {validEmails.map((item, index) => (
            <div 
              key={index}
              className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-between gap-2 group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
                  {item.label}
                </p>
                <span 
                  onClick={(e) => handleEmailClick(item.email, e)}
                  className="text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block cursor-pointer"
                >
                  {item.email}
                </span>
              </div>
              <button
                onClick={(e) => copyEmail(item.email, e)}
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Copia email"
              >
                {copied === item.email ? (
                  <Check size={14} className="text-green-600" />
                ) : (
                  <Copy size={14} className="text-gray-500" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Badge Sede/Filiale
function SedeFiliaBadge({ cliente }) {
  // È una filiale se ha indirizzo_operativo diverso da indirizzo
  const isFiliale = cliente.indirizzo_operativo &&
                    cliente.indirizzo_operativo !== cliente.indirizzo

  if (isFiliale) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <GitBranch size={14} className="text-orange-500" />
        <span className="font-medium text-orange-600 dark:text-orange-400">
          Filiale
        </span>
        {cliente.comune_operativo && (
          <span className="text-gray-500 dark:text-gray-400">
            • {cliente.comune_operativo}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Landmark size={14} className="text-blue-500" />
      <span className="font-medium text-blue-600 dark:text-blue-400">
        Sede
      </span>
    </div>
  )
}

// Badge Accesso Portale
function PortalBadge({ hasAccess, isActive }) {
  if (!hasAccess) {
    return (
      <span 
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
        title="Nessun accesso al portale"
      >
        <ShieldX size={12} />
        No Portale
      </span>
    )
  }

  if (isActive) {
    return (
      <span 
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
        title="Accesso portale attivo"
      >
        <ShieldCheck size={12} />
        Portale Attivo
      </span>
    )
  }

  return (
    <span 
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
      title="Accesso portale disattivato"
    >
      <ShieldX size={12} />
      Portale Disattivato
    </span>
  )
}

// Badge Consenso Accesso Remoto
function ConsensoBadge({ consensoData }) {
  if (!consensoData) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
        title="Consenso accesso remoto mancante"
      >
        <Fingerprint size={12} />
        Consenso mancante
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
      title={`Consenso firmato il ${new Date(consensoData.created_at).toLocaleDateString('it-IT')}`}
    >
      <Fingerprint size={12} />
      Consenso firmato
    </span>
  )
}

export default function ClientiPage() {
  const [clienti, setClienti] = useState([])
  const [portalUsers, setPortalUsers] = useState([])
  const [macchinariCount, setMacchinariCount] = useState({})
  const [contrattiData, setContrattiData] = useState({})
  const [consensiData, setConsensiData] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // Aspetta che Supabase abbia recuperato la sessione prima di fare query
    // Senza questo, dopo ⌘R le query partono prima che il token sia pronto
    supabase.auth.getSession().then(() => {
      loadData()
    })
  }, [])

  async function loadData() {
    try {
      setLoading(true)

      // Helper: carica tutti i record paginando per superare il limite 1000 di Supabase
      async function fetchAllPaginated(table, selectFields, orderField, filters) {
        let allData = []
        let offset = 0
        const pageSize = 1000
        let hasMore = true
        while (hasMore) {
          let query = supabase.from(table).select(selectFields)
          if (orderField) query = query.order(orderField.field, orderField.options || {})
          if (filters) filters.forEach(f => { query = query[f.method](f.column, f.value) })
          query = query.range(offset, offset + pageSize - 1)
          const { data, error } = await query
          if (error) throw error
          if (data && data.length > 0) {
            allData = [...allData, ...data]
            offset += pageSize
            hasMore = data.length === pageSize
          } else {
            hasMore = false
          }
        }
        return allData
      }

      // ⚡ Tutte le query in PARALLELO (prima erano sequenziali!)
      const [clientiData, usersData, macchinariCounts, contrattiList, consensiList] = await Promise.all([
        // 1. Clienti (paginato)
        fetchAllPaginated('clienti', '*', { field: 'ragione_sociale' }),

        // 2. Utenti portale
        supabase
          .from('customer_portal_users')
          .select('id, cliente_id, email, attivo')
          .then(({ data }) => data || [])
          .catch(() => []),

        // 3. Conteggio macchinari via RPC
        supabase.rpc('count_macchinari_per_cliente')
          .then(({ data }) => data || []),

        // 4. Contratti attivi
        supabase
          .from('contratti')
          .select('*')
          .eq('stato', 'attivo')
          .order('data_scadenza', { ascending: true })
          .then(({ data }) => data || []),

        // 5. Consensi accesso remoto
        supabase
          .from('consensi_accesso_remoto')
          .select('id, cliente_id, created_at, firmato_da_nome, revocato_il')
          .is('revocato_il', null)
          .order('created_at', { ascending: false })
          .then(({ data }) => data || [])
          .catch(() => [])
      ])

      // Processa i risultati (operazioni in memoria, istantanee)
      const macchinariPerCliente = {}
      macchinariCounts.forEach(r => {
        macchinariPerCliente[r.id_cliente] = r.count
      })

      const contrattiPerCliente = {}
      const contrattiCountPerCliente = {}
      contrattiList.forEach(c => {
        if (c.id_cliente) {
          if (!contrattiPerCliente[c.id_cliente]) contrattiPerCliente[c.id_cliente] = c
          contrattiCountPerCliente[c.id_cliente] = (contrattiCountPerCliente[c.id_cliente] || 0) + 1
        }
      })

      const consensiPerCliente = {}
      consensiList.forEach(c => {
        if (c.cliente_id && !consensiPerCliente[c.cliente_id]) {
          consensiPerCliente[c.cliente_id] = c
        }
      })

      setClienti(clientiData || [])
      setPortalUsers(usersData)
      setMacchinariCount(macchinariPerCliente)
      setConsensiData(consensiPerCliente)
      setContrattiData({
        contratti: contrattiPerCliente,
        count: contrattiCountPerCliente
      })

    } catch (error) {
      console.error('Errore caricamento:', error)
      toast.error('Errore caricamento clienti')
    } finally {
      setLoading(false)
    }
  }

  // Funzione per ottenere tutte le email di un cliente
  function getClienteEmails(cliente) {
    const emails = []
    if (cliente.email_principale) {
      emails.push({ label: 'Principale', email: cliente.email_principale })
    }
    if (cliente.email_amministrazione) {
      emails.push({ label: 'Amministrazione', email: cliente.email_amministrazione })
    }
    if (cliente.email_pec) {
      emails.push({ label: 'PEC', email: cliente.email_pec })
    }
    if (cliente.email_riparazioni) {
      emails.push({ label: 'Riparazioni', email: cliente.email_riparazioni })
    }
    if (cliente.email_referente) {
      emails.push({ label: 'Referente', email: cliente.email_referente })
    }
    return emails
  }

  // Funzione per verificare accesso portale
  function getPortalAccess(clienteId) {
    return portalUsers.find(u => u.cliente_id === clienteId)
  }

  // Handler per telefono (evita navigazione del Link)
  function handlePhoneClick(phone, e) {
    e.stopPropagation()
    e.preventDefault()
    window.location.href = `tel:${phone}`
  }

  // Filtra clienti
  const filteredClienti = clienti.filter(cliente => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase().trim()
    return (
      (cliente.ragione_sociale || '').toLowerCase().includes(term) ||
      (cliente.ragione_sociale_operativa || '').toLowerCase().includes(term) ||
      (cliente.codice_cliente || '').toLowerCase().includes(term) ||
      (cliente.comune || '').toLowerCase().includes(term) ||
      (cliente.comune_operativo || '').toLowerCase().includes(term) ||
      (cliente.email_principale || '').toLowerCase().includes(term) ||
      (cliente.indirizzo || '').toLowerCase().includes(term) ||
      (cliente.indirizzo_operativo || '').toLowerCase().includes(term) ||
      (cliente.provincia || '').toLowerCase().includes(term) ||
      (cliente.provincia_operativa || '').toLowerCase().includes(term) ||
      (cliente.telefono_principale || '').toLowerCase().includes(term)
    )
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Caricamento clienti...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Torna alla Dashboard</span>
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Clienti</h1>
              <p className="text-gray-600 dark:text-gray-400">{clienti.length} clienti totali</p>
            </div>
            <Link
              href="/admin/portal-access"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <ShieldCheck size={18} />
              Gestione Accessi Portale
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Cerca per ragione sociale, codice, città, indirizzo, email, telefono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
          </div>
          {searchTerm.trim() && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {filteredClienti.length} risultat{filteredClienti.length === 1 ? 'o' : 'i'} per "<span className="font-medium text-gray-700 dark:text-gray-300">{searchTerm.trim()}</span>"
            </p>
          )}
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
            {filteredClienti.map((cliente) => {
              const emails = getClienteEmails(cliente)
              const portalAccess = getPortalAccess(cliente.id)
              const numMacchinari = macchinariCount[cliente.id] || 0
              const numContratti = contrattiData.count?.[cliente.id] || 0
              const contrattoAttivo = contrattiData.contratti?.[cliente.id]
              const consensoCliente = consensiData[cliente.id] || null

              // Mostra in quale campo è stato trovato il match (se non ovvio)
              // Per le filiali, la card mostra comune_operativo, NON comune (sede legale)
              const isFiliale = cliente.indirizzo_operativo && cliente.indirizzo_operativo !== cliente.indirizzo
              let searchMatchInfo = null
              if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase().trim()
                // Campi effettivamente visibili nella card
                const visibleFields = [
                  cliente.ragione_sociale, cliente.codice_cliente, cliente.telefono_principale
                ]
                // Per le filiali si mostra comune_operativo, per le sedi si mostra comune
                if (isFiliale) {
                  visibleFields.push(cliente.comune_operativo)
                } else {
                  visibleFields.push(cliente.comune)
                }
                const isVisibleMatch = visibleFields.some(f => (f || '').toLowerCase().includes(term))

                if (!isVisibleMatch) {
                  // Match è in un campo non direttamente visibile nella card
                  const hiddenMatches = []
                  if ((cliente.ragione_sociale_operativa || '').toLowerCase().includes(term))
                    hiddenMatches.push(`Rag. sociale op.: ${cliente.ragione_sociale_operativa}`)
                  // Per filiali, comune (sede legale) non è visibile
                  if (isFiliale && (cliente.comune || '').toLowerCase().includes(term))
                    hiddenMatches.push(`Sede legale: ${cliente.comune}`)
                  // Per sedi, comune_operativo non è visibile
                  if (!isFiliale && (cliente.comune_operativo || '').toLowerCase().includes(term))
                    hiddenMatches.push(`Comune op.: ${cliente.comune_operativo}`)
                  if ((cliente.indirizzo || '').toLowerCase().includes(term))
                    hiddenMatches.push(`Indirizzo: ${cliente.indirizzo}`)
                  if ((cliente.indirizzo_operativo || '').toLowerCase().includes(term))
                    hiddenMatches.push(`Indirizzo op.: ${cliente.indirizzo_operativo}`)
                  if ((cliente.email_principale || '').toLowerCase().includes(term))
                    hiddenMatches.push(`Email: ${cliente.email_principale}`)
                  if ((cliente.provincia || '').toLowerCase().includes(term))
                    hiddenMatches.push(`Provincia: ${cliente.provincia}`)
                  if ((cliente.provincia_operativa || '').toLowerCase().includes(term))
                    hiddenMatches.push(`Provincia op.: ${cliente.provincia_operativa}`)
                  if (hiddenMatches.length > 0) {
                    searchMatchInfo = hiddenMatches[0]
                  }
                }
              }

              return (
                <Link
                  key={cliente.id}
                  href={`/clienti/${cliente.id}`}
                  className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-2 border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200"
                >
                  {/* Indicatore match ricerca */}
                  {searchMatchInfo && (
                    <div className="mb-3 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 truncate">
                        <Search size={12} className="inline mr-1" />
                        Trovato in: {searchMatchInfo}
                      </p>
                    </div>
                  )}
                  {/* Header Card */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {cliente.ragione_sociale}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Cod. {cliente.codice_cliente}
                      </p>
                      <SedeFiliaBadge cliente={cliente} />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {/* Badge Attivo/Inattivo */}
                      {cliente.attivo ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          Attivo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                          Inattivo
                        </span>
                      )}
                      {/* Badge Portale */}
                      <PortalBadge
                        hasAccess={!!portalAccess}
                        isActive={portalAccess?.attivo}
                      />
                      {/* Badge Consenso */}
                      <ConsensoBadge consensoData={consensoCliente} />
                      {/* Icona edificio */}
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Building2 className="text-blue-500 dark:text-blue-400" size={20} />
                      </div>
                    </div>
                  </div>

                  {/* Info Contatto */}
                  <div className="space-y-2 mb-4">
                    {/* Località - mostra sede operativa se filiale, altrimenti sede legale */}
                    {(() => {
                      const isFiliale = cliente.indirizzo_operativo && cliente.indirizzo_operativo !== cliente.indirizzo
                      const comuneDaMostrare = isFiliale ? cliente.comune_operativo : cliente.comune
                      const provinciaDaMostrare = isFiliale ? cliente.provincia_operativa : cliente.provincia

                      return comuneDaMostrare && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                          <span>{comuneDaMostrare.toUpperCase()} {provinciaDaMostrare && `(${provinciaDaMostrare})`}</span>
                        </div>
                      )
                    })()}
                    
                    {/* Telefono - usa span invece di a per evitare nesting */}
                    {cliente.telefono_principale && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone size={16} className="text-green-500 flex-shrink-0" />
                        <span 
                          onClick={(e) => handlePhoneClick(cliente.telefono_principale, e)}
                          className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                        >
                          {cliente.telefono_principale}
                        </span>
                      </div>
                    )}

                    {/* Email */}
                    <EmailDropdown emails={emails} />
                  </div>

                  {/* Box Macchinari e Contratti */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* Box Macchinari */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <HardDrive size={16} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                          Macchinari
                        </span>
                      </div>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {numMacchinari}
                      </p>
                    </div>

                    {/* Box Contratti */}
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText size={16} className="text-green-600 dark:text-green-400" />
                        <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
                          Contratti
                        </span>
                      </div>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {numContratti}
                      </p>
                    </div>
                  </div>

                  {/* Riga Contratto Attivo */}
                  {contrattoAttivo && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-green-700 dark:text-green-400 text-sm truncate">
                          {contrattoAttivo.nome_contratto || contrattoAttivo.tipo_contratto || 'Contratto'}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                          {contrattoAttivo.num_contratto}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-gray-800 rounded-full border border-green-200 dark:border-green-700">
                        <Clock size={14} className="text-green-600 dark:text-green-400" />
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                          {contrattoAttivo.ore_rimanenti ?? contrattoAttivo.ore_incluse}h
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Footer senza contratto */}
                  {!contrattoAttivo && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        cliente.tipo_contratto === 'premium' 
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' 
                          : cliente.tipo_contratto === 'enterprise'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {cliente.tipo_contratto || 'standard'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        SLA: {cliente.livello_sla || '48h'}
                      </span>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
