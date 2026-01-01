-- 0021_month_close.sql
-- Month close, report packages, corrections (MVP)
-- Paivitetty: 2025-12-31

DO $$ BEGIN
  CREATE TYPE month_state AS ENUM (
    'M0_OPEN_DRAFT',
    'M1_READY_TO_SEND',
    'M2_SENT_LOCKED',
    'M3_CORRECTION_PENDING',
    'M4_CORRECTED_LOCKED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS months (
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  month text NOT NULL,
  month_state month_state NOT NULL DEFAULT 'M0_OPEN_DRAFT',
  lock_applied_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, month)
);

CREATE TABLE IF NOT EXISTS month_state_events (
  month_state_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  month text NOT NULL,
  from_state month_state,
  to_state month_state NOT NULL,
  actor_user_id text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER month_state_events_append_only
    BEFORE UPDATE OR DELETE ON month_state_events
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS report_packages (
  package_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  month text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by_user_id text NOT NULL,
  recipients jsonb NOT NULL,
  artifact_type text NOT NULL CHECK (artifact_type IN ('PDF','XLSX','LINK')),
  artifact_uri text NOT NULL,
  checksum text NOT NULL,
  correction_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER report_packages_append_only
    BEFORE UPDATE OR DELETE ON report_packages
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS month_forecasts (
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  month text NOT NULL,
  forecast_total_eur numeric(14,2) NOT NULL,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL,
  PRIMARY KEY (project_id, month)
);

CREATE TABLE IF NOT EXISTS month_forecast_events (
  month_forecast_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  month text NOT NULL,
  forecast_total_eur numeric(14,2) NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL
);

DO $$ BEGIN
  CREATE TRIGGER month_forecast_events_append_only
    BEFORE UPDATE OR DELETE ON month_forecast_events
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS month_corrections (
  correction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  month text NOT NULL,
  state text NOT NULL CHECK (state IN ('REQUESTED','APPROVED','REJECTED')),
  requested_by_user_id text NOT NULL,
  approved_by_user_id text,
  reason text NOT NULL,
  patch jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS month_correction_events (
  month_correction_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correction_id uuid NOT NULL REFERENCES month_corrections(correction_id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  month text NOT NULL,
  state text NOT NULL,
  actor_user_id text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER month_correction_events_append_only
    BEFORE UPDATE OR DELETE ON month_correction_events
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
