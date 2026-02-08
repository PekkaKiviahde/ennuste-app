-- 0055_proc_package_work_package_1to1.sql
-- Työpaketti-hankintapaketti linkitys 1:N (MVP).
--
-- Mitä muuttui:
-- - `proc_packages.default_work_package_id` muutetaan pakolliseksi (NOT NULL).
-- - Ei lisätä 1:1-uniikkiutta: yksi työpaketti voi kuulua useaan hankintapakettiin (1:N).
-- - Vaihdettu FK-käytös: `default_work_package_id` -> `ON DELETE RESTRICT`.
-- - Lisätään triggerivalidointi, joka varmistaa että hankintapaketti ja linkitetty työpaketti
--   kuuluvat samaan projektiin.
-- Miksi:
-- - MVP-päätös: yhdellä työpaketilla voi olla useita hankintapaketteja (1:N).
-- - Estetään orvot hankintapaketit ja ristiriitaiset ristiin-projekti-linkit.
-- Miten testataan (manuaali):
-- - Yritä lisätä proc_package ilman default_work_package_id -> virhe.
-- - Yritä lisätä proc_package, jonka default_work_package_id on toisesta projektista -> virhe.
-- - Lisää toinen proc_package samalle default_work_package_id:lle -> sallittu (1:N).
-- - Yritä poistaa työpaketti, johon hankintapaketti viittaa -> poisto estyy (RESTRICT).

BEGIN;

DO $$
DECLARE
  v_missing_count integer;
  v_mismatch_count integer;
BEGIN
  SELECT COUNT(*) INTO v_missing_count
  FROM proc_packages
  WHERE default_work_package_id IS NULL;

  IF v_missing_count > 0 THEN
    RAISE EXCEPTION
      'Migraatio 0055 estetty: proc_packages.default_work_package_id puuttuu % riviltä.',
      v_missing_count;
  END IF;

  SELECT COUNT(*) INTO v_mismatch_count
  FROM proc_packages pp
  JOIN work_packages wp ON wp.id = pp.default_work_package_id
  WHERE pp.project_id <> wp.project_id;

  IF v_mismatch_count > 0 THEN
    RAISE EXCEPTION
      'Migraatio 0055 estetty: proc_packages.default_work_package_id viittaa toisen projektin työpakettiin (% riviä).',
      v_mismatch_count;
  END IF;
END
$$;

ALTER TABLE proc_packages
  DROP CONSTRAINT IF EXISTS proc_packages_default_work_package_id_fkey;

ALTER TABLE proc_packages
  ADD CONSTRAINT proc_packages_default_work_package_id_fkey
  FOREIGN KEY (default_work_package_id)
  REFERENCES work_packages(id)
  ON DELETE RESTRICT;

ALTER TABLE proc_packages
  ALTER COLUMN default_work_package_id SET NOT NULL;

DROP INDEX IF EXISTS ux_proc_packages_default_work_package_1to1;

CREATE OR REPLACE FUNCTION proc_packages_validate_default_work_package()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_work_project_id uuid;
BEGIN
  IF NEW.default_work_package_id IS NULL THEN
    RAISE EXCEPTION 'default_work_package_id on pakollinen.';
  END IF;

  SELECT wp.project_id INTO v_work_project_id
  FROM work_packages wp
  WHERE wp.id = NEW.default_work_package_id;

  IF v_work_project_id IS NULL THEN
    RAISE EXCEPTION 'default_work_package_id ei loydy: %', NEW.default_work_package_id;
  END IF;

  IF NEW.project_id <> v_work_project_id THEN
    RAISE EXCEPTION
      'project_id ei vastaa work_packages.project_id: project_id=% work_project_id=%',
      NEW.project_id,
      v_work_project_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proc_packages_validate_default_work_package ON proc_packages;

CREATE TRIGGER proc_packages_validate_default_work_package
  BEFORE INSERT OR UPDATE OF project_id, default_work_package_id
  ON proc_packages
  FOR EACH ROW
  EXECUTE FUNCTION proc_packages_validate_default_work_package();

COMMIT;
