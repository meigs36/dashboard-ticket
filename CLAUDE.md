# Dashboard Ticket - Odonto Service

Sistema di ticketing e gestione assistenza tecnica odontoiatrica. PWA installabile con supporto offline.

## Stack Tecnologico

- **Framework**: Next.js 16 (App Router) con React 19
- **Database/Auth**: Supabase (auth + PostgreSQL)
- **Styling**: Tailwind CSS 4 + Framer Motion
- **PDF**: jsPDF + jsPDF-AutoTable
- **Grafici**: Recharts
- **Icons**: Lucide React
- **Deploy**: rsync + PM2 su VPS (212.132.112.236)

## Struttura Progetto

```
app/                    # Next.js App Router pages
  admin/                # Gestione utenti admin
  analytics/            # Dashboard analytics/KPI
  clienti/              # Anagrafica clienti
  consensi/             # Consenso accesso remoto (pagina pubblica, no auth)
  contratti/            # Gestione contratti
  dashboard/            # Dashboard principale (admin/tecnico)
  impostazioni/         # Impostazioni sistema
  login/                # Login operatori interni
  macchinari/           # Parco macchine
  portal/               # Portale clienti (auth separata via customer_portal_users)
  profilo/              # Profilo utente
  ticket/               # Gestione ticket
  api/                  # API Routes
    admin/              # Creazione utenti
    consensi/           # Verifica e salvataggio consensi
    customer/           # API portale clienti (profilo, onboarding, stats)
    libro-macchine/     # Generazione libro macchine
    portal-access/      # Gestione accesso portale + reset password
    sync/               # Sincronizzazione clienti e macchinari
components/             # Componenti React riutilizzabili
contexts/               # AuthContext.jsx (operatori) + CustomerAuthContext.jsx (portale)
lib/                    # Utility e query (supabase.js, generaConsensoPDF.js, ecc.)
public/                 # Assets statici, manifest PWA, service worker
```

## Sistemi di Autenticazione

Ci sono DUE sistemi auth separati:

1. **Operatori interni** (`/login` -> `/dashboard`): usa `AuthContext.jsx`, tabella `utenti` su Supabase
2. **Portale clienti** (`/portal/login` -> `/portal/dashboard`): usa `CustomerAuthContext.jsx`, tabella `customer_portal_users`, con middleware Next.js che verifica onboarding

## Convenzioni di Codice

- **Lingua UI/commenti**: Italiano
- **Lingua codice** (variabili, funzioni): Mix italiano/inglese - seguire lo stile esistente del file
- **Componenti**: File `.js` o `.jsx` in `components/`, PascalCase
- **Pagine**: `page.js` dentro la cartella di route (App Router)
- **API Routes**: `route.js` dentro `app/api/[nome]/`
- **Client components**: Dichiarare `'use client'` in cima al file
- **Styling**: Classi Tailwind inline, supporto dark mode con `dark:` prefix
- **Icone**: Usare `lucide-react`, non importare altre librerie di icone

## File Importanti da Non Modificare

- `.env.local` - Contiene chiavi Supabase e configurazioni sensibili
- `sw.js`, `sw-portal.js` - Service worker PWA
- `manifest.json`, `manifest-portal.json` - Configurazione PWA

## Comandi

```bash
npm run dev      # Dev server locale
npm run build    # Build produzione
npm run lint     # ESLint
```

## Deploy

Il deploy avviene via rsync verso il VPS. Fare sempre `npm run build` prima del deploy per verificare che non ci siano errori.

## Note

- La pagina `/consensi` e' pubblica e non richiede autenticazione
- Il middleware (`middleware.js`) protegge solo le route `/portal/*` e gestisce il flusso di onboarding
- Le route del dashboard interno (`/dashboard`, `/ticket`, ecc.) sono protette lato client tramite `ProtectedRoute.js`
