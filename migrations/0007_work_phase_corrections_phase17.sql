-- 0007_work_phase_corrections_phase17.sql
-- Phase 17 (SaaS v1): Item-based correction proposal -> 2-step approval -> new version + new baseline
-- Päivitetty: 2025-12-18
-- Päätökset:
--   17.1 = B  (korjauksessa säilytetään item_code muutoshistoriassa)
--   17.2 = A  (vain sama TARGET_ESTIMATE import_batch kuin baselinen target_import_batch_id kelpaa)
--   17.3 = A  (baseline muuttuu retroaktiivisesti: latest baseline voittaa raporteissa)
-- Hyväksyntäketju:
--   1) Työpäällikkö (PM_APPROVED)
--   2) Tuotantojohtaja (FINAL_APPROVED) -> luo uuden work_phase_version + lukitsee uuden baselinen

-- HUOM: Tässä v1-mallissa korjaus lisää työvaiheeseen item_code:n TAUSTALLA olevan 4-num "litteran" (target_littera).
-- Perustelu: toteumat (AC) ovat teillä littera-tasolla (target_littera_id + allocated_amount), ei item-tasolla.
-- Jos halutaan myöhemmin item-tasoinen scope, se on oma laajennus (vaihe 17.2+).

BEGIN;

-- UUID generator (use pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- 1) Korjauspyynnöt (append-only log + status)
-- =========================
CREATE TABLE IF NOT EXISTS work_phase_corrections (
  correction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id uuid NOT NULL REFERENCES projects(project_id),
  work_phase_id uuid NOT NULL REFERENCES work_phases(work_phase_id),

  -- What was the baseline/version at proposal time?
  base_work_phase_version_id uuid NOT NULL REFERENCES work_phase_versions(work_phase_version_id),
  base_baseline_id uuid NOT NULL REFERENCES work_phase_baselines(work_phase_baseline_id),
  target_import_batch_id uuid NOT NULL REFERENCES import_batches(import_batch_id),

  correction_type text NOT NULL, -- e.g. ADD_LITTERA_FROM_TARGET_ESTIMATE_ITEM

  -- The littera that will be added (derived from budget_items.item_code -> littera_id)
  requested_littera_id uuid NOT NULL REFERENCES litteras(littera_id),

  -- Evidence from target estimate (decision 17.1 = B)
  evidence_item_code text NOT NULL,
  evidence_item_desc text NULL,
  evidence_item_total_eur numeric(14,2) NULL,

  notes text NULL,

  status text NOT NULL DEFAULT 'PROPOSED', -- PROPOSED -> PM_APPROVED -> FINAL_APPROVED / REJECTED

  proposed_at timestamptz NOT NULL DEFAULT now(),
  proposed_by text NOT NULL,

  pm_approved_at timestamptz NULL,
  pm_approved_by text NULL,
  pm_comment text NULL,

  final_approved_at timestamptz NULL,
  final_approved_by text NULL,
  final_comment text NULL,

  rejected_at timestamptz NULL,
  rejected_by text NULL,
  rejected_reason text NULL,

  -- If applied:
  applied_work_phase_version_id uuid NULL REFERENCES work_phase_versions(work_phase_version_id),
  applied_baseline_id uuid NULL REFERENCES work_phase_baselines(work_phase_baseline_id)
);

-- Check constraint (idempotent add)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'work_phase_corrections_status_chk'
  ) THEN
    ALTER TABLE work_phase_corrections
      ADD CONSTRAINT work_phase_corrections_status_chk
      CHECK (status IN ('PROPOSED','PM_APPROVED','FINAL_APPROVED','REJECTED'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_work_phase_corrections_phase_status
  ON work_phase_corrections (work_phase_id, status, proposed_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_phase_corrections_project_status
  ON work_phase_corrections (project_id, status, proposed_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_phase_corrections_requested_littera
  ON work_phase_corrections (project_id, requested_littera_id);

-- Convenience view for queueing
CREATE OR REPLACE VIEW v_work_phase_corrections_queue AS
SELECT
  c.correction_id,
  c.project_id,
  c.work_phase_id,
  wp.name AS work_phase_name,
  c.status,
  c.correction_type,
  c.requested_littera_id,
  l.code AS requested_littera_code,
  l.title AS requested_littera_title,
  c.evidence_item_code,
  c.evidence_item_desc,
  c.evidence_item_total_eur,
  c.notes,
  c.proposed_at,
  c.proposed_by,
  c.pm_approved_at,
  c.pm_approved_by,
  c.final_approved_at,
  c.final_approved_by
FROM work_phase_corrections c
JOIN work_phases wp
  ON wp.work_phase_id = c.work_phase_id
LEFT JOIN litteras l
  ON l.project_id = c.project_id
 AND l.littera_id = c.requested_littera_id
ORDER BY c.proposed_at DESC;

-- =========================
-- 2) PROPOSE: add littera derived from budget_items.item_code (strict same batch as baseline)
-- =========================
CREATE OR REPLACE FUNCTION work_phase_propose_add_littera_from_item(
  p_work_phase_id uuid,
  p_item_code text,
  p_proposed_by text,
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_project_id uuid;

  v_base_version_id uuid;
  v_base_baseline_id uuid;
  v_target_batch_id uuid;

  v_item_littera_id uuid;
  v_item_desc text;
  v_item_total numeric(14,2);
  v_cnt integer;

  v_correction_id uuid;
BEGIN
  -- Work phase -> project
  SELECT project_id INTO v_project_id
  FROM work_phases
  WHERE work_phase_id = p_work_phase_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'work_phase_id % not found', p_work_phase_id;
  END IF;

  -- Must have locked baseline (policy A)
  SELECT
    lb.work_phase_version_id,
    lb.work_phase_baseline_id,
    lb.target_import_batch_id
  INTO
    v_base_version_id,
    v_base_baseline_id,
    v_target_batch_id
  FROM v_work_phase_latest_baseline lb
  WHERE lb.work_phase_id = p_work_phase_id;

  IF v_base_baseline_id IS NULL THEN
    RAISE EXCEPTION 'No locked baseline found for work_phase_id % (policy A requires baseline)', p_work_phase_id;
  END IF;

  -- Find item (decision 17.2 = A: only SAME batch)
  SELECT COUNT(*) INTO v_cnt
  FROM budget_items bi
  WHERE bi.project_id = v_project_id
    AND bi.import_batch_id = v_target_batch_id
    AND bi.item_code = p_item_code;

  IF v_cnt = 0 THEN
    RAISE EXCEPTION
      'budget_items.item_code % not found in TARGET_ESTIMATE batch % for project %',
      p_item_code, v_target_batch_id, v_project_id;
  ELSIF v_cnt > 1 THEN
    RAISE EXCEPTION
      'budget_items.item_code % is not unique (% rows) in batch %. Disambiguate first.',
      p_item_code, v_cnt, v_target_batch_id;
  END IF;

  SELECT
    bi.littera_id,
    bi.item_desc,
    ROUND(bi.total_eur, 2)
  INTO
    v_item_littera_id,
    v_item_desc,
    v_item_total
  FROM budget_items bi
  WHERE bi.project_id = v_project_id
    AND bi.import_batch_id = v_target_batch_id
    AND bi.item_code = p_item_code
  LIMIT 1;

  IF v_item_littera_id IS NULL THEN
    RAISE EXCEPTION 'budget_items.item_code % found, but littera_id is NULL (data error)', p_item_code;
  END IF;

  -- Prevent duplicates: littera already in the baseline's version scope
  IF EXISTS (
    SELECT 1
    FROM work_phase_members m
    WHERE m.work_phase_version_id = v_base_version_id
      AND m.member_type = 'LITTERA'
      AND m.littera_id = v_item_littera_id
  ) THEN
    RAISE EXCEPTION
      'Littera is already included in work phase version %. (item_code % -> littera_id %)',
      v_base_version_id, p_item_code, v_item_littera_id;
  END IF;

  -- Ensure budget_lines exist for this littera in the same batch (otherwise baseline lock will fail)
  IF NOT EXISTS (
  SELECT 1
  FROM budget_lines bl
  WHERE bl.project_id = v_project_id
    AND bl.import_batch_id = v_target_batch_id
    AND bl.target_littera_id = v_item_littera_id
) THEN
  RAISE EXCEPTION
    'No budget_lines rows found for target_littera_id % in batch % (cannot lock baseline for it)',
    v_item_littera_id, v_target_batch_id;
END IF;


  INSERT INTO work_phase_corrections (
    project_id,
    work_phase_id,
    base_work_phase_version_id,
    base_baseline_id,
    target_import_batch_id,
    correction_type,
    requested_littera_id,
    evidence_item_code,
    evidence_item_desc,
    evidence_item_total_eur,
    notes,
    status,
    proposed_by
  ) VALUES (
    v_project_id,
    p_work_phase_id,
    v_base_version_id,
    v_base_baseline_id,
    v_target_batch_id,
    'ADD_LITTERA_FROM_TARGET_ESTIMATE_ITEM',
    v_item_littera_id,
    p_item_code,
    v_item_desc,
    v_item_total,
    p_notes,
    'PROPOSED',
    p_proposed_by
  )
  RETURNING correction_id INTO v_correction_id;

  RETURN v_correction_id;
END $$;

-- =========================
-- 3) APPROVE 1/2: PM (Työpäällikkö)
-- =========================
CREATE OR REPLACE FUNCTION work_phase_approve_correction_pm(
  p_correction_id uuid,
  p_approved_by text,
  p_comment text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE work_phase_corrections
  SET
    status = 'PM_APPROVED',
    pm_approved_at = now(),
    pm_approved_by = p_approved_by,
    pm_comment = p_comment
  WHERE correction_id = p_correction_id
    AND status = 'PROPOSED';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Correction % not found in status PROPOSED (cannot PM-approve)', p_correction_id;
  END IF;
END $$;

-- =========================
-- 4) APPROVE 2/2: FINAL (Tuotantojohtaja) -> create new version + lock baseline
-- =========================
CREATE OR REPLACE FUNCTION work_phase_approve_correction_final(
  p_correction_id uuid,
  p_approved_by text,
  p_comment text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_project_id uuid;
  v_work_phase_id uuid;

  v_base_version_id uuid;
  v_base_baseline_id uuid;
  v_target_batch_id uuid;

  v_requested_littera_id uuid;
  v_item_code text;

  v_latest_baseline_id uuid;
  v_latest_version_id uuid;

  v_new_version_no integer;
  v_new_version_id uuid;
  v_new_baseline_id uuid;

  v_notes text;
BEGIN
  -- Load correction (must be PM_APPROVED)
  SELECT
    project_id,
    work_phase_id,
    base_work_phase_version_id,
    base_baseline_id,
    target_import_batch_id,
    requested_littera_id,
    evidence_item_code
  INTO
    v_project_id,
    v_work_phase_id,
    v_base_version_id,
    v_base_baseline_id,
    v_target_batch_id,
    v_requested_littera_id,
    v_item_code
  FROM work_phase_corrections
  WHERE correction_id = p_correction_id
    AND status = 'PM_APPROVED';

  IF v_work_phase_id IS NULL THEN
    RAISE EXCEPTION 'Correction % not found in status PM_APPROVED (cannot final-approve)', p_correction_id;
  END IF;

  -- Conflict check: baseline/version must still be latest (prevents lost updates)
  SELECT
    lb.work_phase_baseline_id,
    lb.work_phase_version_id
  INTO
    v_latest_baseline_id,
    v_latest_version_id
  FROM v_work_phase_latest_baseline lb
  WHERE lb.work_phase_id = v_work_phase_id;

  IF v_latest_baseline_id IS NULL THEN
    RAISE EXCEPTION 'No latest baseline found at final approval time (unexpected)';
  END IF;

  IF v_latest_baseline_id <> v_base_baseline_id OR v_latest_version_id <> v_base_version_id THEN
    RAISE EXCEPTION
      'Baseline/version changed since proposal. Proposed on baseline %, current baseline is %. Re-propose the correction.',
      v_base_baseline_id, v_latest_baseline_id;
  END IF;

  -- New version number
  SELECT COALESCE(MAX(version_no), 0) + 1
  INTO v_new_version_no
  FROM work_phase_versions
  WHERE work_phase_id = v_work_phase_id;

  v_notes := format('Phase17 correction %s: add littera (from item_code %s)', p_correction_id::text, v_item_code);

  -- Create new version
  INSERT INTO work_phase_versions (
    project_id,
    work_phase_id,
    version_no,
    status,
    notes,
    created_by
  )
  VALUES (
    v_project_id,
    v_work_phase_id,
    v_new_version_no,
    'ACTIVE',
    v_notes,
    p_approved_by
  )
  RETURNING work_phase_version_id INTO v_new_version_id;

  -- Copy members from base version
  INSERT INTO work_phase_members (
    project_id,
    work_phase_version_id,
    member_type,
    littera_id,
    note,
    created_by
  )
  SELECT
    project_id,
    v_new_version_id,
    member_type,
    littera_id,
    note,
    created_by
  FROM work_phase_members
  WHERE work_phase_version_id = v_base_version_id;

  -- Add the requested littera as new member
  INSERT INTO work_phase_members (
    project_id,
    work_phase_version_id,
    member_type,
    littera_id,
    note,
    created_by
  )
  VALUES (
    v_project_id,
    v_new_version_id,
    'LITTERA',
    v_requested_littera_id,
    format('Added via correction %s (item_code %s)', p_correction_id::text, v_item_code),
    p_approved_by
  );

  -- Lock baseline for the new version (same target batch) -> returns baseline_id
  SELECT work_phase_lock_baseline(
    v_work_phase_id::uuid,
    v_new_version_id::uuid,
    v_target_batch_id::uuid,
    p_approved_by,
    v_notes
  )
  INTO v_new_baseline_id;

  -- Mark correction as applied
  UPDATE work_phase_corrections
  SET
    status = 'FINAL_APPROVED',
    final_approved_at = now(),
    final_approved_by = p_approved_by,
    final_comment = p_comment,
    applied_work_phase_version_id = v_new_version_id,
    applied_baseline_id = v_new_baseline_id
  WHERE correction_id = p_correction_id;

  RETURN v_new_baseline_id;
END $$;

-- =========================
-- 5) REJECT (either at PROPOSED or PM_APPROVED)
-- =========================
CREATE OR REPLACE FUNCTION work_phase_reject_correction(
  p_correction_id uuid,
  p_rejected_by text,
  p_reason text
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE work_phase_corrections
  SET
    status = 'REJECTED',
    rejected_at = now(),
    rejected_by = p_rejected_by,
    rejected_reason = p_reason
  WHERE correction_id = p_correction_id
    AND status IN ('PROPOSED','PM_APPROVED');

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Correction % not found in status PROPOSED/PM_APPROVED (cannot reject)', p_correction_id;
  END IF;
END $$;

COMMIT;
