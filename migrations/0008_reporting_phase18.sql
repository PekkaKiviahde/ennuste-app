-- 0008_reporting_phase18.sql
-- Phase 18 (SaaS v1): Reporting views (work phase / main group / project) + weekly & monthly trends + top variances
-- Päivitetty: 2025-12-18
-- Lähtöoletukset:
--   - KPI lasketaan vain baseline-lukituille työvaiheille (policy A, jo tehty v16)
--   - Toteuma (AC) saadaan v_actual_cost_lines_latest -näkymästä (v16, teillä target_littera_id + allocated_amount)
--   - Tavoitearvion 4-num taso löytyy budget_lines (teillä target_littera_id -avaimella)
--   - Kuukausiraportointi pohjautuu olemassa olevaan v_target_month_cost_report -näkymään

BEGIN;

-- ============================================================
-- 0) Helper: normalize budget_lines to a stable shape
--    v_budget_lines_norm(project_id, import_batch_id, littera_id, cost_type, amount)
-- ============================================================
DO $phase18_bl$
DECLARE
  v_rel regclass;
  v_littera_col text;
  v_amount_col text;
  v_cost_type_col text;
  v_sql text;
BEGIN
  v_rel := to_regclass('public.budget_lines');

  IF v_rel IS NULL THEN
    EXECUTE 'CREATE OR REPLACE VIEW v_budget_lines_norm AS
             SELECT NULL::uuid AS project_id, NULL::uuid AS import_batch_id, NULL::uuid AS littera_id,
                    NULL::text AS cost_type, 0::numeric(14,2) AS amount
             WHERE false';
    RETURN;
  END IF;

  -- littera column
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='target_littera_id' AND NOT attisdropped) THEN
    v_littera_col := 'target_littera_id';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='littera_id' AND NOT attisdropped) THEN
    v_littera_col := 'littera_id';
  ELSE
    v_littera_col := NULL;
  END IF;

  -- amount column
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='amount' AND NOT attisdropped) THEN
    v_amount_col := 'amount';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='eur' AND NOT attisdropped) THEN
    v_amount_col := 'eur';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='total_eur' AND NOT attisdropped) THEN
    v_amount_col := 'total_eur';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='sum_eur' AND NOT attisdropped) THEN
    v_amount_col := 'sum_eur';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='sum' AND NOT attisdropped) THEN
    v_amount_col := 'sum';
  ELSE
    v_amount_col := NULL;
  END IF;

  -- cost_type column (optional)
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='cost_type' AND NOT attisdropped) THEN
    v_cost_type_col := 'cost_type';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='type' AND NOT attisdropped) THEN
    v_cost_type_col := 'type';
  ELSE
    v_cost_type_col := NULL;
  END IF;

  IF v_littera_col IS NULL OR v_amount_col IS NULL THEN
    RAISE NOTICE 'budget_lines schema not recognized (need littera + amount). Creating empty v_budget_lines_norm.';
    EXECUTE 'CREATE OR REPLACE VIEW v_budget_lines_norm AS
             SELECT NULL::uuid AS project_id, NULL::uuid AS import_batch_id, NULL::uuid AS littera_id,
                    NULL::text AS cost_type, 0::numeric(14,2) AS amount
             WHERE false';
    RETURN;
  END IF;

  IF v_cost_type_col IS NULL THEN
    v_sql := format(
      'CREATE OR REPLACE VIEW v_budget_lines_norm AS
       SELECT
         project_id,
         import_batch_id,
         %I::uuid AS littera_id,
         ''TOTAL''::text AS cost_type,
         %I::numeric(14,2) AS amount
       FROM budget_lines',
      v_littera_col,
      v_amount_col
    );
  ELSE
    v_sql := format(
      'CREATE OR REPLACE VIEW v_budget_lines_norm AS
       SELECT
         project_id,
         import_batch_id,
         %I::uuid AS littera_id,
         %I::text AS cost_type,
         %I::numeric(14,2) AS amount
       FROM budget_lines',
      v_littera_col,
      v_cost_type_col,
      v_amount_col
    );
  END IF;

  EXECUTE v_sql;
END
$phase18_bl$;

-- ============================================================
-- 1) Helper: unmapped actuals total per project (selvitettävät toteumat)
--    v_report_unmapped_actuals_total(project_id, unmapped_total)
-- ============================================================
DO $phase18_unmapped$
DECLARE
  v_rel regclass;
  v_amount_col text;
  v_sql text;
BEGIN
  v_rel := to_regclass('public.v_actuals_latest_snapshot_unmapped');

  IF v_rel IS NULL THEN
    EXECUTE 'CREATE OR REPLACE VIEW v_report_unmapped_actuals_total AS
             SELECT NULL::uuid AS project_id, 0::numeric(14,2) AS unmapped_total
             WHERE false';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='original_amount' AND NOT attisdropped) THEN
    v_amount_col := 'original_amount';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='amount' AND NOT attisdropped) THEN
    v_amount_col := 'amount';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='allocated_amount' AND NOT attisdropped) THEN
    v_amount_col := 'allocated_amount';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='eur' AND NOT attisdropped) THEN
    v_amount_col := 'eur';
  ELSE
    v_amount_col := NULL;
  END IF;

  IF v_amount_col IS NULL THEN
    RAISE NOTICE 'v_actuals_latest_snapshot_unmapped: amount column not detected. Creating empty v_report_unmapped_actuals_total.';
    EXECUTE 'CREATE OR REPLACE VIEW v_report_unmapped_actuals_total AS
             SELECT NULL::uuid AS project_id, 0::numeric(14,2) AS unmapped_total
             WHERE false';
    RETURN;
  END IF;

  v_sql := format(
    'CREATE OR REPLACE VIEW v_report_unmapped_actuals_total AS
     SELECT
       project_id,
       ROUND(SUM(%I)::numeric, 2) AS unmapped_total
     FROM v_actuals_latest_snapshot_unmapped
     GROUP BY project_id',
    v_amount_col
  );

  EXECUTE v_sql;
END
$phase18_unmapped$;

-- ============================================================
-- 2) Work phase KPI report (current state) – stable interface for UI
-- ============================================================
CREATE OR REPLACE VIEW v_report_work_phase_current AS
SELECT
  s.project_id,
  s.work_phase_id,
  s.work_phase_name,
  s.work_phase_status,
  s.current_version_id,

  s.latest_baseline_id,
  s.bac_total,
  s.percent_complete,
  s.ev_value,

  s.ac_total,
  s.ghost_open_total,
  s.ac_star_total,
  s.cpi,

  -- Useful helpers
  ROUND(COALESCE(s.ev_value, 0) - COALESCE(s.ac_star_total, 0), 2) AS cost_variance_eur, -- EV - AC*
  ROUND(COALESCE(s.ac_star_total, 0) - COALESCE(s.ev_value, 0), 2) AS cost_overrun_eur,  -- AC* - EV

  (s.percent_complete IS NULL) AS needs_weekly_update,
  (s.ev_value IS NOT NULL AND s.ac_star_total IS NOT NULL AND s.ac_star_total > 0) AS has_cpi
FROM v_work_phase_summary_v16_kpi s;

-- ============================================================
-- 3) Project summary = multiple work phases aggregated (baseline-locked only)
-- ============================================================
CREATE OR REPLACE VIEW v_report_project_current AS
SELECT
  s.project_id,

  COUNT(*) AS work_phases_baseline_locked,
  COUNT(*) FILTER (WHERE s.percent_complete IS NOT NULL) AS work_phases_with_week_update,

  ROUND(SUM(s.bac_total), 2) AS bac_total,
  ROUND(SUM(COALESCE(s.ev_value, 0)), 2) AS ev_total,

  ROUND(SUM(COALESCE(s.ac_total, 0)), 2) AS ac_total,
  ROUND(SUM(COALESCE(s.ghost_open_total, 0)), 2) AS ghost_open_total,
  ROUND(SUM(COALESCE(s.ac_star_total, 0)), 2) AS ac_star_total,

  CASE
    WHEN SUM(COALESCE(s.ac_star_total, 0)) > 0
    THEN ROUND(SUM(COALESCE(s.ev_value, 0)) / SUM(COALESCE(s.ac_star_total, 0)), 4)
    ELSE NULL
  END AS cpi,

  COALESCE(u.unmapped_total, 0) AS unmapped_actual_total,
  ROUND(SUM(COALESCE(s.ac_total, 0)) + COALESCE(u.unmapped_total, 0), 2) AS actual_including_unmapped_total

FROM v_work_phase_summary_v16_kpi s
LEFT JOIN v_report_unmapped_actuals_total u
  ON u.project_id = s.project_id
GROUP BY s.project_id, u.unmapped_total;

-- ============================================================
-- 4) Work phase -> littera breakdown (budget vs actual at 4-digit littera level)
-- ============================================================
CREATE OR REPLACE VIEW v_report_work_phase_littera_current AS
SELECT
  m.project_id,
  lb.work_phase_id,
  wp.name AS work_phase_name,

  m.littera_id,
  l.code AS littera_code,
  l.title AS littera_title,

  ROUND(COALESCE(SUM(bl.amount), 0), 2) AS budget_total,
  ROUND(COALESCE(SUM(ac.amount), 0), 2) AS actual_total,

  ROUND(COALESCE(SUM(ac.amount), 0) - COALESCE(SUM(bl.amount), 0), 2) AS variance_eur

FROM v_work_phase_latest_baseline lb
JOIN work_phases wp
  ON wp.work_phase_id = lb.work_phase_id
JOIN work_phase_members m
  ON m.work_phase_version_id = lb.work_phase_version_id
 AND m.member_type = 'LITTERA'
JOIN litteras l
  ON l.project_id = m.project_id
 AND l.littera_id = m.littera_id

LEFT JOIN v_budget_lines_norm bl
  ON bl.project_id = m.project_id
 AND bl.import_batch_id = lb.target_import_batch_id
 AND bl.littera_id = m.littera_id

LEFT JOIN v_actual_cost_lines_latest ac
  ON ac.project_id = m.project_id
 AND ac.littera_id = m.littera_id

GROUP BY
  m.project_id, lb.work_phase_id, wp.name,
  m.littera_id, l.code, l.title;

-- ============================================================
-- 5) Main group (pääryhmä) reports
--    Pääryhmä = 1. merkki litterakoodista -> "1xxx", "2xxx", ...
-- ============================================================
CREATE OR REPLACE VIEW v_report_work_phase_main_group_current AS
SELECT
  project_id,
  work_phase_id,
  work_phase_name,
  (SUBSTRING(littera_code, 1, 1) || 'xxx') AS main_group_code,

  ROUND(SUM(budget_total), 2) AS budget_total,
  ROUND(SUM(actual_total), 2) AS actual_total,
  ROUND(SUM(variance_eur), 2) AS variance_eur

FROM v_report_work_phase_littera_current
GROUP BY project_id, work_phase_id, work_phase_name, main_group_code;

CREATE OR REPLACE VIEW v_report_project_main_group_current AS
SELECT
  project_id,
  (SUBSTRING(littera_code, 1, 1) || 'xxx') AS main_group_code,

  ROUND(SUM(budget_total), 2) AS budget_total,
  ROUND(SUM(actual_total), 2) AS actual_total,
  ROUND(SUM(variance_eur), 2) AS variance_eur

FROM v_report_work_phase_littera_current
GROUP BY project_id, main_group_code;

-- ============================================================
-- 6) Diagnostics: overlaps (littera assigned to multiple baseline-locked work phases)
-- ============================================================
CREATE OR REPLACE VIEW v_report_overlap_litteras AS
SELECT
  m.project_id,
  l.code AS littera_code,
  l.title AS littera_title,
  COUNT(DISTINCT lb.work_phase_id) AS work_phase_count,
  ARRAY_AGG(DISTINCT lb.work_phase_id) AS work_phase_ids
FROM v_work_phase_latest_baseline lb
JOIN work_phase_members m
  ON m.work_phase_version_id = lb.work_phase_version_id
 AND m.member_type='LITTERA'
JOIN litteras l
  ON l.project_id = m.project_id
 AND l.littera_id = m.littera_id
GROUP BY m.project_id, l.code, l.title
HAVING COUNT(DISTINCT lb.work_phase_id) > 1;

-- ============================================================
-- 7) Weekly trend: EV by work phase and project (viikkotasolla)
-- ============================================================
CREATE OR REPLACE VIEW v_report_work_phase_weekly_ev AS
SELECT
  w.project_id,
  w.work_phase_id,
  wp.name AS work_phase_name,
  w.week_ending,
  w.percent_complete,
  lb.bac_total,
  ROUND(lb.bac_total * (w.percent_complete / 100.0), 2) AS ev_value
FROM work_phase_weekly_updates w
JOIN work_phases wp
  ON wp.work_phase_id = w.work_phase_id
JOIN v_work_phase_latest_baseline lb
  ON lb.work_phase_id = w.work_phase_id;

CREATE OR REPLACE VIEW v_report_project_weekly_ev AS
SELECT
  project_id,
  week_ending,
  COUNT(DISTINCT work_phase_id) AS work_phases_updated,
  ROUND(SUM(ev_value), 2) AS ev_total
FROM v_report_work_phase_weekly_ev
GROUP BY project_id, week_ending;

-- ============================================================
-- 8) Monthly trend: expose existing monthly report(s) + attempt to create work-phase mapping
-- ============================================================
CREATE OR REPLACE VIEW v_report_monthly_target_cost_raw AS
SELECT * FROM v_target_month_cost_report;

CREATE OR REPLACE VIEW v_report_monthly_mapping_coverage_raw AS
SELECT * FROM v_mapping_coverage_month;

-- Try to build v_report_monthly_work_phase (best-effort; creates empty view if schema differs)
DO $phase18_monthly$
DECLARE
  v_rel regclass;
  v_month_col text;
  v_littera_id_col text;
  v_littera_code_col text;
  v_actual_col text;
  v_target_col text;
  v_forecast_col text;
  v_sql text;
BEGIN
  v_rel := to_regclass('public.v_target_month_cost_report');

  IF v_rel IS NULL THEN
    EXECUTE 'CREATE OR REPLACE VIEW v_report_monthly_work_phase AS
             SELECT NULL::uuid AS project_id, NULL::uuid AS work_phase_id, NULL::text AS work_phase_name,
                    NULL::text AS month_key,
                    0::numeric(14,2) AS target_total,
                    0::numeric(14,2) AS actual_total,
                    NULL::numeric(14,2) AS forecast_total
             WHERE false';
    RETURN;
  END IF;

  -- month column candidates
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='month' AND NOT attisdropped) THEN
    v_month_col := 'month';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='month_end' AND NOT attisdropped) THEN
    v_month_col := 'month_end';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='month_start' AND NOT attisdropped) THEN
    v_month_col := 'month_start';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='period' AND NOT attisdropped) THEN
    v_month_col := 'period';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='year_month' AND NOT attisdropped) THEN
    v_month_col := 'year_month';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='ym' AND NOT attisdropped) THEN
    v_month_col := 'ym';
  ELSE
    v_month_col := NULL;
  END IF;

  -- littera id or code
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='target_littera_id' AND NOT attisdropped) THEN
    v_littera_id_col := 'target_littera_id';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='littera_id' AND NOT attisdropped) THEN
    v_littera_id_col := 'littera_id';
  ELSE
    v_littera_id_col := NULL;
  END IF;

  IF v_littera_id_col IS NULL THEN
    IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='littera_code' AND NOT attisdropped) THEN
      v_littera_code_col := 'littera_code';
    ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='code' AND NOT attisdropped) THEN
      v_littera_code_col := 'code';
    ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='code4' AND NOT attisdropped) THEN
      v_littera_code_col := 'code4';
    ELSE
      v_littera_code_col := NULL;
    END IF;
  ELSE
    v_littera_code_col := NULL;
  END IF;

  -- amount columns (best guess)
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='actual_total' AND NOT attisdropped) THEN
    v_actual_col := 'actual_total';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='actual_eur' AND NOT attisdropped) THEN
    v_actual_col := 'actual_eur';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='actual_amount' AND NOT attisdropped) THEN
    v_actual_col := 'actual_amount';
  ELSE
    v_actual_col := NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='target_total' AND NOT attisdropped) THEN
    v_target_col := 'target_total';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='target_eur' AND NOT attisdropped) THEN
    v_target_col := 'target_eur';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='target_amount' AND NOT attisdropped) THEN
    v_target_col := 'target_amount';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='budget_total' AND NOT attisdropped) THEN
    v_target_col := 'budget_total';
  ELSE
    v_target_col := NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='forecast_total' AND NOT attisdropped) THEN
    v_forecast_col := 'forecast_total';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='forecast_eur' AND NOT attisdropped) THEN
    v_forecast_col := 'forecast_eur';
  ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=v_rel AND attname='forecast_amount' AND NOT attisdropped) THEN
    v_forecast_col := 'forecast_amount';
  ELSE
    v_forecast_col := NULL;
  END IF;

  IF v_month_col IS NULL OR v_target_col IS NULL OR v_actual_col IS NULL THEN
    RAISE NOTICE 'v_target_month_cost_report: missing month/target/actual columns -> creating empty v_report_monthly_work_phase';
    EXECUTE 'CREATE OR REPLACE VIEW v_report_monthly_work_phase AS
             SELECT NULL::uuid AS project_id, NULL::uuid AS work_phase_id, NULL::text AS work_phase_name,
                    NULL::text AS month_key,
                    0::numeric(14,2) AS target_total,
                    0::numeric(14,2) AS actual_total,
                    NULL::numeric(14,2) AS forecast_total
             WHERE false';
    RETURN;
  END IF;

  IF v_littera_id_col IS NOT NULL THEN
    v_sql := format(
      'CREATE OR REPLACE VIEW v_report_monthly_work_phase AS
       SELECT
         lbp.project_id,
         lbp.work_phase_id,
         wp.name AS work_phase_name,
         (%1$I)::text AS month_key,
         ROUND(SUM(r.%2$I)::numeric, 2) AS target_total,
         ROUND(SUM(r.%3$I)::numeric, 2) AS actual_total,
         %4$s
       FROM v_work_phase_latest_baseline lbp
       JOIN work_phases wp ON wp.work_phase_id = lbp.work_phase_id
       JOIN work_phase_members m
         ON m.work_phase_version_id = lbp.work_phase_version_id
        AND m.member_type = ''LITTERA''
       JOIN v_target_month_cost_report r
         ON r.project_id = m.project_id
        AND r.%5$I::uuid = m.littera_id
       GROUP BY lbp.project_id, lbp.work_phase_id, wp.name, (%1$I)::text',
      v_month_col,
      v_target_col,
      v_actual_col,
      CASE
        WHEN v_forecast_col IS NULL THEN 'NULL::numeric(14,2) AS forecast_total'
        ELSE format('ROUND(SUM(r.%I)::numeric, 2) AS forecast_total', v_forecast_col)
      END,
      v_littera_id_col
    );
  ELSIF v_littera_code_col IS NOT NULL THEN
    v_sql := format(
      'CREATE OR REPLACE VIEW v_report_monthly_work_phase AS
       SELECT
         lbp.project_id,
         lbp.work_phase_id,
         wp.name AS work_phase_name,
         (r.%1$I)::text AS month_key,
         ROUND(SUM(r.%2$I)::numeric, 2) AS target_total,
         ROUND(SUM(r.%3$I)::numeric, 2) AS actual_total,
         %4$s
       FROM v_work_phase_latest_baseline lbp
       JOIN work_phases wp ON wp.work_phase_id = lbp.work_phase_id
       JOIN work_phase_members m
         ON m.work_phase_version_id = lbp.work_phase_version_id
        AND m.member_type = ''LITTERA''
       JOIN litteras l
         ON l.project_id = m.project_id
        AND l.littera_id = m.littera_id
       JOIN v_target_month_cost_report r
         ON r.project_id = m.project_id
        AND r.%5$I::text = l.code
       GROUP BY lbp.project_id, lbp.work_phase_id, wp.name, (r.%1$I)::text',
      v_month_col,
      v_target_col,
      v_actual_col,
      CASE
        WHEN v_forecast_col IS NULL THEN 'NULL::numeric(14,2) AS forecast_total'
        ELSE format('ROUND(SUM(r.%I)::numeric, 2) AS forecast_total', v_forecast_col)
      END,
      v_littera_code_col
    );
  ELSE
    RAISE NOTICE 'v_target_month_cost_report: no littera_id or littera_code column -> creating empty v_report_monthly_work_phase';
    EXECUTE 'CREATE OR REPLACE VIEW v_report_monthly_work_phase AS
             SELECT NULL::uuid AS project_id, NULL::uuid AS work_phase_id, NULL::text AS work_phase_name,
                    NULL::text AS month_key,
                    0::numeric(14,2) AS target_total,
                    0::numeric(14,2) AS actual_total,
                    NULL::numeric(14,2) AS forecast_total
             WHERE false';
    RETURN;
  END IF;

  EXECUTE v_sql;
END
$phase18_monthly$;

-- ============================================================
-- 9) Top lists (poikkeamat)
-- ============================================================
CREATE OR REPLACE VIEW v_report_top_overruns_work_phases AS
SELECT
  project_id,
  work_phase_id,
  work_phase_name,
  bac_total,
  percent_complete,
  ev_value,
  ac_star_total,
  cpi,
  ROUND(COALESCE(ac_star_total,0) - COALESCE(ev_value,0), 2) AS overrun_eur
FROM v_work_phase_summary_v16_kpi
WHERE ev_value IS NOT NULL
  AND ac_star_total IS NOT NULL
ORDER BY overrun_eur DESC
LIMIT 20;

CREATE OR REPLACE VIEW v_report_lowest_cpi_work_phases AS
SELECT
  project_id,
  work_phase_id,
  work_phase_name,
  bac_total,
  percent_complete,
  ev_value,
  ac_star_total,
  cpi
FROM v_work_phase_summary_v16_kpi
WHERE cpi IS NOT NULL
ORDER BY cpi ASC
LIMIT 20;

-- If phase16 view exists, expose as "selvitettävät" top list
CREATE OR REPLACE VIEW v_report_top_selvitettavat_littera AS
SELECT *
FROM v_selvitettavat_actuals_by_littera
ORDER BY actual_total DESC
LIMIT 50;

-- Expose forecast & planning raw views for UI (no transformations)
CREATE OR REPLACE VIEW v_report_forecast_current AS
SELECT * FROM v_forecast_current;

CREATE OR REPLACE VIEW v_report_forecast_current_lines AS
SELECT * FROM v_forecast_current_lines;

CREATE OR REPLACE VIEW v_report_planning_current AS
SELECT * FROM v_planning_current;

COMMIT;
