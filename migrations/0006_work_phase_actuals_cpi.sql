-- 0006_work_phase_actuals_cpi.sql
-- Phase 16: Actuals (AC), AC* (with ghost), CPI + "selvitettävät" views
-- Päivitetty: 2025-12-18
-- Policy: KPI/EV/AC computed ONLY for work phases with LOCKED baseline (A)

-- =========================
-- 1) Latest JYDA import batch per project (helper)
-- =========================
CREATE OR REPLACE VIEW v_latest_jyda_batch AS
SELECT project_id, import_batch_id
FROM (
  SELECT
    project_id,
    import_batch_id,
    ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY imported_at DESC) rn
  FROM import_batches
  WHERE source_system = 'JYDA'
) t
WHERE rn = 1;


-- =========================
-- 2) Actuals (AC) – käytetään mapattua toteumaa
-- =========================
CREATE OR REPLACE VIEW v_actual_cost_lines_latest AS
SELECT
  project_id,
  target_littera_id AS littera_id,
  ROUND(SUM(allocated_amount), 2) AS amount
FROM v_actuals_latest_snapshot_mapped
GROUP BY project_id, target_littera_id;




-- =========================
-- 3) Actual costs by work phase (AC), based on the version that was used to lock baseline
--    Policy A: only phases with baseline participate
-- =========================
CREATE OR REPLACE VIEW v_work_phase_actuals_total AS
SELECT
  m.project_id,
  lb.work_phase_id,
  ROUND(COALESCE(SUM(ac.amount), 0), 2) AS ac_total
FROM v_work_phase_latest_baseline lb
JOIN work_phase_members m
  ON m.work_phase_version_id = lb.work_phase_version_id
 AND m.member_type = 'LITTERA'
LEFT JOIN v_actual_cost_lines_latest ac
  ON ac.project_id = m.project_id
 AND ac.littera_id = m.littera_id
GROUP BY m.project_id, lb.work_phase_id;


-- =========================
-- 4) Summary views with KPI
-- =========================
-- All phases, but KPI fields are only filled when baseline exists (policy A)
CREATE OR REPLACE VIEW v_work_phase_summary_v16_all AS
SELECT
  s.*,

  CASE WHEN s.latest_baseline_id IS NOT NULL THEN COALESCE(a.ac_total, 0) ELSE NULL END AS ac_total,

  CASE
    WHEN s.latest_baseline_id IS NOT NULL
    THEN ROUND(COALESCE(a.ac_total, 0) + COALESCE(s.ghost_open_total, 0), 2)
    ELSE NULL
  END AS ac_star_total,

  CASE
    WHEN s.latest_baseline_id IS NOT NULL
     AND s.ev_value IS NOT NULL
     AND (COALESCE(a.ac_total, 0) + COALESCE(s.ghost_open_total, 0)) > 0
    THEN ROUND(
      s.ev_value / (COALESCE(a.ac_total, 0) + COALESCE(s.ghost_open_total, 0)),
      4
    )
    ELSE NULL
  END AS cpi

FROM v_work_phase_summary_mvp s
LEFT JOIN v_work_phase_actuals_total a
  ON a.project_id = s.project_id
 AND a.work_phase_id = s.work_phase_id;

-- KPI-only (policy A)
CREATE OR REPLACE VIEW v_work_phase_summary_v16_kpi AS
SELECT *
FROM v_work_phase_summary_v16_all
WHERE latest_baseline_id IS NOT NULL;

-- =========================
-- 5) "Selvitettävät": actuals not mapped to any baseline-locked work phase member littera
-- =========================
CREATE OR REPLACE VIEW v_selvitettavat_actuals_by_littera AS
WITH assigned_litteras AS (
  SELECT DISTINCT
    m.project_id,
    m.littera_id
  FROM v_work_phase_latest_baseline lb
  JOIN work_phase_members m
    ON m.work_phase_version_id = lb.work_phase_version_id
   AND m.member_type = 'LITTERA'
)
SELECT
  ac.project_id,
  l.code AS littera_code,
  l.title AS littera_title,
  ROUND(SUM(ac.amount), 2) AS actual_total
FROM v_actual_cost_lines_latest ac
LEFT JOIN litteras l
  ON l.project_id = ac.project_id
 AND l.littera_id = ac.littera_id
LEFT JOIN assigned_litteras al
  ON al.project_id = ac.project_id
 AND al.littera_id = ac.littera_id
WHERE al.littera_id IS NULL
GROUP BY ac.project_id, l.code, l.title
ORDER BY actual_total DESC;

