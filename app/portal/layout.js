// app/portal/layout.js
// Layout Portale Clienti - CON DARK MODE
// ✅ Importa portal-dark.css per dark mode automatico

import { CustomerAuthProvider } from '@/contexts/CustomerAuthContext'
import { Providers } from '@/components/Providers'
import PWAPortalProvider from '@/components/portal/PWAPortalProvider'
import './portal-dark.css'  // ✅ DARK MODE CSS

export const metadata = {
  title: 'Portale Clienti - ODONTO SERVICE',
  description: 'Portale clienti per assistenza tecnica odontoiatrica. Gestisci ticket, contratti e macchinari.',
  manifest: '/manifest-portal.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OS Portale',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        </PWAPortalProvider>
      </CustomerAuthProvider>
    </Providers>
  )
}
