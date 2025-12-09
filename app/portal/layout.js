// app/portal/layout.js
// Layout Portale Clienti con supporto PWA - Next.js 16

import { Inter } from 'next/font/google'
import PWAPortalProvider from '@/components/portal/PWAPortalProvider'
import PWAInstallPrompt from '@/components/portal/PWAInstallPrompt'
import { CustomerAuthProvider } from '@/contexts/CustomerAuthContext'

const inter = Inter({ subsets: ['latin'] })

// Metadata (senza viewport e themeColor)
export const metadata = {
  title: 'ODONTO SERVICE - Portale Clienti',
  description: 'Portale Clienti per la gestione dell\'assistenza tecnica odontoiatrica',
  manifest: '/manifest-portal.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OdontoService',
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

// Viewport separato (Next.js 16)
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#2563EB',
}

export default function PortalLayout({ children }) {
  return (
    <html lang="it">
      <head>
        {/* IMPORTANTE: Forza il manifest del portal (sovrascrive root layout) */}
        <link rel="manifest" href="/manifest-portal.json" />
        
        {/* PWA iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="OdontoService Clienti" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* Theme color per portal (blu) */}
        <meta name="theme-color" content="#2563EB" />
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
