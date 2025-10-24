import { AuthProvider } from '@/contexts/AuthContext'
import { Providers } from '@/components/Providers'
import LayoutClient from '@/components/LayoutClient'
import './globals.css'

export const metadata = {
  title: 'Dashboard Ticket',
  description: 'Sistema gestione ticket e assistenza',
}

export default function RootLayout({ children }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className="antialiased bg-gray-50 dark:bg-gray-900">
        <Providers>
          <AuthProvider>
            <LayoutClient>
              {children}
            </LayoutClient>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  )
}
