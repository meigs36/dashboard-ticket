// app/portal/layout.js
// Layout Portale Clienti con supporto PWA e Dark Mode - Next.js 16

import PWAPortalProvider from '@/components/portal/PWAPortalProvider'
import PWAInstallPrompt from '@/components/portal/PWAInstallPrompt'
import { CustomerAuthProvider } from '@/contexts/CustomerAuthContext'
import { Providers } from '@/components/Providers'

// Metadata - SOVRASCRIVE quello del root layout per /portal/*
export const metadata = {
  title: 'ODONTO SERVICE - Portale Clienti',
  description: 'Portale Clienti per la gestione dell\'assistenza tecnica odontoiatrica',
  manifest: '/manifest-portal.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OdontoService Clienti',
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563EB' },
    { media: '(prefers-color-scheme: dark)', color: '#1e3a5f' },
  ],
}

export default function PortalLayout({ children }) {
  return (
    <Providers>
      <CustomerAuthProvider>
        <PWAPortalProvider>
          {children}
          <PWAInstallPrompt />
        </PWAPortalProvider>
      </CustomerAuthProvider>
    </Providers>
  )
}
