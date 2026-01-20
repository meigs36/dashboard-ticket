'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'

export default function LayoutClient({ children }) {
  const pathname = usePathname()
  const { user, loading } = useAuth()

  // ✅ Pagine dove NON mostrare la navbar
  const pagineSenzaNavbar = [
    '/login',
    '/signup',
    '/reset-password',
    '/auth',
    '/portal'
  ]

  const isPaginaSenzaNavbar = pagineSenzaNavbar.some(path => pathname?.startsWith(path))

  // Mostra navbar solo se: utente loggato E non è una pagina esclusa
  const mostraNavbar = user && !isPaginaSenzaNavbar && !loading

  return (
    <>
      {mostraNavbar && <Navbar />}
      <main className={mostraNavbar ? '' : 'min-h-screen bg-gray-50 dark:bg-gray-900'}>
        {children}
      </main>
    </>
  )
}