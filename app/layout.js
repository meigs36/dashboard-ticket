import { AuthProvider } from '@/contexts/AuthContext'
import LayoutClient from '@/components/LayoutClient'
import { SpeedInsights } from "@vercel/speed-insights/next"
import './globals.css'

export const metadata = {
  title: 'Dashboard Ticket',
  description: 'Sistema gestione ticket e assistenza',
}

export default function RootLayout({ children }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className="antialiased bg-gray-50 dark:bg-gray-900">
        <AuthProvider>
          <LayoutClient>
            {children}
          </LayoutClient>
        </AuthProvider>
      </body>
    </html>
  )
}
