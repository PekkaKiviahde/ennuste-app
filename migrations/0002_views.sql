-- 0002_views.sql
-- Views & helper functions for reporting (MVP)
-- Päivitetty: 2025-12-16

-- =========================
-- Helper: active mapping version for a given date
-- =========================
CREATE OR REPLACE FUNCTION fn_mapping_version_for_date(p_project_id uuid, p_date date)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT mv.mapping_version_id
  FROM mapping_versions mv
  WHERE mv.project_id = p_project_id
    AND mv.status = 'ACTIVE'
    AND p_date <@ mv.valid_range
  ORDER BY mv.valid_from DESC
  LIMIT 1;
$$;

-- =========================
-- Current planning (latest event per target littera)
-- =========================
CREATE OR REPLACE VIEW v_planning_current AS
SELECT DISTINCT ON (pe.project_id, pe.target_littera_id)
  pe.project_id,
  pe.target_littera_id,
  pe.planning_event_id,
  pe.event_time,
  pe.created_by,
  pe.status,
  pe.summary,
  pe.observations,
  pe.risks,
  pe.decisions,
  pe.attachments
FROM planning_events pe
ORDER BY pe.project_id, pe.target_littera_id, pe.event_time DESC;

-- =========================
-- Current forecast (latest event per target littera)
-- =========================
CREATE OR REPLACE VIEW v_forecast_current AS
SELECT DISTINCT ON (fe.project_id, fe.target_littera_id)
  fe.project_id,
  fe.target_littera_id,
  fe.forecast_event_id,
  fe.mapping_version_id,
  fe.event_time,
  fe.created_by,
  fe.source,
  fe.comment,
  fe.technical_progress,
  fe.financial_progress,
  fe.kpi_value
FROM forecast_events fe
ORDER BY fe.project_id, fe.target_littera_id, fe.event_time DESC;

CREATE OR REPLACE VIEW v_forecast_current_lines AS
SELECT
  fc.project_id,
  fc.target_littera_id,
  fc.forecast_event_id,
  l.cost_type,
  l.forecast_value,
  l.memo_general,
  l.memo_procurement,
  l.memo_calculation
FROM v_forecast_current fc
JOIN forecast_event_lines l ON l.forecast_event_id = fc.forecast_event_id;

-- =========================
-- Map actuals to target littera via active mapping version at occurred_on
-- (expands to 1..n rows if PERCENT splits)
-- =========================
CREATE OR REPLACE VIEW v_actuals_mapped AS
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
FROM actual_cost_lines a
JOIN LATERAL (
  SELECT fn_mapping_version_for_date(a.project_id, a.occurred_on) AS mapping_version_id
) mv ON mv.mapping_version_id IS NOT NULL
JOIN mapping_lines ml
  ON ml.mapping_version_id = mv.mapping_version_id
 AND ml.work_littera_id = a.work_littera_id
 AND (ml.cost_type IS NULL OR ml.cost_type = a.cost_type);

-- Unmapped actuals (no mapping version or no mapping line)
CREATE OR REPLACE VIEW v_actuals_unmapped AS
SELECT
  a.project_id,
  a.actual_cost_line_id,
  a.occurred_on,
  a.cost_type,
  a.amount,
  a.work_littera_id,
  fn_mapping_version_for_date(a.project_id, a.occurred_on) AS mapping_version_id
FROM actual_cost_lines a
WHERE NOT EXISTS (
  SELECT 1
  FROM mapping_lines ml
  WHERE ml.mapping_version_id = fn_mapping_version_for_date(a.project_id, a.occurred_on)
    AND ml.work_littera_id = a.work_littera_id
    AND (ml.cost_type IS NULL OR ml.cost_type = a.cost_type)
);

-- Aggregated mapped actuals per target littera & cost type
CREATE OR REPLACE VIEW v_actuals_mapped_agg AS
SELECT
  project_id,
  target_littera_id,
  cost_type,
  date_trunc('month', occurred_on)::date AS month,
  SUM(allocated_amount) AS actual_amount
FROM v_actuals_mapped
GROUP BY project_id, target_littera_id, cost_type, date_trunc('month', occurred_on)::date;

-- Coverage per month: mapped / total
CREATE OR REPLACE VIEW v_mapping_coverage_month AS
SELECT
  a.project_id,
  date_trunc('month', a.occurred_on)::date AS month,
  SUM(CASE WHEN m.allocated_amount IS NOT NULL THEN m.allocated_amount ELSE 0 END) AS mapped_amount,
  SUM(a.amount) AS total_amount,
  CASE WHEN SUM(a.amount) = 0 THEN 1.0
       ELSE (SUM(CASE WHEN m.allocated_amount IS NOT NULL THEN m.allocated_amount ELSE 0 END) / SUM(a.amount)) END
       AS coverage
FROM actual_cost_lines a
LEFT JOIN v_actuals_mapped m ON m.actual_cost_line_id = a.actual_cost_line_id
GROUP BY a.project_id, date_trunc('month', a.occurred_on)::date;

-- =========================
-- Simple report: target littera totals (budget, actual, forecast) by month & cost type
-- NOTE: Budget validity is range-based; here we pick the latest budget for month start.
-- =========================
CREATE OR REPLACE VIEW v_target_month_cost_report AS
WITH month_dim AS (
  SELECT DISTINCT project_id, date_trunc('month', occurred_on)::date AS month
  FROM actual_cost_lines
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
FROM v_actuals_mapped_agg am
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

