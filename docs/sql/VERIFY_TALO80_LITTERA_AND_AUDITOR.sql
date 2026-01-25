-- VERIFY_TALO80_LITTERA_AND_AUDITOR.sql
-- Talo80: litterakoodi ^[0-9]{4}$ ja AUDITOR-rooli.
--
-- Mitä muuttui:
-- - Lisätty tarkistukset constraintille ja AUDITOR-roolille.
-- Miksi:
-- - Varmistetaan, että DB on linjassa Talo80 v2.1 -linjausten kanssa.
-- Miten testataan (manuaali):
-- - Aja tämä tiedosto psql:lla migraatioiden jälkeen.

-- Constraint löytyy ja onko se validoitu.
SELECT conname, convalidated
FROM pg_constraint
WHERE conname = 'litteras_code_four_digits_chk';

-- Mahdolliset rikkomukset nykyisessä datassa.
SELECT littera_id, project_id, code
FROM litteras
WHERE code !~ '^[0-9]{4}$';

-- AUDITOR-rooli löytyy.
SELECT role_code, role_name_fi, description
FROM roles
WHERE role_code = 'AUDITOR';

-- AUDITOR-roolin permissionit.
SELECT role_code, permission_code
FROM role_permissions
WHERE role_code = 'AUDITOR'
ORDER BY permission_code;
