-- 0020_import_mappings.sql
-- Import column mappings per project (MVP)
-- Luotu: 2025-12-31

CREATE TABLE IF NOT EXISTS import_mappings (
  import_mapping_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  import_type import_job_type NOT NULL,
  mapping jsonb NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, import_type)
);

CREATE INDEX IF NOT EXISTS import_mappings_project_idx
  ON import_mappings(project_id, import_type);
