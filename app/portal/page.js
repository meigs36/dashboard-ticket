// app/portal/page.js
// Landing Page con Menu - SENZA redirect automatici

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { Building2, LayoutDashboard, ClipboardList, ArrowRight, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PortalPage() {
  const router = useRouter()
  const { signIn, user, customerProfile, authLoading } = useCustomerAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const { data, error: loginError } = await signIn(email, password)
      
      if (loginError) throw loginError
      if (data?.user) {
        toast.success('Login effettuato con successo!')
      }
    } catch (error) {
      console.error('Errore login:', error)
      setError(error.message || 'Credenziali non valide. Riprova.')
      toast.error('Credenziali non valide')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    const { signOut } = useCustomerAuth()
    await signOut()
    toast.success('Logout effettuato')
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    )
  }

  // Se loggato, mostra menu
  if (user && customerProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image 
                src="/Logo.webp" 
                alt="OdontoService" 
                width={100}
                height={75}
                className="object-contain"
              />
              <div className="hidden sm:block h-8 w-px bg-gray-300" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900">Portale Clienti</h1>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Esci</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Benvenuto nel Portale Clienti
            </h2>
            <p className="text-gray-600 text-lg">
              Scegli dove vuoi andare
            </p>
          </div>

          {/* Menu Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card Onboarding */}
            <button
              onClick={() => router.push('/portal/onboarding')}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 text-left overflow-hidden"
            >
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/10 group-hover:from-blue-500/10 group-hover:to-blue-600/20 transition-all" />
              
              {/* Content */}
              <div className="relative">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-200 transition-colors">
                  <ClipboardList className="w-8 h-8 text-blue-600" />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Onboarding / Profilo
                </h3>
                
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Compila o aggiorna i tuoi dati aziendali, referenti, macchinari e documenti
                </p>
                
                <div className="flex items-center gap-2 text-blue-600 font-semibold">
                  <span>Vai all'Onboarding</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Badge */}
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                  Wizard 5 Step
                </span>
              </div>
            </button>

            {/* Card Dashboard */}
            <button
              onClick={() => router.push('/portal/dashboard')}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 text-left overflow-hidden"
            >
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-600/10 group-hover:from-green-500/10 group-hover:to-green-600/20 transition-all" />
              
              {/* Content */}
              <div className="relative">
                <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-200 transition-colors">
                  <LayoutDashboard className="w-8 h-8 text-green-600" />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Dashboard
                </h3>
                
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Visualizza i tuoi dati, contratti, macchinari, documenti e ticket di assistenza
                </p>
                
                <div className="flex items-center gap-2 text-green-600 font-semibold">
                  <span>Vai alla Dashboard</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Badge */}
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                  Panoramica Completa
                </span>
              </div>
            </button>

          </div>

          {/* Info Box */}
          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 mb-2">
                  Primo accesso?
                </h4>
                <p className="text-blue-800 text-sm leading-relaxed">
                  Ti consigliamo di iniziare dall'<strong>Onboarding</strong> per completare il tuo profilo. 
                  Se hai già compilato i dati in precedenza, puoi andare direttamente alla <strong>Dashboard</strong>.
                </p>
              </div>
            </div>
          </div>

        </main>
      </div>
    )
  }

  // Form di login (se non loggato)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Image 
              src="/Logo.webp" 
              alt="OdontoService" 
              width={120}
              height={90}
              className="object-contain drop-shadow-md"
            />
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-gray-700 hover:text-blue-600 font-medium">Funzionalità</a>
            <a href="#contact" className="text-gray-700 hover:text-blue-600 font-medium">Contatti</a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left: Hero Text */}
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Portale Clienti<br />
              <span className="text-blue-600">OdontoService</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Gestisci la tua assistenza tecnica in modo semplice e veloce. 
              Accedi ai tuoi dati, contratti, macchinari e richiedi supporto 24/7.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="font-medium">Assistenza dedicata</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="font-medium">Gestione semplificata</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="font-medium">Sempre aggiornato</span>
              </div>
            </div>
          </div>

          {/* Right: Login Form */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Accedi al Portale
              </h2>
              <p className="text-gray-600">
                Inserisci le tue credenziali per continuare
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="la-tua-email@esempio.it"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Accesso in corso...
                  </span>
                ) : (
                  'Accedi'
                )}
              </button>

              {/* Links */}
              <div className="text-center text-sm text-gray-600">
                <a href="#" className="text-blue-600 hover:underline">
                  Password dimenticata?
                </a>
              </div>
            </form>
          </div>

        </div>
      </main>
    </div>
  )
}
