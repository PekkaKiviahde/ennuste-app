-- 0022_report_snapshots.sql
-- Report package snapshots (on-demand artifacts)
-- Paivitetty: 2026-01-01

-- Allow snapshot-based artifacts while keeping backward compatibility for existing values.
DO $$ BEGIN
  ALTER TABLE report_packages
    DROP CONSTRAINT IF EXISTS report_packages_artifact_type_check;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE report_packages
    ADD CONSTRAINT report_packages_artifact_type_check
    CHECK (artifact_type IN ('LINK','PDF','CSV','XLSX','SNAPSHOT'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS report_package_snapshots (
  snapshot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES report_packages(package_id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  month text NOT NULL,
  row_type text NOT NULL,
  row_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER report_package_snapshots_append_only
    BEFORE UPDATE OR DELETE ON report_package_snapshots
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS report_package_snapshots_package_idx
  ON report_package_snapshots (package_id);

CREATE INDEX IF NOT EXISTS report_package_snapshots_project_month_idx
  ON report_package_snapshots (project_id, month);
