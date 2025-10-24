#!/bin/bash

# ========================================
# 🚀 INSTALLAZIONE AUTOMATICA PWA
# Odonto Service - Sistema Ticket
# ========================================

echo ""
echo "🦷 =========================================="
echo "   ODONTO SERVICE PWA - AUTO INSTALLER"
echo "=========================================="
echo ""

# Colori
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Funzioni helper
success() { echo -e "${GREEN}✓ $1${NC}"; }
info() { echo -e "${BLUE}ℹ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
error() { echo -e "${RED}✗ $1${NC}"; exit 1; }

# ========================================
# VERIFICHE PRELIMINARI
# ========================================

echo "🔍 Verifica progetto..."
[ ! -f "package.json" ] && error "package.json non trovato! Sei nella cartella dashboard-ticket?"
success "Progetto trovato!"
echo ""

# ========================================
# BACKUP (opzionale)
# ========================================

echo "💾 Vuoi fare un backup dei file esistenti? (y/n)"
read -n 1 -r backup_choice
echo ""

if [[ $backup_choice =~ ^[Yy]$ ]]; then
    info "Creazione backup..."
    mkdir -p backup_$(date +%Y%m%d_%H%M%S)
    cp -r public/icons backup_*/icons_old 2>/dev/null
    cp public/manifest.json backup_*/manifest_old.json 2>/dev/null
    cp app/layout.js backup_*/layout_old.js 2>/dev/null
    success "Backup creato in backup_*/"
fi
echo ""

# ========================================
# INSTALLAZIONE ICONE
# ========================================

echo "📱 Installazione icone PWA..."

# Crea directory icons se non esiste
mkdir -p public/icons

# Verifica se abbiamo i file da installare
if [ -d "icons" ]; then
    info "Copia icone..."
    cp -r icons/* public/icons/
    success "Icone copiate in public/icons/"
else
    warning "Cartella icons non trovata. Estrai prima l'archivio!"
fi

# ========================================
# INSTALLAZIONE FAVICON
# ========================================

echo ""
echo "🎨 Installazione favicon..."

for file in favicon.ico favicon.svg favicon-96x96.png apple-touch-icon.png; do
    if [ -f "$file" ]; then
        cp "$file" public/
        success "Copiato $file"
    else
        warning "$file non trovato"
    fi
done

# ========================================
# INSTALLAZIONE FILE CONFIG
# ========================================

echo ""
echo "⚙️  Installazione configurazione..."

# Manifest
if [ -f "manifest.json" ]; then
    cp manifest.json public/
    success "manifest.json aggiornato"
else
    warning "manifest.json non trovato"
fi

# Layout
if [ -f "layout.js" ]; then
    cp layout.js app/
    success "layout.js aggiornato"
else
    warning "layout.js non trovato"
fi

# Service Worker
if [ -f "sw.js" ]; then
    cp sw.js public/
    success "sw.js copiato"
fi

# PWA CSS
if [ -f "pwa.css" ]; then
    cp pwa.css app/
    success "pwa.css copiato"
fi

# ========================================
# COMPONENTI
# ========================================

echo ""
echo "🧩 Installazione componenti..."

mkdir -p components hooks

if [ -f "PWAInstaller.js" ]; then
    cp PWAInstaller.js components/
    success "PWAInstaller.js copiato"
fi

if [ -f "MobileComponents.js" ]; then
    cp MobileComponents.js components/
    success "MobileComponents.js copiato"
fi

if [ -f "useMobileOptimizations.js" ]; then
    cp useMobileOptimizations.js hooks/
    success "useMobileOptimizations.js copiato"
fi

# ========================================
# VERIFICA INSTALLAZIONE
# ========================================

echo ""
echo "🔍 Verifica installazione..."

errors=0

# Verifica icone
for size in 72 96 128 144 152 192 384 512; do
    if [ ! -f "public/icons/icon-${size}x${size}.png" ]; then
        warning "Manca icon-${size}x${size}.png"
        ((errors++))
    fi
done

# Verifica favicon
[ ! -f "public/favicon.ico" ] && warning "Manca favicon.ico" && ((errors++))

# Verifica manifest
[ ! -f "public/manifest.json" ] && warning "Manca manifest.json" && ((errors++))

# Verifica SW
[ ! -f "public/sw.js" ] && warning "Manca sw.js" && ((errors++))

if [ $errors -eq 0 ]; then
    success "Tutti i file installati correttamente! ✨"
else
    warning "Installazione completata con $errors warning"
fi

# ========================================
# IMPORT CSS
# ========================================

echo ""
echo "🎨 Configurazione CSS..."

if ! grep -q "import.*pwa.css" app/globals.css 2>/dev/null; then
    info "Aggiungi questa riga a app/globals.css:"
    echo ""
    echo "  @import './pwa.css';"
    echo ""
fi

# ========================================
# TEST BUILD
# ========================================

echo ""
echo "🔨 Vuoi testare il build ora? (y/n)"
read -n 1 -r test_choice
echo ""

if [[ $test_choice =~ ^[Yy]$ ]]; then
    info "Esecuzione build..."
    npm run build
    
    if [ $? -eq 0 ]; then
        success "Build completato con successo!"
        echo ""
        info "Avvia il server con: npm start"
        info "Poi apri: http://localhost:3000"
    else
        error "Build fallito! Controlla gli errori sopra"
    fi
fi

# ========================================
# RIEPILOGO FINALE
# ========================================

echo ""
echo "=========================================="
echo "✅ INSTALLAZIONE COMPLETATA!"
echo "=========================================="
echo ""
echo "📋 PROSSIMI PASSI:"
echo ""
echo "1. ${BLUE}Importa CSS${NC}"
echo "   Aggiungi a app/globals.css:"
echo "   @import './pwa.css';"
echo ""
echo "2. ${BLUE}Test Locale${NC}"
echo "   npm run build"
echo "   npm start"
echo ""
echo "3. ${BLUE}Verifica DevTools${NC}"
echo "   Chrome DevTools > Application"
echo "   - Manifest ✓"
echo "   - Service Workers ✓"
echo "   - Icons ✓"
echo ""
echo "4. ${BLUE}Deploy${NC}"
echo "   git add ."
echo "   git commit -m 'feat: PWA Odonto Service ready'"
echo "   git push"
echo "   vercel --prod"
echo ""
echo "=========================================="
echo "🦷 Odonto Service PWA Ready!"
echo "=========================================="
echo ""

# Apri documentazione
if command -v xdg-open &> /dev/null; then
    echo "Vuoi aprire la documentazione? (y/n)"
    read -n 1 -r docs_choice
    echo ""
    if [[ $docs_choice =~ ^[Yy]$ ]]; then
        xdg-open GUIDA-INSTALLAZIONE-ICONE.md 2>/dev/null
    fi
fi

echo "🎉 Installazione completata! Buon lavoro! 🚀"
echo ""
