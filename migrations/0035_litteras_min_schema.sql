-- 0035_litteras_min_schema.sql
-- Minimi litteras-taulu VERIFY_INVARIANTS.sql:n plan-before-forecast -tarkistusta varten.
-- Edellyttää prevent_update_delete() -funktiota (baseline:ssa).

CREATE TABLE IF NOT EXISTS litteras (
  littera_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  code text NOT NULL,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'system',
  UNIQUE (project_id, code)
);

CREATE INDEX IF NOT EXISTS litteras_project_idx ON litteras(project_id);

DO $$ BEGIN
  CREATE TRIGGER litteras_append_only
    BEFORE UPDATE OR DELETE ON litteras
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
