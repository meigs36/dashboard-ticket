# OdontoService - Sistema Gestione Ticket

## Informazioni Azienda
- **Ragione Sociale:** ODONTO SERVICE SRL
- **Indirizzo:** Viale Romagna 248-250, Lido di Savio 48125 RA
- **Telefono:** 0544 949554
- **Email:** info@odontoservice.info
- **P.IVA:** IT00595400391
- **SDI:** T04ZHR3
- **Sito Web:** www.odonto-service.it
- **URL Produzione:** https://assistenza.odonto-service.it

---

## Contesto e Scopo

Stefano è il lead developer per OdontoService SRL, un'azienda di assistenza tecnica per apparecchiature odontoiatriche. L'azienda gestisce circa 11.000 macchinari dentali presso le sedi dei clienti ed è passata da operazioni manuali basate su Excel a una piattaforma digitale completa.

Il sistema serve più stakeholder:
- **Amministratori** - Gestione completa
- **Tecnici** - Interventi sul campo
- **Clienti** (studi dentistici) - Portale self-service

L'obiettivo principale è semplificare la gestione dei ticket di assistenza, il tracciamento delle apparecchiature e le comunicazioni con i clienti.

---

## Stack Tecnologico

### Frontend
- **Next.js 15** con App Router
- **Tailwind CSS** per lo styling
- **Framer Motion** per le animazioni
- **PWA** con Service Workers per funzionalità offline

### Backend
- **Supabase** (PostgreSQL + Storage + Auth)
- **n8n** self-hosted via Docker per automazioni
- **Vercel** per il deployment

### Integrazioni
- **OpenAI Whisper API** - Trascrizione automatica audio
- **jsPDF** - Generazione documenti PDF
- **Sharp** - Elaborazione immagini

### Ambiente di Sviluppo
- MacBook Pro
- Node.js v20 LTS (raccomandato vs v24 per problemi SSL)
- GitHub per version control
- Supabase CLI per gestione database

---

## Stato Attuale

La piattaforma core è completamente operativa con:

✅ **Gestione Ticket Completa**
- Creazione, assegnazione, tracking
- Tipi intervento: remoto, on-site, garanzia

✅ **Portale Clienti**
- Accesso dati apparecchiature
- Visualizzazione documenti
- Creazione ticket di supporto

✅ **Trascrizione Automatica Audio**
- Workflow n8n (30-40 secondi processing)
- Costo ~$0.01 per file 2 minuti

✅ **Generazione PDF**
- Registri macchinari con branding professionale

✅ **Sistema Notifiche**
- Aggiornamenti ticket

✅ **Sicurezza Database**
- Row Level Security (RLS) su tutte le tabelle
- Risolte 17+ warning di sicurezza Supabase

✅ **PWA**
- Installabile su piattaforme supportate
- Funzionalità offline

---

## Prossimi Step (Roadmap)

### Priorità 1: Sistema Notifiche Avanzato
- Miglioramenti notifiche esistenti

### Priorità 2: Preventivi con Firma Digitale
- Integrazione firma digitale per preventivi/quote

### Priorità 3: Analytics e Reportistica
- Dashboard analytics espansa

### Priorità 4: Notifiche Push/Email
- Miglioramenti sistema push/email

### Priorità 5: Miglioramenti PWA
- Ottimizzazioni Progressive Web App

### Altri Sviluppi Pianificati
- Espansione sistema raccolta dati infrastruttura clienti
- Workflow gestione contratti più sofisticati
- Miglioramento esperienza mobile per tecnici sul campo
- Scalabilità oltre i 13.000+ clienti attuali

---

## Principi e Pattern di Sviluppo

### Sicurezza Database
- Attenzione sistematica alla sicurezza
- RLS policies proper
- Rimozione funzioni security_definer
- Separazione chiara tra accesso admin/tecnici e portale clienti

### Design Mobile-First
- I tecnici usano principalmente il sistema su mobile
- Registrazione audio richiede considerazioni specifiche per iOS PWA:
  - MIME types appropriati (audio/mp4)
  - Sample rates (44100Hz)
  - Gestione permessi microfono con user gesture

### Automazione con n8n
- Molto efficace per ridurre lavoro manuale
- Trascrizione audio e notifiche email
- Implementare retry queues per affidabilità webhook

### Metodologia Testing
1. Verifica sviluppo locale
2. Test deployment Vercel
3. Attenzione particolare a flussi autenticazione e PWA mobile

### Organizzazione Codice
- Separazione componenti client-side da logica server-side
- Pattern TypeScript consistenti
- Tailwind CSS per styling

### Problem-Solving
- Identificare root cause con debug sistematico
- Soluzioni complete che affrontano problemi architetturali
- No quick fixes superficiali

---

## Struttura Progetto

```
/app                    # Next.js App Router (routes)
  /api                  # API Routes
  /clienti              # Gestione clienti
  /contratti            # Gestione contratti
  /dashboard            # Dashboard principale
  /macchinari           # Gestione macchinari
  /portal               # Portale clienti
  /ticket               # Gestione ticket
  /analytics            # Analytics
/components             # Componenti React riutilizzabili
/contexts               # Context providers (Auth, CustomerAuth)
/hooks                  # Custom React hooks
/lib                    # Utility e servizi (supabase, etc.)
/public                 # Asset statici, icone, manifest
/docs                   # Documentazione e script SQL
/supabase               # Configurazione Supabase
```

---

## Deployment

### Produzione (VPS)
- **URL:** https://assistenza.odonto-service.it
- **Server:** 212.132.112.236
- **Reverse Proxy:** Caddy (Docker)
- **Process Manager:** PM2
- **Path:** /var/www/dashboard-ticket

### Comandi Deploy
```bash
# Sul VPS
cd /var/www/dashboard-ticket && git pull && npm run build && pm2 restart dashboard-ticket

# Status
pm2 status
pm2 logs dashboard-ticket
```

### Vercel (Staging/Preview)
- Deploy automatico da GitHub

---

## Note Importanti

### Autenticazione
- Separazione tra admin/tecnici (AuthContext) e clienti (CustomerAuthContext)
- Evitare conflitti tra i due sistemi

### Audio iOS PWA
- MIME type: audio/mp4
- Sample rate: 44100Hz
- Richiede user gesture per permessi microfono

### Database Migrations
- Sempre includere script migrazione
- Preparare procedure rollback
- Documentare cambiamenti schema

---

*Ultimo aggiornamento: Gennaio 2026*
