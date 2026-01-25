-- 0053_talo80_littera_code_and_auditor.sql
-- Talo80: 4-numeroinen litterakoodi + AUDITOR-rooli.
--
-- Mitä muuttui:
-- - Lisätään CHECK-constraint litteras.code: ^[0-9]{4}$ (NOT VALID).
-- - Varmistetaan AUDITOR-rooli ja minimi read-oikeus.
-- Miksi:
-- - Talo80-linjaukset vaativat 4-numeroisen litterakoodin ja AUDITOR-roolin.
-- Miten testataan (manuaali):
-- - Aja migraatiot ja sen jälkeen `docs/sql/VERIFY_TALO80_LITTERA_AND_AUDITOR.sql`.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'litteras_code_four_digits_chk'
  ) THEN
    ALTER TABLE litteras
      ADD CONSTRAINT litteras_code_four_digits_chk
      CHECK (code ~ '^[0-9]{4}$')
      NOT VALID;
  END IF;
END $$;

INSERT INTO roles (role_code, role_name_fi, description)
VALUES ('AUDITOR', 'Auditoija', 'Audit trail read-only')
ON CONFLICT (role_code) DO NOTHING;

INSERT INTO role_permissions (role_code, permission_code)
SELECT 'AUDITOR', 'REPORT_READ'
WHERE EXISTS (
  SELECT 1 FROM permissions WHERE permission_code = 'REPORT_READ'
)
ON CONFLICT DO NOTHING;

COMMIT;
