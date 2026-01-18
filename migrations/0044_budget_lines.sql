-- 0044_budget_lines.sql
-- Budjetti/tavoitearvio: budget_lines (minimi Next-UI + importStaging käyttöön)
--
-- Mitä muuttui:
-- - Lisätty puuttuvat enum-tyypit: `cost_type`, `budget_source` (idempotentti).
-- - Lisätty taulu `budget_lines` + indeksit + append-only trigger.
-- Miksi:
-- - Next-UI ja API lukevat `budget_lines`-taulusta tavoitearvion koonteja; ilman taulua UI kaatuu virheeseen
--   `relation "budget_lines" does not exist`.
-- Miten testataan (manuaali):
-- - Aja migraatiot (`npm run db:migrate` tai `api: db:setup`).
-- - (DB) `SELECT to_regclass('public.budget_lines')` palauttaa `budget_lines`.
-- - Avaa UI ja varmista että tavoitearvion/raportin näkymät eivät kaadu `budget_lines`-virheeseen.
-- - (API) `GET /api/report/target-summary` palauttaa `totals.budget` ilman server erroria.

BEGIN;

DO $$ BEGIN
  CREATE TYPE cost_type AS ENUM ('LABOR','MATERIAL','SUBCONTRACT','RENTAL','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE budget_source AS ENUM ('IMPORT','UI','MIGRATION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS budget_lines (
  budget_line_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  target_littera_id uuid NOT NULL REFERENCES litteras(littera_id) ON DELETE RESTRICT,
  cost_type cost_type NOT NULL,
  amount numeric NOT NULL,
  source budget_source NOT NULL,
  import_batch_id uuid REFERENCES import_batches(id) ON DELETE RESTRICT,
  valid_from date NOT NULL DEFAULT current_date,
  valid_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'system',
  CONSTRAINT budget_lines_valid_range_chk CHECK (valid_to IS NULL OR valid_from <= valid_to)
);

CREATE INDEX IF NOT EXISTS ix_budget_lines_project_target_cost
  ON budget_lines(project_id, target_littera_id, cost_type);

CREATE INDEX IF NOT EXISTS ix_budget_lines_project_batch_time
  ON budget_lines(project_id, import_batch_id, created_at DESC);

DO $$ BEGIN
  CREATE TRIGGER budget_lines_append_only
    BEFORE UPDATE OR DELETE ON budget_lines
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
