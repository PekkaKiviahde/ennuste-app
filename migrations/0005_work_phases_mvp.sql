-- 0005_work_phases_mvp.sql
-- Work phases (paketit), baseline, weekly updates, ghost costs, change control (MVP)
-- Päivitetty: 2025-12-18

-- NOTE:
-- This migration assumes you already have:
--   - projects(project_id)
--   - litteras(project_id, littera_id, code, ...)
--   - import_batches(import_batch_id, project_id, source_system, imported_at, ...)
--   - budget_lines(project_id, target_littera_id, cost_type, amount, import_batch_id, ...)
--   - prevent_update_delete() trigger function (append-only helper)
--   - gen_random_uuid() available (pgcrypto)

-- =========================
-- 1) Work phases (master)
-- =========================
CREATE TABLE IF NOT EXISTS work_phases (
  work_phase_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  owner text,

  lead_littera_id uuid,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','ACTIVE','CLOSED')),

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL
);

-- lead littera must belong to same project
DO $$ BEGIN
  ALTER TABLE work_phases
    ADD CONSTRAINT work_phases_lead_littera_fk
    FOREIGN KEY (project_id, lead_littera_id)
    REFERENCES litteras(project_id, littera_id)
    ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS work_phases_project_status_idx
  ON work_phases(project_id, status);

-- =========================
-- 2) Work phase versions (composition versions)
-- =========================
CREATE TABLE IF NOT EXISTS work_phase_versions (
  work_phase_version_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  work_phase_id uuid NOT NULL REFERENCES work_phases(work_phase_id) ON DELETE CASCADE,

  version_no integer NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','ACTIVE','RETIRED')),

  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,

  UNIQUE (work_phase_id, version_no)
);

CREATE INDEX IF NOT EXISTS work_phase_versions_phase_status_idx
  ON work_phase_versions(work_phase_id, status);

-- =========================
-- 3) Work phase members (composition)
--    Member types:
--      - LITTERA: references 4-digit littera_id
--      - ITEM: detailed item_code (Excel column C), optional item_desc
-- =========================
CREATE TABLE IF NOT EXISTS work_phase_members (
  work_phase_member_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  work_phase_version_id uuid NOT NULL REFERENCES work_phase_versions(work_phase_version_id) ON DELETE CASCADE,

  member_type text NOT NULL
    CHECK (member_type IN ('LITTERA','ITEM')),

  littera_id uuid,
  item_code text,
  item_desc text,

  note text,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,

  CONSTRAINT work_phase_members_member_ck CHECK (
    (member_type='LITTERA' AND littera_id IS NOT NULL AND item_code IS NULL)
    OR
    (member_type='ITEM' AND item_code IS NOT NULL)
  ),

  CONSTRAINT work_phase_members_littera_fk FOREIGN KEY (project_id, littera_id)
    REFERENCES litteras(project_id, littera_id) ON DELETE RESTRICT
);

-- prevent duplicates per version
CREATE UNIQUE INDEX IF NOT EXISTS work_phase_members_unique_littera
  ON work_phase_members(work_phase_version_id, littera_id)
  WHERE member_type='LITTERA';

CREATE UNIQUE INDEX IF NOT EXISTS work_phase_members_unique_item
  ON work_phase_members(work_phase_version_id, item_code)
  WHERE member_type='ITEM';

CREATE INDEX IF NOT EXISTS work_phase_members_version_idx
  ON work_phase_members(work_phase_version_id);

-- =========================
-- 4) Baseline (LOCKED plan)
--    Baseline is immutable (append-only); new baseline = new row.
-- =========================
CREATE TABLE IF NOT EXISTS work_phase_baselines (
  work_phase_baseline_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  work_phase_id uuid NOT NULL REFERENCES work_phases(work_phase_id) ON DELETE CASCADE,
  work_phase_version_id uuid NOT NULL REFERENCES work_phase_versions(work_phase_version_id) ON DELETE RESTRICT,

  target_import_batch_id uuid NOT NULL REFERENCES import_batches(import_batch_id) ON DELETE RESTRICT,

  bac_total numeric(14,2) NOT NULL,

  notes text,

  locked_at timestamptz NOT NULL DEFAULT now(),
  locked_by text NOT NULL
);

CREATE INDEX IF NOT EXISTS work_phase_baselines_phase_idx
  ON work_phase_baselines(work_phase_id, locked_at DESC);

CREATE TABLE IF NOT EXISTS work_phase_baseline_lines (
  work_phase_baseline_id uuid NOT NULL REFERENCES work_phase_baselines(work_phase_baseline_id) ON DELETE CASCADE,

  cost_type text NOT NULL CHECK (cost_type IN ('LABOR','MATERIAL','SUBCONTRACT','RENTAL','OTHER')),
  amount numeric(14,2) NOT NULL,

  PRIMARY KEY (work_phase_baseline_id, cost_type)
);

-- Append-only baselines
DO $$ BEGIN
  CREATE TRIGGER work_phase_baselines_append_only
    BEFORE UPDATE OR DELETE ON work_phase_baselines
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER work_phase_baseline_lines_append_only
    BEFORE UPDATE OR DELETE ON work_phase_baseline_lines
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- 5) Weekly updates (append-only)
-- =========================
CREATE TABLE IF NOT EXISTS work_phase_weekly_updates (
  work_phase_weekly_update_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  work_phase_id uuid NOT NULL REFERENCES work_phases(work_phase_id) ON DELETE CASCADE,

  week_ending date NOT NULL,
  percent_complete numeric(5,2) NOT NULL CHECK (percent_complete >= 0 AND percent_complete <= 100),

  progress_notes text,
  risks text,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL
);

CREATE INDEX IF NOT EXISTS work_phase_weekly_updates_idx
  ON work_phase_weekly_updates(work_phase_id, week_ending DESC, created_at DESC);

DO $$ BEGIN
  CREATE TRIGGER work_phase_weekly_updates_append_only
    BEFORE UPDATE OR DELETE ON work_phase_weekly_updates
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- 6) Ghost costs (entries + settlements, append-only)
-- =========================
CREATE TABLE IF NOT EXISTS ghost_cost_entries (
  ghost_cost_entry_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  work_phase_id uuid NOT NULL REFERENCES work_phases(work_phase_id) ON DELETE CASCADE,

  week_ending date NOT NULL,
  cost_type text NOT NULL CHECK (cost_type IN ('LABOR','MATERIAL','SUBCONTRACT','RENTAL','OTHER')),
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),

  description text,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL
);

CREATE INDEX IF NOT EXISTS ghost_cost_entries_idx
  ON ghost_cost_entries(work_phase_id, week_ending DESC);

DO $$ BEGIN
  CREATE TRIGGER ghost_cost_entries_append_only
    BEFORE UPDATE OR DELETE ON ghost_cost_entries
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS ghost_cost_settlements (
  ghost_cost_settlement_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  ghost_cost_entry_id uuid NOT NULL REFERENCES ghost_cost_entries(ghost_cost_entry_id) ON DELETE CASCADE,

  settled_amount numeric(14,2) NOT NULL CHECK (settled_amount >= 0),

  settled_at timestamptz NOT NULL DEFAULT now(),
  settled_by text NOT NULL,
  notes text
);

CREATE INDEX IF NOT EXISTS ghost_cost_settlements_idx
  ON ghost_cost_settlements(ghost_cost_entry_id);

DO $$ BEGIN
  CREATE TRIGGER ghost_cost_settlements_append_only
    BEFORE UPDATE OR DELETE ON ghost_cost_settlements
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- 7) Change control & learning (append-only)
--    Approvals are separate (append-only)
-- =========================
CREATE TABLE IF NOT EXISTS work_phase_change_events (
  work_phase_change_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  work_phase_id uuid NOT NULL REFERENCES work_phases(work_phase_id) ON DELETE CASCADE,

  event_class text NOT NULL CHECK (event_class IN ('CORRECTION','MISSING_FROM_TARGET_ESTIMATE','SCOPE_CHANGE','NOTE')),
  subject_type text NOT NULL CHECK (subject_type IN ('PHASE','LITTERA','ITEM')),

  littera_id uuid,
  item_code text,
  item_desc text,

  cost_type text CHECK (cost_type IN ('LABOR','MATERIAL','SUBCONTRACT','RENTAL','OTHER')),
  amount numeric(14,2),

  rationale text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,

  CONSTRAINT work_phase_change_subject_ck CHECK (
    (subject_type='PHASE' AND littera_id IS NULL AND item_code IS NULL)
    OR (subject_type='LITTERA' AND littera_id IS NOT NULL)
    OR (subject_type='ITEM' AND item_code IS NOT NULL)
  ),

  CONSTRAINT work_phase_change_littera_fk FOREIGN KEY (project_id, littera_id)
    REFERENCES litteras(project_id, littera_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS work_phase_change_events_idx
  ON work_phase_change_events(work_phase_id, created_at DESC);

DO $$ BEGIN
  CREATE TRIGGER work_phase_change_events_append_only
    BEFORE UPDATE OR DELETE ON work_phase_change_events
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS work_phase_change_approvals (
  work_phase_change_approval_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  work_phase_change_event_id uuid NOT NULL REFERENCES work_phase_change_events(work_phase_change_event_id) ON DELETE CASCADE,

  decision text NOT NULL CHECK (decision IN ('APPROVE','REJECT')),
  approved_at timestamptz NOT NULL DEFAULT now(),
  approved_by text NOT NULL,
  note text
);

CREATE INDEX IF NOT EXISTS work_phase_change_approvals_idx
  ON work_phase_change_approvals(work_phase_change_event_id, approved_at DESC);

DO $$ BEGIN
  CREATE TRIGGER work_phase_change_approvals_append_only
    BEFORE UPDATE OR DELETE ON work_phase_change_approvals
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- 8) Helper views (MVP)
-- =========================

-- Current version (prefer ACTIVE, else latest version_no)
CREATE OR REPLACE VIEW v_work_phase_current_version AS
SELECT work_phase_id, work_phase_version_id
FROM (
  SELECT
    work_phase_id,
    work_phase_version_id,
    ROW_NUMBER() OVER (
      PARTITION BY work_phase_id
      ORDER BY
        CASE WHEN status='ACTIVE' THEN 0 ELSE 1 END,
        version_no DESC,
        created_at DESC
    ) AS rn
  FROM work_phase_versions
) t
WHERE rn = 1;

-- Latest baseline per work phase
CREATE OR REPLACE VIEW v_work_phase_latest_baseline AS
SELECT work_phase_id, work_phase_baseline_id, work_phase_version_id, target_import_batch_id, bac_total, locked_at, locked_by, notes
FROM (
  SELECT
    work_phase_id,
    work_phase_baseline_id,
    work_phase_version_id,
    target_import_batch_id,
    bac_total,
    locked_at,
    locked_by,
    notes,
    ROW_NUMBER() OVER (PARTITION BY work_phase_id ORDER BY locked_at DESC) rn
  FROM work_phase_baselines
) b
WHERE rn=1;

-- Latest weekly update per work phase
CREATE OR REPLACE VIEW v_work_phase_latest_weekly_update AS
SELECT work_phase_id, week_ending, percent_complete, progress_notes, risks, created_at, created_by
FROM (
  SELECT
    work_phase_id,
    week_ending,
    percent_complete,
    progress_notes,
    risks,
    created_at,
    created_by,
    ROW_NUMBER() OVER (
      PARTITION BY work_phase_id
      ORDER BY week_ending DESC, created_at DESC
    ) rn
  FROM work_phase_weekly_updates
) w
WHERE rn=1;

-- Ghost open amount per entry (entry minus settlements)
CREATE OR REPLACE VIEW v_ghost_open_entries AS
SELECT
  e.ghost_cost_entry_id,
  e.project_id,
  e.work_phase_id,
  e.week_ending,
  e.cost_type,
  e.amount AS entered_amount,
  COALESCE(s.settled_amount, 0) AS settled_amount,
  (e.amount - COALESCE(s.settled_amount, 0)) AS open_amount
FROM ghost_cost_entries e
LEFT JOIN (
  SELECT ghost_cost_entry_id, SUM(settled_amount) AS settled_amount
  FROM ghost_cost_settlements
  GROUP BY ghost_cost_entry_id
) s ON s.ghost_cost_entry_id = e.ghost_cost_entry_id;

-- Ghost open totals per work phase
CREATE OR REPLACE VIEW v_work_phase_ghost_open AS
SELECT
  project_id,
  work_phase_id,
  cost_type,
  SUM(open_amount) AS open_amount
FROM v_ghost_open_entries
GROUP BY project_id, work_phase_id, cost_type;

-- Total ghost open per work phase
CREATE OR REPLACE VIEW v_work_phase_ghost_open_total AS
SELECT
  project_id,
  work_phase_id,
  SUM(open_amount) AS open_amount_total
FROM v_work_phase_ghost_open
GROUP BY project_id, work_phase_id;

-- MVP summary (without actuals integration)
-- Columns:
--  - BAC from latest baseline
--  - % complete from latest weekly update
--  - EV = BAC * %/100
--  - Ghost open total
-- Actual costs (AC) integration will be added later once actuals table is finalized.
CREATE OR REPLACE VIEW v_work_phase_summary_mvp AS
SELECT
  p.project_id,
  p.work_phase_id,
  p.name AS work_phase_name,
  p.status AS work_phase_status,

  l.code AS lead_littera_code,
  l.title AS lead_littera_title,

  cv.work_phase_version_id AS current_version_id,

  lb.work_phase_baseline_id AS latest_baseline_id,
  lb.target_import_batch_id,
  lb.bac_total,

  wu.week_ending AS latest_week_ending,
  wu.percent_complete,

  CASE
    WHEN lb.bac_total IS NOT NULL AND wu.percent_complete IS NOT NULL
    THEN ROUND(lb.bac_total * (wu.percent_complete / 100.0), 2)
    ELSE NULL
  END AS ev_value,

  go.open_amount_total AS ghost_open_total

FROM work_phases p
LEFT JOIN litteras l
  ON l.project_id = p.project_id AND l.littera_id = p.lead_littera_id
LEFT JOIN v_work_phase_current_version cv
  ON cv.work_phase_id = p.work_phase_id
LEFT JOIN v_work_phase_latest_baseline lb
  ON lb.work_phase_id = p.work_phase_id
LEFT JOIN v_work_phase_latest_weekly_update wu
  ON wu.work_phase_id = p.work_phase_id
LEFT JOIN v_work_phase_ghost_open_total go
  ON go.work_phase_id = p.work_phase_id AND go.project_id = p.project_id;

-- =========================
-- 9) Minimal helper function: lock baseline from budget_lines
--     - Strict: every member littera must exist in budget_lines for that import batch.
--     - Baseline is created as a new immutable row + baseline_lines.
-- =========================
CREATE OR REPLACE FUNCTION work_phase_lock_baseline(
  p_work_phase_id uuid,
  p_work_phase_version_id uuid,
  p_target_import_batch_id uuid,
  p_locked_by text,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_project_id uuid;
  v_baseline_id uuid;
  v_missing_codes text;
  v_member_count integer;
  v_bac_total numeric(14,2);
BEGIN
  -- Validate work_phase exists and get project_id
  SELECT project_id INTO v_project_id
  FROM work_phases
  WHERE work_phase_id = p_work_phase_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'work_phase_id not found: %', p_work_phase_id;
  END IF;

  -- Validate version belongs to that work phase
  IF NOT EXISTS (
    SELECT 1
    FROM work_phase_versions
    WHERE work_phase_version_id = p_work_phase_version_id
      AND work_phase_id = p_work_phase_id
      AND project_id = v_project_id
  ) THEN
    RAISE EXCEPTION 'work_phase_version_id % does not belong to work_phase %', p_work_phase_version_id, p_work_phase_id;
  END IF;

  -- Validate target batch belongs to project and is TARGET_ESTIMATE
  IF NOT EXISTS (
    SELECT 1
    FROM import_batches
    WHERE import_batch_id = p_target_import_batch_id
      AND project_id = v_project_id
      AND source_system = 'TARGET_ESTIMATE'
  ) THEN
    RAISE EXCEPTION 'target_import_batch_id % is not a TARGET_ESTIMATE batch for this project', p_target_import_batch_id;
  END IF;

  -- Count member litteras
  SELECT COUNT(*) INTO v_member_count
  FROM work_phase_members
  WHERE work_phase_version_id = p_work_phase_version_id
    AND member_type = 'LITTERA';

  IF v_member_count = 0 THEN
    RAISE EXCEPTION 'Cannot lock baseline: no LITTERA members found for work_phase_version_id %', p_work_phase_version_id;
  END IF;

  -- Find missing member litteras (not in budget_lines for that batch)
  SELECT STRING_AGG(l.code, ', ' ORDER BY l.code) INTO v_missing_codes
  FROM work_phase_members m
  JOIN litteras l
    ON l.project_id = m.project_id AND l.littera_id = m.littera_id
  WHERE m.work_phase_version_id = p_work_phase_version_id
    AND m.member_type = 'LITTERA'
    AND NOT EXISTS (
      SELECT 1
      FROM budget_lines bl
      WHERE bl.project_id = v_project_id
        AND bl.import_batch_id = p_target_import_batch_id
        AND bl.target_littera_id = m.littera_id
    );

  IF v_missing_codes IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot lock baseline: these members are missing from TARGET_ESTIMATE (budget_lines) in batch %: %',
      p_target_import_batch_id, v_missing_codes;
  END IF;

  -- Compute BAC total
  SELECT COALESCE(SUM(bl.amount), 0) INTO v_bac_total
  FROM work_phase_members m
  JOIN budget_lines bl
    ON bl.project_id = v_project_id
   AND bl.import_batch_id = p_target_import_batch_id
   AND bl.target_littera_id = m.littera_id
  WHERE m.work_phase_version_id = p_work_phase_version_id
    AND m.member_type = 'LITTERA';

  IF v_bac_total = 0 THEN
    RAISE EXCEPTION 'Cannot lock baseline: BAC total computed as 0. Check members and target estimate.';
  END IF;

  -- Insert baseline header
  INSERT INTO work_phase_baselines (
    project_id, work_phase_id, work_phase_version_id, target_import_batch_id,
    bac_total, notes, locked_by
  ) VALUES (
    v_project_id, p_work_phase_id, p_work_phase_version_id, p_target_import_batch_id,
    ROUND(v_bac_total, 2), p_notes, p_locked_by
  )
  RETURNING work_phase_baseline_id INTO v_baseline_id;

  -- Insert baseline lines by cost_type
  INSERT INTO work_phase_baseline_lines (work_phase_baseline_id, cost_type, amount)
  SELECT
    v_baseline_id,
    bl.cost_type,
    ROUND(SUM(bl.amount), 2) AS amount
  FROM work_phase_members m
  JOIN budget_lines bl
    ON bl.project_id = v_project_id
   AND bl.import_batch_id = p_target_import_batch_id
   AND bl.target_littera_id = m.littera_id
  WHERE m.work_phase_version_id = p_work_phase_version_id
    AND m.member_type = 'LITTERA'
  GROUP BY bl.cost_type;

  RETURN v_baseline_id;
END;
$$;

