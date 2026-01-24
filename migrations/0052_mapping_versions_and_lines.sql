-- 0052_mapping_versions_and_lines.sql
-- Lisää puuttuvat mapping_versions + mapping_lines (tavoitearvio-sivun mapping-taulukko).
--
-- Mitä muuttui:
-- - Lisätty enum `allocation_rule` (FULL | PERCENT).
-- - Lisätty taulut `mapping_versions`, `mapping_lines`, `mapping_event_log` + indeksit.
-- Miksi:
-- - Next-UI käyttää `mapping_versions` / `mapping_lines` -tauluja tavoitearvion mapping-näkymässä; ilman niitä UI kaatuu virheeseen
--   `relation "mapping_lines" does not exist`.
-- Miten testataan (manuaali):
-- - Aja migraatiot (`npm run db:migrate`).
-- - (DB) `SELECT to_regclass('public.mapping_versions'), to_regclass('public.mapping_lines');` palauttaa taulujen nimet.
-- - Avaa Next-UI `Tavoitearvio` ja varmista ettei sivu kaadu mapping-virheeseen.

BEGIN;

DO $$ BEGIN
  CREATE TYPE allocation_rule AS ENUM ('FULL','PERCENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS mapping_versions (
  mapping_version_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  valid_from date NOT NULL DEFAULT current_date,
  valid_to date,
  status mapping_version_status NOT NULL DEFAULT 'DRAFT',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'system',
  approved_at timestamptz,
  approved_by text,
  CONSTRAINT mapping_versions_valid_range_chk CHECK (valid_to IS NULL OR valid_from <= valid_to)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mapping_versions_active
  ON mapping_versions(project_id)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS ix_mapping_versions_project
  ON mapping_versions(project_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_mapping_versions_validity
  ON mapping_versions(project_id, valid_from, valid_to);

CREATE TABLE IF NOT EXISTS mapping_lines (
  mapping_line_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  mapping_version_id uuid NOT NULL REFERENCES mapping_versions(mapping_version_id) ON DELETE CASCADE,
  work_littera_id uuid NOT NULL REFERENCES litteras(littera_id) ON DELETE RESTRICT,
  target_littera_id uuid NOT NULL REFERENCES litteras(littera_id) ON DELETE RESTRICT,
  allocation_rule allocation_rule NOT NULL,
  allocation_value numeric(9,4) NOT NULL,
  cost_type cost_type,
  note text,
  CONSTRAINT mapping_lines_allocation_value_chk CHECK (allocation_value > 0 AND allocation_value <= 1),
  CONSTRAINT mapping_lines_full_rule_value_chk CHECK (
    allocation_rule <> 'FULL' OR allocation_value = 1
  )
);

CREATE INDEX IF NOT EXISTS ix_mapping_lines_version
  ON mapping_lines(mapping_version_id);

CREATE INDEX IF NOT EXISTS ix_mapping_lines_work
  ON mapping_lines(work_littera_id);

CREATE INDEX IF NOT EXISTS ix_mapping_lines_target
  ON mapping_lines(target_littera_id);

-- Audit trail (append-only): mappingin muutosloki.
CREATE TABLE IF NOT EXISTS mapping_event_log (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  event_time timestamptz NOT NULL DEFAULT now(),
  event_user text,
  action text NOT NULL,
  payload_json jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_mapping_event_project_time
  ON mapping_event_log(project_id, event_time DESC);

DO $$ BEGIN
  CREATE TRIGGER mapping_event_log_append_only
    BEFORE UPDATE OR DELETE ON mapping_event_log
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;

