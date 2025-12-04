'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import { 
  ArrowLeft, 
  Users, 
  UserPlus, 
  Search, 
  Shield, 
  ShieldCheck,
  ShieldX,
  Mail,
  Phone,
  Building2,
  Key,
  Copy,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Calendar,
  Clock
} from 'lucide-react'
import Link from 'next/link'

export default function PortalAccessPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [clienti, setClienti] = useState([])
  const [portalUsers, setPortalUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all') // all, with-access, without-access
  const [showModal, setShowModal] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState(null)
  const [creating, setCreating] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Form nuovo accesso
  const [formData, setFormData] = useState({
    email: '',
    nome: '',
    cognome: '',
    ruolo_aziendale: 'Titolare',
    telefono: '',
    inviaEmail: true
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      
      // Carica clienti
      const { data: clientiData, error: clientiError } = await supabase
        .from('clienti')
        .select('*')
        .eq('attivo', true)
        .order('ragione_sociale')
      
      if (clientiError) throw clientiError
      
      // Carica utenti portale
      const { data: usersData, error: usersError } = await supabase
        .from('customer_portal_users')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (usersError) throw usersError
      
      setClienti(clientiData || [])
      setPortalUsers(usersData || [])
      
    } catch (error) {
      console.error('Errore caricamento:', error)
      toast.error('Errore caricamento dati')
    } finally {
      setLoading(false)
    }
  }

  // Funzione per verificare se un cliente ha accesso portale
  function getPortalAccess(clienteId) {
    return portalUsers.find(u => u.cliente_id === clienteId)
  }

  // Genera password sicura
  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
    return Array.from({ length: 12 }, () => 
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
  }

  // Apri modal per creare accesso
  function openCreateModal(cliente) {
    setSelectedCliente(cliente)
    setFormData({
      email: cliente.email_principale || cliente.email_referente || '',
      nome: cliente.contatto_referente_nome?.split(' ')[0] || '',
      cognome: cliente.contatto_referente_nome?.split(' ').slice(1).join(' ') || '',
      ruolo_aziendale: 'Titolare',
      telefono: cliente.telefono_referente || cliente.telefono_principale || '',
      inviaEmail: true
    })
    setGeneratedPassword(generatePassword())
    setShowModal(true)
  }

  // Crea accesso portale
  async function handleCreateAccess(e) {
    e.preventDefault()
    
    if (!formData.email) {
      toast.error('Email obbligatoria')
      return
    }

    try {
      setCreating(true)

      // Chiama API per creare utente
      const response = await fetch('/api/portal-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: selectedCliente.id,
          email: formData.email,
          password: generatedPassword,
          nome: formData.nome,
          cognome: formData.cognome,
          ruolo_aziendale: formData.ruolo_aziendale,
          telefono: formData.telefono,
          inviaEmail: formData.inviaEmail
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Errore creazione accesso')
      }

      toast.success('Accesso portale creato con successo!')
      
      // Copia credenziali negli appunti
      const credenziali = `Email: ${formData.email}\nPassword: ${generatedPassword}`
      navigator.clipboard.writeText(credenziali)
      toast.success('Credenziali copiate negli appunti', { icon: '📋' })

      setShowModal(false)
      loadData() // Ricarica dati

    } catch (error) {
      console.error('Errore creazione:', error)
      toast.error(error.message)
    } finally {
      setCreating(false)
    }
  }

  // Disattiva accesso
  async function handleToggleAccess(portalUser, attivo) {
    try {
      const { error } = await supabase
        .from('customer_portal_users')
        .update({ attivo: !attivo })
        .eq('id', portalUser.id)

      if (error) throw error

      toast.success(attivo ? 'Accesso disattivato' : 'Accesso riattivato')
      loadData()

    } catch (error) {
      console.error('Errore toggle:', error)
      toast.error('Errore aggiornamento')
    }
  }

  // Reset password
  async function handleResetPassword(portalUser) {
    const newPassword = generatePassword()
    
    try {
      // Chiama API per reset
      const response = await fetch('/api/portal-access/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: portalUser.id,
          newPassword
        })
      })

      if (!response.ok) {
        throw new Error('Errore reset password')
      }

      // Copia nuova password
      navigator.clipboard.writeText(newPassword)
      toast.success(`Password resettata e copiata: ${newPassword}`, { 
        duration: 8000,
        icon: '🔑'
      })

    } catch (error) {
      console.error('Errore reset:', error)
      toast.error('Errore reset password')
    }
  }

  // Filtra clienti
  const filteredClienti = clienti.filter(cliente => {
    const matchSearch = 
      cliente.ragione_sociale?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.codice_cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.email_principale?.toLowerCase().includes(searchTerm.toLowerCase())

    const hasAccess = getPortalAccess(cliente.id)

    if (filter === 'with-access') return matchSearch && hasAccess
    if (filter === 'without-access') return matchSearch && !hasAccess
    return matchSearch
  })

  // Stats
  const stats = {
    totali: clienti.length,
    conAccesso: portalUsers.filter(u => u.attivo).length,
    senzaAccesso: clienti.length - portalUsers.length
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Torna alla Dashboard</span>
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Shield className="text-blue-600" />
                Gestione Accessi Portale
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Crea e gestisci gli accessi dei clienti al portale
              </p>
            </div>
            
            <button
              onClick={loadData}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Users className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totali}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Clienti Totali</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <ShieldCheck className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.conAccesso}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Con Accesso Attivo</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                <ShieldX className="text-orange-600 dark:text-orange-400" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.senzaAccesso}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Senza Accesso</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtri e Ricerca */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Ricerca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Cerca per nome, codice o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filtro stato */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Tutti
              </button>
              <button
                onClick={() => setFilter('with-access')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  filter === 'with-access' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <ShieldCheck size={18} />
                Con Accesso
              </button>
              <button
                onClick={() => setFilter('without-access')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  filter === 'without-access' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <ShieldX size={18} />
                Senza Accesso
              </button>
            </div>
          </div>
        </div>

        {/* Lista Clienti */}
        <div className="space-y-3">
          {filteredClienti.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
              <Search className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Nessun risultato</h3>
              <p className="text-gray-600 dark:text-gray-400">Prova con altri criteri di ricerca</p>
            </div>
          ) : (
            filteredClienti.map((cliente) => {
              const portalAccess = getPortalAccess(cliente.id)
              
              return (
                <div 
                  key={cliente.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Info Cliente */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-xl ${
                        portalAccess?.attivo 
                          ? 'bg-green-100 dark:bg-green-900/30' 
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        {portalAccess?.attivo ? (
                          <ShieldCheck className="text-green-600 dark:text-green-400" size={24} />
                        ) : (
                          <ShieldX className="text-gray-400" size={24} />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {cliente.ragione_sociale}
                          </h3>
                          <span className="text-sm font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                            {cliente.codice_cliente}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                          {cliente.email_principale && (
                            <span className="flex items-center gap-1">
                              <Mail size={14} />
                              {cliente.email_principale}
                            </span>
                          )}
                          {cliente.telefono_principale && (
                            <span className="flex items-center gap-1">
                              <Phone size={14} />
                              {cliente.telefono_principale}
                            </span>
                          )}
                          {cliente.citta && (
                            <span className="flex items-center gap-1">
                              <Building2 size={14} />
                              {cliente.citta}
                            </span>
                          )}
                        </div>

                        {/* Info accesso esistente */}
                        {portalAccess && (
                          <div className="mt-2 text-sm">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                              portalAccess.attivo 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              {portalAccess.attivo ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                              {portalAccess.email}
                            </span>
                            <span className="ml-3 text-gray-500 dark:text-gray-400">
                              <Clock size={14} className="inline mr-1" />
                              Creato: {new Date(portalAccess.created_at).toLocaleDateString('it-IT')}
                            </span>
                            {portalAccess.ultimo_accesso && (
                              <span className="ml-3 text-gray-500 dark:text-gray-400">
                                Ultimo login: {new Date(portalAccess.ultimo_accesso).toLocaleDateString('it-IT')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Azioni */}
                    <div className="flex items-center gap-2">
                      {portalAccess ? (
                        <>
                          <button
                            onClick={() => handleResetPassword(portalAccess)}
                            className="px-3 py-2 text-sm font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors flex items-center gap-1.5"
                          >
                            <Key size={16} />
                            Reset Password
                          </button>
                          <button
                            onClick={() => handleToggleAccess(portalAccess, portalAccess.attivo)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                              portalAccess.attivo
                                ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                                : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                            }`}
                          >
                            {portalAccess.attivo ? (
                              <>
                                <XCircle size={16} />
                                Disattiva
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={16} />
                                Riattiva
                              </>
                            )}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => openCreateModal(cliente)}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <UserPlus size={16} />
                          Crea Accesso
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal Creazione Accesso */}
      {showModal && selectedCliente && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserPlus className="text-blue-600" />
                Crea Accesso Portale
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {selectedCliente.ragione_sociale}
              </p>
            </div>

            <form onSubmit={handleCreateAccess} className="p-6 space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email di accesso *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Nome e Cognome */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cognome
                  </label>
                  <input
                    type="text"
                    value={formData.cognome}
                    onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Ruolo e Telefono */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ruolo aziendale
                  </label>
                  <select
                    value={formData.ruolo_aziendale}
                    onChange={(e) => setFormData({ ...formData, ruolo_aziendale: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Titolare">Titolare</option>
                    <option value="Responsabile">Responsabile</option>
                    <option value="Assistente">Assistente</option>
                    <option value="Amministrazione">Amministrazione</option>
                    <option value="Tecnico">Tecnico</option>
                    <option value="Altro">Altro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Telefono
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Password generata */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password generata
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={generatedPassword}
                      readOnly
                      className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setGeneratedPassword(generatePassword())
                      toast.success('Nuova password generata')
                    }}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Rigenera password"
                  >
                    <RefreshCw size={18} className="text-gray-600 dark:text-gray-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPassword)
                      toast.success('Password copiata')
                    }}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Copia password"
                  >
                    <Copy size={18} className="text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Checkbox invio email */}
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <input
                  type="checkbox"
                  id="inviaEmail"
                  checked={formData.inviaEmail}
                  onChange={(e) => setFormData({ ...formData, inviaEmail: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="inviaEmail" className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Send size={16} className="text-blue-600" />
                  Invia email di benvenuto con credenziali
                </label>
              </div>

              {/* Bottoni */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Creazione...
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      Crea Accesso
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
