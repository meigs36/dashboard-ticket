'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function CustomerPortalLanding() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Implementare autenticazione Supabase
      console.log('Login:', { email, password });
      
      // Mock delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to dashboard (mock)
      alert('Login effettuato! (mock)');
      router.push('/portal/dashboard');
    } catch (error) {
      console.error('Errore login:', error);
      alert('Credenziali non valide');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header con logo grande */}
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
          <button
            onClick={() => setShowLogin(!showLogin)}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all shadow-md"
          >
            {showLogin ? 'Chiudi' : 'Accedi'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Testo Hero */}
          <div>
            <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              🎉 Benvenuto nel tuo portale
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Gestisci la tua
              <span className="block text-blue-600">assistenza tecnica</span>
              in modo semplice
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Accedi ai tuoi documenti, controlla lo stato degli interventi e richiedi assistenza 
              24/7 dal tuo portale personale.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setShowLogin(true)}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-lg shadow-xl transition-all hover:scale-105"
              >
                Accedi al Portale →
              </button>
              <button
                className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:border-blue-600 hover:text-blue-600 font-semibold text-lg transition-all"
              >
                Scopri di più
              </button>
            </div>
          </div>

          {/* Form Login (visibile quando showLogin = true) */}
          {showLogin ? (
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
              <div className="text-center mb-8">
                <Image 
                  src="/Logo.webp" 
                  alt="OdontoService" 
                  width={100}
                  height={75}
                  className="mx-auto mb-4 object-contain"
                />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Accedi al Portale
                </h2>
                <p className="text-gray-600">
                  Inserisci le tue credenziali
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="tua@email.it"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Ricordami</span>
                  </label>
                  <a href="#" className="text-sm text-blue-600 hover:underline">
                    Password dimenticata?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Accesso in corso...
                    </span>
                  ) : (
                    'Accedi'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-600">
                <p>
                  Non hai un account?{' '}
                  <a href="mailto:assistenza@odontoservice.it" className="text-blue-600 hover:underline font-medium">
                    Contattaci
                  </a>
                </p>
              </div>
            </div>
          ) : (
            // Immagine placeholder quando form non visibile
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl p-12 shadow-xl">
                <div className="bg-white rounded-xl p-8 shadow-lg">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Contratti</p>
                      <p className="text-sm text-gray-600">Visualizza i tuoi contratti</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Interventi</p>
                      <p className="text-sm text-gray-600">Monitora lo stato</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Assistenza 24/7</p>
                      <p className="text-sm text-gray-600">Sempre disponibili</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Tutto quello che ti serve
            </h2>
            <p className="text-xl text-gray-600">
              Un portale completo per gestire la tua assistenza
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-8 border border-blue-100">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Documenti Sempre Disponibili
              </h3>
              <p className="text-gray-600">
                Accedi ai tuoi contratti, preventivi e documenti tecnici quando vuoi, da qualsiasi dispositivo.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-green-50 to-white rounded-xl p-8 border border-green-100">
              <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Tracciamento Interventi
              </h3>
              <p className="text-gray-600">
                Monitora in tempo reale lo stato dei tuoi ticket e ricevi notifiche su ogni aggiornamento.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-8 border border-amber-100">
              <div className="w-14 h-14 bg-amber-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Supporto Immediato
              </h3>
              <p className="text-gray-600">
                Richiedi assistenza in qualsiasi momento e ricevi supporto rapido dal nostro team.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Pronto per iniziare?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Accedi ora al tuo portale e scopri tutti i vantaggi della gestione digitale
          </p>
          <button
            onClick={() => setShowLogin(true)}
            className="px-10 py-4 bg-white text-blue-600 rounded-xl hover:bg-blue-50 font-bold text-lg shadow-2xl transition-all hover:scale-105"
          >
            Accedi al Portale →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Image 
                src="/Logo.webp" 
                alt="OdontoService" 
                width={80}
                height={60}
                className="mb-4 brightness-0 invert opacity-80"
              />
              <p className="text-sm text-gray-400">
                Il tuo partner per l'assistenza tecnica odontoiatrica
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Servizi</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Manutenzione</a></li>
                <li><a href="#" className="hover:text-white">Riparazioni</a></li>
                <li><a href="#" className="hover:text-white">Installazioni</a></li>
                <li><a href="#" className="hover:text-white">Consulenza</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Contatti</h4>
              <ul className="space-y-2 text-sm">
                <li>📧 info@odontoservice.it</li>
                <li>📞 +39 02 12345678</li>
                <li>📍 Milano, Italia</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Link Utili</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Termini di Servizio</a></li>
                <li><a href="#" className="hover:text-white">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2025 OdontoService. Tutti i diritti riservati.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
