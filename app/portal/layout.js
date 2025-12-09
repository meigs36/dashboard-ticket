// app/portal/layout.js
// Layout Portale Clienti con supporto PWA

import { Inter } from 'next/font/google'
import PWAPortalProvider from '@/components/portal/PWAPortalProvider'
import PWAInstallPrompt from '@/components/portal/PWAInstallPrompt'
import { CustomerAuthProvider } from '@/contexts/CustomerAuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'ODONTO SERVICE - Portale Clienti',
  description: 'Portale Clienti per la gestione dell\'assistenza tecnica odontoiatrica',
  manifest: '/manifest-portal.json',
  themeColor: '#2563EB',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OdontoService',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  icons: {
    icon: [
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function PortalLayout({ children }) {
  return (
    <html lang="it">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="OdontoService" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased bg-gray-50 dark:bg-gray-900">
        <CustomerAuthProvider>
          <PWAPortalProvider>
            {children}
            <PWAInstallPrompt />
          </PWAPortalProvider>
        </CustomerAuthProvider>
      </body>
    </html>
  )
}
