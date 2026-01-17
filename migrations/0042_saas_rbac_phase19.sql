-- 0042_saas_rbac_phase19.sql
-- Phase19 minimi: tenants + users + sessions + RBAC + audit-log (append-only)
--
-- Mitä muuttui:
-- - Lisätty `tenants`, `users`, `sessions`, RBAC-taulut (membership + role assignments) ja `app_audit_log`.
-- - Lisätty `projects.tenant_id` + SaaS-sarakkeet (`customer`, `project_state`, `project_details`).
-- - Lisätty DB-RBAC näkymä/funktio: `v_rbac_user_project_permissions`, `rbac_user_has_permission(...)`.
-- Miksi:
-- - Tuotantokelpoinen tenant-eristys ja roolipohjainen access sovelluskerroksen kautta.
-- - Audit trail (append-only) kriittisille tapahtumille.
-- Miten testataan (manuaali):
-- - Aja migraatiot + `docs/sql/VERIFY_INVARIANTS.sql` + `docs/sql/SMOKE_E2E_CORE.sql`.
-- - (DB) `SELECT rbac_user_has_permission(<project_id>, <username>, 'REPORT_READ');`

BEGIN;

-- =========================
-- tenants
-- =========================
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'system'
);

-- Seed default tenant (idempotentti; backfillia varten)
INSERT INTO tenants (name, created_by)
VALUES ('Default', 'system')
ON CONFLICT (name) DO NOTHING;

-- =========================
-- projects: tenant_id + SaaS-kentät
-- =========================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_state text NOT NULL DEFAULT 'P1_PROJECT_ACTIVE';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_details jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill: jos tenant_id puuttuu, aseta Default-tenant.
DO $$
DECLARE
  v_default_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_default_tenant_id FROM tenants WHERE name='Default' LIMIT 1;
  IF v_default_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Default tenant missing';
  END IF;

  UPDATE projects
  SET tenant_id = v_default_tenant_id
  WHERE tenant_id IS NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'projects_tenant_id_fkey'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_tenant_id_fkey
      FOREIGN KEY (tenant_id)
      REFERENCES tenants(tenant_id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- Enforce NOT NULL vasta backfillin jälkeen
ALTER TABLE projects ALTER COLUMN tenant_id SET NOT NULL;

-- Composite unique, jotta sessions voi FK:lla varmistaa (project_id,tenant_id) parin
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_project_id_tenant_id_ux') THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_project_id_tenant_id_ux UNIQUE (project_id, tenant_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_projects_tenant_org ON projects(tenant_id, organization_id);
CREATE INDEX IF NOT EXISTS ix_projects_tenant_state ON projects(tenant_id, project_state);

-- =========================
-- users + sessions (signed cookie -> sessions taulu)
-- =========================
CREATE TABLE IF NOT EXISTS users (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  display_name text,
  email text,
  pin_hash text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'system',
  CONSTRAINT users_username_chk CHECK (length(trim(username)) > 0)
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  project_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

-- Varmista, että session.project_id kuuluu samaan tenanttiin (prevents "mismatch session" -tilat)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_project_tenant_fk') THEN
    ALTER TABLE sessions
      ADD CONSTRAINT sessions_project_tenant_fk
      FOREIGN KEY (project_id, tenant_id)
      REFERENCES projects(project_id, tenant_id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_sessions_user_active ON sessions(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_sessions_expires ON sessions(expires_at);

-- =========================
-- Audit log (append-only)
-- =========================
CREATE TABLE IF NOT EXISTS app_audit_log (
  audit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
  organization_id uuid REFERENCES organizations(organization_id) ON DELETE RESTRICT,
  project_id uuid REFERENCES projects(project_id) ON DELETE RESTRICT,
  actor text,
  actor_user_id uuid REFERENCES users(user_id) ON DELETE SET NULL,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  event_time timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_audit_log_action_chk CHECK (length(trim(action)) > 0)
);

CREATE INDEX IF NOT EXISTS ix_app_audit_log_project_time ON app_audit_log(project_id, event_time DESC);
CREATE INDEX IF NOT EXISTS ix_app_audit_log_tenant_time ON app_audit_log(tenant_id, event_time DESC);

-- Autocomplete tenant/org context projektista, jos caller ei aseta niitä.
CREATE OR REPLACE FUNCTION app_audit_log_fill_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id uuid;
  v_org_id uuid;
BEGIN
  IF NEW.project_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT tenant_id, organization_id
  INTO v_tenant_id, v_org_id
  FROM projects
  WHERE project_id = NEW.project_id
  LIMIT 1;

  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := v_tenant_id;
  END IF;
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := v_org_id;
  END IF;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER app_audit_log_fill_context
    BEFORE INSERT ON app_audit_log
    FOR EACH ROW EXECUTE FUNCTION app_audit_log_fill_context();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER app_audit_log_append_only
    BEFORE UPDATE OR DELETE ON app_audit_log
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- Planning events (append-only; nykyinen API käyttää tätä)
-- =========================
DO $$ BEGIN
  CREATE TYPE plan_status AS ENUM ('DRAFT','READY_FOR_FORECAST','LOCKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS planning_events (
  planning_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  target_littera_id uuid NOT NULL REFERENCES litteras(littera_id) ON DELETE RESTRICT,
  status plan_status NOT NULL,
  summary text,
  observations text,
  risks text,
  decisions text,
  created_by text NOT NULL,
  event_time timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_planning_events_project_time ON planning_events(project_id, event_time DESC, planning_event_id DESC);
CREATE INDEX IF NOT EXISTS ix_planning_events_project_target ON planning_events(project_id, target_littera_id, event_time DESC);

DO $$ BEGIN
  CREATE TRIGGER planning_events_append_only
    BEFORE UPDATE OR DELETE ON planning_events
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- RBAC: memberships + roles + permissions + assignments
-- =========================
CREATE TABLE IF NOT EXISTS organization_memberships (
  membership_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(organization_id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  joined_at timestamptz NOT NULL DEFAULT now(),
  joined_by text NOT NULL,
  left_at timestamptz,
  left_by text
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_org_memberships_active
  ON organization_memberships(organization_id, user_id)
  WHERE left_at IS NULL;

CREATE TABLE IF NOT EXISTS roles (
  role_code text PRIMARY KEY,
  role_name_fi text NOT NULL,
  description text
);

CREATE TABLE IF NOT EXISTS permissions (
  permission_code text PRIMARY KEY,
  description text
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_code text NOT NULL REFERENCES roles(role_code) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES permissions(permission_code) ON DELETE CASCADE,
  PRIMARY KEY (role_code, permission_code)
);

CREATE TABLE IF NOT EXISTS organization_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(organization_id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  role_code text NOT NULL REFERENCES roles(role_code) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by text NOT NULL,
  revoked_at timestamptz,
  revoked_by text,
  valid_from timestamptz,
  valid_to timestamptz,
  CONSTRAINT ora_valid_range_chk CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_org_role_assignments_active
  ON organization_role_assignments(organization_id, user_id, role_code)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS project_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  role_code text NOT NULL REFERENCES roles(role_code) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by text NOT NULL,
  revoked_at timestamptz,
  revoked_by text,
  valid_from timestamptz,
  valid_to timestamptz,
  CONSTRAINT pra_valid_range_chk CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_project_role_assignments_active
  ON project_role_assignments(project_id, user_id, role_code)
  WHERE revoked_at IS NULL;

-- Seed roolit (idempotentti)
INSERT INTO roles (role_code, role_name_fi, description) VALUES
  ('SITE_FOREMAN','Työnjohtaja','Tuotannon käyttäjä (site foreman)'),
  ('GENERAL_FOREMAN','Vastaavamestari','PM-roolin esihenkilö (general foreman)'),
  ('PROJECT_MANAGER','Projektipäällikkö','PM'),
  ('PROJECT_OWNER','Projektin omistaja','Onboardingin omistajarooli'),
  ('PRODUCTION_MANAGER','Tuotantojohtaja','Baseline-hyväksyntä 2/2 + korjaukset'),
  ('PROCUREMENT','Hankinta','Hankinnan rooli'),
  ('EXEC_READONLY','Johto','Read-only katselu'),
  ('ORG_ADMIN','Yritysadmin','Organisaation admin'),
  ('SELLER','Myyjä','Provisioning / SaaS onboarding'),
  ('GROUP_ADMIN','Konserniadmin','Group-tason admin'),
  ('GROUP_VIEWER','Konsernikatselija','Group-tason katselu')
ON CONFLICT (role_code) DO NOTHING;

-- Seed permissionit (idempotentti)
INSERT INTO permissions (permission_code, description) VALUES
  ('REPORT_READ','Lue raportit'),
  ('PLANNING_WRITE','Kirjoita suunnittelu'),
  ('FORECAST_WRITE','Kirjoita ennuste'),
  ('WORK_PHASE_WEEKLY_UPDATE_CREATE','Luo viikkopäivitys'),
  ('WORK_PHASE_WEEKLY_UPDATE_APPROVE','Hyväksy viikkopäivitys'),
  ('GHOST_ENTRY_CREATE','Luo ghost-rivi'),
  ('CORRECTION_PROPOSE','Ehdota korjaus'),
  ('CORRECTION_APPROVE_PM','Hyväksy korjaus 1/2'),
  ('CORRECTION_APPROVE_FINAL','Hyväksy korjaus 2/2'),
  ('BASELINE_LOCK','Baseline-lukitus'),
  ('MEMBERS_MANAGE','Hallitse käyttäjiä ja rooleja'),
  ('TERMINOLOGY_MANAGE','Hallitse sanasto'),
  ('SELLER_UI','Myyjän UI'),
  ('SAAS_ONBOARDING_MANAGE','SaaS onboarding -hallinta'),
  ('GROUP_READ','Konserniluku')
ON CONFLICT (permission_code) DO NOTHING;

-- Minimi rooli->permission -mappaus (MVP)
-- Huom: tarkempi matriisi dokumentoitu `docs/workflows/rbac-matrix.md` (UI-nappien taso).
INSERT INTO role_permissions (role_code, permission_code)
SELECT x.role_code, x.permission_code
FROM (VALUES
  -- Project / tuotanto
  ('SITE_FOREMAN','REPORT_READ'),
  ('SITE_FOREMAN','PLANNING_WRITE'),
  ('SITE_FOREMAN','FORECAST_WRITE'),
  ('SITE_FOREMAN','WORK_PHASE_WEEKLY_UPDATE_CREATE'),
  ('SITE_FOREMAN','GHOST_ENTRY_CREATE'),

  ('GENERAL_FOREMAN','REPORT_READ'),
  ('GENERAL_FOREMAN','PLANNING_WRITE'),
  ('GENERAL_FOREMAN','BASELINE_LOCK'),
  ('GENERAL_FOREMAN','CORRECTION_APPROVE_PM'),

  ('PROJECT_MANAGER','REPORT_READ'),
  ('PROJECT_MANAGER','PLANNING_WRITE'),
  ('PROJECT_MANAGER','BASELINE_LOCK'),
  ('PROJECT_MANAGER','CORRECTION_APPROVE_PM'),

  ('PRODUCTION_MANAGER','REPORT_READ'),
  ('PRODUCTION_MANAGER','PLANNING_WRITE'),
  ('PRODUCTION_MANAGER','BASELINE_LOCK'),
  ('PRODUCTION_MANAGER','CORRECTION_APPROVE_FINAL'),
  ('PRODUCTION_MANAGER','FORECAST_WRITE'),

  ('EXEC_READONLY','REPORT_READ'),

  -- Admin / provisioning
  ('ORG_ADMIN','REPORT_READ'),
  ('ORG_ADMIN','MEMBERS_MANAGE'),
  ('ORG_ADMIN','TERMINOLOGY_MANAGE'),
  ('ORG_ADMIN','BASELINE_LOCK'),
  ('ORG_ADMIN','PLANNING_WRITE'),
  ('ORG_ADMIN','FORECAST_WRITE'),

  ('SELLER','SELLER_UI'),
  ('SELLER','SAAS_ONBOARDING_MANAGE'),
  ('GROUP_ADMIN','GROUP_READ'),
  ('GROUP_VIEWER','GROUP_READ')
) AS x(role_code, permission_code)
ON CONFLICT DO NOTHING;

-- Alias: PROJECT_OWNER perii tuotantojohtajan permissionit (onboarding)
INSERT INTO role_permissions (role_code, permission_code)
SELECT 'PROJECT_OWNER', rp.permission_code
FROM role_permissions rp
WHERE rp.role_code = 'PRODUCTION_MANAGER'
ON CONFLICT DO NOTHING;

-- =========================
-- RBAC views / functions
-- =========================
CREATE OR REPLACE VIEW v_rbac_user_project_permissions AS
WITH active_users AS (
  SELECT user_id, username
  FROM users
  WHERE is_active = true
),
project_ctx AS (
  SELECT p.project_id, p.organization_id
  FROM projects p
),
members AS (
  SELECT m.organization_id, m.user_id
  FROM organization_memberships m
  WHERE m.left_at IS NULL
),
scoped_roles AS (
  -- project scoped roles
  SELECT pra.project_id, pra.user_id, pra.role_code
  FROM project_role_assignments pra
  WHERE pra.revoked_at IS NULL
    AND (pra.valid_from IS NULL OR pra.valid_from <= now())
    AND (pra.valid_to IS NULL OR pra.valid_to >= now())
  UNION ALL
  -- organization scoped roles (periytyy kaikkiin orgin projekteihin)
  SELECT p.project_id, ora.user_id, ora.role_code
  FROM organization_role_assignments ora
  JOIN project_ctx p ON p.organization_id = ora.organization_id
  WHERE ora.revoked_at IS NULL
    AND (ora.valid_from IS NULL OR ora.valid_from <= now())
    AND (ora.valid_to IS NULL OR ora.valid_to >= now())
),
effective_roles AS (
  SELECT DISTINCT r.project_id, r.user_id, r.role_code
  FROM scoped_roles r
  JOIN project_ctx p ON p.project_id = r.project_id
  JOIN members m ON m.organization_id = p.organization_id AND m.user_id = r.user_id
),
effective_permissions AS (
  SELECT er.project_id, er.user_id, rp.permission_code
  FROM effective_roles er
  JOIN role_permissions rp ON rp.role_code = er.role_code
)
SELECT ep.project_id, u.username, ep.permission_code
FROM effective_permissions ep
JOIN active_users u ON u.user_id = ep.user_id;

CREATE OR REPLACE FUNCTION rbac_user_has_permission(p_project_id uuid, p_username text, p_permission_code text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM v_rbac_user_project_permissions v
    WHERE v.project_id = p_project_id
      AND v.username = p_username
      AND v.permission_code = p_permission_code
  );
$$;

CREATE OR REPLACE FUNCTION rbac_assert_project_permission(p_project_id uuid, p_username text, p_permission_code text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT rbac_user_has_permission(p_project_id, p_username, p_permission_code) THEN
    RAISE EXCEPTION 'RBAC: missing permission % for username=% project_id=%', p_permission_code, p_username, p_project_id;
  END IF;
END;
$$;

COMMIT;
