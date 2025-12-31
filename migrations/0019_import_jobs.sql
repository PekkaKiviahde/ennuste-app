-- 0019_import_jobs.sql
-- Import job tracking for async budget/JYDA imports (MVP)
-- Luotu: 2025-12-31

DO $$ BEGIN
  CREATE TYPE import_job_status AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE import_job_type AS ENUM ('BUDGET', 'JYDA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS import_jobs (
  import_job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  import_type import_job_type NOT NULL,
  status import_job_status NOT NULL DEFAULT 'QUEUED',
  source_filename text,
  import_batch_id uuid REFERENCES import_batches(import_batch_id) ON DELETE SET NULL,
  stdout text,
  stderr text,
  error_message text,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS import_jobs_project_idx
  ON import_jobs(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS import_job_events (
  import_job_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id uuid NOT NULL REFERENCES import_jobs(import_job_id) ON DELETE CASCADE,
  status import_job_status NOT NULL,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER import_job_events_append_only
    BEFORE UPDATE OR DELETE ON import_job_events
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
