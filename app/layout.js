import { AuthProvider } from '@/contexts/AuthContext'
import { Providers } from '@/components/Providers'
import LayoutClient from '@/components/LayoutClient'
import PWAInstaller from "@/components/PWAInstaller"
// import ServiceWorkerRegister from "@/components/ServiceWorkerRegister" // ← COMMENTATO PER FIX 401
import './globals.css'
import './mobile-media-fixes.css' // ⬅️ Aggiungi questa riga

export const metadata = {
  title: 'Odonto Service - Sistema Ticket',
  description: 'Sistema completo per assistenza tecnica odontoiatrica. Installabile come app nativa su tutti i dispositivi. Funziona anche offline.',
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Odonto Service",
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
  openGraph: {
    title: "Odonto Service - Sistema Ticket",
    description: "Sistema completo per assistenza tecnica odontoiatrica",
    type: "website",
  },
  keywords: ["odonto", "ticket", "assistenza", "odontoiatria", "service desk", "help desk"],
  authors: [{ name: "Odonto Service" }],
}

// ✅ Viewport export separato (richiesto da Next.js 14+)
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1E90FF",
}

export default function RootLayout({ children }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <script src="/sw-unregister.js" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Odonto Service" />
        <meta name="theme-color" content="#1E90FF" />
      </head>
      <body className="antialiased bg-gray-50 dark:bg-gray-900">
        <Providers>
          <AuthProvider>
            <LayoutClient>
              {children}
            </LayoutClient>
          </AuthProvider>
        </Providers>
        {/* <ServiceWorkerRegister /> */}
        <PWAInstaller />
      </body>
    </html>
  )
}