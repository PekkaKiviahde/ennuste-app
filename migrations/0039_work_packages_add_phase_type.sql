-- 0039_work_packages_add_phase_type.sql
-- Hankintapaketit ja työpaketit mallinnetaan work_packages-tauluun phase_type-sarakkeella.

ALTER TABLE work_packages
  ADD COLUMN IF NOT EXISTS phase_type text;

UPDATE work_packages
SET phase_type = 'WORK'
WHERE phase_type IS NULL;

ALTER TABLE work_packages
  ALTER COLUMN phase_type SET DEFAULT 'WORK';

ALTER TABLE work_packages
  ALTER COLUMN phase_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'work_packages'
      AND c.conname = 'work_packages_phase_type_chk'
  ) THEN
    ALTER TABLE work_packages
    ADD CONSTRAINT work_packages_phase_type_chk
    CHECK (phase_type IN ('WORK','PROCUREMENT'));
  END IF;
END $$;
