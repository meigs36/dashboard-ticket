create table public.clienti (
  id uuid not null default extensions.uuid_generate_v4 (),
  codice_cliente character varying(50) not null,
  ragione_sociale character varying(255) not null,
  codice_fiscale character varying(16) null,
  partita_iva character varying(11) null,
  via character varying(255) null,
  citta character varying(100) null,
  cap character varying(10) null,
  provincia character varying(2) null,
  regione character varying(50) null,
  telefono_principale character varying(20) null,
  telefono_secondario character varying(20) null,
  email_principale character varying(255) null,
  email_amministrazione character varying(255) null,
  email_pec character varying(255) null,
  email_riparazioni character varying(255) null,
  contatto_referente_nome character varying(255) null,
  telefono_referente character varying(20) null,
  email_referente character varying(255) null,
  tipo_contratto character varying(20) null default 'standard'::character varying,
  livello_sla character varying(10) null default '48h'::character varying,
  agente_assegnato character varying(100) null,
  sito_web character varying(255) null,
  note text null,
  note_interne text null,
  attivo boolean null default true,
  data_creazione timestamp without time zone null default now(),
  data_modifica timestamp without time zone null default now(),
  creato_da character varying(100) null,
  modificato_da character varying(100) null,
  constraint clienti_pkey primary key (id),
  constraint clienti_codice_cliente_key unique (codice_cliente),
  constraint chk_livello_sla check (
    (
      (livello_sla)::text = any (
        (
          array[
            '4h'::character varying,
            '24h'::character varying,
            '48h'::character varying,
            '72h'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint chk_tipo_contratto check (
    (
      (tipo_contratto)::text = any (
        (
          array[
            'standard'::character varying,
            'premium'::character varying,
            'enterprise'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_clienti_ragione_sociale on public.clienti using btree (ragione_sociale) TABLESPACE pg_default;

create index IF not exists idx_clienti_codice_cliente on public.clienti using btree (codice_cliente) TABLESPACE pg_default;

create index IF not exists idx_clienti_email_riparazioni on public.clienti using btree (email_riparazioni) TABLESPACE pg_default;

create index IF not exists idx_clienti_attivo on public.clienti using btree (attivo) TABLESPACE pg_default;

create trigger update_clienti_modtime BEFORE
update on clienti for EACH row
execute FUNCTION update_modified_column ();

create table public.contratti (
  id uuid not null default extensions.uuid_generate_v4 (),
  num_contratto character varying(50) not null,
  codice_cliente character varying(50) not null,
  tipo_contratto character varying(100) null,
  nome_contratto character varying(255) null,
  sede_riferimento character varying(255) null,
  data_contratto date not null,
  data_scadenza date not null,
  data_rinnovo date null,
  ore_incluse numeric(5, 2) not null default 0,
  ore_utilizzate numeric(5, 2) not null default 0,
  ore_rimanenti numeric GENERATED ALWAYS as ((ore_incluse - ore_utilizzate)) STORED (5, 2) null,
  stato character varying(20) null default 'attivo'::character varying,
  note text null,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint contratti_pkey primary key (id),
  constraint contratti_num_contratto_key unique (num_contratto),
  constraint contratti_codice_cliente_fkey foreign KEY (codice_cliente) references clienti (codice_cliente) on delete RESTRICT,
  constraint chk_ore_positive check (
    (
      (ore_incluse >= (0)::numeric)
      and (ore_utilizzate >= (0)::numeric)
    )
  ),
  constraint chk_stato_contratto check (
    (
      (stato)::text = any (
        (
          array[
            'attivo'::character varying,
            'scaduto'::character varying,
            'rinnovato'::character varying,
            'sospeso'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_contratti_codice_cliente on public.contratti using btree (codice_cliente) TABLESPACE pg_default;

create index IF not exists idx_contratti_num_contratto on public.contratti using btree (num_contratto) TABLESPACE pg_default;

create index IF not exists idx_contratti_stato on public.contratti using btree (stato) TABLESPACE pg_default;

create index IF not exists idx_contratti_scadenza on public.contratti using btree (data_scadenza) TABLESPACE pg_default;

create trigger update_contratti_modtime BEFORE
update on contratti for EACH row
execute FUNCTION update_modified_column ();

create table public.interventi (
  id uuid not null default extensions.uuid_generate_v4 (),
  ticket_id uuid not null,
  contratto_id uuid null,
  data_intervento date not null,
  ora_inizio time without time zone not null,
  ora_fine time without time zone null,
  durata_effettiva numeric(5, 2) null,
  durata_addebitata numeric(5, 2) null,
  is_cortesia boolean null default false,
  motivo_cortesia text null,
  ore_scalate numeric(5, 2) null default 0,
  tecnico_id uuid not null,
  inserito_da uuid not null,
  tipo_attivita character varying(100) null,
  descrizione_intervento text null,
  note_interne text null,
  materiali_usati jsonb null,
  stato_intervento character varying(20) null default 'completato'::character varying,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint interventi_pkey primary key (id),
  constraint interventi_ticket_id_fkey foreign KEY (ticket_id) references ticket (id) on delete CASCADE,
  constraint interventi_contratto_id_fkey foreign KEY (contratto_id) references contratti (id) on delete set null,
  constraint interventi_inserito_da_fkey foreign KEY (inserito_da) references utenti (id) on delete RESTRICT,
  constraint interventi_tecnico_id_fkey foreign KEY (tecnico_id) references tecnici (id) on delete RESTRICT,
  constraint chk_cortesia_ore check (
    (
      (
        (is_cortesia = true)
        and (ore_scalate = (0)::numeric)
      )
      or (is_cortesia = false)
    )
  ),
  constraint chk_ora_fine_dopo_inizio check (
    (
      (ora_fine is null)
      or (ora_fine > ora_inizio)
    )
  ),
  constraint chk_stato_intervento check (
    (
      (stato_intervento)::text = any (
        (
          array[
            'completato'::character varying,
            'in_corso'::character varying,
            'annullato'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint chk_durate_positive check (
    (
      (durata_effettiva is null)
      or (
        (durata_effettiva >= (0)::numeric)
        and (durata_addebitata is null)
      )
      or (durata_addebitata >= (0)::numeric)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_interventi_ticket on public.interventi using btree (ticket_id) TABLESPACE pg_default;

create index IF not exists idx_interventi_contratto on public.interventi using btree (contratto_id) TABLESPACE pg_default;

create index IF not exists idx_interventi_tecnico on public.interventi using btree (tecnico_id) TABLESPACE pg_default;

create index IF not exists idx_interventi_data on public.interventi using btree (data_intervento desc) TABLESPACE pg_default;

create index IF not exists idx_interventi_cortesia on public.interventi using btree (is_cortesia) TABLESPACE pg_default;

create index IF not exists idx_interventi_stato on public.interventi using btree (stato_intervento) TABLESPACE pg_default;

create trigger auto_aggiorna_contratto
after INSERT on interventi for EACH row
execute FUNCTION aggiorna_ore_contratto ();

create trigger auto_calcola_durata BEFORE INSERT
or
update on interventi for EACH row
execute FUNCTION calcola_durata_intervento ();

create trigger auto_gestisci_modifica_intervento
after DELETE
or
update on interventi for EACH row
execute FUNCTION gestisci_modifica_intervento ();

create trigger update_interventi_modtime BEFORE
update on interventi for EACH row
execute FUNCTION update_modified_column ();

create table public.macchinari (
  id uuid not null default extensions.uuid_generate_v4 (),
  id_cliente uuid not null,
  numero_seriale character varying(100) not null,
  numero_libro character varying(50) null,
  tipo_macchinario character varying(100) null,
  marca character varying(100) null,
  modello character varying(100) null,
  data_installazione date null,
  garanzia_scadenza date null,
  garanzia_estensione_scadenza date null,
  contratto_manutenzione character varying(20) null default 'scaduto'::character varying,
  stato character varying(20) null default 'attivo'::character varying,
  ubicazione_specifica character varying(255) null,
  note_tecniche text null,
  documentazione_url text null,
  data_creazione timestamp without time zone null default now(),
  data_modifica timestamp without time zone null default now(),
  data_ultimo_intervento timestamp without time zone null,
  constraint macchinari_pkey primary key (id),
  constraint macchinari_numero_seriale_key unique (numero_seriale),
  constraint macchinari_id_cliente_fkey foreign KEY (id_cliente) references clienti (id) on delete CASCADE,
  constraint chk_contratto_manutenzione check (
    (
      (contratto_manutenzione)::text = any (
        (
          array[
            'attivo'::character varying,
            'scaduto'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint chk_stato_macchinario check (
    (
      (stato)::text = any (
        (
          array[
            'attivo'::character varying,
            'obsoleto'::character varying,
            'dismesso'::character varying,
            'in_manutenzione'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_macchinari_cliente on public.macchinari using btree (id_cliente) TABLESPACE pg_default;

create index IF not exists idx_macchinari_numero_seriale on public.macchinari using btree (numero_seriale) TABLESPACE pg_default;

create index IF not exists idx_macchinari_tipo on public.macchinari using btree (tipo_macchinario) TABLESPACE pg_default;

create index IF not exists idx_macchinari_stato on public.macchinari using btree (stato) TABLESPACE pg_default;

create trigger update_macchinari_modtime BEFORE
update on macchinari for EACH row
execute FUNCTION update_modified_column ();

create table public.tecnici (
  id uuid not null default extensions.uuid_generate_v4 (),
  nome character varying(100) not null,
  cognome character varying(100) not null,
  email character varying(255) not null,
  telefono character varying(20) null,
  competenze text[] null,
  google_calendar_id character varying(255) null,
  google_refresh_token text null,
  livello character varying(20) null default 'junior'::character varying,
  attivo boolean null default true,
  data_creazione timestamp without time zone null default now(),
  data_modifica timestamp without time zone null default now(),
  constraint tecnici_pkey primary key (id),
  constraint tecnici_email_key unique (email),
  constraint tecnici_google_calendar_id_key unique (google_calendar_id),
  constraint chk_livello_tecnico check (
    (
      (livello)::text = any (
        (
          array[
            'junior'::character varying,
            'senior'::character varying,
            'specialist'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_tecnici_email on public.tecnici using btree (email) TABLESPACE pg_default;

create index IF not exists idx_tecnici_attivo on public.tecnici using btree (attivo) TABLESPACE pg_default;

create index IF not exists idx_tecnici_competenze on public.tecnici using gin (competenze) TABLESPACE pg_default;

create trigger update_tecnici_modtime BEFORE
update on tecnici for EACH row
execute FUNCTION update_modified_column ();

create table public.ticket (
  id uuid not null default extensions.uuid_generate_v4 (),
  numero_ticket character varying(50) not null,
  id_cliente uuid not null,
  id_macchinario uuid null,
  id_tecnico_assegnato uuid null,
  canale_origine character varying(30) not null,
  priorita character varying(10) not null default 'media'::character varying,
  stato character varying(30) not null default 'aperto'::character varying,
  categoria character varying(50) null,
  oggetto character varying(255) not null,
  descrizione text not null,
  trascrizione_chiamata text null,
  allegati jsonb null,
  data_apertura timestamp without time zone null default now(),
  data_assegnazione timestamp without time zone null,
  data_presa_in_carico timestamp without time zone null,
  data_chiusura timestamp without time zone null,
  sla_scadenza timestamp without time zone null,
  tempo_risoluzione_minuti integer null,
  note_interne text null,
  comunicazioni_cliente jsonb null,
  is_critico boolean null default false,
  motivo_critico character varying(255) null,
  valutazione_cliente integer null,
  feedback_cliente text null,
  data_creazione timestamp without time zone null default now(),
  data_modifica timestamp without time zone null default now(),
  constraint ticket_pkey primary key (id),
  constraint ticket_numero_ticket_key unique (numero_ticket),
  constraint ticket_id_macchinario_fkey foreign KEY (id_macchinario) references macchinari (id) on delete set null,
  constraint ticket_id_tecnico_assegnato_fkey foreign KEY (id_tecnico_assegnato) references utenti (id) on delete set null,
  constraint ticket_id_cliente_fkey foreign KEY (id_cliente) references clienti (id) on delete RESTRICT,
  constraint ticket_valutazione_cliente_check check (
    (
      (valutazione_cliente >= 1)
      and (valutazione_cliente <= 5)
    )
  ),
  constraint chk_categoria check (
    (
      (categoria)::text = any (
        (
          array[
            'guasto_macchina'::character varying,
            'manutenzione_software'::character varying,
            'consulenza'::character varying,
            'installazione'::character varying,
            'altro'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint chk_priorita check (
    (
      (priorita)::text = any (
        (
          array[
            'bassa'::character varying,
            'media'::character varying,
            'alta'::character varying,
            'critica'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint chk_stato check (
    (
      (stato)::text = any (
        (
          array[
            'aperto'::character varying,
            'assegnato'::character varying,
            'in_lavorazione'::character varying,
            'in_attesa_cliente'::character varying,
            'in_attesa_parti'::character varying,
            'risolto'::character varying,
            'chiuso'::character varying,
            'annullato'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint chk_canale check (
    (
      (canale_origine)::text = any (
        (
          array[
            'form_web'::character varying,
            'telefono'::character varying,
            'whatsapp'::character varying,
            'admin_manuale'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_ticket_numero on public.ticket using btree (numero_ticket) TABLESPACE pg_default;

create index IF not exists idx_ticket_cliente on public.ticket using btree (id_cliente) TABLESPACE pg_default;

create index IF not exists idx_ticket_tecnico on public.ticket using btree (id_tecnico_assegnato) TABLESPACE pg_default;

create index IF not exists idx_ticket_macchinario on public.ticket using btree (id_macchinario) TABLESPACE pg_default;

create index IF not exists idx_ticket_stato on public.ticket using btree (stato) TABLESPACE pg_default;

create index IF not exists idx_ticket_priorita on public.ticket using btree (priorita) TABLESPACE pg_default;

create index IF not exists idx_ticket_critico on public.ticket using btree (is_critico) TABLESPACE pg_default;

create index IF not exists idx_ticket_data_apertura on public.ticket using btree (data_apertura desc) TABLESPACE pg_default;

create index IF not exists idx_ticket_sla_scadenza on public.ticket using btree (sla_scadenza) TABLESPACE pg_default;

create index IF not exists idx_ticket_tecnico_assegnato on public.ticket using btree (id_tecnico_assegnato) TABLESPACE pg_default;

create trigger auto_calculate_sla BEFORE INSERT on ticket for EACH row
execute FUNCTION calculate_sla_deadline ();

create trigger auto_generate_ticket_number BEFORE INSERT on ticket for EACH row when (
  new.numero_ticket is null
  or new.numero_ticket::text = ''::text
)
execute FUNCTION generate_ticket_number ();

create trigger ticket_change_logger
after
update on ticket for EACH row
execute FUNCTION log_ticket_change ();

create trigger update_ticket_modtime BEFORE
update on ticket for EACH row
execute FUNCTION update_modified_column ();

create table public.ticket_note (
  id uuid not null default gen_random_uuid (),
  id_ticket uuid not null,
  id_utente uuid not null,
  tipo text not null,
  contenuto text not null,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint ticket_note_pkey primary key (id),
  constraint ticket_note_id_ticket_fkey foreign KEY (id_ticket) references ticket (id) on delete CASCADE,
  constraint ticket_note_id_utente_fkey foreign KEY (id_utente) references utenti (id),
  constraint ticket_note_tipo_check check (
    (
      tipo = any (
        array[
          'nota_interna'::text,
          'commento_cliente'::text,
          'cambio_stato'::text,
          'assegnazione'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_ticket_note_ticket on public.ticket_note using btree (id_ticket) TABLESPACE pg_default;

create index IF not exists idx_ticket_note_utente on public.ticket_note using btree (id_utente) TABLESPACE pg_default;

create index IF not exists idx_ticket_note_created on public.ticket_note using btree (created_at desc) TABLESPACE pg_default;

create table public.ticket_storico (
  id uuid not null default gen_random_uuid (),
  id_ticket uuid not null,
  id_utente uuid not null,
  azione text not null,
  campo_modificato text null,
  valore_precedente text null,
  valore_nuovo text null,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint ticket_storico_pkey primary key (id),
  constraint ticket_storico_id_ticket_fkey foreign KEY (id_ticket) references ticket (id) on delete CASCADE,
  constraint ticket_storico_id_utente_fkey foreign KEY (id_utente) references utenti (id)
) TABLESPACE pg_default;

create index IF not exists idx_ticket_storico_ticket on public.ticket_storico using btree (id_ticket) TABLESPACE pg_default;

create index IF not exists idx_ticket_storico_created on public.ticket_storico using btree (created_at desc) TABLESPACE pg_default;

create table public.ticket_storico (
  id uuid not null default gen_random_uuid (),
  id_ticket uuid not null,
  id_utente uuid not null,
  azione text not null,
  campo_modificato text null,
  valore_precedente text null,
  valore_nuovo text null,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint ticket_storico_pkey primary key (id),
  constraint ticket_storico_id_ticket_fkey foreign KEY (id_ticket) references ticket (id) on delete CASCADE,
  constraint ticket_storico_id_utente_fkey foreign KEY (id_utente) references utenti (id)
) TABLESPACE pg_default;

create index IF not exists idx_ticket_storico_ticket on public.ticket_storico using btree (id_ticket) TABLESPACE pg_default;

create index IF not exists idx_ticket_storico_created on public.ticket_storico using btree (created_at desc) TABLESPACE pg_default;

