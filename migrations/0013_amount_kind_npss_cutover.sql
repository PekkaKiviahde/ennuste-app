-- 0013_amount_kind_npss_cutover.sql
-- NPSS/cutover: amount_kind + cost_type_origin + effective helpers (append-only)

DO $$ BEGIN
  CREATE TYPE amount_kind AS ENUM ('COST', 'TOTAL', 'NPSS_UNCLASSIFIED', 'UNCLASSIFIED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE amount_kind ADD VALUE IF NOT EXISTS 'NPSS_UNCLASSIFIED';
  ALTER TYPE amount_kind ADD VALUE IF NOT EXISTS 'UNCLASSIFIED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cost_type_origin AS ENUM ('COST', 'NPSS_CUTOVER', 'HEURISTIC');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE actual_cost_lines
  ADD COLUMN IF NOT EXISTS amount_kind amount_kind,
  ADD COLUMN IF NOT EXISTS cost_type_origin cost_type_origin;

CREATE OR REPLACE VIEW v_actual_cost_lines_effective AS
SELECT
  acl.*,
  COALESCE(
    acl.amount_kind,
    CASE
      WHEN (
        ib.source_system ILIKE '%NPSS%'
        OR ib.source_system ILIKE '%CUTOVER%'
        OR acl.external_ref ILIKE '%NPSS%'
        OR acl.external_ref ILIKE '%CUTOVER%'
      ) THEN 'NPSS_UNCLASSIFIED'::amount_kind
      ELSE 'COST'::amount_kind
    END
  ) AS effective_amount_kind,
  COALESCE(
    acl.cost_type_origin,
    CASE
      WHEN (
        ib.source_system ILIKE '%NPSS%'
        OR ib.source_system ILIKE '%CUTOVER%'
        OR acl.external_ref ILIKE '%NPSS%'
        OR acl.external_ref ILIKE '%CUTOVER%'
      ) THEN 'NPSS_CUTOVER'::cost_type_origin
      ELSE 'COST'::cost_type_origin
    END
  ) AS effective_cost_type_origin
FROM actual_cost_lines acl
LEFT JOIN import_batches ib
  ON ib.import_batch_id = acl.import_batch_id;
