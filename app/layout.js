import "./globals.css";
import PWAInstaller from "@/components/PWAInstaller";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { AuthProvider } from "@/contexts/AuthContext";

const fontClass = "font-sans";

export const metadata = {
  title: "Odonto Service - Sistema Ticket",
  description: "Sistema completo per assistenza tecnica odontoiatrica. Installabile come app nativa su tutti i dispositivi. Funziona anche offline.",
  manifest: "/manifest.json",
  themeColor: "#1E90FF",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Odonto Service",
  },
  icons: {
    icon: [
      { url: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
      { url: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
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
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Odonto Service" />
        <meta name="theme-color" content="#1E90FF" />
      </head>
      <body className={fontClass}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <ServiceWorkerRegister />
        <PWAInstaller />
      </body>
    </html>
  );
}