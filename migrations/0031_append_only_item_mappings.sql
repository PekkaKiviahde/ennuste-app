-- 0031_append_only_item_mappings.sql
-- Append-only item mapping versiot + rivit
-- Luotu: 2026-01-11

BEGIN;

DO $$ BEGIN
  CREATE TYPE mapping_kind AS ENUM ('FORECAST','ITEM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE mapping_versions
  ADD COLUMN IF NOT EXISTS mapping_kind mapping_kind NOT NULL DEFAULT 'FORECAST';

ALTER TABLE mapping_versions
  ADD COLUMN IF NOT EXISTS import_batch_id uuid REFERENCES import_batches(import_batch_id) ON DELETE SET NULL;

ALTER TABLE mapping_versions
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

ALTER TABLE mapping_versions
  DROP CONSTRAINT IF EXISTS mapping_versions_no_overlap_active;

ALTER TABLE mapping_versions
  ADD CONSTRAINT mapping_versions_no_overlap_active
  EXCLUDE USING gist (project_id WITH =, mapping_kind WITH =, valid_range WITH &&)
  WHERE (status = 'ACTIVE');

CREATE INDEX IF NOT EXISTS mapping_versions_project_kind_status_idx
  ON mapping_versions(project_id, mapping_kind, status, valid_from DESC);

CREATE INDEX IF NOT EXISTS mapping_versions_kind_validrange_gist
  ON mapping_versions USING gist (project_id, mapping_kind, valid_range);

CREATE TABLE IF NOT EXISTS row_mappings (
  row_mapping_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  mapping_version_id uuid NOT NULL REFERENCES mapping_versions(mapping_version_id) ON DELETE CASCADE,
  budget_item_id uuid NOT NULL REFERENCES budget_items(budget_item_id) ON DELETE CASCADE,
  work_phase_id uuid REFERENCES work_phases(work_phase_id),
  proc_package_id uuid REFERENCES proc_packages(proc_package_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL
);

CREATE INDEX IF NOT EXISTS row_mappings_project_item_idx
  ON row_mappings(project_id, budget_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS row_mappings_version_idx
  ON row_mappings(mapping_version_id, budget_item_id);

DO $$ BEGIN
  CREATE TRIGGER row_mappings_append_only
    BEFORE UPDATE OR DELETE ON row_mappings
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE VIEW v_current_item_mappings AS
SELECT DISTINCT ON (rm.project_id, rm.budget_item_id)
  rm.row_mapping_id,
  rm.project_id,
  rm.mapping_version_id,
  rm.budget_item_id,
  rm.work_phase_id,
  rm.proc_package_id,
  rm.created_at,
  rm.created_by
FROM row_mappings rm
JOIN mapping_versions mv ON mv.mapping_version_id = rm.mapping_version_id
WHERE mv.mapping_kind = 'ITEM'
  AND mv.status = 'ACTIVE'
ORDER BY rm.project_id, rm.budget_item_id, rm.created_at DESC, rm.row_mapping_id DESC;

WITH latest_import AS (
  SELECT DISTINCT ON (ib.project_id)
    ib.project_id,
    ib.import_batch_id
  FROM import_batches ib
  WHERE ib.source_system = 'TARGET_ESTIMATE'
  ORDER BY ib.project_id, ib.imported_at DESC
),
projects_with_mappings AS (
  SELECT DISTINCT tim.project_id
  FROM target_estimate_item_mappings tim
),
backfill_projects AS (
  SELECT li.project_id, li.import_batch_id
  FROM latest_import li
  JOIN projects_with_mappings pm ON pm.project_id = li.project_id
)
INSERT INTO mapping_versions (
  project_id,
  valid_from,
  status,
  reason,
  created_by,
  activated_at,
  import_batch_id,
  mapping_kind
)
SELECT
  bp.project_id,
  current_date,
  'ACTIVE',
  'item mapping migration',
  'migration',
  now(),
  bp.import_batch_id,
  'ITEM'
FROM backfill_projects bp
WHERE NOT EXISTS (
  SELECT 1
  FROM mapping_versions mv
  WHERE mv.project_id = bp.project_id
    AND mv.mapping_kind = 'ITEM'
    AND mv.status = 'ACTIVE'
);

WITH active_versions AS (
  SELECT mapping_version_id, project_id
  FROM mapping_versions
  WHERE mapping_kind = 'ITEM'
    AND status = 'ACTIVE'
)
INSERT INTO row_mappings (
  project_id,
  mapping_version_id,
  budget_item_id,
  work_phase_id,
  proc_package_id,
  created_by
)
SELECT
  tim.project_id,
  av.mapping_version_id,
  tim.budget_item_id,
  tim.work_phase_id,
  tim.proc_package_id,
  'migration'
FROM target_estimate_item_mappings tim
JOIN active_versions av ON av.project_id = tim.project_id
WHERE NOT EXISTS (
  SELECT 1
  FROM row_mappings rm
  WHERE rm.mapping_version_id = av.mapping_version_id
    AND rm.budget_item_id = tim.budget_item_id
);

COMMIT;
