# Vaihe 20 – Terminologia & monikielisyys (normalisoitu taulu)

Päivitetty: 2025-12-19

## Miksi tämä tehdään?
- Laskennan merkitykset lukitaan (BAC/AC/EV/CPI...), mutta nimet pitää pystyä vaihtamaan:
  - yrityskohtaisesti
  - kielittäin (FI/EN/...)
- Ratkaisu: `terminology_terms` (append-only) + resolver-funktiot.

## Asennus
1) Kopioi `migrations/0010_terminology_i18n.sql` repoosi.
2) Aja pgAdminissa (Query Tool).

## Smoke test 1: näe seed-termit
```sql
SELECT term_key, label, description
FROM v_terminology_current
WHERE organization_id IS NULL AND locale='fi'
ORDER BY term_key;
```

## Ota käyttöön termien muokkaus (ORG_ADMIN oikeus)
Anna Pekalle org-admin rooli organisaatioon:

```sql
INSERT INTO organization_role_assignments (organization_id, user_id, role_code, granted_by)
SELECT '9287b9f7-1d22-4f0f-bfd9-064170a53c6b'::uuid, u.user_id, 'ORG_ADMIN', 'system'
FROM users u
WHERE u.username='pekka'
  AND NOT EXISTS (
    SELECT 1
    FROM organization_role_assignments x
    WHERE x.organization_id='9287b9f7-1d22-4f0f-bfd9-064170a53c6b'::uuid
      AND x.user_id=u.user_id
      AND x.role_code='ORG_ADMIN'
      AND x.revoked_at IS NULL
  );
```

## Esimerkki: yritys haluaa kutsua “Työvaihe” = “Työpaketti” (FI)
```sql
SELECT terminology_set_term_secure(
  '9287b9f7-1d22-4f0f-bfd9-064170a53c6b'::uuid,
  'fi',
  'term.work_phase',
  'Työpaketti',
  'Yrityksen oma termi työvaiheelle.',
  'pekka',
  'Yritysterminologia'
);
```

## Esimerkki: “Tavoite (baseline) €” nimetään “Budjetti €” (FI)
```sql
SELECT terminology_set_term_secure(
  '9287b9f7-1d22-4f0f-bfd9-064170a53c6b'::uuid,
  'fi',
  'metric.bac',
  'Budjetti €',
  'Lukittu baseline (BAC).',
  'pekka',
  'Yritysterminologia'
);
```

## Testaa resolver (org override -> global, locale -> fallback)
```sql
SELECT *
FROM terminology_resolve_term(
  '9287b9f7-1d22-4f0f-bfd9-064170a53c6b'::uuid,
  'fi',
  'metric.bac',
  'en'
);
```

## Hae koko sanasto UI:lle yhdellä kutsulla
```sql
SELECT *
FROM terminology_get_dictionary(
  '9287b9f7-1d22-4f0f-bfd9-064170a53c6b'::uuid,
  'fi',
  'en'
);
```

## Huomio API/UI:lle
- API palauttaa aina **koodit** (esim. `metric.bac`) + arvot.
- UI hakee sanaston (dictionary) ja renderöi labelit käyttäjän kielellä.
- Tämä mahdollistaa kansainvälisyyden ja yrityskohtaiset nimitykset ilman laskennan muutoksia.

## Mitä muuttui
- Lisätty muutososiot dokumentin loppuun.

## Miksi
- Dokumentaatiokäytäntö: muutokset kirjataan näkyvästi.

## Miten testataan (manuaali)
- Avaa dokumentti ja varmista, että osiot ovat mukana.
