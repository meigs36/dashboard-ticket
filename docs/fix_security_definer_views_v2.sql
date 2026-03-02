-- =====================================================
-- FIX SECURITY WARNINGS - SUPABASE LINTER (v2)
-- Data: 2026-02-12
-- =====================================================
-- CORREZIONE: Usa ALTER VIEW per cambiare SECURITY DEFINER -> INVOKER
-- Questo è più sicuro e veloce che ricreare le viste
-- =====================================================

-- Metodo 1: ALTER VIEW SET (security_invoker = true)
-- Questo è il metodo più pulito in PostgreSQL 15+

ALTER VIEW public.ticket_note_complete SET (security_invoker = true);
ALTER VIEW public.ticket_storico_complete SET (security_invoker = true);
ALTER VIEW public.v_audio_con_trascrizione SET (security_invoker = true);
ALTER VIEW public.v_customer_documents_stats SET (security_invoker = true);
ALTER VIEW public.v_interventi_con_trascrizioni SET (security_invoker = true);
ALTER VIEW public.v_team_notifications_unread SET (security_invoker = true);
ALTER VIEW public.vw_customer_documents_onboarding SET (security_invoker = true);
ALTER VIEW public.vw_customer_interventi SET (security_invoker = true);
ALTER VIEW public.vw_customer_tickets SET (security_invoker = true);
ALTER VIEW public.vw_email_retry_status SET (security_invoker = true);
ALTER VIEW public.vw_fatture_complete SET (security_invoker = true);
ALTER VIEW public.vw_infrastruttura_clienti_completa SET (security_invoker = true);
ALTER VIEW public.vw_interventi_con_allegati SET (security_invoker = true);
ALTER VIEW public.vw_tariffe_attive SET (security_invoker = true);
ALTER VIEW public.vw_trascrizioni_health SET (security_invoker = true);

-- =====================================================
-- Abilita RLS su customer_firme_digitali (se non già fatto)
-- =====================================================

ALTER TABLE public.customer_firme_digitali ENABLE ROW LEVEL SECURITY;

-- Rimuovi policy esistenti se presenti (per evitare duplicati)
DROP POLICY IF EXISTS "Utenti autenticati possono vedere firme" ON public.customer_firme_digitali;
DROP POLICY IF EXISTS "Solo admin possono inserire firme" ON public.customer_firme_digitali;
DROP POLICY IF EXISTS "Solo admin possono modificare firme" ON public.customer_firme_digitali;
DROP POLICY IF EXISTS "Solo admin possono eliminare firme" ON public.customer_firme_digitali;

-- Ricrea le policy
CREATE POLICY "Utenti autenticati possono vedere firme"
ON public.customer_firme_digitali
FOR SELECT
TO authenticated
USING (true);

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
-- VERIFICA
-- =====================================================
-- Esegui questa query per verificare che le viste siano ora SECURITY INVOKER:
--
-- SELECT
--   viewname,
--   CASE
--     WHEN definition LIKE '%security_barrier%' THEN 'SECURITY DEFINER'
--     ELSE 'SECURITY INVOKER'
--   END as security_mode
-- FROM pg_views
-- WHERE schemaname = 'public'
-- AND viewname IN (
--   'ticket_note_complete', 'ticket_storico_complete', 'v_audio_con_trascrizione',
--   'v_customer_documents_stats', 'v_interventi_con_trascrizioni', 'v_team_notifications_unread',
--   'vw_customer_documents_onboarding', 'vw_customer_interventi', 'vw_customer_tickets',
--   'vw_email_retry_status', 'vw_fatture_complete', 'vw_infrastruttura_clienti_completa',
--   'vw_interventi_con_allegati', 'vw_tariffe_attive', 'vw_trascrizioni_health'
-- );
