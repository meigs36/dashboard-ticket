'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { 
  User, Mail, Phone, Briefcase, Calendar, Shield, 
  Key, Save, Eye, EyeOff, CheckCircle, Award,
  Clock, Ticket, FileText, TrendingUp, ArrowLeft
} from 'lucide-react'

export default function ProfiloPage() {
  const { user, userProfile, refreshProfile } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('dati')
  const [stats, setStats] = useState({
    ticketRisolti: 0,
    interventiEffettuati: 0,
    oreTotali: 0,
    ticketAperti: 0
  })

  // Form dati personali
  const [formDati, setFormDati] = useState({
    nome: '',
    cognome: '',
    email: '',
    telefono: ''
  })

  // Form cambio password
  const [formPassword, setFormPassword] = useState({
    vecchiaPassword: '',
    nuovaPassword: '',
    confermaNuovaPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    vecchia: false,
    nuova: false,
    conferma: false
  })

  useEffect(() => {
    if (userProfile) {
      setFormDati({
        nome: userProfile.nome || '',
        cognome: userProfile.cognome || '',
        email: userProfile.email || '',
        telefono: userProfile.telefono || ''
      })
      loadStats()
    }
  }, [userProfile])

  async function loadStats() {
    if (!userProfile?.id) return
    
    try {
      // ✅ CORRETTO: id_tecnico_assegnato (non tecnico_assegnato_id)
      // Ticket risolti
      const { count: ticketRisolti, error: risError } = await supabase
        .from('ticket')
        .select('*', { count: 'exact', head: true })
        .eq('id_tecnico_assegnato', userProfile.id)
        .eq('stato', 'risolto')

      if (risError) {
        console.error('Errore caricamento ticket risolti:', risError)
      }

      // Ticket aperti
      const { count: ticketAperti, error: apertiError } = await supabase
        .from('ticket')
        .select('*', { count: 'exact', head: true })
        .eq('id_tecnico_assegnato', userProfile.id)
        .in('stato', ['aperto', 'in_lavorazione'])

      if (apertiError) {
        console.error('Errore caricamento ticket aperti:', apertiError)
      }

      // Interventi effettuati
      const { count: interventiEffettuati, error: intError } = await supabase
        .from('interventi')
        .select('*', { count: 'exact', head: true })
        .eq('tecnico_id', userProfile.id)

      if (intError) {
        console.error('Errore caricamento interventi:', intError)
      }

      // Ore totali lavorate
      const { data: interventi, error: oreError } = await supabase
        .from('interventi')
        .select('durata_effettiva')
        .eq('tecnico_id', userProfile.id)

      if (oreError) {
        console.error('Errore caricamento ore:', oreError)
      }

      const oreTotali = interventi?.reduce((sum, i) => sum + parseFloat(i.durata_effettiva || 0), 0) || 0

      setStats({
        ticketRisolti: ticketRisolti || 0,
        interventiEffettuati: interventiEffettuati || 0,
        oreTotali: Math.round(oreTotali * 10) / 10, // Arrotonda a 1 decimale
        ticketAperti: ticketAperti || 0
      })
    } catch (error) {
      console.error('Errore caricamento statistiche:', error)
      // Non bloccare l'app se le stats falliscono
      setStats({
        ticketRisolti: 0,
        interventiEffettuati: 0,
        oreTotali: 0,
        ticketAperti: 0
      })
    }
  }

  async function handleSalvaDati(e) {
    e.preventDefault()
    setLoading(true)

    try {
      // Aggiorna profilo
      const { error: profileError } = await supabase
        .from('utenti')
        .update({
          nome: formDati.nome,
          cognome: formDati.cognome,
          telefono: formDati.telefono
        })
        .eq('id', userProfile.id)

      if (profileError) throw profileError

      // Se email è cambiata, aggiorna anche auth
      if (formDati.email !== userProfile.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formDati.email
        })

        if (emailError) throw emailError
        
        alert('✅ Profilo aggiornato!\n\n📧 Ti abbiamo inviato un\'email per confermare il nuovo indirizzo.')
      } else {
        alert('✅ Profilo aggiornato con successo!')
      }

      await refreshProfile()
      await loadStats() // ✅ Ricarica anche le statistiche
    } catch (error) {
      console.error('Errore aggiornamento profilo:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCambioPassword(e) {
    e.preventDefault()

    // Validazioni
    if (formPassword.nuovaPassword.length < 8) {
      alert('⚠️ La nuova password deve essere di almeno 8 caratteri')
      return
    }

    if (formPassword.nuovaPassword !== formPassword.confermaNuovaPassword) {
      alert('⚠️ Le password non coincidono')
      return
    }

    setLoading(true)

    try {
      // Cambia password
      const { error } = await supabase.auth.updateUser({
        password: formPassword.nuovaPassword
      })

      if (error) throw error

      alert('✅ Password cambiata con successo!')
      
      // Reset form
      setFormPassword({
        vecchiaPassword: '',
        nuovaPassword: '',
        confermaNuovaPassword: ''
      })
    } catch (error) {
      console.error('Errore cambio password:', error)
      alert('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  function getRuoloBadgeColor(ruolo) {
    switch (ruolo) {
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'tecnico': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600">Caricamento profilo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Pulsante Indietro per PWA */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          Indietro
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Il Mio Profilo</h1>
          <p className="text-gray-600">Gestisci le tue informazioni personali e le impostazioni dell'account</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {userProfile.nome?.[0]}{userProfile.cognome?.[0]}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {userProfile.nome} {userProfile.cognome}
              </h2>
              <p className="text-gray-600 mb-3">{userProfile.email}</p>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRuoloBadgeColor(userProfile.ruolo)}`}>
                  {userProfile.ruolo === 'admin' ? '👑 Amministratore' : '🔧 Tecnico'}
                </span>
                {userProfile.attivo && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                    <CheckCircle className="inline-block mr-1" size={14} />
                    Attivo
                  </span>
                )}
              </div>
            </div>

            {/* Stats Quick View */}
            <div className="hidden lg:flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.ticketAperti}</div>
                <div className="text-xs text-gray-500">Aperti</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.ticketRisolti}</div>
                <div className="text-xs text-gray-500">Risolti</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.oreTotali}h</div>
                <div className="text-xs text-gray-500">Ore Lavorate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards (Mobile) */}
        <div className="grid grid-cols-2 lg:hidden gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Ticket className="text-blue-600" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.ticketAperti}</div>
                <div className="text-xs text-gray-500">Ticket Aperti</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.ticketRisolti}</div>
                <div className="text-xs text-gray-500">Risolti</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="text-purple-600" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.interventiEffettuati}</div>
                <div className="text-xs text-gray-500">Interventi</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="text-orange-600" size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.oreTotali}h</div>
                <div className="text-xs text-gray-500">Ore Totali</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('dati')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'dati'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <User className="inline-block mr-2" size={18} />
              Dati Personali
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'password'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Key className="inline-block mr-2" size={18} />
              Sicurezza
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Dati Personali */}
            {activeTab === 'dati' && (
              <form onSubmit={handleSalvaDati} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome *
                    </label>
                    <input
                      type="text"
                      value={formDati.nome}
                      onChange={(e) => setFormDati(prev => ({ ...prev, nome: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Cognome */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cognome *
                    </label>
                    <input
                      type="text"
                      value={formDati.cognome}
                      onChange={(e) => setFormDati(prev => ({ ...prev, cognome: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formDati.email}
                      onChange={(e) => setFormDati(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ⚠️ Cambiando l'email riceverai un messaggio di conferma
                    </p>
                  </div>

                  {/* Telefono */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefono
                    </label>
                    <input
                      type="tel"
                      value={formDati.telefono}
                      onChange={(e) => setFormDati(prev => ({ ...prev, telefono: e.target.value }))}
                      placeholder="+39 123 456 7890"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Ruolo (readonly) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ruolo
                    </label>
                    <input
                      type="text"
                      value={userProfile.ruolo === 'admin' ? 'Amministratore' : 'Tecnico'}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Il ruolo può essere modificato solo da un amministratore
                    </p>
                  </div>

                  {/* Data Creazione (readonly) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Membro dal
                    </label>
                    <input
                      type="text"
                      value={new Date(userProfile.created_at).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Salvataggio...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Salva Modifiche
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Cambio Password */}
            {activeTab === 'password' && (
              <form onSubmit={handleCambioPassword} className="space-y-6 max-w-lg">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-900">
                    <Shield className="inline-block mr-2" size={16} />
                    La tua password deve essere di almeno 8 caratteri e contenere lettere e numeri.
                  </p>
                </div>

                {/* Nuova Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nuova Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.nuova ? 'text' : 'password'}
                      value={formPassword.nuovaPassword}
                      onChange={(e) => setFormPassword(prev => ({ ...prev, nuovaPassword: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, nuova: !prev.nuova }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.nuova ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Conferma Nuova Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Conferma Nuova Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.conferma ? 'text' : 'password'}
                      value={formPassword.confermaNuovaPassword}
                      onChange={(e) => setFormPassword(prev => ({ ...prev, confermaNuovaPassword: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, conferma: !prev.conferma }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.conferma ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Modifica...
                      </>
                    ) : (
                      <>
                        <Key size={18} />
                        Cambia Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
