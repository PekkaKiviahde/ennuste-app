-- 0031_mapping_versioning.sql
-- Append-only item-mäppäys: versiot + rivit + current view
-- Luotu: 2026-01-11

BEGIN;

ALTER TABLE mapping_versions
  ADD COLUMN IF NOT EXISTS import_batch_id uuid REFERENCES import_batches(import_batch_id) ON DELETE SET NULL;

ALTER TABLE mapping_versions
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

ALTER TABLE mapping_versions
  DROP CONSTRAINT IF EXISTS mapping_versions_no_overlap_active;

CREATE UNIQUE INDEX IF NOT EXISTS mapping_versions_active_per_batch
  ON mapping_versions(project_id, import_batch_id)
  WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS row_mappings (
  row_mapping_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_version_id uuid NOT NULL REFERENCES mapping_versions(mapping_version_id) ON DELETE CASCADE,
  budget_item_id uuid NOT NULL REFERENCES budget_items(budget_item_id) ON DELETE CASCADE,
  work_phase_id uuid REFERENCES work_phases(work_phase_id),
  proc_package_id uuid REFERENCES proc_packages(proc_package_id),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS row_mappings_version_item_created_idx
  ON row_mappings(mapping_version_id, budget_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS row_mappings_item_created_idx
  ON row_mappings(budget_item_id, created_at DESC);

DO $$ BEGIN
  CREATE TRIGGER row_mappings_append_only
    BEFORE UPDATE OR DELETE ON row_mappings
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE VIEW v_current_item_mappings AS
SELECT *
FROM (
  SELECT
    rm.*,
    ROW_NUMBER() OVER (
      PARTITION BY rm.budget_item_id
      ORDER BY rm.created_at DESC, rm.row_mapping_id DESC
    ) AS rn
  FROM row_mappings rm
  JOIN mapping_versions mv
    ON mv.mapping_version_id = rm.mapping_version_id
  WHERE mv.status = 'ACTIVE'
) t
WHERE t.rn = 1;

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
  import_batch_id,
  status,
  reason,
  created_by,
  activated_at,
  valid_from
)
SELECT
  bp.project_id,
  bp.import_batch_id,
  'ACTIVE',
  'item mapping migration',
  'migration',
  now(),
  current_date
FROM backfill_projects bp
WHERE NOT EXISTS (
  SELECT 1
  FROM mapping_versions mv
  WHERE mv.project_id = bp.project_id
    AND mv.import_batch_id = bp.import_batch_id
    AND mv.status = 'ACTIVE'
);

WITH active_versions AS (
  SELECT mapping_version_id, project_id, import_batch_id
  FROM mapping_versions
  WHERE status = 'ACTIVE'
)
INSERT INTO row_mappings (
  mapping_version_id,
  budget_item_id,
  work_phase_id,
  proc_package_id,
  created_by
)
SELECT
  av.mapping_version_id,
  tim.budget_item_id,
  tim.work_phase_id,
  tim.proc_package_id,
  'migration'
FROM target_estimate_item_mappings tim
JOIN active_versions av
  ON av.project_id = tim.project_id
WHERE NOT EXISTS (
  SELECT 1
  FROM row_mappings rm
  WHERE rm.mapping_version_id = av.mapping_version_id
    AND rm.budget_item_id = tim.budget_item_id
);

COMMIT;
