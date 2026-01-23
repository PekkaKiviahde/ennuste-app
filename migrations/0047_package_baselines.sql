-- 0047_package_baselines.sql
-- Työpaketit + hankintapaketit: baseline-lukitus budjettilinjojen (budget_lines) perusteella.
--
-- Mitä muuttui:
-- - Lisätty taulut `work_package_baselines` + `work_package_baseline_lines`.
-- - Lisätty taulut `proc_package_baselines` + `proc_package_baseline_lines`.
-- - Lisätty funktiot `work_package_lock_baseline(...)` ja `proc_package_lock_baseline(...)`.
-- - Lisätty näkymät `v_work_package_latest_baseline` ja `v_proc_package_latest_baseline`.
-- Miksi:
-- - Baseline lukitsee paketin BAC:n (append-only) ja mahdollistaa monen littera-rivin (budget_line_id) kuulumisen samaan pakettiin.
-- - Baseline on snapshot: myöhemmät budjettimuutokset eivät muuta vanhaa baselinea.
-- Miten testataan (manuaali):
-- - Luo 2 `budget_lines`-riviä (5600/4700) ja linkitä ne samaan työpakettiin `package_budget_line_links`-taululla.
-- - Aja `SELECT work_package_lock_baseline(<work_package_id>, 'manual', 'test');`
-- - Varmista `SUM(amount)` taulusta `work_package_baseline_lines`.

BEGIN;

-- =========================
-- Work package baseline
-- =========================
CREATE TABLE IF NOT EXISTS work_package_baselines (
  work_package_baseline_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  work_package_id uuid NOT NULL REFERENCES work_packages(id) ON DELETE CASCADE,
  locked_at timestamptz NOT NULL DEFAULT now(),
  locked_by text NOT NULL,
  notes text
);

CREATE INDEX IF NOT EXISTS ix_work_package_baselines_package_time
  ON work_package_baselines(work_package_id, locked_at DESC, work_package_baseline_id DESC);

DO $$ BEGIN
  CREATE TRIGGER work_package_baselines_append_only
    BEFORE UPDATE OR DELETE ON work_package_baselines
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS work_package_baseline_lines (
  work_package_baseline_line_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_package_baseline_id uuid NOT NULL REFERENCES work_package_baselines(work_package_baseline_id) ON DELETE CASCADE,
  budget_line_id uuid NOT NULL REFERENCES budget_lines(budget_line_id) ON DELETE RESTRICT,
  target_littera_id uuid NOT NULL REFERENCES litteras(littera_id) ON DELETE RESTRICT,
  cost_type cost_type NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'system',
  UNIQUE (work_package_baseline_id, budget_line_id)
);

CREATE INDEX IF NOT EXISTS ix_work_package_baseline_lines_baseline
  ON work_package_baseline_lines(work_package_baseline_id, work_package_baseline_line_id DESC);

CREATE INDEX IF NOT EXISTS ix_work_package_baseline_lines_budget_line
  ON work_package_baseline_lines(budget_line_id);

DO $$ BEGIN
  CREATE TRIGGER work_package_baseline_lines_append_only
    BEFORE UPDATE OR DELETE ON work_package_baseline_lines
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE VIEW v_work_package_latest_baseline AS
SELECT DISTINCT ON (b.work_package_id)
  b.project_id,
  b.work_package_id,
  b.work_package_baseline_id,
  b.locked_at,
  b.locked_by,
  b.notes
FROM work_package_baselines b
ORDER BY b.work_package_id, b.locked_at DESC, b.work_package_baseline_id DESC;

CREATE OR REPLACE FUNCTION work_package_lock_baseline(
  p_work_package_id uuid,
  p_locked_by text,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_project_id uuid;
  v_baseline_id uuid;
  v_line_count int;
BEGIN
  SELECT wp.project_id INTO v_project_id
  FROM work_packages wp
  WHERE wp.id = p_work_package_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'work_package_id ei loydy: %', p_work_package_id;
  END IF;

  INSERT INTO work_package_baselines (project_id, work_package_id, locked_by, notes)
  VALUES (v_project_id, p_work_package_id, p_locked_by, p_notes)
  RETURNING work_package_baseline_id INTO v_baseline_id;

  INSERT INTO work_package_baseline_lines (
    work_package_baseline_id,
    budget_line_id,
    target_littera_id,
    cost_type,
    amount,
    created_by
  )
  SELECT
    v_baseline_id,
    bl.budget_line_id,
    bl.target_littera_id,
    bl.cost_type,
    bl.amount,
    p_locked_by
  FROM package_budget_line_links link
  JOIN budget_lines bl ON bl.budget_line_id = link.budget_line_id
  WHERE link.work_package_id = p_work_package_id
    AND link.project_id = v_project_id;

  GET DIAGNOSTICS v_line_count = ROW_COUNT;
  IF v_line_count = 0 THEN
    RAISE EXCEPTION 'Baseline-lukitus estetty: tyopakettiin ei ole linkitetty budget_lines-riveja (package_budget_line_links). work_package_id=%', p_work_package_id;
  END IF;

  RETURN v_baseline_id;
END;
$$;

-- =========================
-- Proc package baseline
-- =========================
CREATE TABLE IF NOT EXISTS proc_package_baselines (
  proc_package_baseline_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  proc_package_id uuid NOT NULL REFERENCES proc_packages(id) ON DELETE CASCADE,
  locked_at timestamptz NOT NULL DEFAULT now(),
  locked_by text NOT NULL,
  notes text
);

CREATE INDEX IF NOT EXISTS ix_proc_package_baselines_package_time
  ON proc_package_baselines(proc_package_id, locked_at DESC, proc_package_baseline_id DESC);

DO $$ BEGIN
  CREATE TRIGGER proc_package_baselines_append_only
    BEFORE UPDATE OR DELETE ON proc_package_baselines
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS proc_package_baseline_lines (
  proc_package_baseline_line_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proc_package_baseline_id uuid NOT NULL REFERENCES proc_package_baselines(proc_package_baseline_id) ON DELETE CASCADE,
  budget_line_id uuid NOT NULL REFERENCES budget_lines(budget_line_id) ON DELETE RESTRICT,
  target_littera_id uuid NOT NULL REFERENCES litteras(littera_id) ON DELETE RESTRICT,
  cost_type cost_type NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'system',
  UNIQUE (proc_package_baseline_id, budget_line_id)
);

CREATE INDEX IF NOT EXISTS ix_proc_package_baseline_lines_baseline
  ON proc_package_baseline_lines(proc_package_baseline_id, proc_package_baseline_line_id DESC);

CREATE INDEX IF NOT EXISTS ix_proc_package_baseline_lines_budget_line
  ON proc_package_baseline_lines(budget_line_id);

DO $$ BEGIN
  CREATE TRIGGER proc_package_baseline_lines_append_only
    BEFORE UPDATE OR DELETE ON proc_package_baseline_lines
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE VIEW v_proc_package_latest_baseline AS
SELECT DISTINCT ON (b.proc_package_id)
  b.project_id,
  b.proc_package_id,
  b.proc_package_baseline_id,
  b.locked_at,
  b.locked_by,
  b.notes
FROM proc_package_baselines b
ORDER BY b.proc_package_id, b.locked_at DESC, b.proc_package_baseline_id DESC;

CREATE OR REPLACE FUNCTION proc_package_lock_baseline(
  p_proc_package_id uuid,
  p_locked_by text,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_project_id uuid;
  v_baseline_id uuid;
  v_line_count int;
BEGIN
  SELECT pp.project_id INTO v_project_id
  FROM proc_packages pp
  WHERE pp.id = p_proc_package_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'proc_package_id ei loydy: %', p_proc_package_id;
  END IF;

  INSERT INTO proc_package_baselines (project_id, proc_package_id, locked_by, notes)
  VALUES (v_project_id, p_proc_package_id, p_locked_by, p_notes)
  RETURNING proc_package_baseline_id INTO v_baseline_id;

  INSERT INTO proc_package_baseline_lines (
    proc_package_baseline_id,
    budget_line_id,
    target_littera_id,
    cost_type,
    amount,
    created_by
  )
  SELECT
    v_baseline_id,
    bl.budget_line_id,
    bl.target_littera_id,
    bl.cost_type,
    bl.amount,
    p_locked_by
  FROM package_budget_line_links link
  JOIN budget_lines bl ON bl.budget_line_id = link.budget_line_id
  WHERE link.proc_package_id = p_proc_package_id
    AND link.project_id = v_project_id;

  GET DIAGNOSTICS v_line_count = ROW_COUNT;
  IF v_line_count = 0 THEN
    RAISE EXCEPTION 'Baseline-lukitus estetty: hankintapakettiin ei ole linkitetty budget_lines-riveja (package_budget_line_links). proc_package_id=%', p_proc_package_id;
  END IF;

  RETURN v_baseline_id;
END;
$$;

COMMIT;

