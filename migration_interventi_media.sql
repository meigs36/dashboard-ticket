-- ============================================
-- MIGRAZIONE: Supporto Media per Interventi
-- Aggiunge tabella allegati e storage buckets
-- ============================================

-- 1. Crea tabella per allegati interventi
CREATE TABLE IF NOT EXISTS interventi_allegati (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervento_id UUID NOT NULL REFERENCES interventi(id) ON DELETE CASCADE,
    
    -- Info file
    tipo VARCHAR(20) NOT NULL, -- 'audio', 'foto', 'documento'
    nome_file VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL, -- Path in Supabase Storage
    storage_bucket VARCHAR(50) DEFAULT 'interventi-media',
    
    -- Metadata
    mime_type VARCHAR(100),
    dimensione_bytes INTEGER,
    durata_secondi INTEGER, -- Solo per audio
    
    -- Trascrizione (per audio)
    trascrizione TEXT,
    trascrizione_stato VARCHAR(20) DEFAULT 'pending', -- pending / processing / completed / failed
    trascrizione_data TIMESTAMP,
    
    -- Timestamp e utente
    caricato_da UUID NOT NULL REFERENCES utenti(id),
    caricato_il TIMESTAMP DEFAULT NOW(),
    
    -- Note opzionali
    note TEXT,
    
    CONSTRAINT chk_tipo_allegato CHECK (tipo IN ('audio', 'foto', 'documento')),
    CONSTRAINT chk_trascrizione_stato CHECK (trascrizione_stato IN ('pending', 'processing', 'completed', 'failed'))
);

-- Indici per performance
CREATE INDEX idx_allegati_intervento ON interventi_allegati(intervento_id);
CREATE INDEX idx_allegati_tipo ON interventi_allegati(tipo);
CREATE INDEX idx_allegati_stato_trascrizione ON interventi_allegati(trascrizione_stato);

-- 2. Commenti per documentazione
COMMENT ON TABLE interventi_allegati IS 'Allegati multimediali (audio, foto, documenti) associati agli interventi tecnici';
COMMENT ON COLUMN interventi_allegati.trascrizione IS 'Testo trascritto da audio tramite Whisper API o AssemblyAI';
COMMENT ON COLUMN interventi_allegati.durata_secondi IS 'Durata in secondi per file audio';

-- 3. RLS (Row Level Security) - Configura in Supabase Dashboard
-- I tecnici possono vedere/caricare solo allegati dei propri interventi
-- Gli admin possono vedere tutto

-- Abilita RLS
ALTER TABLE interventi_allegati ENABLE ROW LEVEL SECURITY;

-- Policy: Lettura per tecnici assegnati all'intervento
CREATE POLICY "Tecnici possono vedere allegati dei propri interventi"
ON interventi_allegati
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM interventi i
        WHERE i.id = interventi_allegati.intervento_id
        AND i.id_tecnico = auth.uid()
    )
    OR 
    -- Admin possono vedere tutto
    EXISTS (
        SELECT 1 FROM utenti u
        WHERE u.id = auth.uid()
        AND u.ruolo IN ('admin', 'manager')
    )
);

-- Policy: Inserimento per tecnici assegnati
CREATE POLICY "Tecnici possono caricare allegati nei propri interventi"
ON interventi_allegati
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM interventi i
        WHERE i.id = interventi_allegati.intervento_id
        AND i.id_tecnico = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM utenti u
        WHERE u.id = auth.uid()
        AND u.ruolo IN ('admin', 'manager')
    )
);

-- Policy: Cancellazione per admin e proprietario
CREATE POLICY "Tecnici possono cancellare i propri allegati"
ON interventi_allegati
FOR DELETE
USING (
    caricato_da = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM utenti u
        WHERE u.id = auth.uid()
        AND u.ruolo IN ('admin', 'manager')
    )
);

-- ============================================
-- STORAGE BUCKETS (da configurare in Supabase Dashboard)
-- ============================================

-- In Supabase Dashboard > Storage, crea:
-- 1. Bucket: "interventi-media"
--    - Public: NO (privato)
--    - File size limit: 50 MB
--    - Allowed MIME types: audio/*, image/*, application/pdf

-- Esempio policy Storage (da applicare in Dashboard):
/*
-- Policy per upload
CREATE POLICY "Tecnici possono caricare nel proprio spazio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'interventi-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy per lettura
CREATE POLICY "Tecnici possono leggere file autorizzati"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'interventi-media'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR 
    EXISTS (
      SELECT 1 FROM utenti WHERE id = auth.uid() AND ruolo IN ('admin', 'manager')
    )
  )
);
*/

-- ============================================
-- VIEW: Interventi con conteggio allegati
-- ============================================
CREATE OR REPLACE VIEW vw_interventi_con_allegati AS
SELECT 
    i.*,
    COUNT(CASE WHEN ia.tipo = 'foto' THEN 1 END) as num_foto,
    COUNT(CASE WHEN ia.tipo = 'audio' THEN 1 END) as num_audio,
    COUNT(CASE WHEN ia.tipo = 'documento' THEN 1 END) as num_documenti,
    COUNT(ia.id) as totale_allegati,
    MAX(ia.caricato_il) as ultimo_allegato_caricato
FROM interventi i
LEFT JOIN interventi_allegati ia ON ia.intervento_id = i.id
GROUP BY i.id;

-- ============================================
-- FUNCTION: Aggiorna contatore allegati
-- ============================================
CREATE OR REPLACE FUNCTION aggiorna_ultimo_intervento()
RETURNS TRIGGER AS $$
BEGIN
    -- Aggiorna data_ultimo_intervento del macchinario se presente
    IF NEW.ticket_id IS NOT NULL THEN
        UPDATE macchinari
        SET data_ultimo_intervento = NOW()
        WHERE id = (
            SELECT id_macchinario 
            FROM ticket 
            WHERE id = NEW.ticket_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per aggiornamento automatico
DROP TRIGGER IF EXISTS trg_aggiorna_ultimo_intervento ON interventi;
CREATE TRIGGER trg_aggiorna_ultimo_intervento
    AFTER INSERT OR UPDATE ON interventi
    FOR EACH ROW
    EXECUTE FUNCTION aggiorna_ultimo_intervento();

-- ============================================
-- NOTE IMPORTANTI
-- ============================================
/*
DOPO AVER ESEGUITO QUESTO SCRIPT:

1. Vai in Supabase Dashboard > Storage
2. Crea bucket "interventi-media" con configurazione:
   - Public: NO
   - File size limit: 50 MB
   - Allowed MIME types: audio/webm, audio/mp3, audio/wav, image/jpeg, image/png, image/webp

3. Configura le policy storage (sopra nel commento)

4. Testa l'upload con un file di prova

5. Verifica che RLS funzioni correttamente
*/
