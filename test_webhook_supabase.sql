-- 🧪 Script Test Completo Webhook Supabase → n8n
-- Esegui questo script nel SQL Editor di Supabase per testare il flusso completo

-- ========================================
-- PARTE 1: CLEANUP TEST PRECEDENTI
-- ========================================

-- Rimuovi eventuali record di test precedenti
DELETE FROM interventi_allegati 
WHERE nome_file LIKE 'test_%' OR nome_file LIKE 'webhook_test_%';

NOTIFY pgrst, 'reload schema';

-- ========================================
-- PARTE 2: VERIFICA CONFIGURAZIONE
-- ========================================

-- Mostra la struttura della tabella interventi_allegati
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'interventi_allegati'
ORDER BY ordinal_position;

-- Verifica che esistano colonne per trascrizione
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'interventi_allegati' 
            AND column_name = 'trascrizione_audio'
        ) THEN '✅ Colonna trascrizione_audio presente'
        ELSE '❌ Colonna trascrizione_audio MANCANTE - esegui migration'
    END as status_trascrizione,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'interventi_allegati' 
            AND column_name = 'trascrizione_errore'
        ) THEN '✅ Colonna trascrizione_errore presente'
        ELSE '❌ Colonna trascrizione_errore MANCANTE'
    END as status_errore;

-- ========================================
-- PARTE 3: TEST 1 - INSERT AUDIO (Deve Triggerare)
-- ========================================

DO $$
DECLARE
    test_intervento_id UUID;
    test_allegato_id UUID;
BEGIN
    -- Prendi un intervento esistente o creane uno di test
    SELECT id INTO test_intervento_id FROM interventi LIMIT 1;
    
    IF test_intervento_id IS NULL THEN
        RAISE NOTICE '⚠️  Nessun intervento trovato - creane uno prima di testare';
    ELSE
        -- Inserisci allegato AUDIO
        INSERT INTO interventi_allegati (
            intervento_id,
            tipo,
            nome_file,
            storage_path,
            mime_type
        ) VALUES (
            test_intervento_id,
            'audio',  -- ← IMPORTANTE: tipo audio
            'webhook_test_audio_' || extract(epoch from now())::text || '.webm',
            'test/webhook_test_audio.webm',
            'audio/webm'
        ) RETURNING id INTO test_allegato_id;
        
        RAISE NOTICE '✅ TEST 1 COMPLETATO';
        RAISE NOTICE '   ID Allegato: %', test_allegato_id;
        RAISE NOTICE '   Tipo: audio';
        RAISE NOTICE '   Webhook DOVREBBE essere triggerato';
        RAISE NOTICE '   Controlla n8n → Executions per verificare';
    END IF;
END $$;

-- Pausa di 2 secondi per vedere il risultato
SELECT pg_sleep(2);

-- ========================================
-- PARTE 4: TEST 2 - INSERT FOTO (NON Deve Triggerare)
-- ========================================

DO $$
DECLARE
    test_intervento_id UUID;
    test_allegato_id UUID;
BEGIN
    SELECT id INTO test_intervento_id FROM interventi LIMIT 1;
    
    IF test_intervento_id IS NOT NULL THEN
        -- Inserisci allegato FOTO
        INSERT INTO interventi_allegati (
            intervento_id,
            tipo,
            nome_file,
            storage_path,
            mime_type
        ) VALUES (
            test_intervento_id,
            'foto',  -- ← FOTO: NON deve triggerare
            'webhook_test_foto_' || extract(epoch from now())::text || '.jpg',
            'test/webhook_test_foto.jpg',
            'image/jpeg'
        ) RETURNING id INTO test_allegato_id;
        
        RAISE NOTICE '✅ TEST 2 COMPLETATO';
        RAISE NOTICE '   ID Allegato: %', test_allegato_id;
        RAISE NOTICE '   Tipo: foto';
        RAISE NOTICE '   Webhook NON dovrebbe essere triggerato';
        RAISE NOTICE '   Controlla n8n → NON deve esserci nuova execution';
    END IF;
END $$;

-- ========================================
-- PARTE 5: VERIFICA RISULTATI
-- ========================================

-- Mostra tutti i test inseriti
SELECT 
    id,
    intervento_id,
    tipo,
    nome_file,
    trascrizione_audio,
    trascrizione_errore,
    created_at,
    CASE 
        WHEN tipo = 'audio' THEN '🎤 Dovrebbe aver triggerato webhook'
        WHEN tipo = 'foto' THEN '📸 NON dovrebbe aver triggerato webhook'
        ELSE '❓ Tipo sconosciuto'
    END as stato_atteso
FROM interventi_allegati
WHERE nome_file LIKE 'webhook_test_%'
ORDER BY created_at DESC;

-- ========================================
-- PARTE 6: VERIFICA WEBHOOK LOGS
-- ========================================

-- Nota: I log dei webhook non sono direttamente accessibili via SQL
-- Devi controllare manualmente su:
-- Supabase Dashboard → Database → Webhooks → [tuo webhook] → Logs

SELECT 
    '📊 ISTRUZIONI VERIFICA' as step,
    'Vai su Supabase Dashboard → Database → Webhooks' as azione_1,
    'Clicca sul webhook "audio_trascrizione_webhook"' as azione_2,
    'Vai sul tab "Logs"' as azione_3,
    'Dovresti vedere 1 richiesta per il TEST 1 (audio)' as risultato_atteso_1,
    'NON dovresti vedere richieste per il TEST 2 (foto)' as risultato_atteso_2;

-- ========================================
-- PARTE 7: MONITORING - Query Utili
-- ========================================

-- Conta allegati per tipo
SELECT 
    tipo,
    COUNT(*) as totale,
    COUNT(trascrizione_audio) as con_trascrizione,
    COUNT(trascrizione_errore) as con_errori
FROM interventi_allegati
GROUP BY tipo;

-- Ultimi 10 allegati audio inseriti
SELECT 
    id,
    nome_file,
    LENGTH(trascrizione_audio) as lunghezza_trascrizione,
    trascrizione_errore,
    created_at,
    CASE 
        WHEN trascrizione_audio IS NOT NULL THEN '✅ Trascritto'
        WHEN trascrizione_errore IS NOT NULL THEN '❌ Errore'
        ELSE '⏳ In attesa'
    END as stato
FROM interventi_allegati
WHERE tipo = 'audio'
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- PARTE 8: CLEANUP FINALE (Opzionale)
-- ========================================

-- Decommentare per rimuovere i dati di test
/*
DELETE FROM interventi_allegati 
WHERE nome_file LIKE 'webhook_test_%';

SELECT '✅ Test cleanup completato' as messaggio;
*/

-- ========================================
-- 📋 CHECKLIST FINALE
-- ========================================

SELECT 
    '✓ Esegui questo script completo' as step_1,
    '✓ Controlla output RAISE NOTICE sopra' as step_2,
    '✓ Vai su n8n → Executions' as step_3,
    '✓ Dovresti vedere 1 esecuzione (TEST 1 - audio)' as step_4,
    '✓ NON dovresti vedere esecuzione per TEST 2 (foto)' as step_5,
    '✓ Se tutto OK, webhook funziona correttamente!' as step_6;

-- ========================================
-- 🔍 TROUBLESHOOTING
-- ========================================

SELECT 
    '❌ Se webhook non si attiva' as problema,
    'Verifica che webhook sia configurato su Supabase Dashboard' as soluzione_1,
    'Verifica URL webhook: https://n8nsimpro.simulationproject.it/webhook/audio-trascrizione' as soluzione_2,
    'Verifica condizione: NEW.tipo = ''audio''' as soluzione_3,
    'Verifica che n8n workflow sia ATTIVO' as soluzione_4,
    'Controlla logs Supabase: Database → Webhooks → Logs' as soluzione_5;

-- Fine script test
-- Ultima modifica: 2024-10-26
