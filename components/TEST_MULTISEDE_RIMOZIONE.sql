-- ============================================================
-- SCRIPT RIMOZIONE DATI TEST MULTI-SEDE
-- OdontoService - Cleanup dopo test
-- 
-- Eseguire in Supabase SQL Editor
-- Data: 4 Dicembre 2025
-- ============================================================

-- ⚠️ ATTENZIONE: Questo script elimina TUTTI i dati di test!
-- Eseguire solo dopo aver completato i test.

-- ============================================================
-- STEP 1: RIMUOVI EVENTUALI TICKET DI TEST
-- ============================================================

-- Prima elimina note e storico dei ticket di test
DELETE FROM ticket_note 
WHERE id_ticket IN (
  SELECT id FROM ticket 
  WHERE id_cliente IN (
    'a1111111-1111-1111-1111-111111111111',
    'a2222222-2222-2222-2222-222222222222',
    'a3333333-3333-3333-3333-333333333333'
  )
);

DELETE FROM ticket_storico 
WHERE id_ticket IN (
  SELECT id FROM ticket 
  WHERE id_cliente IN (
    'a1111111-1111-1111-1111-111111111111',
    'a2222222-2222-2222-2222-222222222222',
    'a3333333-3333-3333-3333-333333333333'
  )
);

DELETE FROM storico_ticket 
WHERE id_ticket IN (
  SELECT id FROM ticket 
  WHERE id_cliente IN (
    'a1111111-1111-1111-1111-111111111111',
    'a2222222-2222-2222-2222-222222222222',
    'a3333333-3333-3333-3333-333333333333'
  )
);

DELETE FROM note_ticket 
WHERE id_ticket IN (
  SELECT id FROM ticket 
  WHERE id_cliente IN (
    'a1111111-1111-1111-1111-111111111111',
    'a2222222-2222-2222-2222-222222222222',
    'a3333333-3333-3333-3333-333333333333'
  )
);

-- Elimina i ticket
DELETE FROM ticket 
WHERE id_cliente IN (
  'a1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222',
  'a3333333-3333-3333-3333-333333333333'
);

-- ============================================================
-- STEP 2: RIMUOVI UTENTE PORTALE E DATI CORRELATI
-- ============================================================

-- Rimuovi notifiche utente
DELETE FROM customer_notifications 
WHERE user_id IN (
  SELECT id FROM customer_portal_users 
  WHERE cliente_id IN (
    'a1111111-1111-1111-1111-111111111111',
    'a2222222-2222-2222-2222-222222222222',
    'a3333333-3333-3333-3333-333333333333'
  )
);

-- Rimuovi sessioni utente
DELETE FROM customer_portal_sessions 
WHERE user_id IN (
  SELECT id FROM customer_portal_users 
  WHERE cliente_id IN (
    'a1111111-1111-1111-1111-111111111111',
    'a2222222-2222-2222-2222-222222222222',
    'a3333333-3333-3333-3333-333333333333'
  )
);

-- Rimuovi log accessi utente
DELETE FROM customer_portal_access_log 
WHERE user_id IN (
  SELECT id FROM customer_portal_users 
  WHERE cliente_id IN (
    'a1111111-1111-1111-1111-111111111111',
    'a2222222-2222-2222-2222-222222222222',
    'a3333333-3333-3333-3333-333333333333'
  )
);

-- Rimuovi log modifiche dati
DELETE FROM customer_data_changes_log 
WHERE cliente_id IN (
  'a1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222',
  'a3333333-3333-3333-3333-333333333333'
);

-- Rimuovi stato onboarding
DELETE FROM customer_onboarding_status 
WHERE cliente_id IN (
  'a1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222',
  'a3333333-3333-3333-3333-333333333333'
);

-- Rimuovi utente portale
DELETE FROM customer_portal_users 
WHERE cliente_id IN (
  'a1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222',
  'a3333333-3333-3333-3333-333333333333'
);

-- ============================================================
-- STEP 3: RIMUOVI DOCUMENTI E PREVENTIVI
-- ============================================================

DELETE FROM customer_preventivi 
WHERE cliente_id IN (
  'a1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222',
  'a3333333-3333-3333-3333-333333333333'
);

DELETE FROM customer_documents 
WHERE cliente_id IN (
  'a1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222',
  'a3333333-3333-3333-3333-333333333333'
);

-- ============================================================
-- STEP 4: RIMUOVI REFERENTI E MACCHINARI CUSTOMER
-- ============================================================

DELETE FROM customer_referenti 
WHERE cliente_id IN (
  'a1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222',
  'a3333333-3333-3333-3333-333333333333'
);

DELETE FROM customer_macchinari 
WHERE cliente_id IN (
  'a1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222',
  'a3333333-3333-3333-3333-333333333333'
);

-- ============================================================
-- STEP 5: RIMUOVI MACCHINARI (tabella principale)
-- ============================================================

DELETE FROM macchinari 
WHERE id IN (
  -- Milano Centro
  'b1111111-1111-1111-1111-111111111111',
  'b1111111-1111-1111-1111-111111111112',
  'b1111111-1111-1111-1111-111111111113',
  -- Milano Nord
  'b2222222-2222-2222-2222-222222222221',
  'b2222222-2222-2222-2222-222222222222',
  -- Monza
  'b3333333-3333-3333-3333-333333333331',
  'b3333333-3333-3333-3333-333333333332',
  'b3333333-3333-3333-3333-333333333333',
  'b3333333-3333-3333-3333-333333333334',
  'b3333333-3333-3333-3333-333333333335'
);

-- ============================================================
-- STEP 6: RIMUOVI CONTRATTI
-- ============================================================

DELETE FROM contratti 
WHERE id_cliente IN (
  'a1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222',
  'a3333333-3333-3333-3333-333333333333'
);

-- ============================================================
-- STEP 7: RIMUOVI CLIENTI TEST
-- ============================================================

DELETE FROM clienti 
WHERE id IN (
  'a1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222',
  'a3333333-3333-3333-3333-333333333333'
);

-- ============================================================
-- STEP 8: RIMUOVI UTENTE DA SUPABASE AUTH (MANUALE)
-- ============================================================
-- 
-- ⚠️ L'utente in auth.users va rimosso manualmente:
-- 
-- Opzione A) Da Supabase Dashboard:
--   1. Vai su Authentication > Users
--   2. Cerca: test.multisede@example.com
--   3. Click sui 3 puntini > Delete user
--
-- Opzione B) Via API:
--   await supabase.auth.admin.deleteUser('AUTH_USER_UUID')
--

-- ============================================================
-- VERIFICA CLEANUP
-- ============================================================

-- Verifica che i clienti test siano stati rimossi
SELECT COUNT(*) as clienti_rimasti 
FROM clienti 
WHERE partita_iva = '12345678901';
-- Risultato atteso: 0

-- Verifica che i macchinari test siano stati rimossi
SELECT COUNT(*) as macchinari_rimasti 
FROM macchinari 
WHERE numero_seriale LIKE 'TEST-%';
-- Risultato atteso: 0

-- Verifica utente portale
SELECT COUNT(*) as utenti_portale_rimasti 
FROM customer_portal_users 
WHERE email = 'test.multisede@example.com';
-- Risultato atteso: 0

-- ============================================================
-- CLEANUP COMPLETATO! ✅
-- ============================================================
