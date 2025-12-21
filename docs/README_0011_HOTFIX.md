# Hotfix 0011 – terminology_get_dictionary()

Päivitetty: 2025-12-19

## Miksi tämä tarvitaan?
`terminology_get_dictionary()` antoi virheen:

> column reference "term_key" is ambiguous

Syy: PL/pgSQL sekoitti palautus-sarakkeen `term_key` ja taulun sarakkeen `term_key`.

## Mitä tämä tekee?
- Korvaa funktion `terminology_get_dictionary()` turvallisesti (`CREATE OR REPLACE FUNCTION`).
- Ei muuta dataa.

## Asennus
1) Kopioi `migrations/0011_fix_terminology_get_dictionary.sql` repoosi.
2) Aja pgAdminissa (Query Tool) tai psql:llä.

## Testi
```sql
SELECT *
FROM terminology_get_dictionary(
  '<ORG_ID>'::uuid,
  'fi',
  'en'
)
LIMIT 20;
```
