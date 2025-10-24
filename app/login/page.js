'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Mail, Lock, AlertCircle, LogIn } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, user, userProfile } = useAuth()
  const router = useRouter()

  // DEBUG TEMPORANEO - Rimuovi dopo aver risolto
  useEffect(() => {
    console.log('🔍 Auth object:', { signIn, user, userProfile })
    console.log('🔍 signIn type:', typeof signIn)
  }, [signIn, user, userProfile])

  // Redirect se già autenticato
  useEffect(() => {
    if (user && userProfile) {
      console.log('✅ Utente già autenticato, redirect a dashboard')
      router.push('/dashboard')
    }
  }, [user, userProfile, router])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('🔐 Invio form login...')
      console.log('🔍 signIn prima di chiamarlo:', signIn)
      
      if (typeof signIn !== 'function') {
        throw new Error('signIn non è una funzione! Tipo: ' + typeof signIn)
      }
      
      const { error: signInError } = await signIn(email, password)
      
      if (signInError) {
        throw signInError
      }
      
      console.log('✅ Login completato, attendo caricamento profilo...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      console.log('➡️ Redirect a dashboard')
      router.push('/dashboard')
      
    } catch (error) {
      console.error('❌ Errore login:', error)
      setError(error.message || 'Credenziali non valide. Verifica email e password.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo e Titolo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="relative w-48 h-24">
              <Image
                src="/Logo.webp"
                alt="Odonto Service Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Ticket Assistenza
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Accedi al sistema di gestione ticket
          </p>
        </div>

        {/* Card Login */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          {/* Errore */}
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-200">Errore di accesso</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="text-gray-400" size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="admin@demo.it"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn size={20} />
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </form>

          {/* Link recupero password */}
          <div className="mt-6 text-center">
            <a href="/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Password dimenticata? Recuperala qui
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}