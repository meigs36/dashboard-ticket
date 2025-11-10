'use client'

import { useEffect, useState } from 'react'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { supabase } from '@/lib/supabase'
import { 
  Users, 
  Wrench, 
  FileText, 
  Ticket,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const { customerProfile } = useCustomerAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    referenti: 0,
    macchinari: 0,
    documenti: 0,
    ticket: 0
  })
  const [referenti, setReferenti] = useState([])
  const [macchinari, setMacchinari] = useState([])

  useEffect(() => {
    if (customerProfile?.id) {
      loadDashboardData()
    }
  }, [customerProfile])

  async function loadDashboardData() {
    try {
      setLoading(true)

      // Carica referenti
      const { data: referentiData } = await supabase
        .from('customer_referenti')
        .select('*')
        .eq('customer_id', customerProfile.id)
        .order('principale', { ascending: false })

      setReferenti(referentiData || [])

      // Carica macchinari
      const { data: macchinariData } = await supabase
        .from('customer_macchinari')
        .select('*')
        .eq('customer_id', customerProfile.id)
        .order('created_at', { ascending: false })

      setMacchinari(macchinariData || [])

      // Carica documenti count
      const { count: documentiCount } = await supabase
        .from('customer_documents')
        .select('*', { count: 'exact', head: true })
        .eq('cliente_id', customerProfile.cliente_id)

      // Aggiorna stats
      setStats({
        referenti: referentiData?.length || 0,
        macchinari: macchinariData?.length || 0,
        documenti: documentiCount || 0,
        ticket: 0 // TODO: implementare quando avremo ticket cliente
      })

    } catch (error) {
      console.error('Errore caricamento dashboard:', error)
      toast.error('Errore caricamento dati')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Benvenuto! 👋
        </h1>
        <p className="text-gray-600">
          Ecco una panoramica del tuo account OdontoService
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Referenti"
          value={stats.referenti}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Macchinari"
          value={stats.macchinari}
          icon={Wrench}
          color="green"
        />
        <StatCard
          title="Documenti"
          value={stats.documenti}
          icon={FileText}
          color="purple"
        />
        <StatCard
          title="Ticket Attivi"
          value={stats.ticket}
          icon={Ticket}
          color="orange"
        />
      </div>

      {/* Dati Azienda */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">
                Dati Azienda
              </h2>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Modifica
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoItem
              icon={Building2}
              label="Ragione Sociale"
              value={customerProfile?.ragione_sociale}
            />
            <InfoItem
              icon={Mail}
              label="Email"
              value={customerProfile?.email}
            />
            <InfoItem
              icon={Phone}
              label="Telefono"
              value={customerProfile?.telefono}
            />
            <InfoItem
              icon={MapPin}
              label="Indirizzo"
              value={`${customerProfile?.indirizzo}, ${customerProfile?.citta} ${customerProfile?.cap}`}
            />
            {customerProfile?.partita_iva && (
              <InfoItem
                label="P.IVA"
                value={customerProfile.partita_iva}
              />
            )}
            {customerProfile?.pec && (
              <InfoItem
                label="PEC"
                value={customerProfile.pec}
              />
            )}
          </div>
        </div>
      </div>

      {/* Referenti */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">
                Referenti ({referenti.length})
              </h2>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Aggiungi
            </button>
          </div>
        </div>

        {referenti.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nessun referente presente</p>
            <button className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium">
              Aggiungi il primo referente
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ruolo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contatti
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Principale
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {referenti.map((ref) => (
                  <tr key={ref.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {ref.nome} {ref.cognome}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{ref.ruolo}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {ref.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            {ref.email}
                          </div>
                        )}
                        {ref.telefono && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            {ref.telefono}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ref.principale && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Principale
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Macchinari */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wrench className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">
                Macchinari ({macchinari.length})
              </h2>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Aggiungi
            </button>
          </div>
        </div>

        {macchinari.length === 0 ? (
          <div className="p-8 text-center">
            <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nessun macchinario presente</p>
            <button className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium">
              Aggiungi il primo macchinario
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Marca/Modello
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Numero Seriale
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Garanzia
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {macchinari.map((macc) => (
                  <tr key={macc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">
                        {macc.tipo_macchinario || 'N/D'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">{macc.marca}</div>
                        <div className="text-sm text-gray-500">{macc.modello}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 font-mono">
                        {macc.numero_seriale}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`
                        inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full
                        ${macc.stato === 'attivo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}
                      `}>
                        {macc.stato === 'attivo' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {macc.stato}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {macc.garanzia_scadenza ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {new Date(macc.garanzia_scadenza).toLocaleDateString('it-IT')}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">N/D</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickActionCard
          title="Richiedi Assistenza"
          description="Apri un nuovo ticket di assistenza"
          icon={Ticket}
          color="blue"
          onClick={() => toast.info('Funzione in arrivo!')}
        />
        <QuickActionCard
          title="Carica Documento"
          description="Aggiungi un nuovo documento"
          icon={FileText}
          color="green"
          onClick={() => toast.info('Funzione in arrivo!')}
        />
        <QuickActionCard
          title="Contatta Supporto"
          description="Invia una email al supporto"
          icon={Mail}
          color="purple"
          onClick={() => window.location.href = 'mailto:assistenza@odontoservice.it'}
        />
      </div>
    </div>
  )
}

// Component helper: Stat Card
function StatCard({ title, value, icon: Icon, color }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
        <p className="text-sm text-gray-600">{title}</p>
      </div>
    </div>
  )
}

// Component helper: Info Item
function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
        <p className="text-base text-gray-900 break-words">{value || 'N/D'}</p>
      </div>
    </div>
  )
}

// Component helper: Quick Action Card
function QuickActionCard({ title, description, icon: Icon, color, onClick }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    green: 'bg-green-50 border-green-200 hover:bg-green-100',
    purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
  }

  const iconColors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600'
  }

  return (
    <button
      onClick={onClick}
      className={`
        p-6 rounded-xl border-2 transition-all text-left
        ${colors[color]}
      `}
    >
      <div className={`w-12 h-12 rounded-lg bg-white flex items-center justify-center mb-4 ${iconColors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  )
}
