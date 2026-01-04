-- 0027_group_onboarding.sql
-- Konserni + kutsulinkit + SaaS onboarding

BEGIN;

CREATE TABLE IF NOT EXISTS groups (
  group_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS groups_name_ux ON groups (name);

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES groups(group_id);

CREATE INDEX IF NOT EXISTS organizations_group_idx ON organizations(group_id);

CREATE TABLE IF NOT EXISTS org_invites (
  invite_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  email text NOT NULL,
  role_code text NOT NULL DEFAULT 'ORG_ADMIN' REFERENCES roles(role_code),
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS org_invites_token_ux ON org_invites (token_hash);
CREATE INDEX IF NOT EXISTS org_invites_org_idx ON org_invites (organization_id, expires_at);

CREATE TABLE IF NOT EXISTS group_role_assignments (
  assignment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(user_id),
  role_code text NOT NULL REFERENCES roles(role_code),

  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by text NOT NULL,

  revoked_at timestamptz NULL,
  revoked_by text NULL,
  revoke_reason text NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS group_role_active_ux
  ON group_role_assignments (group_id, user_id, role_code)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS group_role_user_idx
  ON group_role_assignments (user_id);

INSERT INTO roles (role_code, role_name_fi, description)
VALUES
  ('GROUP_ADMIN', 'Konserni-admin', 'Konsernin ylintason hallinta'),
  ('GROUP_VIEWER', 'Konserni-johtaja', 'Konsernin lukuoikeus')
ON CONFLICT (role_code) DO NOTHING;

INSERT INTO permissions (permission_code, description)
VALUES
  ('SAAS_ONBOARDING_MANAGE', 'Saa luoda konsernin, yhtiön ja kutsun'),
  ('GROUP_READ', 'Saa lukea konsernin yhtiot')
ON CONFLICT (permission_code) DO NOTHING;

INSERT INTO role_permissions (role_code, permission_code)
VALUES
  ('SELLER', 'SAAS_ONBOARDING_MANAGE'),
  ('GROUP_ADMIN', 'GROUP_READ'),
  ('GROUP_VIEWER', 'GROUP_READ')
ON CONFLICT DO NOTHING;

COMMIT;
