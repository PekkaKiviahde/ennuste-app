-- 0026_import_staging.sql
-- Import staging for manual cleanup (budget/JYDA)
-- Created: 2026-01-04

BEGIN;

CREATE TABLE IF NOT EXISTS import_staging_batches (
  staging_batch_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  import_type text NOT NULL, -- e.g. BUDGET, JYDA
  source_system text NOT NULL,
  file_name text,
  signature text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL
);

CREATE INDEX IF NOT EXISTS import_staging_batches_project_idx
  ON import_staging_batches(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS import_staging_batches_signature_idx
  ON import_staging_batches(project_id, import_type, signature);

DO $$ BEGIN
  CREATE TRIGGER import_staging_batches_append_only
    BEFORE UPDATE OR DELETE ON import_staging_batches
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS import_staging_batch_events (
  staging_batch_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staging_batch_id uuid NOT NULL REFERENCES import_staging_batches(staging_batch_id) ON DELETE CASCADE,
  status text NOT NULL, -- e.g. DRAFT, IN_REVIEW, APPROVED, REJECTED
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL
);

CREATE INDEX IF NOT EXISTS import_staging_batch_events_batch_idx
  ON import_staging_batch_events(staging_batch_id, created_at DESC);

DO $$ BEGIN
  CREATE TRIGGER import_staging_batch_events_append_only
    BEFORE UPDATE OR DELETE ON import_staging_batch_events
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS import_staging_lines_raw (
  staging_line_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staging_batch_id uuid NOT NULL REFERENCES import_staging_batches(staging_batch_id) ON DELETE CASCADE,
  row_no int NOT NULL,
  raw_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL
);

CREATE INDEX IF NOT EXISTS import_staging_lines_raw_batch_idx
  ON import_staging_lines_raw(staging_batch_id, row_no);

DO $$ BEGIN
  CREATE TRIGGER import_staging_lines_raw_append_only
    BEFORE UPDATE OR DELETE ON import_staging_lines_raw
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS import_staging_line_edits (
  staging_line_edit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staging_line_id uuid NOT NULL REFERENCES import_staging_lines_raw(staging_line_id) ON DELETE CASCADE,
  edit_json jsonb NOT NULL,
  reason text,
  edited_at timestamptz NOT NULL DEFAULT now(),
  edited_by text NOT NULL
);

CREATE INDEX IF NOT EXISTS import_staging_line_edits_line_idx
  ON import_staging_line_edits(staging_line_id, edited_at DESC);

DO $$ BEGIN
  CREATE TRIGGER import_staging_line_edits_append_only
    BEFORE UPDATE OR DELETE ON import_staging_line_edits
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS import_staging_issues (
  staging_issue_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staging_line_id uuid NOT NULL REFERENCES import_staging_lines_raw(staging_line_id) ON DELETE CASCADE,
  issue_code text NOT NULL,
  issue_message text,
  severity text NOT NULL DEFAULT 'ERROR', -- ERROR, WARN, INFO
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL
);

CREATE INDEX IF NOT EXISTS import_staging_issues_line_idx
  ON import_staging_issues(staging_line_id, created_at DESC);

DO $$ BEGIN
  CREATE TRIGGER import_staging_issues_append_only
    BEFORE UPDATE OR DELETE ON import_staging_issues
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
