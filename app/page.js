'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { 
  Smartphone, Zap, Shield, Download, ArrowRight, 
  CheckCircle, BarChart3, Users, HardDrive, Ticket 
} from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [showLanding, setShowLanding] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Se autenticato, vai alla dashboard
        router.push('/dashboard')
      } else {
        // Mostra landing page per utenti non autenticati
        setShowLanding(true)
      }
    }
  }, [user, loading, router])

  if (loading || !showLanding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-xl">OS</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Odonto Service</h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">Sistema Ticket</p>
              </div>
            </div>
            <Link 
              href="/login"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-200 flex items-center gap-2"
            >
              Accedi
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-semibold mb-6">
            <Zap size={16} />
            Progressive Web App
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Gestione Ticket<br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Professionale
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-10">
            Sistema completo per assistenza tecnica odontoiatrica. 
            Installabile come app nativa su tutti i dispositivi. 
            Funziona anche offline.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              Inizia Ora
              <ArrowRight size={20} />
            </Link>
            <button
              onClick={() => {
                if ('serviceWorker' in navigator) {
                  alert('✅ PWA Attiva!\n\nVedrai il banner di installazione automaticamente.\n\nOppure usa il menu browser > "Installa app"')
                }
              }}
              className="px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600 rounded-xl font-bold text-lg transition-all duration-200 flex items-center gap-2"
            >
              <Download size={20} />
              Installa App
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          <FeatureCard
            icon={<Ticket className="text-blue-600" size={28} />}
            title="Gestione Ticket"
            description="Sistema completo di ticketing con priorità, stati e assegnazioni"
          />
          <FeatureCard
            icon={<Users className="text-green-600" size={28} />}
            title="Clienti & Macchinari"
            description="Database completo clienti e installazioni"
          />
          <FeatureCard
            icon={<BarChart3 className="text-purple-600" size={28} />}
            title="Analytics Pro"
            description="Dashboard con KPI, grafici e report esportabili"
          />
          <FeatureCard
            icon={<HardDrive className="text-amber-600" size={28} />}
            title="Offline Ready"
            description="Funziona anche senza connessione internet"
          />
        </div>

        {/* PWA Features */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12 mb-20">
          <div className="text-center mb-12">
            <Smartphone className="mx-auto text-blue-600 mb-4" size={48} />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Progressive Web App
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Installala come app nativa su qualsiasi dispositivo
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <PWAFeature
              icon={<Download className="text-blue-600" size={24} />}
              title="Installabile"
              description="Aggiungi alla home screen su iOS, Android, Windows, macOS"
            />
            <PWAFeature
              icon={<Zap className="text-green-600" size={24} />}
              title="Veloce"
              description="Caricamento istantaneo e performance ottimizzate"
            />
            <PWAFeature
              icon={<Shield className="text-purple-600" size={24} />}
              title="Sicura"
              description="HTTPS, autenticazione robusta e dati protetti"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          <StatCard number="100%" label="PWA Score" />
          <StatCard number="95+" label="Performance" />
          <StatCard number="Offline" label="Funziona" />
          <StatCard number="24/7" label="Disponibile" />
        </div>

        {/* CTA Final */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-2xl p-12 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto per iniziare?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Accedi al sistema e scopri tutte le funzionalità
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all duration-200 shadow-lg"
          >
            Accedi Ora
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600 dark:text-gray-400">
          <p>© 2025 Odonto Service. Sistema Ticket Professionale.</p>
          <p className="mt-2 text-sm">Powered by Next.js & Supabase</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-100 dark:border-gray-700">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm">{description}</p>
    </div>
  )
}

function PWAFeature({ icon, title, description }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  )
}

function StatCard({ number, label }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center shadow-lg border border-gray-100 dark:border-gray-700">
      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">{number}</div>
      <div className="text-gray-600 dark:text-gray-400 font-medium">{label}</div>
    </div>
  )
}
