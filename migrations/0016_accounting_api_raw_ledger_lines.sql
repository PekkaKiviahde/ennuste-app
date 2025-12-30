-- 0016_accounting_api_raw_ledger_lines.sql
-- MVP: Accounting API raw ledger lines staging (append-only)
--
-- Goal:
--  - Store raw API ledger lines (raw_payload jsonb) + minimal canonical columns
--  - Append-only (no UPDATE/DELETE)
--  - Enable "latest per external_id" via a view using import_batches.imported_at

-- =========================
-- 0) Base table (fresh install)
-- =========================
CREATE TABLE IF NOT EXISTS accounting_api_raw_ledger_lines (
  raw_ledger_line_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id uuid NOT NULL,
  import_batch_id uuid NOT NULL,

  external_id text NOT NULL,
  posted_on date,
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',

  description text,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

-- =========================
-- 1) Ensure columns exist (if table existed from an earlier/partial run)
-- =========================
ALTER TABLE accounting_api_raw_ledger_lines
  ADD COLUMN IF NOT EXISTS raw_ledger_line_id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS project_id uuid,
  ADD COLUMN IF NOT EXISTS import_batch_id uuid,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS posted_on date,
  ADD COLUMN IF NOT EXISTS amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS dimensions jsonb,
  ADD COLUMN IF NOT EXISTS raw_payload jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by text;

-- Defaults (safe to set; helps avoid NULL JSONB surprises)
ALTER TABLE accounting_api_raw_ledger_lines
  ALTER COLUMN currency SET DEFAULT 'EUR',
  ALTER COLUMN dimensions SET DEFAULT '{}'::jsonb,
  ALTER COLUMN raw_payload SET DEFAULT '{}'::jsonb,
  ALTER COLUMN created_at SET DEFAULT now();

-- =========================
-- 2) Constraints (only if missing)
-- =========================

-- Primary key only if the table doesn't already have one
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'accounting_api_raw_ledger_lines'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE accounting_api_raw_ledger_lines
      ADD CONSTRAINT accounting_api_raw_ledger_lines_pkey PRIMARY KEY (raw_ledger_line_id);
  END IF;
END $$;

-- FK: project_id -> projects(project_id) (only if no FK exists on project_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.constraint_schema = kcu.constraint_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'accounting_api_raw_ledger_lines'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'project_id'
  ) THEN
    ALTER TABLE accounting_api_raw_ledger_lines
      ADD CONSTRAINT accounting_api_raw_ledger_lines_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE;
  END IF;
END $$;

-- FK: import_batch_id -> import_batches(import_batch_id) (only if no FK exists on import_batch_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.constraint_schema = kcu.constraint_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'accounting_api_raw_ledger_lines'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'import_batch_id'
  ) THEN
    ALTER TABLE accounting_api_raw_ledger_lines
      ADD CONSTRAINT accounting_api_raw_ledger_lines_import_batch_id_fkey
      FOREIGN KEY (import_batch_id) REFERENCES import_batches(import_batch_id) ON DELETE RESTRICT;
  END IF;
END $$;

-- external_id hygiene (allow NULL only if someone inserts broken rows; view filters NULL away)
DO $$ BEGIN
  ALTER TABLE accounting_api_raw_ledger_lines
    ADD CONSTRAINT accounting_api_raw_ledger_lines_external_id_nonempty_chk
    CHECK (external_id IS NULL OR length(trim(external_id)) > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- 3) Append-only protection
-- =========================
DO $$ BEGIN
  CREATE TRIGGER trg_accounting_api_raw_ledger_lines_no_update_delete
  BEFORE UPDATE OR DELETE ON accounting_api_raw_ledger_lines
  FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- 4) Indexes
-- =========================
CREATE INDEX IF NOT EXISTS accounting_api_raw_ledger_lines_project_external_id_idx
  ON accounting_api_raw_ledger_lines(project_id, external_id);

CREATE INDEX IF NOT EXISTS accounting_api_raw_ledger_lines_import_batch_id_idx
  ON accounting_api_raw_ledger_lines(import_batch_id);

-- Optional but useful: idempotent inserts per batch (re-run same batch without duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS accounting_api_raw_ledger_lines_uniq_batch_external_id
  ON accounting_api_raw_ledger_lines(project_id, import_batch_id, external_id)
  WHERE external_id IS NOT NULL;

-- =========================
-- 5) Latest view (per project_id + external_id)
-- =========================
CREATE OR REPLACE VIEW v_accounting_api_raw_ledger_lines_latest AS
SELECT DISTINCT ON (r.project_id, r.external_id)
  r.raw_ledger_line_id,
  r.project_id,
  r.import_batch_id,
  ib.source_system,
  ib.imported_at,
  ib.imported_by,

  r.external_id,
  r.posted_on,
  r.amount,
  r.currency,
  r.description,
  r.dimensions,
  r.raw_payload,

  r.created_at,
  r.created_by
FROM accounting_api_raw_ledger_lines r
JOIN import_batches ib
  ON ib.import_batch_id = r.import_batch_id
WHERE r.external_id IS NOT NULL
ORDER BY
  r.project_id,
  r.external_id,
  ib.imported_at DESC,
  r.created_at DESC NULLS LAST,
  r.raw_ledger_line_id DESC NULLS LAST;
