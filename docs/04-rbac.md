# RBAC (Roles + Permissions) ja aikarajatut roolit

## 1) Tavoite
- Selkeä permission-malli, joka toimii multi-tenant SaaS:ssa.
- Mahdollistaa määräaikaiset oikeudet (sijaisuudet, projektihuiput, tms).

## 2) Data-rakenne
- `memberships`: user ↔ tenant (jäsenyys)
- `roles`: tenant-kohtaiset roolit
- `permissions`: globaalit permission-avaimet (tai myös tenant-kohtaiset, jos halutaan)
- `role_permissions`: rooli ↔ permission
- `role_assignments`: membership ↔ role, **valid_from/to**

Skeema: `db/00-schema.sql`

## 3) Permission naming
Suositus: `<resource>.<verb>` tai `<domain>.<action>`

Esimerkkejä:
- `company.read`, `company.write`
- `project.read`, `project.write`
- `rbac.manage`
- `audit.read`

## 4) Authorization-logiikka (per request)
**Input:**
- `currentUserId`
- `currentTenantId`

**Steps:**
1) Hae membership:
   - `memberships.user_id = currentUserId`
   - `memberships.tenant_id = currentTenantId`
   - `status = 'active'`
2) Hae voimassa olevat roolit nyt:
   - `role_assignments.membership_id = membership.id`
   - `valid_from is null or valid_from <= now()`
   - `valid_to is null or valid_to >= now()`
3) Hae permissionit rooleille:
   - join `role_permissions` → `permissions`
4) Cache `permissions[]` requestin eliniäksi.
5) `requirePermission("project.write")` ennen write-operaatioita.

## 5) Esimerkkikysely (SQL)
```sql
-- permissions for a given user in a given tenant
select distinct p.key
from memberships m
join role_assignments ra on ra.membership_id = m.id
join role_permissions rp on rp.role_id = ra.role_id
join permissions p on p.id = rp.permission_id
where m.user_id = :user_id
  and m.tenant_id = :tenant_id
  and m.status = 'active'
  and (ra.valid_from is null or ra.valid_from <= now())
  and (ra.valid_to is null or ra.valid_to >= now());
```

## 6) Käytännön huomioita
- **Sallittu oletus**: kaikki endpointit vaativat auth, mutta osa vaatii permissionin.
- **Read vs Write**: usein read permission on laajempi kuin write.
- **Admin-rooli**: tyypillisesti `rbac.manage` ja kaikki domain write-permissionit.
- **Least privilege**: luo perusroolit (viewer/editor/admin).

## 7) Aikarajatut roolit (valid_from/to)
- Jos `valid_from` tai `valid_to` on NULL → avoin raja.
- Tee UI:ssa näkyväksi “oikeus on voimassa X–Y”.

## 8) Audit
Kirjaa aina roolimuutokset:
- `rbac.role_assigned`
- `rbac.role_revoked`

## Mitä muuttui
- Lisätty muutososiot dokumentin loppuun.

## Miksi
- Dokumentaatiokäytäntö: muutokset kirjataan näkyvästi.

## Miten testataan (manuaali)
- Avaa dokumentti ja varmista, että osiot ovat mukana.
