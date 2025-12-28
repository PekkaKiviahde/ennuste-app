-- 0015_npss_opening_snapshot_views.sql
-- NPSS/cutover opening snapshot views + COST-only reporting chain

-- =========================
-- 1) Base helpers
-- =========================
CREATE OR REPLACE VIEW v_actual_cost_lines_cost_only AS
SELECT *
FROM v_actual_cost_lines_effective
WHERE effective_amount_kind = 'COST';

CREATE OR REPLACE VIEW v_actual_cost_lines_npss_opening AS
SELECT *
FROM v_actual_cost_lines_effective
WHERE effective_amount_kind IN ('NPSS_UNCLASSIFIED', 'UNCLASSIFIED');

-- =========================
-- 2) Latest snapshot (COST-only) chain
-- =========================
CREATE OR REPLACE VIEW v_actuals_latest_snapshot_cost_only AS
SELECT DISTINCT ON (acl.project_id, acl.work_littera_id, acl.cost_type, acl.external_ref)
  acl.project_id,
  acl.work_littera_id,
  acl.cost_type,
  acl.external_ref,
  acl.amount,
  acl.occurred_on,
  acl.import_batch_id,
  acl.created_at
FROM v_actual_cost_lines_cost_only acl
WHERE acl.source = 'JYDA'
  AND acl.external_ref IN (
    'JYDA.ACTUAL_COST',
    'JYDA.COMMITTED_COST',
    'JYDA.ACTUAL_COST_INCL_UNAPPROVED',
    'JYDA.FORECAST_COST',
    'JYDA.TARGET_COST'
  )
ORDER BY acl.project_id, acl.work_littera_id, acl.cost_type, acl.external_ref, acl.occurred_on DESC, acl.created_at DESC;

CREATE OR REPLACE VIEW v_actuals_latest_snapshot_mapped_cost_only AS
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
FROM v_actuals_latest_snapshot_cost_only s
JOIN LATERAL (
  SELECT fn_mapping_version_for_date(s.project_id, s.occurred_on) AS mapping_version_id
) mv ON mv.mapping_version_id IS NOT NULL
JOIN mapping_lines ml
  ON ml.mapping_version_id = mv.mapping_version_id
 AND ml.work_littera_id = s.work_littera_id
 AND (ml.cost_type IS NULL OR ml.cost_type = s.cost_type);

CREATE OR REPLACE VIEW v_actuals_latest_snapshot_unmapped_cost_only AS
SELECT
  s.project_id,
  s.work_littera_id,
  s.cost_type,
  s.external_ref,
  s.amount,
  s.occurred_on,
  fn_mapping_version_for_date(s.project_id, s.occurred_on) AS mapping_version_id
FROM v_actuals_latest_snapshot_cost_only s
WHERE NOT EXISTS (
  SELECT 1
  FROM mapping_lines ml
  WHERE ml.mapping_version_id = fn_mapping_version_for_date(s.project_id, s.occurred_on)
    AND ml.work_littera_id = s.work_littera_id
    AND (ml.cost_type IS NULL OR ml.cost_type = s.cost_type)
);

-- KPI/AC uses COST-only snapshot
CREATE OR REPLACE VIEW v_actual_cost_lines_latest AS
SELECT
  project_id,
  target_littera_id AS littera_id,
  ROUND(SUM(allocated_amount), 2) AS amount
FROM v_actuals_latest_snapshot_mapped_cost_only
GROUP BY project_id, target_littera_id;

-- =========================
-- 3) Monthly COST-only chain
-- =========================
CREATE OR REPLACE VIEW v_actuals_mapped_cost_only AS
SELECT
  a.project_id,
  a.actual_cost_line_id,
  a.occurred_on,
  a.cost_type,
  a.amount AS original_amount,
  a.work_littera_id,
  mv.mapping_version_id,
  ml.target_littera_id,
  ml.allocation_rule,
  ml.allocation_value,
  CASE
    WHEN ml.allocation_rule = 'FULL' THEN a.amount
    WHEN ml.allocation_rule = 'PERCENT' THEN round(a.amount * ml.allocation_value, 2)
    ELSE NULL
  END AS allocated_amount
FROM v_actual_cost_lines_cost_only a
JOIN LATERAL (
  SELECT fn_mapping_version_for_date(a.project_id, a.occurred_on) AS mapping_version_id
) mv ON mv.mapping_version_id IS NOT NULL
JOIN mapping_lines ml
  ON ml.mapping_version_id = mv.mapping_version_id
 AND ml.work_littera_id = a.work_littera_id
 AND (ml.cost_type IS NULL OR ml.cost_type = a.cost_type);

CREATE OR REPLACE VIEW v_actuals_unmapped_cost_only AS
SELECT
  a.project_id,
  a.actual_cost_line_id,
  a.occurred_on,
  a.cost_type,
  a.amount,
  a.work_littera_id,
  fn_mapping_version_for_date(a.project_id, a.occurred_on) AS mapping_version_id
FROM v_actual_cost_lines_cost_only a
WHERE NOT EXISTS (
  SELECT 1
  FROM mapping_lines ml
  WHERE ml.mapping_version_id = fn_mapping_version_for_date(a.project_id, a.occurred_on)
    AND ml.work_littera_id = a.work_littera_id
    AND (ml.cost_type IS NULL OR ml.cost_type = a.cost_type)
);

CREATE OR REPLACE VIEW v_actuals_mapped_agg_cost_only AS
SELECT
  project_id,
  target_littera_id,
  cost_type,
  date_trunc('month', occurred_on)::date AS month,
  SUM(allocated_amount) AS actual_amount
FROM v_actuals_mapped_cost_only
GROUP BY project_id, target_littera_id, cost_type, date_trunc('month', occurred_on)::date;

CREATE OR REPLACE VIEW v_mapping_coverage_month_cost_only AS
SELECT
  a.project_id,
  date_trunc('month', a.occurred_on)::date AS month,
  SUM(CASE WHEN m.allocated_amount IS NOT NULL THEN m.allocated_amount ELSE 0 END) AS mapped_amount,
  SUM(a.amount) AS total_amount,
  CASE WHEN SUM(a.amount) = 0 THEN 1.0
       ELSE (SUM(CASE WHEN m.allocated_amount IS NOT NULL THEN m.allocated_amount ELSE 0 END) / SUM(a.amount)) END
       AS coverage
FROM v_actual_cost_lines_cost_only a
LEFT JOIN v_actuals_mapped_cost_only m ON m.actual_cost_line_id = a.actual_cost_line_id
GROUP BY a.project_id, date_trunc('month', a.occurred_on)::date;

CREATE OR REPLACE VIEW v_target_month_cost_report AS
WITH month_dim AS (
  SELECT DISTINCT project_id, date_trunc('month', occurred_on)::date AS month
  FROM v_actual_cost_lines_cost_only
),
budget_pick AS (
  SELECT
    md.project_id,
    md.month,
    bl.target_littera_id,
    bl.cost_type,
    bl.amount,
    ROW_NUMBER() OVER (
      PARTITION BY md.project_id, md.month, bl.target_littera_id, bl.cost_type
      ORDER BY bl.valid_from DESC, bl.created_at DESC
    ) AS rn
  FROM month_dim md
  JOIN budget_lines bl
    ON bl.project_id = md.project_id
   AND md.month <@ bl.valid_range
)
SELECT
  am.project_id,
  am.month,
  am.target_littera_id,
  am.cost_type,
  COALESCE(bp.amount, 0) AS budget_amount,
  am.actual_amount,
  COALESCE(fcl.forecast_value, 0) AS forecast_value,
  fc.event_time AS forecast_time
FROM v_actuals_mapped_agg_cost_only am
LEFT JOIN budget_pick bp
  ON bp.project_id = am.project_id
 AND bp.month = am.month
 AND bp.target_littera_id = am.target_littera_id
 AND bp.cost_type = am.cost_type
 AND bp.rn = 1
LEFT JOIN v_forecast_current fc
  ON fc.project_id = am.project_id
 AND fc.target_littera_id = am.target_littera_id
LEFT JOIN v_forecast_current_lines fcl
  ON fcl.forecast_event_id = fc.forecast_event_id
 AND fcl.cost_type = am.cost_type;

CREATE OR REPLACE VIEW v_report_monthly_target_cost_raw AS
SELECT * FROM v_target_month_cost_report;

CREATE OR REPLACE VIEW v_report_monthly_mapping_coverage_raw AS
SELECT * FROM v_mapping_coverage_month_cost_only;

-- =========================
-- 4) Opening snapshot views (NPSS/cutover)
-- =========================
CREATE OR REPLACE VIEW v_npss_opening_snapshot_raw AS
SELECT *
FROM v_actual_cost_lines_npss_opening;

CREATE OR REPLACE VIEW v_npss_opening_snapshot_mapped AS
SELECT
  a.project_id,
  a.actual_cost_line_id,
  a.occurred_on,
  a.cost_type,
  a.amount AS original_amount,
  a.work_littera_id,
  mv.mapping_version_id,
  ml.target_littera_id,
  ml.allocation_rule,
  ml.allocation_value,
  CASE
    WHEN ml.allocation_rule = 'FULL' THEN a.amount
    WHEN ml.allocation_rule = 'PERCENT' THEN round(a.amount * ml.allocation_value, 2)
    ELSE NULL
  END AS allocated_amount
FROM v_actual_cost_lines_npss_opening a
JOIN LATERAL (
  SELECT fn_mapping_version_for_date(a.project_id, a.occurred_on) AS mapping_version_id
) mv ON mv.mapping_version_id IS NOT NULL
JOIN mapping_lines ml
  ON ml.mapping_version_id = mv.mapping_version_id
 AND ml.work_littera_id = a.work_littera_id
 AND (ml.cost_type IS NULL OR ml.cost_type = a.cost_type);

CREATE OR REPLACE VIEW v_npss_opening_snapshot_unmapped AS
SELECT
  a.project_id,
  a.actual_cost_line_id,
  a.occurred_on,
  a.cost_type,
  a.amount,
  a.work_littera_id,
  fn_mapping_version_for_date(a.project_id, a.occurred_on) AS mapping_version_id
FROM v_actual_cost_lines_npss_opening a
WHERE NOT EXISTS (
  SELECT 1
  FROM mapping_lines ml
  WHERE ml.mapping_version_id = fn_mapping_version_for_date(a.project_id, a.occurred_on)
    AND ml.work_littera_id = a.work_littera_id
    AND (ml.cost_type IS NULL OR ml.cost_type = a.cost_type)
);

CREATE OR REPLACE VIEW v_npss_opening_snapshot_totals AS
SELECT
  project_id,
  target_littera_id,
  cost_type,
  ROUND(SUM(allocated_amount), 2) AS opening_amount
FROM v_npss_opening_snapshot_mapped
GROUP BY project_id, target_littera_id, cost_type;

-- =========================
-- 5) Unmapped totals (COST-only) for KPI/project summary
-- =========================
CREATE OR REPLACE VIEW v_report_unmapped_actuals_total AS
SELECT
  project_id,
  ROUND(SUM(amount)::numeric, 2) AS unmapped_total
FROM v_actuals_latest_snapshot_unmapped_cost_only
GROUP BY project_id;
