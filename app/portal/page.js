// app/portal/page.js
// Landing Page Completa Portale Clienti ODONTO SERVICE
// ✅ CON DARK MODE

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useCustomerAuth } from '@/contexts/CustomerAuthContext'
import { 
  Building2, 
  LayoutDashboard, 
  ClipboardList, 
  ArrowRight, 
  LogOut,
  Shield,
  Clock,
  FileText,
  Wrench,
  Bell,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  Users,
  Smartphone,
  Lock,
  HeadphonesIcon,
  FileSignature,
  History,
  Settings,
  Star,
  Globe
} from 'lucide-react'
import toast from 'react-hot-toast'

// Componente wrapper per Suspense
export default function PortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Caricamento...</p>
        </div>
      </div>
    }>
      <PortalPageContent />
    </Suspense>
  )
}

function PortalPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect')
  const { signIn, signOut, user, customerProfile, loading: authLoading } = useCustomerAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect se già loggato e c'è un URL di redirect
  useEffect(() => {
    if (user && customerProfile && redirectUrl) {
      router.push(decodeURIComponent(redirectUrl))
    }
  }, [user, customerProfile, redirectUrl, router])

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const { data, error: loginError } = await signIn(email, password)
      
      if (loginError) throw loginError
      if (data?.user) {
        toast.success('Login effettuato con successo!')
        
        if (redirectUrl) {
          router.push(decodeURIComponent(redirectUrl))
        }
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
    await signOut()
    toast.success('Logout effettuato')
  }

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Caricamento...</p>
        </div>
      </div>
    )
  }

  // ============================================
  // SE LOGGATO: Mostra menu principale
  // ============================================
  if (user && customerProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image 
                src="/Logo.webp" 
                alt="ODONTO SERVICE" 
                width={100}
                height={75}
                className="object-contain"
              />
              <div className="hidden sm:block h-8 w-px bg-gray-300 dark:bg-gray-600" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">Portale Clienti</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Esci</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Benvenuto nel Portale Clienti
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Scegli dove vuoi andare
            </p>
          </div>

          {/* Menu Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card Onboarding */}
            <button
              onClick={() => router.push('/portal/onboarding')}
              className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 text-left overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/10 dark:from-blue-500/10 dark:to-blue-600/20 group-hover:from-blue-500/10 group-hover:to-blue-600/20 transition-all" />
              
              <div className="relative">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                  <ClipboardList className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Onboarding / Profilo
                </h3>
                
                <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                  Compila o aggiorna i tuoi dati aziendali, referenti, macchinari e documenti
                </p>
                
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold">
                  <span>Vai all'Onboarding</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full">
                  Wizard 5 Step
                </span>
              </div>
            </button>

            {/* Card Dashboard */}
            <button
              onClick={() => router.push('/portal/dashboard')}
              className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 text-left overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-600/10 dark:from-green-500/10 dark:to-green-600/20 group-hover:from-green-500/10 group-hover:to-green-600/20 transition-all" />
              
              <div className="relative">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-200 dark:group-hover:bg-green-800/50 transition-colors">
                  <LayoutDashboard className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Dashboard
                </h3>
                
                <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                  Visualizza i tuoi dati, contratti, macchinari, documenti e ticket di assistenza
                </p>
                
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold">
                  <span>Vai alla Dashboard</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">
                  Panoramica Completa
                </span>
              </div>
            </button>

          </div>

          {/* Info Box */}
          <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Primo accesso?
                </h4>
                <p className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed">
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

  // ============================================
  // SE NON LOGGATO: Landing Page completa
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Image 
              src="/Logo.webp" 
              alt="ODONTO SERVICE" 
              width={120}
              height={90}
              className="object-contain drop-shadow-md"
            />
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => scrollToSection('features')} 
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
            >
              Funzionalità
            </button>
            <button 
              onClick={() => scrollToSection('activation')} 
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
            >
              Attivazione
            </button>
            <button 
              onClick={() => scrollToSection('contact')} 
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
            >
              Contatti
            </button>
          </nav>
          <button 
            onClick={() => scrollToSection('login-form')}
            className="md:hidden px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg"
          >
            Accedi
          </button>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className="max-w-7xl mx-auto px-4 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left: Hero Text */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-6">
              <Star className="w-4 h-4" />
              <span>Il tuo portale di assistenza dedicato</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Portale Clienti<br />
              <span className="text-blue-600 dark:text-blue-400">ODONTO SERVICE</span>
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              Gestisci la tua assistenza tecnica in modo semplice e veloce. 
              Accedi ai tuoi dati, contratti, macchinari e richiedi supporto <strong>24/7</strong>.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                  <HeadphonesIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <span className="font-medium text-gray-800 dark:text-gray-200">Assistenza dedicata</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-medium text-gray-800 dark:text-gray-200">Gestione semplice</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="font-medium text-gray-800 dark:text-gray-200">Sempre aggiornato</span>
              </div>
            </div>

            <button 
              onClick={() => scrollToSection('features')}
              className="hidden lg:flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <span className="text-sm">Scopri di più</span>
              <ChevronDown className="w-5 h-5 animate-bounce" />
            </button>
          </div>

          {/* Right: Login Form */}
          <div id="login-form" className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Accedi al Portale
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Inserisci le tue credenziali per continuare
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="la-tua-email@esempio.it"
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
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

              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                <button 
                  type="button"
                  onClick={() => router.push('/portal/forgot-password')}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Password dimenticata?
                </button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                🔒 Connessione sicura e crittografata
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section id="features" className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Tutte le Funzionalità del Portale
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Gestisci ogni aspetto della tua assistenza tecnica da un'unica piattaforma
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="group p-6 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 rounded-2xl border border-blue-100 dark:border-blue-800 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <LayoutDashboard className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Dashboard Personale</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Panoramica completa dei tuoi dati, contratti attivi, macchinari e stato delle richieste di assistenza.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-6 bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-800 rounded-2xl border border-green-100 dark:border-green-800 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Wrench className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Gestione Macchinari</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Visualizza l'elenco completo delle tue apparecchiature, con dettagli tecnici, scadenze e storico manutenzioni.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-6 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-800 rounded-2xl border border-purple-100 dark:border-purple-800 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Contratti e Documenti</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Accedi ai tuoi contratti di assistenza, preventivi, fatture e documenti tecnici sempre disponibili.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-6 bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/20 dark:to-gray-800 rounded-2xl border border-orange-100 dark:border-orange-800 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-orange-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <HeadphonesIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Ticket di Assistenza</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Apri nuove richieste di assistenza, monitora lo stato dei ticket e comunica direttamente con i tecnici.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group p-6 bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-gray-800 rounded-2xl border border-red-100 dark:border-red-800 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-red-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <History className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Storico Interventi</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Consulta lo storico completo degli interventi effettuati sulle tue apparecchiature con report dettagliati.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group p-6 bg-gradient-to-br from-teal-50 to-white dark:from-teal-900/20 dark:to-gray-800 rounded-2xl border border-teal-100 dark:border-teal-800 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-teal-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <FileSignature className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Firma Digitale</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Accetta preventivi e contratti con firma digitale legalmente valida, direttamente dal portale.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ===== ACTIVATION SECTION ===== */}
      <section id="activation" className="py-20 bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Attivazione
            </h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              In pochi semplici passaggi avrai accesso completo al tuo portale
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="relative text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-3xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Ricevi le Credenziali</h3>
              <p className="text-blue-100">
                Riceverai via email le tue credenziali di accesso personalizzate
              </p>
              <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-blue-400/50" />
            </div>

            {/* Step 2 */}
            <div className="relative text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-3xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Completa il Profilo</h3>
              <p className="text-blue-100">
                Verifica e aggiorna i dati della tua azienda con il wizard guidato
              </p>
              <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-blue-400/50" />
            </div>

            {/* Step 3 */}
            <div className="relative text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-3xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Registra i Macchinari</h3>
              <p className="text-blue-100">
                Inserisci le tue apparecchiature per una gestione ottimale
              </p>
              <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-blue-400/50" />
            </div>

            {/* Step 4 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-3xl font-bold text-blue-600">4</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Gestisci Tutto Online</h3>
              <p className="text-blue-100">
                Accedi quando vuoi per monitorare, richiedere assistenza e firmare documenti
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== BENEFITS ===== */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Perché scegliere il Portale Clienti?
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Risparmia Tempo</h3>
                    <p className="text-gray-600 dark:text-gray-400">Niente più telefonate o email per informazioni. Tutto è accessibile online in tempo reale.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Sicuro e Protetto</h3>
                    <p className="text-gray-600 dark:text-gray-400">I tuoi dati sono protetti con crittografia avanzata e accesso controllato.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Accessibile Ovunque</h3>
                    <p className="text-gray-600 dark:text-gray-400">Accedi da computer, tablet o smartphone. Il portale è ottimizzato per ogni dispositivo.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Sempre Aggiornato</h3>
                    <p className="text-gray-600 dark:text-gray-400">Ricevi notifiche su scadenze, interventi programmati e nuovi documenti disponibili.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg text-center">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">24/7</div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Accesso al portale</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg text-center">
                <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">100%</div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Digitale e paperless</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg text-center">
                <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">13K+</div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Clienti serviti</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg text-center">
                <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">11K+</div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Macchinari gestiti</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ===== CONTACT SECTION ===== */}
      <section id="contact" className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Hai bisogno di aiuto?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Il nostro team è a tua disposizione per qualsiasi domanda
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            
            {/* Phone */}
            <a 
              href="tel:+390544949554" 
              className="group p-6 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 rounded-2xl border border-blue-100 dark:border-blue-800 hover:shadow-xl transition-all duration-300 text-center"
            >
              <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Phone className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Telefono</h3>
              <p className="text-blue-600 dark:text-blue-400 font-semibold text-lg">0544 949554</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Lun-Ven: 8:30-18:00</p>
            </a>

            {/* Email */}
            <a 
              href="mailto:info@odontoservice.info" 
              className="group p-6 bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-800 rounded-2xl border border-green-100 dark:border-green-800 hover:shadow-xl transition-all duration-300 text-center"
            >
              <div className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Mail className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Email</h3>
              <p className="text-green-600 dark:text-green-400 font-semibold">info@odontoservice.info</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Risposta entro 24h</p>
            </a>

            {/* Address */}
            <div className="group p-6 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-800 rounded-2xl border border-purple-100 dark:border-purple-800 hover:shadow-xl transition-all duration-300 text-center">
              <div className="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sede</h3>
              <p className="text-gray-600 dark:text-gray-400">Viale Romagna n. 248-250</p>
              <p className="text-gray-600 dark:text-gray-400">48125 Lido di Savio (RA)</p>
            </div>

            {/* Website */}
            <a 
              href="https://www.odonto-service.it" 
              target="_blank"
              rel="noopener noreferrer"
              className="group p-6 bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/20 dark:to-gray-800 rounded-2xl border border-orange-100 dark:border-orange-800 hover:shadow-xl transition-all duration-300 text-center"
            >
              <div className="w-14 h-14 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Globe className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sito Web</h3>
              <p className="text-orange-600 dark:text-orange-400 font-semibold">www.odonto-service.it</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Scopri i nostri servizi</p>
            </a>

          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            
            {/* Logo & Description */}
            <div className="md:col-span-2">
              <Image 
                src="/Logo.webp" 
                alt="ODONTO SERVICE" 
                width={150}
                height={112}
                className="object-contain mb-4 brightness-0 invert opacity-90"
              />
              <p className="text-gray-400 leading-relaxed max-w-md">
                ODONTO SERVICE è leader nell'assistenza tecnica per apparecchiature odontoiatriche. 
                Da oltre 30 anni al fianco dei professionisti del settore dentale.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-lg mb-4">Link Rapidi</h4>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => scrollToSection('features')} className="text-gray-400 hover:text-white transition-colors">
                    Funzionalità
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('activation')} className="text-gray-400 hover:text-white transition-colors">
                    Attivazione
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('contact')} className="text-gray-400 hover:text-white transition-colors">
                    Contatti
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="font-bold text-lg mb-4">Contatti</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <a href="tel:+390544949554" className="hover:text-white transition-colors">0544 949554</a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <a href="mailto:info@odontoservice.info" className="hover:text-white transition-colors">info@odontoservice.info</a>
                </li>
                <li className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <a href="https://www.odonto-service.it" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">www.odonto-service.it</a>
                </li>
              </ul>
            </div>

          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} ODONTO SERVICE S.r.l. - Tutti i diritti riservati
            </p>
            <p className="text-gray-500 text-sm">
              P.IVA: IT00595400391 | SDI: T04ZHR3
            </p>
          </div>
        </div>
      </footer>

    </div>
  )
}
