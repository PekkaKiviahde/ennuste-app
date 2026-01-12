-- 0034_tenant_min_schema.sql
-- Minimi tenant-skeema VERIFY_INVARIANTS.sql:n tenant-rajaa varten.

CREATE TABLE IF NOT EXISTS organizations (
  organization_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'system'
);

CREATE TABLE IF NOT EXISTS projects (
  project_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'system',
  CONSTRAINT projects_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES organizations(organization_id)
    ON DELETE RESTRICT
);

-- Seed default organisaatio (idempotentti)
INSERT INTO organizations (slug, name, created_by)
VALUES ('default', 'Default', 'system')
ON CONFLICT (slug) DO NOTHING;
