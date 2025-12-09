// app/portal/layout.js
// Layout Portale Clienti con supporto PWA - Next.js 16
// NOTA: Non include <html> e <body> perché sono nel root layout

import PWAPortalProvider from '@/components/portal/PWAPortalProvider'
import PWAInstallPrompt from '@/components/portal/PWAInstallPrompt'
import { CustomerAuthProvider } from '@/contexts/CustomerAuthContext'

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
  themeColor: '#2563EB',
}

export default function PortalLayout({ children }) {
  // NOTA: Non wrappare con <html> e <body> - sono già nel root layout!
  return (
    <CustomerAuthProvider>
      <PWAPortalProvider>
        {children}
        <PWAInstallPrompt />
      </PWAPortalProvider>
    </CustomerAuthProvider>
  )
}
