-- db/01-seed-permissions.sql
-- Seed default permissions and example roles for a given tenant.
--
-- Notes:
-- - This script uses gen_random_uuid() for ids (requires pgcrypto extension).
--   If you don't want DB-side UUIDs, generate UUIDs in the app and rewrite inserts accordingly.
--
-- 0) Optional (needed for gen_random_uuid):
-- create extension if not exists pgcrypto;

-- 1) Seed permissions (global)
insert into permissions (id, key) values
  (gen_random_uuid(), 'company.read'),
  (gen_random_uuid(), 'company.write'),
  (gen_random_uuid(), 'project.read'),
  (gen_random_uuid(), 'project.write'),
  (gen_random_uuid(), 'rbac.manage'),
  (gen_random_uuid(), 'audit.read')
on conflict (key) do nothing;

-- 2) Example roles for ONE tenant
-- Replace <TENANT_ID> with an actual tenant UUID.
-- Tip: run this block once per tenant you want to initialize.

-- ===== BEGIN tenant role seed =====
-- with
--   t as (select '<TENANT_ID>'::uuid as tenant_id),
--   r as (
--     insert into roles (id, tenant_id, name)
--     select gen_random_uuid(), t.tenant_id, x.name
--     from t
--     cross join (values ('viewer'), ('editor'), ('admin')) as x(name)
--     on conflict (tenant_id, name) do update set name = excluded.name
--     returning id, tenant_id, name
--   ),
--   p as (
--     select id, key from permissions
--     where key in (
--       'company.read','company.write','project.read','project.write','rbac.manage','audit.read'
--     )
--   )
-- insert into role_permissions (role_id, permission_id)
-- select r.id as role_id, p.id as permission_id
-- from r
-- join p on (
--   (r.name = 'viewer' and p.key in ('company.read','project.read')) or
--   (r.name = 'editor' and p.key in ('company.read','project.read','company.write','project.write')) or
--   (r.name = 'admin'  and p.key in ('company.read','project.read','company.write','project.write','rbac.manage','audit.read'))
-- )
-- on conflict do nothing;
-- ===== END tenant role seed =====
