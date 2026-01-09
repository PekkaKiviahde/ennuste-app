-- 0030_target_estimate_item_mappings.sql
-- Item-tason mappaus tavoitearviosta tyopaketteihin ja hankintapaketteihin (MVP)
-- Luotu: 2026-01-10

BEGIN;

CREATE TABLE IF NOT EXISTS proc_packages (
  proc_package_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  default_work_package_id uuid REFERENCES work_phases(work_phase_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL
);

CREATE INDEX IF NOT EXISTS proc_packages_project_idx
  ON proc_packages(project_id, name);

CREATE TABLE IF NOT EXISTS target_estimate_item_mappings (
  item_mapping_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  budget_item_id uuid NOT NULL REFERENCES budget_items(budget_item_id) ON DELETE CASCADE,
  work_phase_id uuid REFERENCES work_phases(work_phase_id),
  proc_package_id uuid REFERENCES proc_packages(proc_package_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL,
  UNIQUE (budget_item_id)
);

CREATE INDEX IF NOT EXISTS target_estimate_item_mappings_project_idx
  ON target_estimate_item_mappings(project_id);

COMMIT;
