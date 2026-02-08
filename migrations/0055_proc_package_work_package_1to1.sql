-- 0055_proc_package_work_package_1to1.sql
-- Työpaketti-hankintapaketti linkitys 1:1 (MVP).
--
-- Mitä muuttui:
-- - `proc_packages.default_work_package_id` muutetaan pakolliseksi (NOT NULL).
-- - Lisätään uniikkius `default_work_package_id`-kentälle (1:1 työpaketti -> hankintapaketti).
-- - Lisätään triggerivalidointi, joka varmistaa että hankintapaketti ja linkitetty työpaketti
--   kuuluvat samaan projektiin.
-- Miksi:
-- - MVP-päätös: yhdellä työpaketilla voi olla enintään yksi hankintapaketti.
-- - Estetään orvot hankintapaketit ja ristiriitaiset ristiin-projekti-linkit.
-- Miten testataan (manuaali):
-- - Yritä lisätä proc_package ilman default_work_package_id -> virhe.
-- - Yritä lisätä proc_package, jonka default_work_package_id on toisesta projektista -> virhe.
-- - Yritä lisätä toinen proc_package samalle default_work_package_id:lle -> virhe.

BEGIN;

DO $$
DECLARE
  v_missing_count integer;
  v_mismatch_count integer;
  v_duplicate_count integer;
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

  SELECT COUNT(*) INTO v_duplicate_count
  FROM (
    SELECT default_work_package_id
    FROM proc_packages
    GROUP BY default_work_package_id
    HAVING COUNT(*) > 1
  ) duplicates;

  IF v_duplicate_count > 0 THEN
    RAISE EXCEPTION
      'Migraatio 0055 estetty: samaan työpakettiin on linkitetty useita hankintapaketteja (% työpakettia).',
      v_duplicate_count;
  END IF;
END
$$;

ALTER TABLE proc_packages
  ALTER COLUMN default_work_package_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_proc_packages_default_work_package_1to1
  ON proc_packages(default_work_package_id);

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
