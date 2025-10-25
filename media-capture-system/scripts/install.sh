#!/bin/bash

# ============================================
# Script di Installazione Sistema Media Capture
# Copia i file nella struttura corretta del progetto
# ============================================

echo "📦 Installazione Sistema Media Capture"
echo "======================================"
echo ""

# Colori per output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Controlla se siamo nella directory corretta
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Errore: package.json non trovato${NC}"
    echo "Esegui questo script dalla root del progetto Next.js"
    exit 1
fi

echo -e "${BLUE}📍 Directory corrente:${NC} $(pwd)"
echo ""

# Chiedi conferma
read -p "Procedere con l'installazione? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installazione annullata."
    exit 0
fi

echo ""
echo -e "${YELLOW}📁 Creazione strutture cartelle...${NC}"

# Crea le directory necessarie
mkdir -p hooks
mkdir -p lib
mkdir -p components
mkdir -p app/test-media

echo -e "${GREEN}✅ Cartelle create${NC}"
echo ""

# Funzione per copiare file con feedback
copy_file() {
    local source=$1
    local dest=$2
    local name=$3
    
    if [ -f "$source" ]; then
        cp "$source" "$dest"
        echo -e "${GREEN}✅${NC} Copiato: ${BLUE}$name${NC}"
    else
        echo -e "${RED}❌${NC} Non trovato: ${YELLOW}$name${NC}"
    fi
}

echo -e "${YELLOW}📝 Copia file...${NC}"
echo ""

# Copia hooks
echo "Hooks:"
copy_file "/home/claude/useAudioRecorder.js" "hooks/useAudioRecorder.js" "useAudioRecorder.js"
copy_file "/home/claude/usePhotoCapture.js" "hooks/usePhotoCapture.js" "usePhotoCapture.js"
echo ""

# Copia lib
echo "Library:"
copy_file "/home/claude/mediaUpload.js" "lib/mediaUpload.js" "mediaUpload.js"
echo ""

# Copia componenti
echo "Componenti:"
copy_file "/home/claude/InterventoMediaCapture.jsx" "components/InterventoMediaCapture.jsx" "InterventoMediaCapture.jsx"
copy_file "/home/claude/QuickMediaButtons.jsx" "components/QuickMediaButtons.jsx" "QuickMediaButtons.jsx"
echo ""

# Copia pagina test
echo "Pagina Test:"
copy_file "/home/claude/test-media-page.js" "app/test-media/page.js" "test-media/page.js"
echo ""

# Copia SQL e README
echo "Documentazione:"
copy_file "/home/claude/migration_interventi_media.sql" "migration_interventi_media.sql" "migration_interventi_media.sql"
copy_file "/home/claude/README_MEDIA_CAPTURE.md" "README_MEDIA_CAPTURE.md" "README_MEDIA_CAPTURE.md"
echo ""

echo -e "${GREEN}✅ Installazione completata!${NC}"
echo ""
echo -e "${BLUE}📋 Prossimi step:${NC}"
echo ""
echo "1️⃣  Esegui la migrazione database:"
echo "   - Apri Supabase Dashboard → SQL Editor"
echo "   - Esegui il file: migration_interventi_media.sql"
echo ""
echo "2️⃣  Configura Storage:"
echo "   - Supabase Dashboard → Storage"
echo "   - Crea bucket 'interventi-media'"
echo "   - Configura policies (vedi README)"
echo ""
echo "3️⃣  Installa dipendenze (se mancanti):"
echo "   npm install lucide-react"
echo ""
echo "4️⃣  Testa il sistema:"
echo "   - Avvia dev server: npm run dev"
echo "   - Vai a: http://localhost:3000/test-media"
echo ""
echo "5️⃣  Leggi la documentazione completa:"
echo "   cat README_MEDIA_CAPTURE.md"
echo ""
echo -e "${YELLOW}💡 Suggerimento:${NC}"
echo "Per integrazione rapida, aggiungi QuickMediaButtons"
echo "nella tua InterventiTab esistente."
echo ""
echo -e "${GREEN}🎉 Buon lavoro!${NC}"
