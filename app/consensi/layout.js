// app/consensi/layout.js
// Layout minimale per pagina pubblica consensi (senza sidebar, senza auth)

export const metadata = {
  title: 'Consenso Accesso Remoto - ODONTO SERVICE',
  description: 'Autorizzazione accesso remoto per assistenza tecnica - Odonto Service S.r.l.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function ConsensiLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {children}
    </div>
  )
}
