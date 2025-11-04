# 📸🎙️ Sistema Cattura Media per Interventi

Sistema completo per catturare audio, foto e allegati durante gli interventi tecnici, con upload automatico su Supabase Storage e trascrizione AI.

## 📋 Indice

1. [Setup Database](#1-setup-database)
2. [Configurazione Supabase Storage](#2-configurazione-supabase-storage)
3. [Installazione Componenti](#3-installazione-componenti)
4. [Integrazione nell'App](#4-integrazione-nellapp)
5. [Test e Verifica](#5-test-e-verifica)
6. [Configurazione n8n (Fase 3)](#6-configurazione-n8n-fase-3)

---

## 1. Setup Database

### Step 1.1: Esegui migrazione SQL

Vai in **Supabase Dashboard → SQL Editor** e esegui:

```bash
migration_interventi_media.sql
```

Questo creerà:
- ✅ Tabella `interventi_allegati`
- ✅ View `vw_interventi_con_allegati`
- ✅ Policies RLS per sicurezza
- ✅ Trigger automatici

### Step 1.2: Verifica creazione tabella

```sql
SELECT * FROM interventi_allegati LIMIT 1;
```

Se non dà errore, sei pronto! ✅

---

## 2. Configurazione Supabase Storage

### Step 2.1: Crea Bucket Storage

1. Vai in **Supabase Dashboard → Storage**
2. Click **"New Bucket"**
3. Configura:
   ```
   Name: interventi-media
   Public: NO (privato)
   File size limit: 50 MB
   Allowed MIME types: 
     - audio/webm
     - audio/mp3
     - audio/wav
     - image/jpeg
     - image/png
     - image/webp
   ```

### Step 2.2: Configura Policies Storage

In **Storage → interventi-media → Policies**, aggiungi:

#### Policy INSERT (Upload)
```sql
CREATE POLICY "Tecnici possono caricare file"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'interventi-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy SELECT (Download)
```sql
CREATE POLICY "Tecnici possono leggere i propri file"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'interventi-media'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR 
    EXISTS (
      SELECT 1 FROM utenti 
      WHERE id = auth.uid() 
      AND ruolo IN ('admin', 'manager')
    )
  )
);
```

#### Policy DELETE (Eliminazione)
```sql
CREATE POLICY "Tecnici possono eliminare i propri file"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'interventi-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## 3. Installazione Componenti

### Step 3.1: Crea struttura cartelle

```bash
# Nella tua app Next.js
mkdir -p hooks
mkdir -p lib
mkdir -p components
```

### Step 3.2: Copia i file

Copia i seguenti file nella tua app:

```
hooks/
  ├── useAudioRecorder.js
  └── usePhotoCapture.js

lib/
  └── mediaUpload.js

components/
  └── InterventoMediaCapture.jsx
```

### Step 3.3: Installa Lucide Icons (se non già installato)

```bash
npm install lucide-react
```

---

## 4. Integrazione nell'App

### Opzione A: Integrazione in InterventiTab (Consigliata)

Modifica `components/InterventiTab.js`:

```jsx
// Importa il componente
import InterventoMediaCapture from '@/components/InterventoMediaCapture'

export default function InterventiTab({ ticket, onUpdate }) {
  // ... codice esistente ...

  return (
    <div className="space-y-6">
      
      {/* ... codice esistente header e lista interventi ... */}

      {/* NUOVO: Sezione Media Capture */}
      {interventi.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            📸 Media e Allegati
          </h3>
          <InterventoMediaCapture
            interventoId={interventi[0].id} // Usa primo intervento o selezionato
            onMediaUploaded={(media) => {
              console.log('Media caricato:', media);
              loadInterventi(); // Ricarica interventi
              onUpdate(); // Notifica parent
            }}
          />
        </div>
      )}

    </div>
  )
}
```

### Opzione B: Modal Dedicato

Crea `components/InterventoMediaModal.jsx`:

```jsx
'use client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import InterventoMediaCapture from './InterventoMediaCapture'

export default function InterventoMediaModal({ isOpen, onClose, interventoId }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📸 Aggiungi Media all'Intervento</DialogTitle>
        </DialogHeader>
        
        <InterventoMediaCapture
          interventoId={interventoId}
          onMediaUploaded={(media) => {
            console.log('Media caricato:', media)
            // Chiudi modal dopo 1 secondo
            setTimeout(() => onClose(), 1000)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
```

Poi in `InterventiTab.js`:

```jsx
import { Camera } from 'lucide-react'
import InterventoMediaModal from './InterventoMediaModal'

// ... nel componente ...
const [showMediaModal, setShowMediaModal] = useState(false)
const [selectedInterventoId, setSelectedInterventoId] = useState(null)

// ... nel render ...
<button
  onClick={() => {
    setSelectedInterventoId(intervento.id)
    setShowMediaModal(true)
  }}
  className="text-blue-600 hover:text-blue-700"
>
  <Camera size={18} />
</button>

{/* Modal */}
<InterventoMediaModal
  isOpen={showMediaModal}
  onClose={() => setShowMediaModal(false)}
  interventoId={selectedInterventoId}
/>
```

### Opzione C: Pagina Dedicata Mobile

Crea `app/interventi/[id]/media/page.js`:

```jsx
'use client'
import { useParams, useRouter } from 'next/navigation'
import InterventoMediaCapture from '@/components/InterventoMediaCapture'

export default function InterventoMediaPage() {
  const params = useParams()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-4 text-blue-600 hover:text-blue-700"
        >
          ← Torna all'intervento
        </button>

        <InterventoMediaCapture
          interventoId={params.id}
          onMediaUploaded={() => {
            alert('✅ Media caricato!')
          }}
        />
      </div>
    </div>
  )
}
```

---

## 5. Test e Verifica

### Checklist Test

- [ ] **Database**: Tabella `interventi_allegati` creata
- [ ] **Storage**: Bucket `interventi-media` configurato
- [ ] **Policies**: RLS attivo e funzionante
- [ ] **Audio**: Registrazione funziona su mobile e desktop
- [ ] **Foto**: Cattura da camera funziona su mobile
- [ ] **Upload**: File vengono caricati su Storage
- [ ] **Database**: Record creati in `interventi_allegati`
- [ ] **Gallery**: Allegati visibili correttamente
- [ ] **Eliminazione**: File eliminati da Storage e DB

### Test Manuale

1. **Test Audio**:
   ```
   1. Click "Registra Audio"
   2. Parla per 5-10 secondi
   3. Stop registrazione
   4. Ascolta playback
   5. Click "Carica Audio"
   6. Verifica in Gallery
   ```

2. **Test Foto**:
   ```
   1. Click "Aggiungi Foto"
   2. Scatta o seleziona foto
   3. Verifica preview
   4. Click "Carica Foto"
   5. Verifica in Gallery
   ```

3. **Test Elimina**:
   ```
   1. Vai in Gallery
   2. Click cestino su allegato
   3. Conferma eliminazione
   4. Verifica rimozione
   ```

### Debugging

Se qualcosa non funziona:

```javascript
// Controlla console browser per errori
console.log('User:', user)
console.log('Intervento ID:', interventoId)

// Verifica permessi Supabase
const { data, error } = await supabase
  .from('interventi_allegati')
  .select('*')
  .eq('intervento_id', interventoId)

console.log('Allegati:', data, 'Errore:', error)
```

---

## 6. Configurazione n8n (Fase 3)

### Webhook n8n per Trascrizione Audio

Crea workflow n8n con questi nodi:

1. **Webhook Trigger**
   - URL: `https://your-n8n.com/webhook/trascrizione-audio`
   - Method: POST
   - Body: JSON

2. **Get File from Supabase**
   ```javascript
   // Node: HTTP Request
   const { audioPath, interventoId, allegatoId } = $json.body
   
   return {
     url: `https://[PROJECT].supabase.co/storage/v1/object/authenticated/${audioPath}`,
     headers: {
       'Authorization': `Bearer ${$credentials.supabaseToken}`
     }
   }
   ```

3. **Whisper API Transcription**
   ```javascript
   // Node: OpenAI
   // Model: whisper-1
   // File: from previous step
   ```

4. **Update Database**
   ```sql
   UPDATE interventi_allegati
   SET 
     trascrizione = '{{ $json.text }}',
     trascrizione_stato = 'completed',
     trascrizione_data = NOW()
   WHERE id = '{{ $json.allegatoId }}'
   ```

5. **Optional: Update Intervento Notes**
   ```sql
   UPDATE interventi
   SET descrizione_intervento = COALESCE(descrizione_intervento, '') || E'\n\n[Audio] ' || '{{ $json.text }}'
   WHERE id = '{{ $json.interventoId }}'
   ```

### Attiva Webhook da Supabase

Crea Edge Function o trigger:

```javascript
// supabase/functions/trigger-trascrizione/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { record } = await req.json()
  
  // Solo per nuovi audio
  if (record.tipo === 'audio' && record.trascrizione_stato === 'pending') {
    
    // Chiama n8n webhook
    await fetch('https://your-n8n.com/webhook/trascrizione-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioPath: record.storage_path,
        interventoId: record.intervento_id,
        allegatoId: record.id
      })
    })
  }
  
  return new Response('OK', { status: 200 })
})
```

Attiva con Database Webhook in Supabase.

---

## 🎉 Completato!

Il sistema è ora pronto per:
- ✅ Catturare audio durante interventi
- ✅ Scattare foto di macchinari
- ✅ Upload automatico su cloud
- ✅ Gallery allegati organizzata
- ✅ (Opzionale) Trascrizione automatica via AI

## 📊 Metriche Successo

Dopo 1 settimana di utilizzo, monitora:
- Numero medio audio/foto per intervento
- Tempo medio compilazione scheda intervento
- % interventi con almeno 1 allegato
- Feedback tecnici (soddisfazione)

## 🆘 Support

Per problemi o domande:
1. Controlla console browser (F12)
2. Verifica policies Supabase
3. Testa permessi microfono/camera
4. Controlla storage bucket configurato

---

**Versione**: 1.0  
**Data**: Gennaio 2025  
**Compatibilità**: Next.js 14+, Supabase, Mobile PWA
