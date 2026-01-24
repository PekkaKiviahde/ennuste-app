-- 0051_project_cost_bridge_mt_lt_by_littera.sql
-- Litteratason kustannussilta: BAC (baseline) + MT/LT (approved) + EAC (latest actuals batch).
--
-- Mitä muuttui:
-- - Lisätty näkymä `v_report_project_cost_bridge_mt_lt_by_littera`.
-- Miksi:
-- - Tarvitaan raportointi litteratasolla (project_id, littera_code) kustannusten sillaksi (BAC + MT + LT + EAC).
-- Miten testataan (manuaali):
-- - Aja migraatiot puhtaaseen kantaan.
-- - Aja `docs/sql/VERIFY_INVARIANTS.sql` ja `docs/sql/SMOKE_E2E_CORE.sql`.
-- - Smoke:
--   SELECT * FROM v_report_project_cost_bridge_mt_lt_by_littera WHERE project_id='<PROJECT_ID>'::uuid ORDER BY littera_code;

BEGIN;

CREATE OR REPLACE VIEW v_report_project_cost_bridge_mt_lt_by_littera AS
WITH
  bac_by_littera AS (
    SELECT
      lb.project_id,
      l.code AS littera_code,
      COALESCE(SUM(bll.amount), 0)::numeric AS original_bac_cost_eur
    FROM v_work_package_latest_baseline lb
    JOIN work_package_baseline_lines bll ON bll.work_package_baseline_id = lb.work_package_baseline_id
    JOIN litteras l ON l.littera_id = bll.target_littera_id
    WHERE l.code ~ '^[0-9]{4}$'
    GROUP BY lb.project_id, l.code
  ),
  mt_by_littera AS (
    SELECT
      l.project_id,
      l.littera_code,
      COUNT(DISTINCT r.change_request_id)::int AS mt_approved_count,
      COALESCE(SUM(l.cost_eur), 0)::numeric AS mt_approved_cost_eur,
      COALESCE(SUM(l.revenue_eur), 0)::numeric AS mt_approved_revenue_eur,
      COALESCE(SUM(l.revenue_eur - l.cost_eur), 0)::numeric AS mt_approved_margin_eur
    FROM change_request_lines l
    JOIN change_requests r
      ON r.change_request_id = l.change_request_id
     AND r.project_id = l.project_id
     AND r.change_type = 'MT'
    JOIN v_change_request_current_status s
      ON s.change_request_id = r.change_request_id
     AND s.status = 'APPROVED'
    GROUP BY l.project_id, l.littera_code
  ),
  lt_by_littera AS (
    SELECT
      l.project_id,
      l.littera_code,
      COUNT(DISTINCT r.change_request_id)::int AS lt_approved_count,
      COALESCE(SUM(l.cost_eur), 0)::numeric AS lt_approved_cost_eur,
      COALESCE(SUM(l.revenue_eur), 0)::numeric AS lt_approved_revenue_eur,
      COALESCE(SUM(l.revenue_eur - l.cost_eur), 0)::numeric AS lt_approved_margin_eur
    FROM change_request_lines l
    JOIN change_requests r
      ON r.change_request_id = l.change_request_id
     AND r.project_id = l.project_id
     AND r.change_type = 'LT'
    JOIN v_change_request_current_status s
      ON s.change_request_id = r.change_request_id
     AND s.status = 'APPROVED'
    GROUP BY l.project_id, l.littera_code
  ),
  latest_actuals_batches AS (
    SELECT DISTINCT ON (b.project_id)
      b.project_id,
      b.id AS import_batch_id
    FROM import_batches b
    WHERE b.kind = 'ACTUALS'
    ORDER BY b.project_id, b.created_at DESC, b.id DESC
  ),
  eac_by_littera AS (
    SELECT
      b.project_id,
      (a.dimensions_json->>'littera_code') AS littera_code,
      COALESCE(SUM(a.amount_eur), 0)::numeric AS current_eac_cost_eur
    FROM latest_actuals_batches la
    JOIN import_batches b ON b.id = la.import_batch_id
    JOIN actuals_lines a ON a.import_batch_id = b.id
    WHERE (a.dimensions_json->>'littera_code') ~ '^[0-9]{4}$'
    GROUP BY b.project_id, (a.dimensions_json->>'littera_code')
  ),
  base_litteras AS (
    SELECT DISTINCT project_id, littera_code
    FROM (
      SELECT project_id, littera_code FROM bac_by_littera
      UNION ALL
      SELECT project_id, littera_code FROM mt_by_littera
      UNION ALL
      SELECT project_id, littera_code FROM lt_by_littera
      UNION ALL
      SELECT project_id, littera_code FROM eac_by_littera
    ) u
  )
SELECT
  bl.project_id,
  bl.littera_code,
  LEFT(bl.littera_code, 1)::int AS main_group,
  COALESCE(bac.original_bac_cost_eur, 0)::numeric AS original_bac_cost_eur,
  COALESCE(mt.mt_approved_count, 0)::int AS mt_approved_count,
  COALESCE(mt.mt_approved_cost_eur, 0)::numeric AS mt_approved_cost_eur,
  COALESCE(mt.mt_approved_revenue_eur, 0)::numeric AS mt_approved_revenue_eur,
  COALESCE(mt.mt_approved_margin_eur, 0)::numeric AS mt_approved_margin_eur,
  COALESCE(lt.lt_approved_count, 0)::int AS lt_approved_count,
  COALESCE(lt.lt_approved_cost_eur, 0)::numeric AS lt_approved_cost_eur,
  COALESCE(lt.lt_approved_revenue_eur, 0)::numeric AS lt_approved_revenue_eur,
  COALESCE(lt.lt_approved_margin_eur, 0)::numeric AS lt_approved_margin_eur,
  (
    COALESCE(bac.original_bac_cost_eur, 0)
    + COALESCE(mt.mt_approved_cost_eur, 0)
    + COALESCE(lt.lt_approved_cost_eur, 0)
  )::numeric AS contract_baseline_cost_eur,
  COALESCE(eac.current_eac_cost_eur, 0)::numeric AS current_eac_cost_eur,
  (
    COALESCE(eac.current_eac_cost_eur, 0)
    - (
      COALESCE(bac.original_bac_cost_eur, 0)
      + COALESCE(mt.mt_approved_cost_eur, 0)
      + COALESCE(lt.lt_approved_cost_eur, 0)
    )
  )::numeric AS internal_cost_variance_eur
FROM base_litteras bl
JOIN projects p ON p.project_id = bl.project_id
LEFT JOIN bac_by_littera bac
  ON bac.project_id = bl.project_id
 AND bac.littera_code = bl.littera_code
LEFT JOIN mt_by_littera mt
  ON mt.project_id = bl.project_id
 AND mt.littera_code = bl.littera_code
LEFT JOIN lt_by_littera lt
  ON lt.project_id = bl.project_id
 AND lt.littera_code = bl.littera_code
LEFT JOIN eac_by_littera eac
  ON eac.project_id = bl.project_id
 AND eac.littera_code = bl.littera_code;

COMMIT;

