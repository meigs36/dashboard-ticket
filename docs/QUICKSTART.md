# 🚀 Quick Start - 5 Minuti

## Setup Rapido

### 1. Database (2 minuti)

```bash
# 1. Apri Supabase Dashboard
# 2. Vai in SQL Editor
# 3. Copia-incolla tutto il contenuto di: migration_interventi_media.sql
# 4. Clicca RUN
```

### 2. Storage (1 minuto)

```bash
# 1. Supabase Dashboard → Storage → New Bucket
# 2. Nome: interventi-media
# 3. Public: NO
# 4. Create
```

### 3. Installa Componenti (1 minuto)

Dalla root del tuo progetto Next.js:

```bash
# Opzione A: Script automatico
./install.sh

# Opzione B: Manuale
mkdir -p hooks lib components
cp useAudioRecorder.js hooks/
cp usePhotoCapture.js hooks/
cp mediaUpload.js lib/
cp InterventoMediaCapture.jsx components/
cp QuickMediaButtons.jsx components/
```

### 4. Test (1 minuto)

```bash
# Avvia dev server
npm run dev

# Apri browser
http://localhost:3000/test-media

# Prova a registrare audio e scattare foto
```

## 🎯 Uso Immediato

### Versione Minimal (2 righe di codice)

```jsx
import QuickMediaButtons from '@/components/QuickMediaButtons'

// Ovunque nel tuo codice:
<QuickMediaButtons interventoId={intervento.id} />
```

### Versione Completa

```jsx
import InterventoMediaCapture from '@/components/InterventoMediaCapture'

<InterventoMediaCapture
  interventoId={intervento.id}
  onMediaUploaded={() => console.log('Caricato!')}
/>
```

## 📱 Ottimizzato per Mobile

Il sistema è PWA-ready e funziona perfettamente su:
- ✅ iPhone (Safari)
- ✅ Android (Chrome)
- ✅ Desktop (tutti i browser moderni)

## ⚡ Features Principali

- 🎙️ Registrazione audio fino a 30 secondi
- 📸 Cattura foto da camera o galleria
- ☁️ Upload automatico su Supabase Storage
- 🖼️ Gallery allegati con preview
- 🗑️ Elimina allegati
- 💾 Funziona offline (PWA)
- 🤖 Pronto per trascrizione AI (Fase 3)

## 🆘 Problemi Comuni

**Audio non funziona?**
```
→ Controlla permessi microfono nel browser
→ Su mobile: Settings → App → Permessi → Microfono
```

**Foto non si caricano?**
```
→ Controlla policies Storage in Supabase
→ Verifica che il bucket 'interventi-media' esista
```

**Errore "Not authorized"?**
```
→ Controlla RLS policies nel database
→ Verifica auth.uid() in Supabase
```

## 📖 Documentazione Completa

Leggi `README_MEDIA_CAPTURE.md` per tutti i dettagli.

## 🎉 Fatto!

Ora i tuoi tecnici possono registrare note vocali e scattare foto direttamente dagli interventi! 🚀
