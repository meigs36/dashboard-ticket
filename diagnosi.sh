#!/bin/bash

echo "🔍 DIAGNOSI ERRORI DASHBOARD - Script Automatico"
echo "================================================"
echo ""

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📋 STEP 1: Controllo Favicon"
echo "----------------------------"

# Controlla icon dinamici
if [ -f "app/icon.tsx" ] || [ -f "app/icon.ts" ] || [ -f "app/icon.jsx" ]; then
    echo -e "${RED}❌ CONFLITTO TROVATO: File icon dinamico in app/${NC}"
    echo "   Trovati:"
    ls -la app/icon.* 2>/dev/null
    echo ""
    echo "   SOLUZIONE: Elimina questi file con:"
    echo "   rm app/icon.tsx app/icon.ts app/icon.jsx"
else
    echo -e "${GREEN}✅ Nessun icon dinamico in app/${NC}"
fi

# Controlla favicon statici
echo ""
if [ -f "public/favicon.ico" ] && [ -f "public/favicon.svg" ]; then
    echo -e "${GREEN}✅ Favicon statici presenti in public/${NC}"
elif [ -f "public/favicon.ico" ] || [ -f "public/favicon.svg" ]; then
    echo -e "${YELLOW}⚠️  Solo alcuni favicon presenti${NC}"
    ls -la public/favicon.* 2>/dev/null
else
    echo -e "${RED}❌ Nessun favicon in public/${NC}"
    echo "   SOLUZIONE: Copia favicon.svg in public/"
fi

echo ""
echo "================================================"
echo "📋 STEP 2: Controllo Componenti"
echo "----------------------------"

# Controlla TicketActionsModal
if [ -f "components/TicketActionsModal.js" ]; then
    echo -e "${GREEN}✅ TicketActionsModal.js trovato${NC}"
elif [ -f "app/components/TicketActionsModal.js" ]; then
    echo -e "${GREEN}✅ TicketActionsModal.js trovato in app/components/${NC}"
else
    echo -e "${RED}❌ TicketActionsModal.js NON TROVATO${NC}"
    echo "   Cerca in:"
    find . -name "TicketActionsModal.js" 2>/dev/null | head -5
fi

# Controlla InterventiTab
echo ""
if [ -f "components/InterventiTab.js" ]; then
    echo -e "${GREEN}✅ InterventiTab.js trovato${NC}"
elif [ -f "app/components/InterventiTab.js" ]; then
    echo -e "${GREEN}✅ InterventiTab.js trovato in app/components/${NC}"
else
    echo -e "${RED}❌ InterventiTab.js NON TROVATO${NC}"
    echo "   Cerca in:"
    find . -name "InterventiTab.js" 2>/dev/null | head -5
fi

echo ""
echo "================================================"
echo "📋 STEP 3: Controllo Configurazione"
echo "----------------------------"

# Controlla next.config.js
if [ -f "next.config.js" ]; then
    echo -e "${GREEN}✅ next.config.js presente${NC}"
    echo "   Contenuto:"
    cat next.config.js | head -20
else
    echo -e "${YELLOW}⚠️  next.config.js non trovato${NC}"
fi

echo ""

# Controlla jsconfig.json
if [ -f "jsconfig.json" ]; then
    echo -e "${GREEN}✅ jsconfig.json presente${NC}"
    echo "   Path aliases:"
    cat jsconfig.json | grep -A 10 "paths"
else
    echo -e "${YELLOW}⚠️  jsconfig.json non trovato${NC}"
fi

echo ""
echo "================================================"
echo "📋 STEP 4: Lista Componenti Disponibili"
echo "----------------------------"

if [ -d "components" ]; then
    echo "📁 Componenti in ./components/:"
    ls -1 components/*.js 2>/dev/null | sed 's/components\//  - /'
fi

if [ -d "app/components" ]; then
    echo ""
    echo "📁 Componenti in ./app/components/:"
    ls -1 app/components/*.js 2>/dev/null | sed 's/app\/components\//  - /'
fi

echo ""
echo "================================================"
echo "📋 STEP 5: Controllo Package.json"
echo "----------------------------"

if [ -f "package.json" ]; then
    echo "Dipendenze principali:"
    cat package.json | grep -A 20 '"dependencies"' | grep -E "(next|react|supabase|lucide)"
else
    echo -e "${RED}❌ package.json non trovato${NC}"
fi

echo ""
echo "================================================"
echo "🎯 AZIONI CONSIGLIATE"
echo "----------------------------"
echo ""
echo "1. Se hai conflitto favicon:"
echo "   rm app/icon.tsx app/icon.ts app/icon.jsx"
echo ""
echo "2. Se mancano componenti, verifica gli import"
echo ""
echo "3. Riavvia il server:"
echo "   npm run dev"
echo ""
echo "4. Controlla l'errore COMPLETO nel terminale"
echo ""
echo "================================================"
