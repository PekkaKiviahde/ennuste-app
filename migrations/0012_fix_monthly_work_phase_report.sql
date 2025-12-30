-- 0012_fix_monthly_work_phase_report.sql
-- Fix Phase 18 monthly mapping for your v_target_month_cost_report schema:
-- month + target_littera_id + budget_amount + actual_amount + forecast_value

BEGIN;

CREATE OR REPLACE VIEW v_report_monthly_work_phase AS
SELECT
  wp.project_id,
  lb.work_phase_id,
  wp.name AS work_phase_name,
  (r.month)::text AS month_key,

  ROUND(SUM(COALESCE(r.budget_amount, 0))::numeric, 2) AS target_total,
  ROUND(SUM(COALESCE(r.actual_amount, 0))::numeric, 2) AS actual_total,
  ROUND(SUM(COALESCE(r.forecast_value, 0))::numeric, 2) AS forecast_total

FROM v_work_phase_latest_baseline lb
JOIN work_phases wp
  ON wp.work_phase_id = lb.work_phase_id
JOIN work_phase_members m
  ON m.work_phase_version_id = lb.work_phase_version_id
 AND m.member_type = 'LITTERA'
JOIN v_target_month_cost_report r
  ON r.project_id = wp.project_id
 AND r.target_littera_id = m.littera_id

GROUP BY wp.project_id, lb.work_phase_id, wp.name, (r.month)::text;

COMMIT;
