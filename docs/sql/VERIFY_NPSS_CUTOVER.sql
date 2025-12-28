-- VERIFY_NPSS_CUTOVER.sql
-- Tarkistukset NPSS/cutover opening snapshot -tuelle (pgAdmin Query Tool)

-- 1) Tyypit olemassa
SELECT t.typname
FROM pg_type t
WHERE t.typname IN ('amount_kind', 'cost_type_origin');

-- 2) Sarakkeet actual_cost_lines-taulussa
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'actual_cost_lines'
  AND column_name IN ('amount_kind', 'cost_type_origin');

-- 3) NPSS opening snapshot -näkymät olemassa
SELECT table_name
FROM information_schema.views
WHERE table_name IN (
  'v_actual_cost_lines_effective',
  'v_actual_cost_lines_cost_only',
  'v_actual_cost_lines_npss_opening',
  'v_npss_opening_snapshot_raw',
  'v_npss_opening_snapshot_mapped',
  'v_npss_opening_snapshot_totals'
);

-- 4) Varmista: kuukausiraportin ketju ei sisällä NPSS_UNCLASSIFIED/UNCLASSIFIED
SELECT COUNT(*) AS npss_rows_in_monthly_chain
FROM v_actuals_mapped_cost_only am
JOIN v_actual_cost_lines_effective a
  ON a.actual_cost_line_id = am.actual_cost_line_id
WHERE a.effective_amount_kind IN ('NPSS_UNCLASSIFIED', 'UNCLASSIFIED');

-- 5) Erottelu: COST-only vs NPSS opening snapshot
SELECT COALESCE(SUM(amount), 0) AS cost_only_total
FROM v_actual_cost_lines_cost_only;

SELECT COALESCE(SUM(amount), 0) AS npss_opening_total
FROM v_npss_opening_snapshot_raw;
