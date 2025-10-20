'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { AuthProvider } from '@/contexts/AuthContext'
import './globals.css'

export default function RootLayout({ children }) {
  const pathname = usePathname()
  
  // Pagine dove NON mostrare la navbar (login, signup, etc)
  const pagineSenzaNavbar = ['/login', '/signup', '/reset-password', '/auth']
  const mostraNavbar = !pagineSenzaNavbar.some(path => pathname.startsWith(path))

  return (
    <html lang="it" suppressHydrationWarning>
      <body className="antialiased bg-gray-50 dark:bg-gray-900">
        <AuthProvider>
          {mostraNavbar && <Navbar />}
          <main className={mostraNavbar ? '' : 'min-h-screen bg-gray-50 dark:bg-gray-900'}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  )
}
