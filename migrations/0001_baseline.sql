-- 0001_baseline.sql
-- Baseline-skeema (squashattu migraatiohistoria)

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- ENUM-tyypit (vakaat)
-- =========================
DO $$ BEGIN
  CREATE TYPE import_batch_kind AS ENUM ('TARGET_ESTIMATE','ACTUALS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mapping_version_status AS ENUM ('DRAFT','ACTIVE','RETIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE import_parse_status AS ENUM ('OK','ERROR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- Yleinen "append-only" suoja
-- =========================
CREATE OR REPLACE FUNCTION prevent_update_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only. Create a new event/row instead of UPDATE/DELETE.', TG_TABLE_NAME;
END;
$$;

-- =========================
-- Importit (raaka + eritelty)
-- =========================
CREATE TABLE IF NOT EXISTS import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  kind import_batch_kind NOT NULL,
  source_system text NOT NULL,
  file_name text,
  file_hash text,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT import_batches_source_system_chk CHECK (length(trim(source_system)) > 0)
);

CREATE INDEX IF NOT EXISTS import_batches_project_kind_idx
  ON import_batches(project_id, kind, created_at DESC);

CREATE TABLE IF NOT EXISTS import_raw_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  row_no integer NOT NULL,
  raw_text text,
  parsed_json jsonb,
  parse_status import_parse_status NOT NULL DEFAULT 'OK',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT import_raw_rows_row_no_chk CHECK (row_no > 0)
);

CREATE INDEX IF NOT EXISTS import_raw_rows_batch_idx
  ON import_raw_rows(import_batch_id, row_no);

-- =========================
-- Tavoitearvion rivit (item)
-- =========================
CREATE TABLE IF NOT EXISTS target_estimate_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  item_code text,
  littera_code text NOT NULL,
  description text,
  qty numeric,
  unit text,
  sum_eur numeric,
  cost_breakdown_json jsonb,
  row_type text NOT NULL,
  parent_item_id uuid REFERENCES target_estimate_items(id) ON DELETE SET NULL,
  CONSTRAINT target_estimate_items_littera_code_chk CHECK (littera_code ~ '^\d{4}$'),
  CONSTRAINT target_estimate_items_row_type_chk CHECK (length(trim(row_type)) > 0)
);

CREATE INDEX IF NOT EXISTS target_estimate_items_batch_idx
  ON target_estimate_items(import_batch_id, littera_code);

-- =========================
-- Työpaketit ja hankintapaketit
-- =========================
CREATE TABLE IF NOT EXISTS work_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  responsible_user_id uuid,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_packages_code_chk CHECK (code ~ '^\d{4}$'),
  CONSTRAINT work_packages_status_chk CHECK (length(trim(status)) > 0)
);

CREATE INDEX IF NOT EXISTS work_packages_project_code_idx
  ON work_packages(project_id, code);

CREATE TABLE IF NOT EXISTS proc_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  owner_type text NOT NULL,
  vendor_name text,
  contract_ref text,
  default_work_package_id uuid REFERENCES work_packages(id) ON DELETE SET NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT proc_packages_code_chk CHECK (code ~ '^\d{4}$'),
  CONSTRAINT proc_packages_owner_type_chk CHECK (length(trim(owner_type)) > 0),
  CONSTRAINT proc_packages_status_chk CHECK (length(trim(status)) > 0)
);

CREATE INDEX IF NOT EXISTS proc_packages_project_code_idx
  ON proc_packages(project_id, code);

CREATE INDEX IF NOT EXISTS proc_packages_default_work_package_idx
  ON proc_packages(default_work_package_id);

-- =========================
-- Item-mäppäys (append-only)
-- =========================
CREATE TABLE IF NOT EXISTS item_mapping_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  import_batch_id uuid NOT NULL REFERENCES import_batches(id) ON DELETE RESTRICT,
  status mapping_version_status NOT NULL DEFAULT 'DRAFT',
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS item_mapping_versions_active_unique
  ON item_mapping_versions(project_id, import_batch_id)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS item_mapping_versions_project_status_idx
  ON item_mapping_versions(project_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS item_row_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_mapping_version_id uuid NOT NULL REFERENCES item_mapping_versions(id) ON DELETE CASCADE,
  target_estimate_item_id uuid NOT NULL REFERENCES target_estimate_items(id) ON DELETE CASCADE,
  work_package_id uuid NOT NULL REFERENCES work_packages(id) ON DELETE RESTRICT,
  proc_package_id uuid REFERENCES proc_packages(id) ON DELETE SET NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS item_row_mappings_item_idx
  ON item_row_mappings(target_estimate_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS item_row_mappings_version_idx
  ON item_row_mappings(item_mapping_version_id, target_estimate_item_id);

DO $$ BEGIN
  CREATE TRIGGER item_row_mappings_append_only
    BEFORE UPDATE OR DELETE ON item_row_mappings
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE VIEW v_current_item_mappings AS
SELECT DISTINCT ON (irm.target_estimate_item_id)
  imv.project_id,
  imv.import_batch_id,
  irm.target_estimate_item_id,
  irm.work_package_id,
  irm.proc_package_id,
  irm.created_by AS mapped_by,
  irm.created_at AS mapped_at
FROM item_row_mappings irm
JOIN item_mapping_versions imv ON imv.id = irm.item_mapping_version_id
WHERE imv.status = 'ACTIVE'
ORDER BY irm.target_estimate_item_id, irm.created_at DESC, irm.id DESC;

-- =========================
-- Toteumat (actuals) + oma mäppäys
-- =========================
CREATE TABLE IF NOT EXISTS actuals_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  posting_date date,
  amount_eur numeric NOT NULL,
  account text,
  cost_center text,
  vendor text,
  invoice_no text,
  description text,
  dimensions_json jsonb
);

CREATE INDEX IF NOT EXISTS actuals_lines_batch_idx
  ON actuals_lines(import_batch_id, posting_date);

CREATE TABLE IF NOT EXISTS actuals_mapping_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  status mapping_version_status NOT NULL DEFAULT 'DRAFT',
  valid_from date NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS actuals_mapping_versions_project_idx
  ON actuals_mapping_versions(project_id, status, valid_from DESC);

CREATE TABLE IF NOT EXISTS actuals_mapping_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actuals_mapping_version_id uuid NOT NULL REFERENCES actuals_mapping_versions(id) ON DELETE CASCADE,
  match_json jsonb NOT NULL,
  work_package_id uuid NOT NULL REFERENCES work_packages(id) ON DELETE RESTRICT,
  proc_package_id uuid REFERENCES proc_packages(id) ON DELETE SET NULL,
  priority integer NOT NULL DEFAULT 100,
  CONSTRAINT actuals_mapping_rules_priority_chk CHECK (priority > 0)
);

CREATE INDEX IF NOT EXISTS actuals_mapping_rules_version_idx
  ON actuals_mapping_rules(actuals_mapping_version_id, priority DESC);

CREATE TABLE IF NOT EXISTS actuals_row_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actuals_mapping_version_id uuid NOT NULL REFERENCES actuals_mapping_versions(id) ON DELETE CASCADE,
  actuals_line_id uuid NOT NULL REFERENCES actuals_lines(id) ON DELETE CASCADE,
  work_package_id uuid NOT NULL REFERENCES work_packages(id) ON DELETE RESTRICT,
  proc_package_id uuid REFERENCES proc_packages(id) ON DELETE SET NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS actuals_row_overrides_line_idx
  ON actuals_row_overrides(actuals_line_id, created_at DESC);

DO $$ BEGIN
  CREATE TRIGGER actuals_row_overrides_append_only
    BEFORE UPDATE OR DELETE ON actuals_row_overrides
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- Ennustetapahtumat
-- =========================
CREATE TABLE IF NOT EXISTS forecast_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  forecast_date date NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  note text
);

CREATE INDEX IF NOT EXISTS forecast_events_project_date_idx
  ON forecast_events(project_id, forecast_date DESC);

CREATE TABLE IF NOT EXISTS forecast_event_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_event_id uuid NOT NULL REFERENCES forecast_events(id) ON DELETE CASCADE,
  work_package_id uuid NOT NULL REFERENCES work_packages(id) ON DELETE RESTRICT,
  proc_package_id uuid REFERENCES proc_packages(id) ON DELETE SET NULL,
  forecast_eur numeric NOT NULL,
  explanation text
);

CREATE INDEX IF NOT EXISTS forecast_event_rows_event_idx
  ON forecast_event_rows(forecast_event_id);

COMMIT;
