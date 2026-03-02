-- =====================================================
-- FIX SECURITY WARNINGS - SUPABASE LINTER
-- Data: 2026-02-12
-- =====================================================
-- Questo script corregge:
-- 1. 15 viste con SECURITY DEFINER (bypassano RLS)
-- 2. 1 tabella senza RLS abilitato
-- =====================================================

-- =====================================================
-- PARTE 1: Ricreare le viste senza SECURITY DEFINER
-- =====================================================

-- 1. ticket_note_complete
DROP VIEW IF EXISTS public.ticket_note_complete;
CREATE VIEW public.ticket_note_complete AS
SELECT tn.id,
    tn.id_ticket,
    tn.id_utente,
    tn.tipo,
    tn.contenuto AS testo,
    tn.metadata,
    tn.created_at,
    tn.created_at AS updated_at,
    u.nome AS utente_nome,
    u.cognome AS utente_cognome,
    u.email AS utente_email
FROM ticket_note tn
LEFT JOIN utenti u ON tn.id_utente = u.id;

-- 2. ticket_storico_complete
DROP VIEW IF EXISTS public.ticket_storico_complete;
CREATE VIEW public.ticket_storico_complete AS
SELECT ts.id,
    ts.id_ticket,
    ts.id_utente,
    ts.azione,
    ts.campo_modificato,
    ts.valore_precedente,
    ts.valore_nuovo,
    ts.metadata,
    ts.created_at,
    u.nome AS utente_nome,
    u.cognome AS utente_cognome,
    u.email AS utente_email
FROM ticket_storico ts
LEFT JOIN utenti u ON ts.id_utente = u.id;

-- 3. v_audio_con_trascrizione
DROP VIEW IF EXISTS public.v_audio_con_trascrizione;
CREATE VIEW public.v_audio_con_trascrizione AS
SELECT ia.id,
    ia.intervento_id,
    i.ticket_id,
    ia.nome_file,
    ia.caricato_il,
    CASE
        WHEN ia.trascrizione_audio IS NOT NULL THEN '✅ SI'::text
        ELSE '❌ NO'::text
    END AS ha_trascrizione,
    length(ia.trascrizione_audio) AS lunghezza_testo,
    ia.trascrizione_completata_il,
    ia.trascrizione_stato,
    ia.trascrizione_errore,
    EXTRACT(epoch FROM ia.trascrizione_completata_il - ia.caricato_il) AS secondi_per_trascrizione
FROM interventi_allegati ia
JOIN interventi i ON ia.intervento_id = i.id
WHERE ia.tipo::text = 'audio'::text
ORDER BY ia.caricato_il DESC;

-- 4. v_customer_documents_stats
DROP VIEW IF EXISTS public.v_customer_documents_stats;
CREATE VIEW public.v_customer_documents_stats AS
SELECT c.id AS cliente_id,
    c.ragione_sociale,
    count(cd.id) AS totale_documenti,
    sum(cd.dimensione_bytes) AS storage_totale_bytes,
    round(sum(cd.dimensione_bytes)::numeric / 1024.0 / 1024.0, 2) AS storage_totale_mb,
    max(cd.data_upload) AS ultimo_upload,
    COALESCE(json_agg(DISTINCT jsonb_build_object('categoria', cd.categoria, 'count', (
        SELECT count(*) AS count
        FROM customer_documents cd2
        WHERE cd2.cliente_id = c.id AND cd2.categoria::text = cd.categoria::text
    ))) FILTER (WHERE cd.id IS NOT NULL), '[]'::json) AS documenti_per_categoria
FROM clienti c
LEFT JOIN customer_documents cd ON c.id = cd.cliente_id
GROUP BY c.id, c.ragione_sociale;

-- 5. v_interventi_con_trascrizioni
DROP VIEW IF EXISTS public.v_interventi_con_trascrizioni;
CREATE VIEW public.v_interventi_con_trascrizioni AS
SELECT i.id AS intervento_id,
    i.ticket_id,
    t.id AS ticket_id_ref,
    i.data_intervento,
    i.descrizione_intervento,
    i.trascrizioni_audio,
    i.trascrizione_editata,
    i.trascrizione_editata_il,
    count(ia.id) FILTER (WHERE ia.tipo::text = 'audio'::text) AS num_audio,
    count(ia.id) FILTER (WHERE ia.tipo::text = 'audio'::text AND ia.trascrizione_audio IS NOT NULL) AS num_trascrizioni,
    string_agg(ia.nome_file::text, ', '::text) FILTER (WHERE ia.tipo::text = 'audio'::text) AS file_audio
FROM interventi i
LEFT JOIN ticket t ON i.ticket_id = t.id
LEFT JOIN interventi_allegati ia ON i.id = ia.intervento_id
GROUP BY i.id, t.id
HAVING count(ia.id) FILTER (WHERE ia.tipo::text = 'audio'::text) > 0
ORDER BY i.data_intervento DESC;

-- 6. v_team_notifications_unread
DROP VIEW IF EXISTS public.v_team_notifications_unread;
CREATE VIEW public.v_team_notifications_unread AS
SELECT tn.id,
    tn.destinatario_id,
    tn.destinatario_ruolo,
    tn.tipo,
    tn.priorita,
    tn.titolo,
    tn.messaggio,
    tn.ticket_id,
    tn.nota_id,
    tn.link_url,
    tn.letta,
    tn.letta_da,
    tn.letta_il,
    tn.metadata,
    tn.creata_da,
    tn.created_at,
    t.numero_ticket,
    t.oggetto AS ticket_oggetto,
    c.ragione_sociale AS cliente,
    (u.nome || ' '::text) || u.cognome AS creata_da_nome
FROM team_notifications tn
LEFT JOIN ticket t ON tn.ticket_id = t.id
LEFT JOIN clienti c ON t.id_cliente = c.id
LEFT JOIN utenti u ON tn.creata_da = u.id
WHERE tn.letta = false
ORDER BY tn.created_at DESC;

-- 7. vw_customer_documents_onboarding
DROP VIEW IF EXISTS public.vw_customer_documents_onboarding;
CREATE VIEW public.vw_customer_documents_onboarding AS
SELECT cd.id,
    cd.cliente_id,
    cd.tipo,
    cd.categoria,
    cd.numero_documento,
    cd.descrizione,
    cd.nome_file,
    cd.storage_path,
    cd.storage_bucket,
    cd.mime_type,
    cd.dimensione_bytes,
    cd.data_documento,
    cd.data_scadenza,
    cd.importo_lordo,
    cd.importo_netto,
    cd.importo_iva,
    cd.stato,
    cd.visibile_cliente,
    cd.tags,
    cd.note_interne,
    cd.caricato_da,
    cd.caricato_il,
    cd.modificato_il,
    cd.nome_originale,
    cd.sottocategoria,
    cd.validato_da,
    cd.validato_il,
    cd.note_validazione,
    cd.obbligatorio,
    c.ragione_sociale,
    c.email_principale,
    v.nome AS validatore_nome,
    v.cognome AS validatore_cognome,
    CASE
        WHEN cd.data_scadenza IS NOT NULL AND cd.data_scadenza < CURRENT_DATE THEN 'scaduto'::text
        WHEN cd.data_scadenza IS NOT NULL AND cd.data_scadenza < (CURRENT_DATE + '30 days'::interval) THEN 'in_scadenza'::text
        ELSE 'valido'::text
    END AS stato_scadenza
FROM customer_documents cd
JOIN clienti c ON c.id = cd.cliente_id
LEFT JOIN utenti v ON v.id = cd.validato_da
WHERE cd.tipo::text = ANY (ARRAY['contratto'::character varying, 'identita'::character varying, 'certificato'::character varying]::text[]);

-- 8. vw_customer_interventi
DROP VIEW IF EXISTS public.vw_customer_interventi;
CREATE VIEW public.vw_customer_interventi AS
SELECT i.id,
    i.ticket_id,
    i.data_intervento,
    i.ora_inizio,
    i.ora_fine,
    i.durata_effettiva,
    i.tipo_attivita,
    i.descrizione_intervento,
    i.modalita_intervento,
    (u.nome || ' '::text) || u.cognome AS tecnico,
    i.stato_intervento,
    t.id_cliente
FROM interventi i
LEFT JOIN utenti u ON i.id_tecnico = u.id
LEFT JOIN ticket t ON i.ticket_id = t.id;

-- 9. vw_customer_tickets
DROP VIEW IF EXISTS public.vw_customer_tickets;
CREATE VIEW public.vw_customer_tickets AS
SELECT t.id,
    t.numero_ticket,
    t.oggetto,
    t.descrizione,
    t.stato,
    t.priorita,
    t.categoria,
    t.data_apertura,
    t.data_chiusura,
    t.sla_scadenza,
    m.tipo_macchinario,
    m.marca,
    m.modello,
    m.numero_seriale,
    m.ubicazione_specifica,
    (u.nome || ' '::text) || u.cognome AS tecnico_assegnato,
    t.id_cliente,
    (SELECT count(*) AS count FROM interventi WHERE interventi.ticket_id = t.id) AS numero_interventi,
    (SELECT count(*) AS count FROM note_ticket WHERE note_ticket.id_ticket = t.id) AS numero_note,
    t.data_creazione AS created_at,
    t.data_modifica AS updated_at
FROM ticket t
LEFT JOIN macchinari m ON t.id_macchinario = m.id
LEFT JOIN utenti u ON t.id_tecnico_assegnato = u.id;

-- 10. vw_email_retry_status
DROP VIEW IF EXISTS public.vw_email_retry_status;
CREATE VIEW public.vw_email_retry_status AS
SELECT stato,
    count(*) AS totale,
    min(created_at) AS piu_vecchia
FROM email_retry_queue
GROUP BY stato;

-- 11. vw_fatture_complete
DROP VIEW IF EXISTS public.vw_fatture_complete;
CREATE VIEW public.vw_fatture_complete AS
SELECT f.id,
    f.numero_fattura,
    f.anno,
    f.cliente_id,
    f.ticket_id,
    f.interventi_ids,
    f.ore_totali,
    f.tariffa_oraria,
    f.imponibile,
    f.iva_percentuale,
    f.iva_importo,
    f.totale,
    f.data_emissione,
    f.data_scadenza,
    f.storage_path,
    f.storage_bucket,
    f.stato,
    f.data_invio,
    f.data_pagamento,
    f.metodo_pagamento,
    f.generato_da,
    f.note,
    f.created_at,
    f.updated_at,
    c.ragione_sociale AS cliente_ragione_sociale,
    c.partita_iva AS cliente_piva,
    c.email_principale AS cliente_email,
    c.telefono_principale AS cliente_telefono,
    c.indirizzo AS cliente_indirizzo,
    c.comune AS cliente_citta,
    c.cap AS cliente_cap,
    t.numero_ticket,
    t.oggetto AS ticket_oggetto,
    (u.nome || ' '::text) || u.cognome AS generato_da_nome
FROM fatture f
LEFT JOIN clienti c ON f.cliente_id = c.id
LEFT JOIN ticket t ON f.ticket_id = t.id
LEFT JOIN utenti u ON f.generato_da = u.id
ORDER BY f.data_emissione DESC, f.numero_fattura DESC;

-- 12. vw_infrastruttura_clienti_completa
DROP VIEW IF EXISTS public.vw_infrastruttura_clienti_completa;
CREATE VIEW public.vw_infrastruttura_clienti_completa AS
SELECT i.id,
    i.id_cliente,
    i.tipo_apparecchiatura,
    i.tipo_apparecchiatura_altro,
    i.include_planimetria,
    i.planimetria_formato,
    i.planimetria_altro,
    i.larghezza_sala_cm,
    i.lunghezza_sala_cm,
    i.altezza_sala_cm,
    i.ha_fotografie,
    i.fotografie_altro,
    i.parete_strutturale,
    i.materiale_pavimento,
    i.sistema_ancoraggio,
    i.sistema_ancoraggio_altro,
    i.rete_tipo,
    i.rete_tipo_altro,
    i.punto_rete_dispositivo,
    i.banda_rete_gbs,
    i.num_pc_ambulatori,
    i.num_pc_segreteria,
    i.num_pc_amministrazione,
    i.num_pc_altro,
    i.sistemi_operativi,
    i.server_versione,
    i.contatto_informatico_studio,
    i.created_at,
    i.updated_at,
    i.created_by,
    i.updated_by,
    c.codice_cliente,
    c.ragione_sociale,
    c.comune AS citta,
    c.provincia,
    c.email_principale,
    c.telefono_principale,
    (u_created.nome || ' '::text) || u_created.cognome AS creato_da_nome,
    (u_updated.nome || ' '::text) || u_updated.cognome AS modificato_da_nome
FROM infrastruttura_clienti i
LEFT JOIN clienti c ON i.id_cliente = c.id
LEFT JOIN utenti u_created ON i.created_by = u_created.id
LEFT JOIN utenti u_updated ON i.updated_by = u_updated.id;

-- 13. vw_interventi_con_allegati
DROP VIEW IF EXISTS public.vw_interventi_con_allegati;
CREATE VIEW public.vw_interventi_con_allegati AS
SELECT i.id,
    i.ticket_id,
    i.contratto_id,
    i.data_intervento,
    i.ora_inizio,
    i.ora_fine,
    i.durata_effettiva,
    i.durata_addebitata,
    i.is_cortesia,
    i.motivo_cortesia,
    i.ore_scalate,
    i.tecnico_id,
    i.inserito_da,
    i.tipo_attivita,
    i.descrizione_intervento,
    i.note_interne,
    i.materiali_usati,
    i.stato_intervento,
    i.created_at,
    i.updated_at,
    i.modalita_intervento,
    i.ore_da_fatturare,
    i.fatturato,
    i.data_fatturazione,
    i.numero_fattura,
    i.id_tecnico,
    count(CASE WHEN ia.tipo::text = 'foto'::text THEN 1 ELSE NULL::integer END) AS num_foto,
    count(CASE WHEN ia.tipo::text = 'audio'::text THEN 1 ELSE NULL::integer END) AS num_audio,
    count(CASE WHEN ia.tipo::text = 'documento'::text THEN 1 ELSE NULL::integer END) AS num_documenti,
    count(ia.id) AS totale_allegati,
    max(ia.caricato_il) AS ultimo_allegato_caricato
FROM interventi i
LEFT JOIN interventi_allegati ia ON ia.intervento_id = i.id
GROUP BY i.id;

-- 14. vw_tariffe_attive
DROP VIEW IF EXISTS public.vw_tariffe_attive;
CREATE VIEW public.vw_tariffe_attive AS
SELECT id,
    codice,
    descrizione,
    categoria,
    prezzo,
    unita,
    frazionabile,
    frazionamento_minimo,
    applica_a,
    note,
    prezzo * 2::numeric AS prezzo_festivo
FROM tariffe_servizio
WHERE attivo = true AND (data_validita_a IS NULL OR data_validita_a >= CURRENT_DATE)
ORDER BY categoria, codice;

-- 15. vw_trascrizioni_health
DROP VIEW IF EXISTS public.vw_trascrizioni_health;
CREATE VIEW public.vw_trascrizioni_health AS
SELECT count(DISTINCT i.id) AS totale_interventi,
    count(DISTINCT CASE WHEN i.trascrizioni_audio IS NOT NULL THEN i.id ELSE NULL::uuid END) AS interventi_con_trascrizioni,
    count(ia.id) FILTER (WHERE ia.tipo::text = 'audio'::text) AS totale_audio,
    count(ia.id) FILTER (WHERE ia.tipo::text = 'audio'::text AND ia.trascrizione_stato::text = 'pending'::text) AS audio_pending,
    count(ia.id) FILTER (WHERE ia.tipo::text = 'audio'::text AND ia.trascrizione_stato::text = 'processing'::text) AS audio_processing,
    count(ia.id) FILTER (WHERE ia.tipo::text = 'audio'::text AND ia.trascrizione_stato::text = 'completed'::text) AS audio_completed,
    count(ia.id) FILTER (WHERE ia.tipo::text = 'audio'::text AND ia.trascrizione_stato::text = 'failed'::text) AS audio_failed,
    avg(EXTRACT(epoch FROM ia.trascrizione_completata_il - ia.caricato_il)) FILTER (WHERE ia.trascrizione_stato::text = 'completed'::text) AS avg_secondi_trascrizione,
    count(ia.id) FILTER (WHERE ia.tipo::text = 'foto'::text) AS totale_foto
FROM interventi i
LEFT JOIN interventi_allegati ia ON ia.intervento_id = i.id;

-- =====================================================
-- PARTE 2: Abilitare RLS sulla tabella customer_firme_digitali
-- =====================================================

-- Abilita RLS
ALTER TABLE public.customer_firme_digitali ENABLE ROW LEVEL SECURITY;

-- Policy: Solo utenti autenticati possono vedere le firme
CREATE POLICY "Utenti autenticati possono vedere firme"
ON public.customer_firme_digitali
FOR SELECT
TO authenticated
USING (true);

-- Policy: Solo admin possono inserire firme
CREATE POLICY "Solo admin possono inserire firme"
ON public.customer_firme_digitali
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.utenti
    WHERE id = auth.uid() AND ruolo = 'admin'
  )
);

-- Policy: Solo admin possono modificare firme
CREATE POLICY "Solo admin possono modificare firme"
ON public.customer_firme_digitali
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.utenti
    WHERE id = auth.uid() AND ruolo = 'admin'
  )
);

-- Policy: Solo admin possono eliminare firme
CREATE POLICY "Solo admin possono eliminare firme"
ON public.customer_firme_digitali
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.utenti
    WHERE id = auth.uid() AND ruolo = 'admin'
  )
);

-- =====================================================
-- PARTE 3: Grant permessi sulle viste
-- =====================================================

GRANT SELECT ON public.ticket_note_complete TO authenticated;
GRANT SELECT ON public.ticket_storico_complete TO authenticated;
GRANT SELECT ON public.v_audio_con_trascrizione TO authenticated;
GRANT SELECT ON public.v_customer_documents_stats TO authenticated;
GRANT SELECT ON public.v_interventi_con_trascrizioni TO authenticated;
GRANT SELECT ON public.v_team_notifications_unread TO authenticated;
GRANT SELECT ON public.vw_customer_documents_onboarding TO authenticated;
GRANT SELECT ON public.vw_customer_interventi TO authenticated;
GRANT SELECT ON public.vw_customer_tickets TO authenticated;
GRANT SELECT ON public.vw_email_retry_status TO authenticated;
GRANT SELECT ON public.vw_fatture_complete TO authenticated;
GRANT SELECT ON public.vw_infrastruttura_clienti_completa TO authenticated;
GRANT SELECT ON public.vw_interventi_con_allegati TO authenticated;
GRANT SELECT ON public.vw_tariffe_attive TO authenticated;
GRANT SELECT ON public.vw_trascrizioni_health TO authenticated;

-- =====================================================
-- VERIFICA FINALE
-- =====================================================
-- Dopo l'esecuzione, ri-eseguire il Database Linter di Supabase
-- per verificare che tutti i warning siano stati risolti.
--
-- Per verificare che le viste non abbiano più SECURITY DEFINER:
-- SELECT viewname FROM pg_views
-- WHERE schemaname = 'public'
-- AND definition LIKE '%security_barrier%';
-- (dovrebbe restituire 0 righe)
