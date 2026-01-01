-- db/00-schema.sql
-- PostgreSQL schema (MVP) for multi-tenant SaaS: tenants + RBAC + companies + projects + audit
--
-- Notes:
-- - UUID generation: choose your strategy (app-side UUIDs or DB-side gen_random_uuid()).
-- - JSONB fields: company_details, project_details for MVP flexibility.
-- - RLS (Row Level Security) examples are included at the bottom as optional v2 hardening.

-- Optional: enable pgcrypto if you want gen_random_uuid()
-- create extension if not exists pgcrypto;

-- ==============
-- Tenancy
-- ==============
create table if not exists tenants (
  id uuid primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key,
  email text unique not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  user_id uuid not null references users(id),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index if not exists idx_memberships_tenant on memberships(tenant_id);
create index if not exists idx_memberships_user on memberships(user_id);

-- ==============
-- RBAC
-- ==============
create table if not exists roles (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  name text not null,
  unique (tenant_id, name)
);

create index if not exists idx_roles_tenant on roles(tenant_id);

create table if not exists permissions (
  id uuid primary key,
  key text unique not null
);

create table if not exists role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists role_assignments (
  id uuid primary key,
  membership_id uuid not null references memberships(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  valid_from timestamptz,
  valid_to timestamptz
);

create index if not exists idx_role_assignments_membership on role_assignments(membership_id);
create index if not exists idx_role_assignments_role on role_assignments(role_id);

-- ==============
-- Domain
-- ==============
create table if not exists companies (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  name text not null,
  company_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_companies_tenant on companies(tenant_id);
create index if not exists idx_companies_details_gin on companies using gin (company_details);

create table if not exists projects (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  company_id uuid not null references companies(id),
  name text not null,
  project_details jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_tenant on projects(tenant_id);
create index if not exists idx_projects_company on projects(company_id);
create index if not exists idx_projects_details_gin on projects using gin (project_details);

-- ==============
-- Audit
-- ==============
create table if not exists audit_log (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  actor_user_id uuid references users(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_tenant on audit_log(tenant_id);
create index if not exists idx_audit_entity on audit_log(entity_type, entity_id);

-- ==========================================================
-- Optional v2: Row Level Security (RLS) hardening examples
-- ==========================================================
-- Usage pattern:
--   select set_config('app.tenant_id', '<tenant_uuid>', true);
-- Then enable RLS and policies:
--
-- alter table companies enable row level security;
-- create policy companies_tenant_isolation
--   on companies
--   using (tenant_id = current_setting('app.tenant_id', true)::uuid)
--   with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
--
-- alter table projects enable row level security;
-- create policy projects_tenant_isolation
--   on projects
--   using (tenant_id = current_setting('app.tenant_id', true)::uuid)
--   with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
--
-- alter table audit_log enable row level security;
-- create policy audit_tenant_isolation
--   on audit_log
--   using (tenant_id = current_setting('app.tenant_id', true)::uuid)
--   with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
