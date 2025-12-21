-- 0009_saas_rbac_phase19.sql
-- Phase 19 (SaaS v1): Tenants (organizations), users, memberships, roles & permissions (RBAC)
-- Päivitetty: 2025-12-18
-- Päätökset:
--   - SaaS-ajattelu (multi-tenant): projektit kuuluvat organisaatioon
--   - Käyttäjä voi kuulua useaan organisaatioon
--   - Hyväksyntäketju (2-portainen): Työpäällikkö -> Tuotantojohtaja
-- Huom:
--   - Tämä on DB-malli + apufunktiot. Varsinainen käyttöoikeuksien “pakotus” tehdään API/UI-tasolla.
--   - Tässä kuitenkin tarjotaan rbac_* -funktiot ja “secure wrapperit” (esim. Phase 17 approve) sovellusta varten.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1) Tenants / organizations
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  organization_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL
);

-- ============================================================
-- 2) Users (application identity)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,       -- use this as the stable identifier in functions
  display_name text NULL,
  email text NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL
);

-- ============================================================
-- 3) Organization memberships (multi-org user support)
--    Append-only style: leaving sets left_at, we keep row for audit.
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_memberships (
  organization_membership_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(organization_id),
  user_id uuid NOT NULL REFERENCES users(user_id),

  joined_at timestamptz NOT NULL DEFAULT now(),
  joined_by text NOT NULL,

  left_at timestamptz NULL,
  left_by text NULL,
  leave_reason text NULL
);

-- One active membership per (org,user)
CREATE UNIQUE INDEX IF NOT EXISTS ux_org_membership_active
  ON organization_memberships (organization_id, user_id)
  WHERE left_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_org_memberships_user
  ON organization_memberships (user_id);

-- ============================================================
-- 4) Roles + permissions
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  role_code text PRIMARY KEY,
  role_name_fi text NOT NULL,
  description text NULL,
  is_system boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS permissions (
  permission_code text PRIMARY KEY,
  description text NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_code text NOT NULL REFERENCES roles(role_code),
  permission_code text NOT NULL REFERENCES permissions(permission_code),
  PRIMARY KEY (role_code, permission_code)
);

-- ============================================================
-- 5) Role assignments (org-level and project-level)
--    Append-only style: revoke sets revoked_at.
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_role_assignments (
  assignment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(organization_id),
  user_id uuid NOT NULL REFERENCES users(user_id),
  role_code text NOT NULL REFERENCES roles(role_code),

  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by text NOT NULL,

  revoked_at timestamptz NULL,
  revoked_by text NULL,
  revoke_reason text NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_org_role_active
  ON organization_role_assignments (organization_id, user_id, role_code)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_org_role_user
  ON organization_role_assignments (user_id);

CREATE TABLE IF NOT EXISTS project_role_assignments (
  assignment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id),
  user_id uuid NOT NULL REFERENCES users(user_id),
  role_code text NOT NULL REFERENCES roles(role_code),

  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by text NOT NULL,

  revoked_at timestamptz NULL,
  revoked_by text NULL,
  revoke_reason text NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_project_role_active
  ON project_role_assignments (project_id, user_id, role_code)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_role_user
  ON project_role_assignments (user_id);

-- ============================================================
-- 6) Link projects -> organizations (tenant boundary)
-- ============================================================
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Add FK if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'projects_organization_id_fkey'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_organization_id_fkey
      FOREIGN KEY (organization_id)
      REFERENCES organizations(organization_id);
  END IF;
END $$;

-- Ensure a default tenant exists (for existing single-db setups)
DO $phase19_default_org$
DECLARE
  v_default_org_id uuid;
BEGIN
  INSERT INTO organizations (slug, name, created_by)
  VALUES ('default', 'Default organization', 'system')
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name
  RETURNING organization_id INTO v_default_org_id;

  -- If ON CONFLICT updated, RETURNING still returns the row. If it didn't, select it:
  IF v_default_org_id IS NULL THEN
    SELECT organization_id INTO v_default_org_id
    FROM organizations WHERE slug='default';
  END IF;

  -- Backfill existing projects
  UPDATE projects
  SET organization_id = v_default_org_id
  WHERE organization_id IS NULL;

  -- Set default for new projects (helpful in local/dev; prod can override)
  EXECUTE format('ALTER TABLE projects ALTER COLUMN organization_id SET DEFAULT %L::uuid', v_default_org_id::text);

  -- Enforce NOT NULL (tenant boundary)
  ALTER TABLE projects
    ALTER COLUMN organization_id SET NOT NULL;
END
$phase19_default_org$;

-- ============================================================
-- 7) Seed system roles + permissions (SaaS v1)
-- ============================================================
INSERT INTO roles (role_code, role_name_fi, description)
VALUES
  ('SITE_FOREMAN',        'Työnjohtaja',        'Kirjaa viikkopäivitykset, ghostit ja korjausehdotukset'),
  ('GENERAL_FOREMAN',     'Vastaava mestari',   'Hyväksyy työnjohtajan viikkopäivitykset, kirjaa ghostit, ehdottaa korjauksia'),
  ('PROJECT_MANAGER',     'Työpäällikkö',       'Hyväksyy (1/2), lukitsee baselinea, vetää ennustuspalaverit'),
  ('PRODUCTION_MANAGER',  'Tuotantojohtaja',    'Lopullinen hyväksyntä (2/2), johtoraportointi'),
  ('PROCUREMENT',         'Hankinta',           'Osallistuu suunnitteluun, raporttien luku'),
  ('EXEC_READONLY',       'Johto (luku)',       'Vain luku'),
  ('ORG_ADMIN',           'Organisaatio-admin', 'Käyttäjät, roolit ja projektien jäsenyydet')
ON CONFLICT (role_code) DO NOTHING;

INSERT INTO permissions (permission_code, description)
VALUES
  ('REPORT_READ',                     'Saa lukea raportit'),
  ('WORK_PHASE_WEEKLY_UPDATE_CREATE', 'Saa tehdä viikkopäivityksen'),
  ('WORK_PHASE_WEEKLY_UPDATE_APPROVE','Saa hyväksyä viikkopäivityksen'),
  ('GHOST_ENTRY_CREATE',              'Saa kirjata ghost-kuluja'),
  ('CORRECTION_PROPOSE',              'Saa ehdottaa korjausta (Phase17)'),
  ('CORRECTION_APPROVE_PM',           'Saa hyväksyä korjauksen 1/2 (Työpäällikkö)'),
  ('CORRECTION_APPROVE_FINAL',        'Saa hyväksyä korjauksen 2/2 (Tuotantojohtaja)'),
  ('BASELINE_LOCK',                   'Saa lukita baselinen'),
  ('MEMBERS_MANAGE',                  'Saa hallita käyttäjiä/rooleja projektissa tai organisaatiossa')
ON CONFLICT (permission_code) DO NOTHING;

-- Role -> permissions mapping (SaaS v1)
INSERT INTO role_permissions (role_code, permission_code)
VALUES
  ('SITE_FOREMAN',       'REPORT_READ'),
  ('SITE_FOREMAN',       'WORK_PHASE_WEEKLY_UPDATE_CREATE'),
  ('SITE_FOREMAN',       'GHOST_ENTRY_CREATE'),
  ('SITE_FOREMAN',       'CORRECTION_PROPOSE'),

  ('GENERAL_FOREMAN',    'REPORT_READ'),
  ('GENERAL_FOREMAN',    'WORK_PHASE_WEEKLY_UPDATE_APPROVE'),
  ('GENERAL_FOREMAN',    'GHOST_ENTRY_CREATE'),
  ('GENERAL_FOREMAN',    'CORRECTION_PROPOSE'),

  ('PROJECT_MANAGER',    'REPORT_READ'),
  ('PROJECT_MANAGER',    'BASELINE_LOCK'),
  ('PROJECT_MANAGER',    'CORRECTION_APPROVE_PM'),

  ('PRODUCTION_MANAGER', 'REPORT_READ'),
  ('PRODUCTION_MANAGER', 'BASELINE_LOCK'),
  ('PRODUCTION_MANAGER', 'CORRECTION_APPROVE_FINAL'),

  ('PROCUREMENT',        'REPORT_READ'),

  ('EXEC_READONLY',      'REPORT_READ'),

  ('ORG_ADMIN',          'REPORT_READ'),
  ('ORG_ADMIN',          'MEMBERS_MANAGE')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8) RBAC helper functions for API/UI
-- ============================================================
CREATE OR REPLACE FUNCTION rbac_get_user_id(p_username text)
RETURNS uuid
LANGUAGE sql
AS $$
  SELECT user_id
  FROM users
  WHERE username = p_username
    AND is_active = true
$$;

CREATE OR REPLACE FUNCTION rbac_user_has_permission(
  p_project_id uuid,
  p_username text,
  p_permission_code text
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
BEGIN
  SELECT rbac_get_user_id(p_username) INTO v_user_id;
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT organization_id INTO v_org_id
  FROM projects
  WHERE project_id = p_project_id;

  -- Project-level permissions
  IF EXISTS (
    SELECT 1
    FROM project_role_assignments pra
    JOIN role_permissions rp
      ON rp.role_code = pra.role_code
     AND rp.permission_code = p_permission_code
    WHERE pra.project_id = p_project_id
      AND pra.user_id = v_user_id
      AND pra.revoked_at IS NULL
  ) THEN
    RETURN true;
  END IF;

  -- Org-level permissions (inherit to all projects in the org)
  IF v_org_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM organization_role_assignments ora
    JOIN role_permissions rp
      ON rp.role_code = ora.role_code
     AND rp.permission_code = p_permission_code
    WHERE ora.organization_id = v_org_id
      AND ora.user_id = v_user_id
      AND ora.revoked_at IS NULL
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION rbac_assert_project_permission(
  p_project_id uuid,
  p_username text,
  p_permission_code text
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT rbac_user_has_permission(p_project_id, p_username, p_permission_code) THEN
    RAISE EXCEPTION 'RBAC: user % missing permission % for project %', p_username, p_permission_code, p_project_id;
  END IF;
END $$;

-- Convenience view: active role assignments (project)
CREATE OR REPLACE VIEW v_rbac_project_roles_active AS
SELECT
  pra.project_id,
  p.organization_id,
  pra.user_id,
  u.username,
  pra.role_code,
  pra.granted_at,
  pra.granted_by
FROM project_role_assignments pra
JOIN users u ON u.user_id = pra.user_id
JOIN projects p ON p.project_id = pra.project_id
WHERE pra.revoked_at IS NULL;

-- Convenience view: active role assignments (org)
CREATE OR REPLACE VIEW v_rbac_org_roles_active AS
SELECT
  ora.organization_id,
  ora.user_id,
  u.username,
  ora.role_code,
  ora.granted_at,
  ora.granted_by
FROM organization_role_assignments ora
JOIN users u ON u.user_id = ora.user_id
WHERE ora.revoked_at IS NULL;

-- Effective permissions per user+project
CREATE OR REPLACE VIEW v_rbac_user_project_permissions AS
WITH proj_roles AS (
  SELECT pra.project_id, pra.user_id, pra.role_code
  FROM project_role_assignments pra
  WHERE pra.revoked_at IS NULL
),
org_roles AS (
  SELECT p.project_id, ora.user_id, ora.role_code
  FROM projects p
  JOIN organization_role_assignments ora
    ON ora.organization_id = p.organization_id
   AND ora.revoked_at IS NULL
)
SELECT
  p.project_id,
  u.user_id,
  u.username,
  rp.permission_code
FROM projects p
JOIN users u ON u.is_active = true
JOIN (
  SELECT * FROM proj_roles
  UNION ALL
  SELECT * FROM org_roles
) r
  ON r.project_id = p.project_id
 AND r.user_id = u.user_id
JOIN role_permissions rp
  ON rp.role_code = r.role_code
GROUP BY p.project_id, u.user_id, u.username, rp.permission_code;

-- ============================================================
-- 9) Secure wrappers for Phase 17 approvals (optional but recommended for API)
-- ============================================================
-- Propose (requires CORRECTION_PROPOSE)
CREATE OR REPLACE FUNCTION work_phase_propose_add_littera_from_item_secure(
  p_work_phase_id uuid,
  p_item_code text,
  p_username text,
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  SELECT project_id INTO v_project_id
  FROM work_phases
  WHERE work_phase_id = p_work_phase_id;

  PERFORM rbac_assert_project_permission(v_project_id, p_username, 'CORRECTION_PROPOSE');

  RETURN work_phase_propose_add_littera_from_item(
    p_work_phase_id,
    p_item_code,
    p_username,
    p_notes
  );
END $$;

-- Approve PM (requires CORRECTION_APPROVE_PM)
CREATE OR REPLACE FUNCTION work_phase_approve_correction_pm_secure(
  p_correction_id uuid,
  p_username text,
  p_comment text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  SELECT project_id INTO v_project_id
  FROM work_phase_corrections
  WHERE correction_id = p_correction_id;

  PERFORM rbac_assert_project_permission(v_project_id, p_username, 'CORRECTION_APPROVE_PM');

  PERFORM work_phase_approve_correction_pm(p_correction_id, p_username, p_comment);
END $$;

-- Approve FINAL (requires CORRECTION_APPROVE_FINAL)
CREATE OR REPLACE FUNCTION work_phase_approve_correction_final_secure(
  p_correction_id uuid,
  p_username text,
  p_comment text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  SELECT project_id INTO v_project_id
  FROM work_phase_corrections
  WHERE correction_id = p_correction_id;

  PERFORM rbac_assert_project_permission(v_project_id, p_username, 'CORRECTION_APPROVE_FINAL');

  RETURN work_phase_approve_correction_final(p_correction_id, p_username, p_comment);
END $$;

-- Baseline lock secure wrapper (requires BASELINE_LOCK)
CREATE OR REPLACE FUNCTION work_phase_lock_baseline_secure(
  p_work_phase_id uuid,
  p_work_phase_version_id uuid,
  p_target_import_batch_id uuid,
  p_username text,
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  SELECT project_id INTO v_project_id
  FROM work_phases
  WHERE work_phase_id = p_work_phase_id;

  PERFORM rbac_assert_project_permission(v_project_id, p_username, 'BASELINE_LOCK');

  RETURN work_phase_lock_baseline(
    p_work_phase_id,
    p_work_phase_version_id,
    p_target_import_batch_id,
    p_username,
    p_notes
  );
END $$;

-- ============================================================
-- 10) (Recommended) Ensure Phase 18 "selvitettävät" view matches your unmapped snapshot source
--     This locks in the manual fix you applied during smoke test.
-- ============================================================
CREATE OR REPLACE VIEW v_selvitettavat_actuals_by_littera AS
SELECT
  u.project_id,
  l.code  AS littera_code,
  l.title AS littera_title,
  ROUND(SUM(u.amount), 2) AS actual_total
FROM v_actuals_latest_snapshot_unmapped u
LEFT JOIN litteras l
  ON l.project_id = u.project_id
 AND l.littera_id = u.work_littera_id
GROUP BY u.project_id, l.code, l.title
ORDER BY actual_total DESC;

CREATE OR REPLACE VIEW v_report_top_selvitettavat_littera AS
SELECT *
FROM v_selvitettavat_actuals_by_littera
ORDER BY actual_total DESC
LIMIT 50;

COMMIT;
