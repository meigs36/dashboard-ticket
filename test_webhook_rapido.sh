#!/bin/bash

# 🧪 Script Test Rapido Webhook n8n
# Testa il webhook senza configurare l'intero workflow

set -e

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurazione
WEBHOOK_URL="https://n8nsimpro.simulationproject.it/webhook/audio-trascrizione"
WEBHOOK_SECRET="09ba4473d27157892c6f577d480c0585d92d5b110187a2a10641c2923ff9d815"

echo "🧪 Test Webhook n8n - Audio Trascrizione"
echo "=========================================="
echo ""

# Test 1: Connettività base
echo "📡 Test 1: Verifica connettività n8n..."
if curl -s -I "$WEBHOOK_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ n8n è raggiungibile${NC}"
else
    echo -e "${RED}❌ n8n non raggiungibile - controlla URL o connessione${NC}"
    exit 1
fi
echo ""

# Test 2: Webhook con payload semplice
echo "🔧 Test 2: Invio payload minimo..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $WEBHOOK_SECRET" \
  -d '{"test": true, "message": "ping"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Webhook risponde correttamente (HTTP $HTTP_CODE)${NC}"
    echo "   Risposta: $BODY"
else
    echo -e "${RED}❌ Webhook error (HTTP $HTTP_CODE)${NC}"
    echo "   Risposta: $BODY"
fi
echo ""

# Test 3: Payload completo simulando Supabase
echo "📦 Test 3: Invio payload tipo Supabase (audio)..."
PAYLOAD='{
  "type": "INSERT",
  "table": "interventi_allegati",
  "record": {
    "id": "test-'$(date +%s)'",
    "intervento_id": "123e4567-e89b-12d3-a456-426614174000",
    "tipo": "audio",
    "nome_file": "test_audio.webm",
    "storage_path": "interventi/test/test_audio.webm",
    "mime_type": "audio/webm",
    "created_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }
}'

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $WEBHOOK_SECRET" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Payload audio inviato correttamente (HTTP $HTTP_CODE)${NC}"
    echo "   Risposta: $BODY"
else
    echo -e "${YELLOW}⚠️  Webhook ricevuto ma potrebbe esserci un errore (HTTP $HTTP_CODE)${NC}"
    echo "   Risposta: $BODY"
fi
echo ""

# Test 4: Payload foto (NON dovrebbe processare)
echo "🖼️  Test 4: Invio payload tipo Supabase (foto - dovrebbe ignorare)..."
PAYLOAD_FOTO='{
  "type": "INSERT",
  "table": "interventi_allegati",
  "record": {
    "id": "test-foto-'$(date +%s)'",
    "intervento_id": "123e4567-e89b-12d3-a456-426614174000",
    "tipo": "foto",
    "nome_file": "test_foto.jpg",
    "storage_path": "interventi/test/test_foto.jpg",
    "mime_type": "image/jpeg",
    "created_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }
}'

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $WEBHOOK_SECRET" \
  -d "$PAYLOAD_FOTO")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 400 ]; then
    echo -e "${GREEN}✅ Foto correttamente ignorata (HTTP $HTTP_CODE)${NC}"
elif [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${YELLOW}⚠️  Foto processata (potrebbe essere OK se workflow accetta tutto)${NC}"
else
    echo -e "${RED}❌ Errore inatteso (HTTP $HTTP_CODE)${NC}"
fi
echo "   Risposta: $BODY"
echo ""

# Test 5: Test senza secret (dovrebbe fallire)
echo "🔐 Test 5: Test sicurezza (senza secret key)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"test": "no-secret"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" -eq 401 ] || [ "$HTTP_CODE" -eq 403 ]; then
    echo -e "${GREEN}✅ Sicurezza OK - richiesta senza secret rifiutata (HTTP $HTTP_CODE)${NC}"
elif [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${YELLOW}⚠️  Webhook accetta richieste senza autenticazione!${NC}"
else
    echo -e "${YELLOW}⚠️  Risposta inattesa (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Riepilogo
echo "=========================================="
echo "📊 RIEPILOGO TEST"
echo "=========================================="
echo ""
echo "Prossimi passi:"
echo "1. Vai su n8n → Executions per vedere le richieste ricevute"
echo "2. Verifica che gli ultimi 2 test siano visibili"
echo "3. Controlla che il payload sia corretto"
echo ""
echo "🔍 Debug:"
echo "   • URL webhook: $WEBHOOK_URL"
echo "   • Se non vedi esecuzioni: controlla che workflow sia ATTIVO"
echo "   • Se errori 401/403: verifica secret key in n8n"
echo "   • Se timeout: verifica firewall e DNS"
echo ""
echo "✅ Test completato!"
