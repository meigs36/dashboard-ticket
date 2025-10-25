#!/bin/bash

# ============================================
# SCRIPT INSTALLAZIONE RAPIDA MEDIA CAPTURE
# Esegui dalla root del progetto dashboard-ticket
# ============================================

set -e  # Esci se c'è un errore

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  📦 INSTALLAZIONE MEDIA CAPTURE SYSTEM    ║${NC}"
echo -e "${BLUE}║  🎙️ Audio + 📸 Foto per Interventi       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Verifica di essere nella root del progetto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ ERRORE: package.json non trovato${NC}"
    echo "Esegui questo script dalla root del progetto Next.js"
    exit 1
fi

echo -e "${GREEN}✓${NC} Directory corretta: $(pwd)"
echo ""

# Verifica presenza media-capture-system.zip
if [ ! -f "media-capture-system.zip" ]; then
    echo -e "${RED}❌ ERRORE: media-capture-system.zip non trovato${NC}"
    echo "Assicurati che il file sia nella root del progetto"
    exit 1
fi

echo -e "${GREEN}✓${NC} File media-capture-system.zip trovato"
echo ""

# Estrai lo zip se non già fatto
if [ ! -d "media-capture-system" ]; then
    echo -e "${YELLOW}📂 Estrazione media-capture-system.zip...${NC}"
    unzip -q media-capture-system.zip
    echo -e "${GREEN}✓${NC} File estratti"
else
    echo -e "${GREEN}✓${NC} Cartella media-capture-system già presente"
fi
echo ""

# Crea struttura cartelle
echo -e "${YELLOW}📁 Creazione struttura cartelle...${NC}"
mkdir -p hooks
mkdir -p lib
mkdir -p components
mkdir -p app/test-media
echo -e "${GREEN}✓${NC} Cartelle create"
echo ""

# Funzione per copiare file con verifica
copy_file() {
    local source=$1
    local dest=$2
    local name=$3
    
    if [ -f "$source" ]; then
        cp "$source" "$dest"
        echo -e "${GREEN}  ✓${NC} $name"
    else
        echo -e "${RED}  ✗${NC} $name (file non trovato)"
    fi
}

# Copia hooks
echo -e "${YELLOW}📝 Copia hooks...${NC}"
copy_file "media-capture-system/hooks/useAudioRecorder.js" "hooks/useAudioRecorder.js" "useAudioRecorder.js"
copy_file "media-capture-system/hooks/usePhotoCapture.js" "hooks/usePhotoCapture.js" "usePhotoCapture.js"
echo ""

# Copia lib
echo -e "${YELLOW}📝 Copia librerie...${NC}"
copy_file "media-capture-system/lib/mediaUpload.js" "lib/mediaUpload.js" "mediaUpload.js"
echo ""

# Copia componenti
echo -e "${YELLOW}📝 Copia componenti...${NC}"
copy_file "media-capture-system/components/InterventoMediaCapture.jsx" "components/InterventoMediaCapture.jsx" "InterventoMediaCapture.jsx"
copy_file "media-capture-system/components/QuickMediaButtons.jsx" "components/QuickMediaButtons.jsx" "QuickMediaButtons.jsx"
echo ""

# Copia pagina test
echo -e "${YELLOW}📝 Copia pagina test...${NC}"
copy_file "media-capture-system/components/test-media-page.js" "app/test-media/page.js" "test-media/page.js"
echo ""

# Copia documentazione
echo -e "${YELLOW}📝 Copia documentazione...${NC}"
copy_file "media-capture-system/docs/migration_interventi_media.sql" "migration_interventi_media.sql" "migration_interventi_media.sql"
copy_file "media-capture-system/docs/README_MEDIA_CAPTURE.md" "README_MEDIA_CAPTURE.md" "README_MEDIA_CAPTURE.md"
echo ""

# Verifica lucide-react
echo -e "${YELLOW}🔍 Verifica dipendenze...${NC}"
if npm list lucide-react >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} lucide-react già installato"
else
    echo -e "${YELLOW}⚠️  lucide-react non trovato, installazione...${NC}"
    npm install lucide-react
    echo -e "${GREEN}✓${NC} lucide-react installato"
fi
echo ""

# Crea backup di InterventiTab.js
if [ -f "components/InterventiTab.js" ]; then
    echo -e "${YELLOW}💾 Backup InterventiTab.js...${NC}"
    cp components/InterventiTab.js components/InterventiTab.js.backup
    echo -e "${GREEN}✓${NC} Backup creato: components/InterventiTab.js.backup"
else
    echo -e "${YELLOW}⚠️  InterventiTab.js non trovato (normale se hai struttura diversa)${NC}"
fi
echo ""

# Riepilogo finale
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         ✅ INSTALLAZIONE COMPLETATA!       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📋 File installati:${NC}"
echo "   • hooks/useAudioRecorder.js"
echo "   • hooks/usePhotoCapture.js"
echo "   • lib/mediaUpload.js"
echo "   • components/InterventoMediaCapture.jsx"
echo "   • components/QuickMediaButtons.jsx"
echo "   • app/test-media/page.js"
echo "   • migration_interventi_media.sql"
echo ""
echo -e "${YELLOW}⚠️  PROSSIMI STEP OBBLIGATORI:${NC}"
echo ""
echo -e "${BLUE}1️⃣  SETUP DATABASE:${NC}"
echo "   • Vai su Supabase Dashboard → SQL Editor"
echo "   • Apri il file: migration_interventi_media.sql"
echo "   • Copia tutto il contenuto e clicca RUN ▶️"
echo ""
echo -e "${BLUE}2️⃣  SETUP STORAGE:${NC}"
echo "   • Vai su Supabase Dashboard → Storage"
echo "   • Crea nuovo bucket: 'interventi-media'"
echo "   • Imposta: Public = NO, Size limit = 50MB"
echo "   • Configura le 3 policies (vedi ISTRUZIONI)"
echo ""
echo -e "${BLUE}3️⃣  MODIFICA InterventiTab.js:${NC}"
echo "   • Aggiungi import: import InterventoMediaCapture from '@/components/InterventoMediaCapture'"
echo "   • Aggiungi componente dopo descrizione intervento"
echo "   • (Vedi ISTRUZIONI_INSTALLAZIONE_MEDIA_CAPTURE.md)"
echo ""
echo -e "${BLUE}4️⃣  TEST:${NC}"
echo "   npm run dev"
echo "   # Apri: http://localhost:3000/test-media"
echo ""
echo -e "${GREEN}📖 Documentazione completa:${NC}"
echo "   cat ISTRUZIONI_INSTALLAZIONE_MEDIA_CAPTURE.md"
echo ""
echo -e "${GREEN}🎉 Buon lavoro!${NC}"
echo ""
