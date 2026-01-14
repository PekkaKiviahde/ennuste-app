-- 0040_group_org_onboarding.sql
-- Konserni (groups) + yhtiö (organizations) + kutsulinkit (org_invites) + demoprojekti (projects.is_demo)
-- Tavoite: toteutuskelpoinen onboarding (email-sidonta, kertakaytto, vanheneminen, resend=revokointi)

BEGIN;

-- =========================
-- groups
-- =========================
CREATE TABLE IF NOT EXISTS groups (
  group_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text,
  is_implicit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'system'
);

ALTER TABLE groups ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_implicit boolean NOT NULL DEFAULT false;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE groups ADD COLUMN IF NOT EXISTS created_by text NOT NULL DEFAULT 'system';

CREATE UNIQUE INDEX IF NOT EXISTS ux_groups_slug ON groups(slug);
CREATE INDEX IF NOT EXISTS ix_groups_is_implicit ON groups(is_implicit);

-- =========================
-- organizations: link to groups (valinnainen, suositus: oma konserni)
-- =========================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS group_id uuid;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organizations_group_id_fkey'
  ) THEN
    ALTER TABLE organizations
      ADD CONSTRAINT organizations_group_id_fkey
      FOREIGN KEY (group_id)
      REFERENCES groups(group_id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_organizations_group_id ON organizations(group_id);

-- =========================
-- projects: demoprojekti + arkistointi
-- =========================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Backfill: jos project_details->demo=true, nosta is_demo=true (jos project_details sarake on olemassa)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'project_details'
  ) THEN
    EXECUTE $sql$
      UPDATE projects
      SET is_demo = true
      WHERE is_demo IS DISTINCT FROM true
        AND COALESCE((project_details->>'demo')::boolean, false) = true
    $sql$;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_projects_org_is_demo ON projects(organization_id, is_demo);
CREATE INDEX IF NOT EXISTS ix_projects_archived_at ON projects(archived_at);

-- =========================
-- org_invites: email-sidonta, kertakaytto, vanheneminen, resend=revokointi
-- =========================
CREATE TABLE IF NOT EXISTS org_invites (
  invite_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(organization_id) ON DELETE RESTRICT,
  email text NOT NULL,
  role_to_grant text NOT NULL DEFAULT 'ORG_ADMIN',
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'system',
  expires_at timestamptz NOT NULL,
  redeemed_at timestamptz,
  revoked_at timestamptz
);

ALTER TABLE org_invites ADD COLUMN IF NOT EXISTS role_to_grant text NOT NULL DEFAULT 'ORG_ADMIN';
ALTER TABLE org_invites ADD COLUMN IF NOT EXISTS redeemed_at timestamptz;
ALTER TABLE org_invites ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

-- Migraatio: jos vanha sarake on olemassa, kopioi data uusiin sarakkeisiin
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'org_invites' AND column_name = 'role_code'
  ) THEN
    UPDATE org_invites
    SET role_to_grant = COALESCE(role_to_grant, role_code)
    WHERE role_to_grant IS NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'org_invites' AND column_name = 'accepted_at'
  ) THEN
    UPDATE org_invites
    SET redeemed_at = COALESCE(redeemed_at, accepted_at)
    WHERE redeemed_at IS NULL AND accepted_at IS NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_org_invites_token_hash ON org_invites(token_hash);
CREATE INDEX IF NOT EXISTS ix_org_invites_org_expires ON org_invites(organization_id, expires_at);

-- Yksi aktiivinen kutsu per (org,email): aktiivinen = ei lunastettu eikä peruttu.
CREATE UNIQUE INDEX IF NOT EXISTS ux_org_invites_active_email
  ON org_invites(organization_id, email)
  WHERE redeemed_at IS NULL AND revoked_at IS NULL;

-- =========================
-- roolit: PROJECT_OWNER (alias tuotantojohtajalle, onboarding)
-- =========================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
    INSERT INTO roles (role_code, role_name_fi, description)
    VALUES ('PROJECT_OWNER', 'Projektin omistaja', 'Onboardingin omistajarooli (PROJECT_OWNER)')
    ON CONFLICT (role_code) DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
    INSERT INTO role_permissions (role_code, permission_code)
    SELECT 'PROJECT_OWNER', rp.permission_code
    FROM role_permissions rp
    WHERE rp.role_code = 'PRODUCTION_MANAGER'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

COMMIT;

