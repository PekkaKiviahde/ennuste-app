# Vaihe 19 – SaaS v1: Tenantit + käyttäjät + roolit ja oikeudet (RBAC)

Päivitetty: 2025-12-18

## Mitä tämä vaihe tekee?
Tämä migraatio lisää tietokantaan:
- `organizations` (tenant/organisaatio)
- `users` (sovelluskäyttäjä, tunniste = `username`)
- `organization_memberships` (käyttäjä voi olla useassa organisaatiossa)
- roolit ja oikeudet:
  - `roles`
  - `permissions`
  - `role_permissions`
- roolien myöntäminen:
  - `project_role_assignments` (projektikohtaiset roolit)
  - `organization_role_assignments` (org-tason roolit, periytyvät kaikkiin orgin projekteihin)
- RBAC-apufunktiot ja näkymät (API/UI-käyttöön):
  - `rbac_user_has_permission(...)`
  - `rbac_assert_project_permission(...)`
  - `v_rbac_user_project_permissions`
- “Secure wrapperit” Phase 17 approve -toimintoihin (valinnainen mutta suositeltu):
  - `work_phase_approve_correction_pm_secure(...)`
  - `work_phase_approve_correction_final_secure(...)`
  - jne.

Lisäksi migraatio lukitsee Phase 18 “selvitettävät” -fixin:
- `v_selvitettavat_actuals_by_littera` lukee `v_actuals_latest_snapshot_unmapped`-lähteestä.

---

## Asennus
1) Aja migraatio `migrations/0042_saas_rbac_phase19.sql` (Phase19 minimi).
2) Aja lopuksi `docs/sql/VERIFY_INVARIANTS.sql` ja `docs/sql/SMOKE_E2E_CORE.sql`.

Jos ajo onnistuu:
- `projects.tenant_id` backfillataan “Default”-tenantille niissä riveissä, joissa se puuttui.

---

## Käyttöönotto (nopea, käytännöllinen polku)

### 1) Katso “default” organisaatio
```sql
SELECT * FROM organizations ORDER BY created_at;
```

### 2) Halutessasi luo oma organisaatio (esim. Pajala) ja siirrä projekti sinne
```sql
INSERT INTO organizations (slug, name, created_by)
VALUES ('pajala', 'Pajala Yhtiöt Oy', 'system')
RETURNING organization_id;
```

Sitten päivitä projekti:
```sql
UPDATE projects
SET organization_id = '<PAJALA_ORG_ID>'::uuid
WHERE project_id = '111c4f99-ae89-4fcd-8756-e66b6722af50'::uuid;
```

### 3) Luo käyttäjät
```sql
INSERT INTO users (username, display_name, email, created_by)
VALUES
  ('pekka', 'Pekka', NULL, 'system'),
  ('tyonjohtaja', 'Työnjohtaja', NULL, 'system'),
  ('vastaava', 'Vastaava mestari', NULL, 'system'),
  ('tyopllikko', 'Työpäällikkö', NULL, 'system'),
  ('tuotantojohtaja', 'Tuotantojohtaja', NULL, 'system'),
  ('hankinta', 'Hankinta', NULL, 'system'),
  ('johto', 'Johto', NULL, 'system')
ON CONFLICT (username) DO NOTHING;
```

### 4) Liitä käyttäjät organisaatioon (jäsenyys)
```sql
INSERT INTO organization_memberships (organization_id, user_id, joined_by)
SELECT
  o.organization_id,
  u.user_id,
  'system'
FROM organizations o
JOIN users u ON u.username IN ('pekka','tyonjohtaja','vastaava','tyopllikko','tuotantojohtaja','hankinta','johto')
WHERE o.slug = 'pajala'
ON CONFLICT DO NOTHING; -- (jos tulee virhe, jäsenyys on jo aktiivinen)
```

Jos teillä tulee ON CONFLICT -virhe, käytä tätä muotoa:
```sql
INSERT INTO organization_memberships (organization_id, user_id, joined_by)
SELECT o.organization_id, u.user_id, 'system'
FROM organizations o
JOIN users u ON u.username='pekka'
WHERE o.slug='pajala'
  AND NOT EXISTS (
    SELECT 1 FROM organization_memberships m
    WHERE m.organization_id=o.organization_id AND m.user_id=u.user_id AND m.left_at IS NULL
  );
```

### 5) Anna projektikohtaiset roolit (testiprojektille)
Projektin id:
`111c4f99-ae89-4fcd-8756-e66b6722af50`

```sql
-- Työnjohtaja
INSERT INTO project_role_assignments (project_id, user_id, role_code, granted_by)
SELECT '111c4f99-ae89-4fcd-8756-e66b6722af50'::uuid, u.user_id, 'SITE_FOREMAN', 'system'
FROM users u
WHERE u.username='tyonjohtaja'
  AND NOT EXISTS (
    SELECT 1 FROM project_role_assignments x
    WHERE x.project_id='111c4f99-ae89-4fcd-8756-e66b6722af50'::uuid
      AND x.user_id=u.user_id
      AND x.role_code='SITE_FOREMAN'
      AND x.revoked_at IS NULL
  );

-- Vastaava
INSERT INTO project_role_assignments (project_id, user_id, role_code, granted_by)
SELECT '111c4f99-ae89-4fcd-8756-e66b6722af50'::uuid, u.user_id, 'GENERAL_FOREMAN', 'system'
FROM users u
WHERE u.username='vastaava'
  AND NOT EXISTS (
    SELECT 1 FROM project_role_assignments x
    WHERE x.project_id='111c4f99-ae89-4fcd-8756-e66b6722af50'::uuid
      AND x.user_id=u.user_id
      AND x.role_code='GENERAL_FOREMAN'
      AND x.revoked_at IS NULL
  );

-- Työpäällikkö
INSERT INTO project_role_assignments (project_id, user_id, role_code, granted_by)
SELECT '111c4f99-ae89-4fcd-8756-e66b6722af50'::uuid, u.user_id, 'PROJECT_MANAGER', 'system'
FROM users u
WHERE u.username='tyopllikko'
  AND NOT EXISTS (
    SELECT 1 FROM project_role_assignments x
    WHERE x.project_id='111c4f99-ae89-4fcd-8756-e66b6722af50'::uuid
      AND x.user_id=u.user_id
      AND x.role_code='PROJECT_MANAGER'
      AND x.revoked_at IS NULL
  );

-- Tuotantojohtaja
INSERT INTO project_role_assignments (project_id, user_id, role_code, granted_by)
SELECT '111c4f99-ae89-4fcd-8756-e66b6722af50'::uuid, u.user_id, 'PRODUCTION_MANAGER', 'system'
FROM users u
WHERE u.username='tuotantojohtaja'
  AND NOT EXISTS (
    SELECT 1 FROM project_role_assignments x
    WHERE x.project_id='111c4f99-ae89-4fcd-8756-e66b6722af50'::uuid
      AND x.user_id=u.user_id
      AND x.role_code='PRODUCTION_MANAGER'
      AND x.revoked_at IS NULL
  );
```

---

## Testaa oikeudet (RBAC)
```sql
SELECT rbac_user_has_permission(
  '111c4f99-ae89-4fcd-8756-e66b6722af50'::uuid,
  'tyopllikko',
  'CORRECTION_APPROVE_PM'
) AS can_pm_approve;

SELECT rbac_user_has_permission(
  '111c4f99-ae89-4fcd-8756-e66b6722af50'::uuid,
  'tuotantojohtaja',
  'CORRECTION_APPROVE_FINAL'
) AS can_final_approve;
```

Katso tehokkaat oikeudet per käyttäjä:
```sql
SELECT *
FROM v_rbac_user_project_permissions
WHERE project_id='111c4f99-ae89-4fcd-8756-e66b6722af50'::uuid
ORDER BY username, permission_code;
```

---

## Secure wrapper -esimerkki (Phase 17)
Kun UI/API käyttää secure wrapperia, DB varmistaa roolin.

```sql
-- Esimerkki: PM hyväksyy korjauksen (1/2)
SELECT work_phase_approve_correction_pm_secure(
  '<CORRECTION_ID>'::uuid,
  'tyopllikko',
  'OK'
);
```

---

## Seuraava vaihe
SaaS v1 -rakenteet on nyt paikallaan.
Seuraavaksi voidaan tehdä API/UI-kerros (login, projektivalinta, hyväksyntäjonot, raportit).

## Mitä muuttui
- Lisätty muutososiot dokumentin loppuun.

## Miksi
- Dokumentaatiokäytäntö: muutokset kirjataan näkyvästi.

## Miten testataan (manuaali)
- Avaa dokumentti ja varmista, että osiot ovat mukana.
