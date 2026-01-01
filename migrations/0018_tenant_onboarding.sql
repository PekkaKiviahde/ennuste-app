-- 0018_tenant_onboarding.sql
-- Tenant + onboarding states + project states (MVP)
-- Paivitetty: 2025-12-31

DO $$ BEGIN
  CREATE TYPE tenant_onboarding_state AS ENUM (
    'C0_PROVISIONED',
    'C1_ONBOARDING_LINK_SENT',
    'C2_ONBOARDING_IN_PROGRESS',
    'C3_READY'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_state AS ENUM (
    'P0_PROJECT_DRAFT',
    'P1_PROJECT_ACTIVE',
    'P2_PROJECT_ARCHIVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS tenants (
  tenant_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  onboarding_state tenant_onboarding_state NOT NULL DEFAULT 'C0_PROVISIONED',
  company_details jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_state project_state NOT NULL DEFAULT 'P0_PROJECT_DRAFT';

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_details jsonb;

CREATE INDEX IF NOT EXISTS projects_tenant_idx
  ON projects(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tenant_state_events (
  tenant_state_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  from_state tenant_onboarding_state,
  to_state tenant_onboarding_state NOT NULL,
  actor_user_id text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_state_events (
  project_state_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  from_state project_state,
  to_state project_state NOT NULL,
  actor_user_id text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS onboarding_links (
  link_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(project_id) ON DELETE SET NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  CREATE TRIGGER tenant_state_events_append_only
    BEFORE UPDATE OR DELETE ON tenant_state_events
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER project_state_events_append_only
    BEFORE UPDATE OR DELETE ON project_state_events
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER onboarding_links_append_only
    BEFORE UPDATE OR DELETE ON onboarding_links
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
