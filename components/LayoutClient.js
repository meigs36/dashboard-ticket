'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'

export default function LayoutClient({ children }) {
  const pathname = usePathname()
  const { user, loading } = useAuth()

  // ✅ Pagine dove NON mostrare MAI la navbar (hanno il loro header)
  const pagineSenzaNavbar = [
    '/',          // Homepage landing page
    '/login',
    '/signup',
    '/reset-password',
    '/auth',
    '/portal'
  ]

  const isPaginaSenzaNavbar = pagineSenzaNavbar.some(path =>
    path === '/' ? pathname === '/' : pathname?.startsWith(path)
  )

  // Mostra navbar solo se: utente loggato E non è loading E non è una pagina esclusa
  const mostraNavbar = !loading && user && !isPaginaSenzaNavbar

  return (
    <>
      {mostraNavbar && <Navbar />}
      <main className={mostraNavbar ? '' : 'min-h-screen bg-gray-50 dark:bg-gray-900'}>
        {children}
      </main>
    </>
  )
}