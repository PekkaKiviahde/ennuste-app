-- 0003_jyda_snapshot_views.sql
-- Patch: handle JYDA snapshot semantics (avoid double counting).
-- Päivitetty: 2025-12-16

-- Latest snapshot per work_littera + metric (external_ref)
CREATE OR REPLACE VIEW v_actuals_latest_snapshot AS
SELECT DISTINCT ON (acl.project_id, acl.work_littera_id, acl.cost_type, acl.external_ref)
  acl.project_id,
  acl.work_littera_id,
  acl.cost_type,
  acl.external_ref,
  acl.amount,
  acl.occurred_on,
  acl.import_batch_id,
  acl.created_at
FROM actual_cost_lines acl
WHERE acl.source = 'JYDA'
  AND acl.external_ref IN (
    'JYDA.ACTUAL_COST',
    'JYDA.COMMITTED_COST',
    'JYDA.ACTUAL_COST_INCL_UNAPPROVED',
    'JYDA.FORECAST_COST',
    'JYDA.TARGET_COST'
  )
ORDER BY acl.project_id, acl.work_littera_id, acl.cost_type, acl.external_ref, acl.occurred_on DESC, acl.created_at DESC;

-- Map latest snapshot actuals to target littera via mapping active on occurred_on
CREATE OR REPLACE VIEW v_actuals_latest_snapshot_mapped AS
SELECT
  s.project_id,
  s.work_littera_id,
  s.cost_type,
  s.external_ref,
  s.amount AS original_amount,
  s.occurred_on,
  mv.mapping_version_id,
  ml.target_littera_id,
  ml.allocation_rule,
  ml.allocation_value,
  CASE
    WHEN ml.allocation_rule = 'FULL' THEN s.amount
    WHEN ml.allocation_rule = 'PERCENT' THEN round(s.amount * ml.allocation_value, 2)
    ELSE NULL
  END AS allocated_amount
FROM v_actuals_latest_snapshot s
JOIN LATERAL (
  SELECT fn_mapping_version_for_date(s.project_id, s.occurred_on) AS mapping_version_id
) mv ON mv.mapping_version_id IS NOT NULL
JOIN mapping_lines ml
  ON ml.mapping_version_id = mv.mapping_version_id
 AND ml.work_littera_id = s.work_littera_id
 AND (ml.cost_type IS NULL OR ml.cost_type = s.cost_type);

-- Unmapped (latest snapshots that have no mapping line)
CREATE OR REPLACE VIEW v_actuals_latest_snapshot_unmapped AS
SELECT
  s.project_id,
  s.work_littera_id,
  s.cost_type,
  s.external_ref,
  s.amount,
  s.occurred_on,
  fn_mapping_version_for_date(s.project_id, s.occurred_on) AS mapping_version_id
FROM v_actuals_latest_snapshot s
WHERE NOT EXISTS (
  SELECT 1
  FROM mapping_lines ml
  WHERE ml.mapping_version_id = fn_mapping_version_for_date(s.project_id, s.occurred_on)
    AND ml.work_littera_id = s.work_littera_id
    AND (ml.cost_type IS NULL OR ml.cost_type = s.cost_type)
);

-- Coverage for latest snapshot (per project, per metric)
CREATE OR REPLACE VIEW v_mapping_coverage_latest_snapshot AS
SELECT
  s.project_id,
  s.external_ref,
  SUM(CASE WHEN m.allocated_amount IS NOT NULL THEN m.allocated_amount ELSE 0 END) AS mapped_amount,
  SUM(s.amount) AS total_amount,
  CASE WHEN SUM(s.amount) = 0 THEN 1.0
       ELSE (SUM(CASE WHEN m.allocated_amount IS NOT NULL THEN m.allocated_amount ELSE 0 END) / SUM(s.amount)) END
       AS coverage
FROM v_actuals_latest_snapshot s
LEFT JOIN v_actuals_latest_snapshot_mapped m
  ON m.project_id = s.project_id
 AND m.work_littera_id = s.work_littera_id
 AND m.cost_type = s.cost_type
 AND m.external_ref = s.external_ref
GROUP BY s.project_id, s.external_ref;

