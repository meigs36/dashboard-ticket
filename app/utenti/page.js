'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { ArrowLeft, Plus, Edit2, Trash2, UserCheck, UserX, Search, Mail, Phone } from 'lucide-react'
import Link from 'next/link'

function UtentiPage() {
  const { userProfile } = useAuth()
  const [utenti, setUtenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    email: '',
    nome: '',
    cognome: '',
    ruolo: 'tecnico',
    telefono: '',
    password: ''
  })

  useEffect(() => {
    loadUtenti()
  }, [])

  async function loadUtenti() {
    try {
      const { data, error } = await supabase
        .from('utenti')
        .select('*')
        .order('cognome', { ascending: true })

      if (error) throw error
      setUtenti(data || [])
    } catch (error) {
      console.error('Errore caricamento utenti:', error)
      alert('Errore nel caricamento degli utenti')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingUser) {
        // Modifica utente esistente
        const { error } = await supabase
          .from('utenti')
          .update({
            nome: formData.nome,
            cognome: formData.cognome,
            ruolo: formData.ruolo,
            telefono: formData.telefono,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUser.id)

        if (error) throw error
        alert('Utente modificato con successo!')
      } else {
        // Crea nuovo utente
        // Prima crea l'utente in auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              nome: formData.nome,
              cognome: formData.cognome
            }
          }
        })

        if (authError) throw authError

        // Poi crea il profilo utente
        const { error: profileError } = await supabase
          .from('utenti')
          .insert({
            auth_id: authData.user.id,
            email: formData.email,
            nome: formData.nome,
            cognome: formData.cognome,
            ruolo: formData.ruolo,
            telefono: formData.telefono,
            attivo: true
          })

        if (profileError) throw profileError
        alert('Utente creato con successo!')
      }

      // Reset form e ricarica
      setShowModal(false)
      setEditingUser(null)
      setFormData({
        email: '',
        nome: '',
        cognome: '',
        ruolo: 'tecnico',
        telefono: '',
        password: ''
      })
      loadUtenti()
    } catch (error) {
      console.error('Errore:', error)
      alert(error.message || 'Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  async function toggleAttivo(userId, currentStatus) {
    try {
      const { error } = await supabase
        .from('utenti')
        .update({ attivo: !currentStatus })
        .eq('id', userId)

      if (error) throw error
      loadUtenti()
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore durante la modifica dello stato')
    }
  }

  async function deleteUser(userId) {
    if (!confirm('Sei sicuro di voler eliminare questo utente?')) return

    try {
      const { error } = await supabase
        .from('utenti')
        .delete()
        .eq('id', userId)

      if (error) throw error
      alert('Utente eliminato')
      loadUtenti()
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore durante la eliminazione')
    }
  }

  function openEditModal(user) {
    setEditingUser(user)
    setFormData({
      email: user.email,
      nome: user.nome,
      cognome: user.cognome,
      ruolo: user.ruolo,
      telefono: user.telefono || '',
      password: ''
    })
    setShowModal(true)
  }

  function openCreateModal() {
    setEditingUser(null)
    setFormData({
      email: '',
      nome: '',
      cognome: '',
      ruolo: 'tecnico',
      telefono: '',
      password: ''
    })
    setShowModal(true)
  }

  const utentiFiltrati = utenti.filter(u =>
    u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.cognome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading && utenti.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Torna alla Dashboard</span>
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Gestione Utenti
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {utenti.length} utenti totali
              </p>
            </div>
            
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus size={20} />
              Nuovo Utente
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Cerca per nome, cognome o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
          </div>
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {utentiFiltrati.map((utente) => (
            <div
              key={utente.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              {/* Header Card */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                    {utente.nome} {utente.cognome}
                  </h3>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    utente.ruolo === 'admin'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {utente.ruolo.toUpperCase()}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  {utente.attivo ? (
                    <UserCheck className="text-green-600" size={20} />
                  ) : (
                    <UserX className="text-red-600" size={20} />
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mail size={16} />
                  <span className="truncate">{utente.email}</span>
                </div>
                {utente.telefono && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Phone size={16} />
                    <span>{utente.telefono}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => openEditModal(utente)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
                >
                  <Edit2 size={16} />
                  Modifica
                </button>
                
                <button
                  onClick={() => toggleAttivo(utente.id, utente.attivo)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                    utente.attivo
                      ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/50'
                      : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50'
                  }`}
                >
                  {utente.attivo ? 'Disattiva' : 'Attiva'}
                </button>
                
                <button
                  onClick={() => deleteUser(utente.id)}
                  className="px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {utentiFiltrati.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Search className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Nessun utente trovato
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Prova a modificare i termini di ricerca
            </p>
          </div>
        )}
      </div>

      {/* Modal Crea/Modifica Utente */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {editingUser ? 'Modifica Utente' : 'Nuovo Utente'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
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
                    onChange={(e) => setFormData({...formData, cognome: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ruolo *
                </label>
                <select
                  value={formData.ruolo}
                  onChange={(e) => setFormData({...formData, ruolo: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="tecnico">Tecnico</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Telefono
                </label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Minimo 6 caratteri
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingUser(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Salvataggio...' : editingUser ? 'Salva' : 'Crea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Page() {
  return (
    <ProtectedRoute requiredRole="admin">
      <UtentiPage />
    </ProtectedRoute>
  )
}