-- =====================================================
-- TABELLA: consensi_accesso_remoto
-- Gestione consensi per accesso remoto ai sistemi
-- dei clienti (studi dentistici)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.consensi_accesso_remoto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clienti(id) ON DELETE RESTRICT,
  tecnico_id UUID NOT NULL REFERENCES public.utenti(id) ON DELETE RESTRICT,

  -- Dati consenso (4 checkbox obbligatori)
  consenso_accesso_remoto BOOLEAN NOT NULL DEFAULT false,
  consenso_dati_sanitari BOOLEAN NOT NULL DEFAULT false,
  consenso_modalita_accesso BOOLEAN NOT NULL DEFAULT false,
  consenso_autorizzazione_titolare BOOLEAN NOT NULL DEFAULT false,

  -- Firma grafica
  firma_grafica_url TEXT,
  firma_grafica_bucket VARCHAR(50) DEFAULT 'customer-documents',

  -- Certificato crittografico
  documento_hash VARCHAR(64) NOT NULL,
  certificato_json JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- PDF generato
  pdf_storage_path TEXT,
  pdf_storage_bucket VARCHAR(50) DEFAULT 'customer-documents',

  -- Metadata di firma
  ip_address VARCHAR(45),
  user_agent TEXT,
  firmato_da_nome VARCHAR(255) NOT NULL,
  firmato_da_ruolo VARCHAR(100),
  note TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revocato_il TIMESTAMPTZ,
  revocato_motivo TEXT
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_consensi_cliente ON public.consensi_accesso_remoto(cliente_id);
CREATE INDEX IF NOT EXISTS idx_consensi_tecnico ON public.consensi_accesso_remoto(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_consensi_data ON public.consensi_accesso_remoto(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consensi_attivi ON public.consensi_accesso_remoto(cliente_id) WHERE revocato_il IS NULL;

-- RLS
ALTER TABLE public.consensi_accesso_remoto ENABLE ROW LEVEL SECURITY;

-- Gli utenti autenticati (admin/tecnici) possono vedere tutti i consensi
CREATE POLICY "Utenti autenticati vedono consensi"
ON public.consensi_accesso_remoto
FOR SELECT
TO authenticated
USING (true);

-- Inserimento aperto (pagina pubblica senza login)
CREATE POLICY "Inserimento pubblico consensi"
ON public.consensi_accesso_remoto
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Solo admin possono aggiornare (per revoca)
CREATE POLICY "Solo admin aggiornano consensi"
ON public.consensi_accesso_remoto
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.utenti
    WHERE id = auth.uid() AND ruolo = 'admin'
  )
);

-- Nessuno può eliminare (storico immutabile)
-- Non creiamo policy DELETE

-- Grant per utenti anonimi (pagina pubblica)
GRANT SELECT, INSERT ON public.consensi_accesso_remoto TO anon;
GRANT USAGE ON SCHEMA public TO anon;
