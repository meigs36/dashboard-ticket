import { AuthProvider } from '@/contexts/AuthContext'
import { Providers } from '@/components/Providers'
import LayoutClient from '@/components/LayoutClient'
import PWAInstaller from '@/components/PWAInstaller'
import './globals.css'

export const metadata = {
  title: 'Odonto Service - Sistema Ticket',
  description: 'Sistema di gestione ticket e assistenza tecnica odontoiatrica professionale',
  generator: 'Next.js',
  manifest: '/manifest.json',
  keywords: ['odonto', 'ticket', 'assistenza', 'odontoiatria', 'helpdesk', 'supporto', 'gestione'],
  authors: [{ name: 'Odonto Service' }],
  colorScheme: 'dark light',
  creator: 'Odonto Service',
  publisher: 'Odonto Service',
  formatDetection: {
    telephone: false,
  },
  metadataBase: new URL('https://dashboard-ticket.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    url: 'https://dashboard-ticket.vercel.app',
    title: 'Odonto Service - Sistema Ticket',
    description: 'Sistema di gestione ticket e assistenza odontoiatrica',
    siteName: 'Odonto Service',
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'Dashboard Ticket System',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Odonto Service - Sistema Ticket',
    description: 'Sistema di gestione ticket e assistenza odontoiatrica',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Odonto Service',
  },
  applicationName: 'Odonto Service Sistema Ticket',
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Ticket System',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1E90FF" />
        {/* iOS Splash Screens */}
        <link rel="apple-touch-startup-image" href="/splash/launch-640x1136.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/launch-750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/launch-1242x2208.png" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/launch-1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/launch-1242x2688.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" />
      </head>
      <body 
        className="antialiased bg-gray-50 dark:bg-gray-900"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        <Providers>
          <AuthProvider>
            <LayoutClient>
              {children}
            </LayoutClient>
            <PWAInstaller />
          </AuthProvider>
        </Providers>
      </body>
    </html>
  )
}
