# Tenant-eristys (MVP + v2 RLS)

## 1) Tavoite
Varmistaa, että data ei koskaan sekoitu tenanttien välillä:
- ei luku-vuotoa
- ei write-vuotoa
- ei audit-vuotoa

## 2) MVP: eristys sovelluskerroksessa (nopea)
**Pakolliset säännöt:**
- Kaikki domain-queryt: `WHERE tenant_id = :tenantId`
- Kaikki write-operaatiot: `tenant_id` asetetaan backendissä (ei clientiltä luotettuna)
- Jokaisen requestin alussa:
  - varmista auth
  - varmista membership (user ↔ tenant)

**Suositus:**
- keskitetty helper: `getTenantContext(req)` joka palauttaa `{ userId, tenantId }`
- keskitetty helper: `requirePermission(key)`

## 3) v2: PostgreSQL Row Level Security (RLS)
RLS toimii “turvaverkkona”:
- vaikka kehittäjä unohtaisi tenant-filterin jossain queryssä, DB estää vuodon.

### 3.1 Perusidea
1) Aseta jokaisessa requestissa DB-session muuttuja:
   - `set_config('app.tenant_id', '<uuid>', true)`
2) Ota RLS käyttöön tauluihin.
3) Tee policy, joka sallii rivit vain jos `tenant_id` matchaa.

### 3.2 Esimerkki (companies)
```sql
alter table companies enable row level security;

create policy companies_tenant_isolation
  on companies
  using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

### 3.3 Esimerkki (projects)
```sql
alter table projects enable row level security;

create policy projects_tenant_isolation
  on projects
  using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

### 3.4 Esimerkki (audit_log)
```sql
alter table audit_log enable row level security;

create policy audit_tenant_isolation
  on audit_log
  using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

## 4) Riskit ja mitigointi
- **Risk**: unohdettu tenant-filter → MVP:ssä vuoto.
  - **Mitigointi**: keskitetyt query-helperit + testit + v2 RLS.
- **Risk**: client lähettää tenant_id väärin.
  - **Mitigointi**: tenant_id tulee sessionista / server-side kontekstista, ei pyydetä luottamaan clientiin.
- **Risk**: audit-log puuttuu.
  - **Mitigointi**: audit helper pakolliseksi write-polulle.

## 5) Testit (tenant-eristys)
- Luo tenant A ja B, user A membership vain A:ssa.
- Varmista:
  - /companies list ei näytä B:n rivejä
  - /projects patch B:n id:llä palauttaa 404 tai 403 (mieluiten 404, ettei vuoda olemassaoloa)

## Mitä muuttui
- Lisätty muutososiot dokumentin loppuun.

## Miksi
- Dokumentaatiokäytäntö: muutokset kirjataan näkyvästi.

## Miten testataan (manuaali)
- Avaa dokumentti ja varmista, että osiot ovat mukana.
