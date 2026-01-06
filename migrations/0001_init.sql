-- 0001_init.sql
-- Postgres schema (MVP) for: suunnittelu → ennustetapahtuma → audit trail
-- Päivitetty: 2025-12-16

-- Suositus: aja tämä tyhjään tietokantaan.
-- Tarvitset oikeudet luoda extensioneja ja tyyppejä.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =========================
-- ENUM-tyypit (vakaat)
-- =========================
DO $$ BEGIN
  CREATE TYPE cost_type AS ENUM ('LABOR','MATERIAL','SUBCONTRACT','RENTAL','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mapping_allocation_rule AS ENUM ('FULL','PERCENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan_status AS ENUM ('DRAFT','READY_FOR_FORECAST','LOCKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mapping_version_status AS ENUM ('DRAFT','ACTIVE','RETIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE forecast_source AS ENUM ('UI','IMPORT','MIGRATION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE budget_source AS ENUM ('IMPORT','MANUAL','CALCULATION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE actual_source AS ENUM ('JYDA','ERP','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mapping_event_action AS ENUM (
    'CREATE_VERSION','EDIT_DRAFT','ACTIVATE','RETIRE','APPROVE','APPLY_RETROACTIVE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =========================
-- Yleinen "append-only" suoja
-- =========================
CREATE OR REPLACE FUNCTION prevent_update_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only. Create a new event/row instead of UPDATE/DELETE.', TG_TABLE_NAME;
END;
$$;


-- =========================
-- Perustaulut
-- =========================
CREATE TABLE IF NOT EXISTS projects (
  project_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  customer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Litterat ovat projektikohtaisia (sama koodi voi esiintyä eri projekteissa)
CREATE TABLE IF NOT EXISTS litteras (
  littera_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  code text NOT NULL,
  title text,
  group_code smallint, -- 0..9 (pääryhmä). voidaan laskea myös sovelluksessa
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT littera_group_code_chk CHECK (group_code IS NULL OR (group_code >= 0 AND group_code <= 9)),
  CONSTRAINT littera_code_nonempty_chk CHECK (length(trim(code)) > 0),
  UNIQUE (project_id, code)
);

-- helpottaa "sama projekti" -FK:tä muissa tauluissa
DO $$ BEGIN
  ALTER TABLE litteras
    ADD CONSTRAINT litteras_project_littera_unique UNIQUE (project_id, littera_id);
EXCEPTION
  WHEN duplicate_table OR duplicate_object THEN
    NULL;
END $$;



-- =========================
-- Mapping: versiot + rivit + audit log
-- =========================
CREATE TABLE IF NOT EXISTS mapping_versions (
  mapping_version_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  valid_from date NOT NULL,
  valid_to date,
  valid_range daterange GENERATED ALWAYS AS (
    daterange(valid_from, COALESCE(valid_to, 'infinity'::date), '[]')
  ) STORED,
  status mapping_version_status NOT NULL DEFAULT 'DRAFT',
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  approved_at timestamptz,
  approved_by text,
  CONSTRAINT mapping_valid_dates_chk CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

-- Ei sallita päällekkäisiä ACTIVE-versioita samalle projektille samalle ajalle
DO $$ BEGIN
  ALTER TABLE mapping_versions
    ADD CONSTRAINT mapping_versions_no_overlap_active
    EXCLUDE USING gist (project_id WITH =, valid_range WITH &&)
    WHERE (status = 'ACTIVE');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS mapping_versions_project_status_idx
  ON mapping_versions(project_id, status, valid_from DESC);

CREATE INDEX IF NOT EXISTS mapping_versions_validrange_gist
  ON mapping_versions USING gist (project_id, valid_range);

-- Mapping-rivit (työpakettilittera -> tavoitelittera)
CREATE TABLE IF NOT EXISTS mapping_lines (
  mapping_line_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  mapping_version_id uuid NOT NULL REFERENCES mapping_versions(mapping_version_id) ON DELETE CASCADE,

  work_littera_id uuid NOT NULL,
  target_littera_id uuid NOT NULL,

  allocation_rule mapping_allocation_rule NOT NULL,
  allocation_value numeric(9,6) NOT NULL,
  cost_type cost_type, -- NULL = kaikki kustannuslajit
  note text,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,

  CONSTRAINT mapping_lines_work_fk FOREIGN KEY (project_id, work_littera_id)
    REFERENCES litteras(project_id, littera_id) ON DELETE RESTRICT,
  CONSTRAINT mapping_lines_target_fk FOREIGN KEY (project_id, target_littera_id)
    REFERENCES litteras(project_id, littera_id) ON DELETE RESTRICT,

  CONSTRAINT allocation_value_chk CHECK (
    (allocation_rule = 'FULL' AND allocation_value = 1.0)
    OR
    (allocation_rule = 'PERCENT' AND allocation_value > 0 AND allocation_value <= 1.0)
  )
);

CREATE INDEX IF NOT EXISTS mapping_lines_lookup_idx
  ON mapping_lines(mapping_version_id, work_littera_id, cost_type);

CREATE INDEX IF NOT EXISTS mapping_lines_target_idx
  ON mapping_lines(mapping_version_id, target_littera_id);

-- Mapping-audit (append-only)
CREATE TABLE IF NOT EXISTS mapping_event_log (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  event_time timestamptz NOT NULL DEFAULT now(),
  actor text NOT NULL,
  action mapping_event_action NOT NULL,
  payload jsonb NOT NULL
);

DO $$ BEGIN
  CREATE TRIGGER mapping_event_log_append_only
    BEFORE UPDATE OR DELETE ON mapping_event_log
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =========================
-- Suunnittelu (append-only eventit)
-- =========================
CREATE TABLE IF NOT EXISTS planning_events (
  planning_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  target_littera_id uuid NOT NULL,
  event_time timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,

  status plan_status NOT NULL DEFAULT 'DRAFT',
  summary text,
  observations text,
  risks text,
  decisions text,
  attachments jsonb, -- MVP: mahdolliset linkit/liitteet jsonina

  CONSTRAINT planning_target_fk FOREIGN KEY (project_id, target_littera_id)
    REFERENCES litteras(project_id, littera_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS planning_events_latest_idx
  ON planning_events(project_id, target_littera_id, event_time DESC);

DO $$ BEGIN
  CREATE TRIGGER planning_events_append_only
    BEFORE UPDATE OR DELETE ON planning_events
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =========================
-- Tavoite (budjetti) ja toteuma (import)
-- =========================
CREATE TABLE IF NOT EXISTS import_batches (
  import_batch_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  source_system text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  imported_by text NOT NULL,
  signature text,
  notes text
);

DO $$ BEGIN
  CREATE TRIGGER import_batches_append_only
    BEFORE UPDATE OR DELETE ON import_batches
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


CREATE TABLE IF NOT EXISTS budget_lines (
  budget_line_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  target_littera_id uuid NOT NULL,
  cost_type cost_type NOT NULL,
  amount numeric(14,2) NOT NULL,
  source budget_source NOT NULL DEFAULT 'IMPORT',
  valid_from date NOT NULL DEFAULT current_date,
  valid_to date,
  valid_range daterange GENERATED ALWAYS AS (
    daterange(valid_from, COALESCE(valid_to, 'infinity'::date), '[]')
  ) STORED,
  import_batch_id uuid REFERENCES import_batches(import_batch_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,

  CONSTRAINT budget_target_fk FOREIGN KEY (project_id, target_littera_id)
    REFERENCES litteras(project_id, littera_id) ON DELETE RESTRICT,
  CONSTRAINT budget_valid_dates_chk CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS budget_lines_lookup_idx
  ON budget_lines(project_id, target_littera_id, cost_type, valid_from DESC);

CREATE INDEX IF NOT EXISTS budget_lines_validrange_gist
  ON budget_lines USING gist (project_id, valid_range);

DO $$ BEGIN
  CREATE TRIGGER budget_lines_append_only
    BEFORE UPDATE OR DELETE ON budget_lines
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


CREATE TABLE IF NOT EXISTS actual_cost_lines (
  actual_cost_line_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  work_littera_id uuid NOT NULL,
  cost_type cost_type NOT NULL,
  amount numeric(14,2) NOT NULL,
  occurred_on date NOT NULL, -- kirjauspäivä / kausi
  source actual_source NOT NULL DEFAULT 'JYDA',
  import_batch_id uuid REFERENCES import_batches(import_batch_id) ON DELETE SET NULL,
  external_ref text, -- esim. järjestelmän rivitunniste
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT actual_work_fk FOREIGN KEY (project_id, work_littera_id)
    REFERENCES litteras(project_id, littera_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS actual_cost_lines_lookup_idx
  ON actual_cost_lines(project_id, work_littera_id, cost_type, occurred_on);

CREATE INDEX IF NOT EXISTS actual_cost_lines_occurred_idx
  ON actual_cost_lines(project_id, occurred_on);

DO $$ BEGIN
  CREATE TRIGGER actual_cost_lines_append_only
    BEFORE UPDATE OR DELETE ON actual_cost_lines
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =========================
-- Ennuste (append-only eventit)
-- =========================
CREATE TABLE IF NOT EXISTS forecast_events (
  forecast_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  target_littera_id uuid NOT NULL,
  mapping_version_id uuid REFERENCES mapping_versions(mapping_version_id) ON DELETE SET NULL,

  event_time timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  source forecast_source NOT NULL DEFAULT 'UI',

  comment text, -- yleisperustelu
  technical_progress numeric(7,6), -- 0..1
  financial_progress numeric(7,6), -- 0..1
  kpi_value numeric(14,6),

  CONSTRAINT forecast_target_fk FOREIGN KEY (project_id, target_littera_id)
    REFERENCES litteras(project_id, littera_id) ON DELETE RESTRICT,
  CONSTRAINT forecast_progress_chk CHECK (
    (technical_progress IS NULL OR (technical_progress >= 0 AND technical_progress <= 1))
    AND
    (financial_progress IS NULL OR (financial_progress >= 0 AND financial_progress <= 1))
  )
);

CREATE INDEX IF NOT EXISTS forecast_events_latest_idx
  ON forecast_events(project_id, target_littera_id, event_time DESC);

DO $$ BEGIN
  CREATE TRIGGER forecast_events_append_only
    BEFORE UPDATE OR DELETE ON forecast_events
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


CREATE TABLE IF NOT EXISTS forecast_event_lines (
  forecast_event_line_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_event_id uuid NOT NULL REFERENCES forecast_events(forecast_event_id) ON DELETE CASCADE,
  cost_type cost_type NOT NULL,
  forecast_value numeric(14,2) NOT NULL,
  memo_general text,
  memo_procurement text,
  memo_calculation text
);

CREATE INDEX IF NOT EXISTS forecast_event_lines_event_idx
  ON forecast_event_lines(forecast_event_id, cost_type);

DO $$ BEGIN
  CREATE TRIGGER forecast_event_lines_append_only
    BEFORE UPDATE OR DELETE ON forecast_event_lines
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


CREATE TABLE IF NOT EXISTS forecast_row_memos (
  forecast_row_memo_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_event_id uuid NOT NULL REFERENCES forecast_events(forecast_event_id) ON DELETE CASCADE,
  row_key text NOT NULL,
  memo_text text NOT NULL
);

CREATE INDEX IF NOT EXISTS forecast_row_memos_event_idx
  ON forecast_row_memos(forecast_event_id);

DO $$ BEGIN
  CREATE TRIGGER forecast_row_memos_append_only
    BEFORE UPDATE OR DELETE ON forecast_row_memos
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


CREATE TABLE IF NOT EXISTS forecast_calc_panel_snapshots (
  forecast_calc_panel_snapshot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_event_id uuid NOT NULL REFERENCES forecast_events(forecast_event_id) ON DELETE CASCADE,
  panel_key text NOT NULL,
  content jsonb NOT NULL,
  format_hint jsonb
);

CREATE INDEX IF NOT EXISTS forecast_calc_panel_event_idx
  ON forecast_calc_panel_snapshots(forecast_event_id);

DO $$ BEGIN
  CREATE TRIGGER forecast_calc_panel_snapshots_append_only
    BEFORE UPDATE OR DELETE ON forecast_calc_panel_snapshots
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =========================
-- Triggerit mappingin "DRAFT-only muokkaus" -säännölle
-- =========================
CREATE OR REPLACE FUNCTION enforce_mapping_lines_draft_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_status mapping_version_status;
BEGIN
  SELECT status INTO v_status
  FROM mapping_versions
  WHERE mapping_version_id = COALESCE(NEW.mapping_version_id, OLD.mapping_version_id);

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'mapping_version not found';
  END IF;

  IF v_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Mapping lines can only be changed when mapping version is DRAFT (current: %)', v_status;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- sallitaan UPDATE/DELETE mapping_lines vain kun versio DRAFT.
-- (INSERT on aina ok, mutta myös se voidaan rajata DRAFT:iin)
DO $$ BEGIN
  CREATE TRIGGER mapping_lines_draft_only_ud
    BEFORE UPDATE OR DELETE ON mapping_lines
    FOR EACH ROW EXECUTE FUNCTION enforce_mapping_lines_draft_only();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- sallitaan INSERT mapping_lines vain kun versio DRAFT
CREATE OR REPLACE FUNCTION enforce_mapping_lines_insert_draft_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_status mapping_version_status;
BEGIN
  SELECT status INTO v_status
  FROM mapping_versions
  WHERE mapping_version_id = NEW.mapping_version_id;

  IF v_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Mapping lines can only be inserted when mapping version is DRAFT (current: %)', v_status;
  END IF;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER mapping_lines_draft_only_ins
    BEFORE INSERT ON mapping_lines
    FOR EACH ROW EXECUTE FUNCTION enforce_mapping_lines_insert_draft_only();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =========================
-- Suunnitelma ennen ennustetta (DB-gate, MVP)
-- =========================
-- Ennusteen INSERT estetään, jos viimeisin planning_event ei ole READY_FOR_FORECAST tai LOCKED.
CREATE OR REPLACE FUNCTION enforce_plan_before_forecast()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_status plan_status;
BEGIN
  SELECT pe.status INTO v_status
  FROM planning_events pe
  WHERE pe.project_id = NEW.project_id
    AND pe.target_littera_id = NEW.target_littera_id
  ORDER BY pe.event_time DESC
  LIMIT 1;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Cannot create forecast: no planning exists for target littera.';
  END IF;

  IF v_status NOT IN ('READY_FOR_FORECAST','LOCKED') THEN
    RAISE EXCEPTION 'Cannot create forecast: latest planning status is % (must be READY_FOR_FORECAST or LOCKED).', v_status;
  END IF;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER forecast_requires_planning
    BEFORE INSERT ON forecast_events
    FOR EACH ROW EXECUTE FUNCTION enforce_plan_before_forecast();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
