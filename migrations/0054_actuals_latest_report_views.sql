-- 0054_actuals_latest_report_views.sql
-- Actuals (toteumat): latest snapshot + mapped/unmapped report -näkymät demo-smokea varten.
--
-- Mitä muuttui:
-- - Lisätty latest-batch ja latest-lines -näkymät toteumille.
-- - Lisätty mappingin tulosnäkymä latest toteumille (rule/override/unmapped).
-- - Lisätty raporttinäkymät: unmapped, work_package ja proc_package latest toteumille.
-- Miksi:
-- - `docs/sql/SMOKE_DEMO_CANONICAL.sql` odottaa latest toteumien mapped/unmapped -näkymiä.
-- - Demo tarvitsee sekä mapped että unmapped toteumarivejä näkyviin raportoinnissa.
-- Miten testataan (manuaali):
-- - Aja migraatiot: `npm run db:migrate`.
-- - Aja smoket: `docs/sql/SMOKE_DEMO_CANONICAL.sql` ja `docs/sql/SMOKE_DEMO_ONBOARDING_DATA.sql`.

BEGIN;

CREATE OR REPLACE VIEW v_actuals_latest_batches AS
SELECT DISTINCT ON (b.project_id)
  b.project_id,
  b.id AS import_batch_id,
  b.created_at
FROM import_batches b
WHERE b.kind = 'ACTUALS'
ORDER BY b.project_id, b.created_at DESC, b.id DESC;

CREATE OR REPLACE VIEW v_actuals_latest_lines AS
SELECT
  lb.project_id,
  lb.import_batch_id,
  al.id AS actuals_line_id,
  al.posting_date,
  al.amount_eur,
  al.account,
  al.cost_center,
  al.vendor,
  al.invoice_no,
  al.description,
  al.dimensions_json
FROM v_actuals_latest_batches lb
JOIN actuals_lines al ON al.import_batch_id = lb.import_batch_id;

CREATE OR REPLACE VIEW v_actuals_latest_mapped_candidates AS
SELECT
  l.project_id,
  l.import_batch_id,
  l.actuals_line_id,
  l.posting_date,
  l.amount_eur,
  l.account,
  l.cost_center,
  l.vendor,
  l.invoice_no,
  l.description,
  l.dimensions_json,
  mv.actuals_mapping_version_id,
  COALESCE(ov.work_package_id, mr.work_package_id) AS work_package_id,
  COALESCE(ov.proc_package_id, mr.proc_package_id) AS proc_package_id,
  mr.actuals_mapping_rule_id,
  ov.actuals_row_override_id,
  CASE
    WHEN ov.actuals_row_override_id IS NOT NULL THEN 'OVERRIDE'
    WHEN mr.actuals_mapping_rule_id IS NOT NULL THEN 'RULE'
    ELSE 'UNMAPPED'
  END AS mapping_source
FROM v_actuals_latest_lines l
LEFT JOIN LATERAL (
  SELECT amv.id AS actuals_mapping_version_id
  FROM actuals_mapping_versions amv
  WHERE amv.project_id = l.project_id
    AND amv.status = 'ACTIVE'
    AND amv.valid_from <= COALESCE(l.posting_date, current_date)
  ORDER BY amv.valid_from DESC, amv.id DESC
  LIMIT 1
) mv ON TRUE
LEFT JOIN LATERAL (
  SELECT
    aro.id AS actuals_row_override_id,
    aro.work_package_id,
    aro.proc_package_id
  FROM actuals_row_overrides aro
  WHERE aro.actuals_mapping_version_id = mv.actuals_mapping_version_id
    AND aro.actuals_line_id = l.actuals_line_id
  ORDER BY aro.created_at DESC, aro.id DESC
  LIMIT 1
) ov ON TRUE
LEFT JOIN LATERAL (
  SELECT
    amr.id AS actuals_mapping_rule_id,
    amr.work_package_id,
    amr.proc_package_id,
    amr.priority
  FROM actuals_mapping_rules amr
  WHERE amr.actuals_mapping_version_id = mv.actuals_mapping_version_id
    AND COALESCE(l.dimensions_json, '{}'::jsonb) @> amr.match_json
  ORDER BY amr.priority DESC, amr.id DESC
  LIMIT 1
) mr ON TRUE;

CREATE OR REPLACE VIEW v_report_unmapped_actuals_latest AS
SELECT
  project_id,
  import_batch_id,
  actuals_line_id,
  posting_date,
  amount_eur,
  dimensions_json->>'littera_code' AS littera_code,
  account,
  cost_center,
  vendor,
  invoice_no,
  description,
  dimensions_json,
  actuals_mapping_version_id,
  mapping_source
FROM v_actuals_latest_mapped_candidates
WHERE mapping_source = 'UNMAPPED';

CREATE OR REPLACE VIEW v_report_work_package_actuals_latest AS
SELECT
  c.project_id,
  c.import_batch_id,
  c.work_package_id,
  wp.code AS work_package_code,
  wp.name AS work_package_name,
  COUNT(*)::int AS line_count,
  SUM(c.amount_eur)::numeric AS amount_total
FROM v_actuals_latest_mapped_candidates c
JOIN work_packages wp ON wp.id = c.work_package_id
WHERE c.work_package_id IS NOT NULL
  AND c.mapping_source <> 'UNMAPPED'
GROUP BY c.project_id, c.import_batch_id, c.work_package_id, wp.code, wp.name;

CREATE OR REPLACE VIEW v_report_proc_package_actuals_latest AS
SELECT
  c.project_id,
  c.import_batch_id,
  c.proc_package_id,
  pp.code AS proc_package_code,
  pp.name AS proc_package_name,
  COUNT(*)::int AS line_count,
  SUM(c.amount_eur)::numeric AS amount_total
FROM v_actuals_latest_mapped_candidates c
JOIN proc_packages pp ON pp.id = c.proc_package_id
WHERE c.proc_package_id IS NOT NULL
  AND c.mapping_source <> 'UNMAPPED'
GROUP BY c.project_id, c.import_batch_id, c.proc_package_id, pp.code, pp.name;

COMMIT;
