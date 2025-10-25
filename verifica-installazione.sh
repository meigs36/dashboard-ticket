#!/bin/bash

# ============================================
# SCRIPT VERIFICA INSTALLAZIONE MEDIA CAPTURE
# Controlla che tutti i file siano al posto giusto
# ============================================

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🔍 VERIFICA INSTALLAZIONE MEDIA CAPTURE  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Contatori
PASSED=0
FAILED=0
WARNINGS=0

# Funzione per verificare file
check_file() {
    local file=$1
    local desc=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $desc"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $desc"
        echo -e "  ${YELLOW}→ File mancante: $file${NC}"
        ((FAILED++))
        return 1
    fi
}

# Funzione per verificare dipendenza npm
check_npm_package() {
    local package=$1
    local desc=$2
    
    if npm list "$package" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $desc"
        ((PASSED++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $desc"
        echo -e "  ${YELLOW}→ Installa con: npm install $package${NC}"
        ((WARNINGS++))
        return 1
    fi
}

echo -e "${BLUE}📁 Verifica file componenti...${NC}"
check_file "hooks/useAudioRecorder.js" "Hook registrazione audio"
check_file "hooks/usePhotoCapture.js" "Hook cattura foto"
check_file "lib/mediaUpload.js" "Library upload media"
check_file "components/InterventoMediaCapture.jsx" "Componente capture completo"
check_file "components/QuickMediaButtons.jsx" "Componente capture rapido"
echo ""

echo -e "${BLUE}📄 Verifica file supporto...${NC}"
check_file "migration_interventi_media.sql" "Script SQL migrazione"
check_file "app/test-media/page.js" "Pagina test"
echo ""

echo -e "${BLUE}📦 Verifica dipendenze npm...${NC}"
check_npm_package "lucide-react" "lucide-react"
check_npm_package "next" "Next.js"
echo ""

echo -e "${BLUE}🔧 Verifica configurazione...${NC}"

# Verifica package.json
if [ -f "package.json" ]; then
    echo -e "${GREEN}✓${NC} package.json presente"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} package.json non trovato"
    echo -e "  ${YELLOW}→ Sei nella directory giusta?${NC}"
    ((FAILED++))
fi

# Verifica .env o variabili Supabase
if [ -f ".env.local" ] || [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} File .env presente"
    ((PASSED++))
    
    # Verifica variabili Supabase
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local 2>/dev/null || grep -q "NEXT_PUBLIC_SUPABASE_URL" .env 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Variabili Supabase configurate"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} Variabili Supabase non trovate"
        echo -e "  ${YELLOW}→ Verifica NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} File .env non trovato"
    echo -e "  ${YELLOW}→ Crea .env.local con le variabili Supabase${NC}"
    ((WARNINGS++))
fi

# Verifica supabase.js
if [ -f "lib/supabase.js" ]; then
    echo -e "${GREEN}✓${NC} Client Supabase configurato"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} lib/supabase.js non trovato"
    echo -e "  ${YELLOW}→ Verifica la configurazione Supabase${NC}"
    ((WARNINGS++))
fi

echo ""

# Riepilogo
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            📊 RIEPILOGO VERIFICA          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Verifiche superate: $PASSED${NC}"
echo -e "${YELLOW}⚠ Warning: $WARNINGS${NC}"
echo -e "${RED}✗ Verifiche fallite: $FAILED${NC}"
echo ""

# Controlli da fare manualmente
echo -e "${BLUE}🔍 Controlli manuali necessari:${NC}"
echo ""
echo "1️⃣  DATABASE:"
echo "   • Tabella 'interventi_allegati' creata in Supabase"
echo "   • Verifica con: SELECT * FROM interventi_allegati LIMIT 1;"
echo ""
echo "2️⃣  STORAGE:"
echo "   • Bucket 'interventi-media' creato in Supabase Dashboard"
echo "   • 3 policies configurate (INSERT, SELECT, DELETE)"
echo ""
echo "3️⃣  INTEGRAZIONE:"
echo "   • InterventiTab.js modificato con import e componente"
echo ""

# Suggerimenti
echo -e "${YELLOW}💡 Prossimi step:${NC}"
echo ""

if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ Tutti i file sono al posto giusto!${NC}"
    echo ""
    echo "Puoi procedere con:"
    echo "  1. Esegui migrazione SQL in Supabase"
    echo "  2. Configura Storage bucket"
    echo "  3. Testa con: npm run dev → http://localhost:3000/test-media"
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Ci sono alcuni warning da risolvere${NC}"
    echo ""
    echo "Risolvi i warning sopra, poi:"
    echo "  npm run dev"
fi

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Ci sono file mancanti!${NC}"
    echo ""
    echo "Riesegui lo script di installazione:"
    echo "  ./installa-media-capture.sh"
fi

echo ""
echo -e "${BLUE}📖 Documentazione completa:${NC}"
echo "   cat ISTRUZIONI_INSTALLAZIONE_MEDIA_CAPTURE.md"
echo ""

# Exit code
if [ $FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi
