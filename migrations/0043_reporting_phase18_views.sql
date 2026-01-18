-- 0043_reporting_phase18_views.sql
-- Raportoinnin minimiview:t Next-UI:ta varten.
--
-- Mitä muuttui:
-- - Lisätty puuttuvat v_report_* -näkymät (project/work phase/forecast).
-- Miksi:
-- - Next-UI käyttää näitä näkymiä /ylataso, /raportti ja /ennuste -sivuilla.
-- Miten testataan (manuaali):
-- - Aja migraatiot ja avaa UI: varmista että /ylataso ei kaadu "relation ... does not exist".
-- - (DB) `SELECT * FROM v_report_project_current LIMIT 1;`

BEGIN;

-- =========================
-- Projektitason koonti
-- =========================
CREATE OR REPLACE VIEW v_report_project_current AS
WITH
  work_phase_counts AS (
    SELECT
      wp.project_id,
      COUNT(*) FILTER (WHERE wp.status = 'ACTIVE')::int AS work_phases_baseline_locked
    FROM work_packages wp
    GROUP BY wp.project_id
  ),
  latest_target_batches AS (
    SELECT DISTINCT ON (b.project_id)
      b.project_id,
      b.id AS import_batch_id
    FROM import_batches b
    WHERE b.kind = 'TARGET_ESTIMATE'
    ORDER BY b.project_id, b.created_at DESC, b.id DESC
  ),
  target_totals AS (
    SELECT
      b.project_id,
      COALESCE(SUM(i.sum_eur) FILTER (WHERE i.row_type = 'LEAF'), 0)::numeric AS bac_total
    FROM latest_target_batches lt
    JOIN import_batches b ON b.id = lt.import_batch_id
    JOIN target_estimate_items i ON i.import_batch_id = b.id
    GROUP BY b.project_id
  ),
  latest_actuals_batches AS (
    SELECT DISTINCT ON (b.project_id)
      b.project_id,
      b.id AS import_batch_id
    FROM import_batches b
    WHERE b.kind = 'ACTUALS'
    ORDER BY b.project_id, b.created_at DESC, b.id DESC
  ),
  actual_totals AS (
    SELECT
      b.project_id,
      COALESCE(SUM(a.amount_eur), 0)::numeric AS actual_including_unmapped_total
    FROM latest_actuals_batches la
    JOIN import_batches b ON b.id = la.import_batch_id
    JOIN actuals_lines a ON a.import_batch_id = b.id
    GROUP BY b.project_id
  )
SELECT
  p.project_id,
  COALESCE(wpc.work_phases_baseline_locked, 0)::int AS work_phases_baseline_locked,
  0::int AS work_phases_with_week_update,
  COALESCE(tt.bac_total, 0)::numeric AS bac_total,
  NULL::numeric AS ev_total,
  COALESCE(at.actual_including_unmapped_total, 0)::numeric AS actual_including_unmapped_total,
  COALESCE(at.actual_including_unmapped_total, 0)::numeric AS ac_star_total,
  NULL::numeric AS cpi,
  COALESCE(at.actual_including_unmapped_total, 0)::numeric AS unmapped_actual_total
FROM projects p
LEFT JOIN work_phase_counts wpc ON wpc.project_id = p.project_id
LEFT JOIN target_totals tt ON tt.project_id = p.project_id
LEFT JOIN actual_totals at ON at.project_id = p.project_id;

-- =========================
-- Työvaihetason koonti (MVP: work_packages)
-- =========================
CREATE OR REPLACE VIEW v_report_work_phase_current AS
WITH latest_target_batches AS (
  SELECT DISTINCT ON (b.project_id)
    b.project_id,
    b.id AS import_batch_id
  FROM import_batches b
  WHERE b.kind = 'TARGET_ESTIMATE'
  ORDER BY b.project_id, b.created_at DESC, b.id DESC
)
SELECT
  wp.project_id,
  wp.id AS work_phase_id,
  wp.name AS work_phase_name,
  COALESCE(SUM(ti.sum_eur) FILTER (WHERE ti.row_type = 'LEAF'), 0)::numeric AS bac_total,
  NULL::numeric AS ev_value,
  NULL::numeric AS ac_star_total,
  NULL::numeric AS cpi,
  false AS has_cpi,
  NULL::numeric AS cost_variance_eur
FROM work_packages wp
LEFT JOIN latest_target_batches lt ON lt.project_id = wp.project_id
LEFT JOIN v_current_item_mappings cim
  ON cim.work_package_id = wp.id
 AND cim.import_batch_id = lt.import_batch_id
LEFT JOIN target_estimate_items ti
  ON ti.id = cim.target_estimate_item_id
GROUP BY wp.project_id, wp.id, wp.name;

-- =========================
-- Ennustetapahtumien koonti (minimi)
-- =========================
CREATE OR REPLACE VIEW v_report_forecast_current AS
SELECT
  fe.project_id,
  fe.id AS forecast_event_id,
  fe.target_littera_id,
  NULL::uuid AS mapping_version_id,
  fe.created_at AS event_time,
  fe.created_by,
  fe.note AS comment,
  NULL::numeric AS kpi_value
FROM forecast_events fe;

COMMIT;

