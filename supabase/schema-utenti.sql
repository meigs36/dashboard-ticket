-- =====================================================
-- SCHEMA AUTENTICAZIONE - Tabella Utenti
-- =====================================================

-- 1. Crea tabella utenti
CREATE TABLE IF NOT EXISTS public.utenti (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  ruolo TEXT NOT NULL CHECK (ruolo IN ('admin', 'tecnico')),
  telefono TEXT,
  attivo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Abilita RLS (Row Level Security)
ALTER TABLE public.utenti ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Gli utenti possono leggere il proprio profilo
CREATE POLICY "Utenti possono leggere il proprio profilo"
ON public.utenti
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 4. Policy: Gli admin possono leggere tutti i profili
CREATE POLICY "Admin possono leggere tutti i profili"
ON public.utenti
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.utenti
    WHERE id = auth.uid() AND ruolo = 'admin'
  )
);

-- 5. Policy: Gli utenti possono aggiornare il proprio profilo
CREATE POLICY "Utenti possono aggiornare il proprio profilo"
ON public.utenti
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6. Policy: Solo admin possono creare nuovi utenti
CREATE POLICY "Solo admin possono creare utenti"
ON public.utenti
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.utenti
    WHERE id = auth.uid() AND ruolo = 'admin'
  )
);

-- 7. Policy: Solo admin possono eliminare utenti
CREATE POLICY "Solo admin possono eliminare utenti"
ON public.utenti
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.utenti
    WHERE id = auth.uid() AND ruolo = 'admin'
  )
);

-- 8. Indici per performance
CREATE INDEX IF NOT EXISTS idx_utenti_email ON public.utenti(email);
CREATE INDEX IF NOT EXISTS idx_utenti_ruolo ON public.utenti(ruolo);
CREATE INDEX IF NOT EXISTS idx_utenti_attivo ON public.utenti(attivo);

-- 9. Trigger per updated_at automatico
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_utenti_updated_at
BEFORE UPDATE ON public.utenti
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INSERISCI UTENTI DEMO (per testing)
-- =====================================================

-- IMPORTANTE: Crea prima gli utenti in Supabase Auth Dashboard
-- poi inserisci qui i loro UUID

-- Admin Demo
-- INSERT INTO public.utenti (id, email, nome, cognome, ruolo, attivo)
-- VALUES (
--   'uuid-from-supabase-auth',
--   'admin@demo.it',
--   'Mario',
--   'Rossi',
--   'admin',
--   true
-- );

-- Tecnico Demo
-- INSERT INTO public.utenti (id, email, nome, cognome, ruolo, attivo)
-- VALUES (
--   'uuid-from-supabase-auth',
--   'tecnico@demo.it',
--   'Laura',
--   'Bianchi',
--   'tecnico',
--   true
-- );

-- =====================================================
-- MODIFICHE ALLE TABELLE ESISTENTI
-- =====================================================

-- Aggiungi colonna id_tecnico_assegnato nella tabella ticket se non esiste
ALTER TABLE public.ticket 
ADD COLUMN IF NOT EXISTS id_tecnico_assegnato UUID REFERENCES public.utenti(id);

-- Aggiungi indice
CREATE INDEX IF NOT EXISTS idx_ticket_tecnico ON public.ticket(id_tecnico_assegnato);

-- =====================================================
-- FUNZIONI UTILITY
-- =====================================================

-- Funzione per ottenere il ruolo dell'utente corrente
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
  SELECT ruolo FROM public.utenti WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Funzione per verificare se l'utente è admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.utenti 
    WHERE id = auth.uid() AND ruolo = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- VIEWS UTILI
-- =====================================================

-- View per elenco tecnici attivi
CREATE OR REPLACE VIEW public.tecnici_attivi AS
SELECT 
  id,
  email,
  nome,
  cognome,
  telefono,
  created_at
FROM public.utenti
WHERE ruolo = 'tecnico' AND attivo = true
ORDER BY nome, cognome;

-- Grant accesso alla view
GRANT SELECT ON public.tecnici_attivi TO authenticated;
