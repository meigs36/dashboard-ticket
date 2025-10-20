'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { ArrowLeft, Search, UserPlus, Edit2, Trash2, Shield, User, Mail, Phone, Calendar, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

function UtentiPage() {
  const { userProfile } = useAuth()
  const [utenti, setUtenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroRuolo, setFiltroRuolo] = useState('tutti')
  const [filtroStato, setFiltroStato] = useState('tutti')
  const [mostraModal, setMostraModal] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' o 'edit'
  const [utenteSelezionato, setUtenteSelezionato] = useState(null)

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nome: '',
    cognome: '',
    ruolo: 'tecnico',
    attivo: true
  })

  useEffect(() => {
    loadUtenti()
  }, [])

  async function loadUtenti() {
    try {
      const { data, error } = await supabase
        .from('utenti')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUtenti(data || [])
    } catch (error) {
      console.error('Errore caricamento utenti:', error)
    } finally {
      setLoading(false)
    }
  }

  const utentiFiltrati = utenti.filter(utente => {
    const matchSearch = 
      utente.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      utente.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      utente.cognome?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchRuolo = filtroRuolo === 'tutti' || utente.ruolo === filtroRuolo
    const matchStato = filtroStato === 'tutti' || 
      (filtroStato === 'attivo' && utente.attivo) ||
      (filtroStato === 'inattivo' && !utente.attivo)
    
    return matchSearch && matchRuolo && matchStato
  })

  function handleNuovoUtente() {
    setModalMode('create')
    setUtenteSelezionato(null)
    setFormData({
      email: '',
      password: '',
      nome: '',
      cognome: '',
      ruolo: 'tecnico',
      attivo: true
    })
    setMostraModal(true)
  }

  function handleModificaUtente(utente) {
    setModalMode('edit')
    setUtenteSelezionato(utente)
    setFormData({
      email: utente.email,
      password: '',
      nome: utente.nome,
      cognome: utente.cognome,
      ruolo: utente.ruolo,
      attivo: utente.attivo
    })
    setMostraModal(true)
  }

  async function handleSalvaUtente(e) {
    e.preventDefault()
    setLoading(true)

    try {
      if (modalMode === 'create') {
        // Crea nuovo utente
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password
        })

        if (authError) throw authError

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('utenti')
            .insert({
              id: authData.user.id,
              email: formData.email,
              nome: formData.nome,
              cognome: formData.cognome,
              ruolo: formData.ruolo,
              attivo: formData.attivo
            })

          if (profileError) throw profileError
        }

        alert('✅ Utente creato con successo!')
      } else {
        // Modifica utente esistente
        const { error } = await supabase
          .from('utenti')
          .update({
            nome: formData.nome,
            cognome: formData.cognome,
            ruolo: formData.ruolo,
            attivo: formData.attivo
          })
          .eq('id', utenteSelezionato.id)

        if (error) throw error

        // Se c'è una nuova password, aggiornala
        if (formData.password) {
          // Nota: questo richiede privilegi admin
          alert('⚠️ Per cambiare la password, l\'utente deve usare il reset password')
        }

        alert('✅ Utente aggiornato con successo!')
      }

      setMostraModal(false)
      loadUtenti()
    } catch (error) {
      console.error('Errore salvataggio utente:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleEliminaUtente(utente) {
    if (!confirm(`Sei sicuro di voler eliminare l'utente ${utente.nome} ${utente.cognome}?`)) {
      return
    }

    try {
      // Nota: questo eliminerà anche l'utente da auth.users grazie al ON DELETE CASCADE
      const { error } = await supabase
        .from('utenti')
        .delete()
        .eq('id', utente.id)

      if (error) throw error

      alert('✅ Utente eliminato!')
      loadUtenti()
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('❌ Errore: ' + error.message)
    }
  }

  async function handleToggleStato(utente) {
    try {
      const { error } = await supabase
        .from('utenti')
        .update({ attivo: !utente.attivo })
        .eq('id', utente.id)

      if (error) throw error

      alert(`✅ Utente ${!utente.attivo ? 'attivato' : 'disattivato'}!`)
      loadUtenti()
    } catch (error) {
      console.error('Errore toggle stato:', error)
      alert('❌ Errore: ' + error.message)
    }
  }

  const stats = {
    totali: utenti.length,
    admin: utenti.filter(u => u.ruolo === 'admin').length,
    tecnici: utenti.filter(u => u.ruolo === 'tecnico').length,
    attivi: utenti.filter(u => u.attivo).length
  }

  if (loading && utenti.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Caricamento utenti...</p>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Gestione Utenti</h1>
              <p className="text-gray-600 dark:text-gray-400">{stats.totali} utenti totali</p>
            </div>
            <button
              onClick={handleNuovoUtente}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg"
            >
              <UserPlus size={20} />
              <span>Nuovo Utente</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <User className="text-blue-600" size={24} />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totali}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Totali</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <Shield className="text-purple-600" size={24} />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.admin}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Amministratori</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <User className="text-green-600" size={24} />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.tecnici}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Tecnici</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="text-green-600" size={24} />
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.attivi}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Attivi</p>
          </div>
        </div>

        {/* Filtri */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[300px] relative">
              <input
                type="text"
                placeholder="Cerca per nome, cognome o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
            </div>
            
            <select
              value={filtroRuolo}
              onChange={(e) => setFiltroRuolo(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="tutti">Tutti i ruoli</option>
              <option value="admin">Amministratori</option>
              <option value="tecnico">Tecnici</option>
            </select>

            <select
              value={filtroStato}
              onChange={(e) => setFiltroStato(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="tutti">Tutti gli stati</option>
              <option value="attivo">Solo attivi</option>
              <option value="inattivo">Solo inattivi</option>
            </select>
          </div>
        </div>

        {/* Tabella Utenti */}
        {utentiFiltrati.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Utente</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Email</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Ruolo</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Stato</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Creato</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {utentiFiltrati.map((utente) => (
                    <tr key={utente.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {utente.nome[0]}{utente.cognome[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {utente.nome} {utente.cognome}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{utente.email}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          utente.ruolo === 'admin' 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' 
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {utente.ruolo === 'admin' ? '👑 Admin' : '🔧 Tecnico'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleToggleStato(utente)}
                          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                            utente.attivo 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {utente.attivo ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          {utente.attivo ? 'Attivo' : 'Inattivo'}
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(utente.created_at).toLocaleDateString('it-IT')}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleModificaUtente(utente)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Modifica"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleEliminaUtente(utente)}
                            disabled={utente.id === userProfile.id}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={utente.id === userProfile.id ? 'Non puoi eliminare te stesso' : 'Elimina'}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <User className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Nessun utente trovato
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Modifica i filtri di ricerca o crea un nuovo utente
            </p>
          </div>
        )}
      </div>

      {/* Modal Crea/Modifica Utente */}
      {mostraModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {modalMode === 'create' ? 'Nuovo Utente' : 'Modifica Utente'}
            </h2>

            <form onSubmit={handleSalvaUtente} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cognome *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cognome}
                    onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  disabled={modalMode === 'edit'}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  placeholder="es: mario.rossi@example.com"
                />
                {modalMode === 'create' && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    💡 Usa domini validi: @gmail.com, @example.com, @test.it
                  </p>
                )}
              </div>

              {modalMode === 'create' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    required={modalMode === 'create'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Minimo 6 caratteri"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ruolo *
                </label>
                <select
                  value={formData.ruolo}
                  onChange={(e) => setFormData({ ...formData, ruolo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="tecnico">Tecnico</option>
                  <option value="admin">Amministratore</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="attivo"
                  checked={formData.attivo}
                  onChange={(e) => setFormData({ ...formData, attivo: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="attivo" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Utente attivo
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setMostraModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Salvataggio...' : 'Salva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function UtentiPageWithAuth() {
  return (
    <ProtectedRoute requiredRole="admin">
      <UtentiPage />
    </ProtectedRoute>
  )
}
