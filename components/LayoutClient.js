'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default function LayoutClient({ children }) {
  const pathname = usePathname()
  
  // Pagine dove NON mostrare la navbar
  const pagineSenzaNavbar = ['/login', '/signup', '/reset-password', '/auth']
  const mostraNavbar = !pagineSenzaNavbar.some(path => pathname?.startsWith(path))

  return (
    <>
      {mostraNavbar && <Navbar />}
      <main className={mostraNavbar ? '' : 'min-h-screen bg-gray-50 dark:bg-gray-900'}>
        {children}
      </main>
    </>
  )
}
