-- 0056_proc_package_work_package_1toN.sql
-- Tyopaketin ja hankintapaketin linkitys 1:N (MVP).
--
-- Mita muuttui:
-- - Poistettu 1:1-uniikkius `proc_packages.default_work_package_id`-kentasta (1:N sallitaan).
-- - Vaihdettu FK-kaytos: `default_work_package_id` -> `ON DELETE RESTRICT`.
-- Miksi:
-- - MVP-paatos: yhdella tyopaketilla voi olla useita hankintapaketteja (1:N).
-- - `NOT NULL` + `RESTRICT` tekee poiston kayttaytymisesta deterministisen.
-- Miten testataan (manuaali):
-- - Luo kaksi hankintapakettia samalle tyopaketti-ID:lle -> sallittu.
-- - Yrita poistaa tyopaketti, johon hankintapaketti viittaa -> poisto estyy (RESTRICT).

BEGIN;

DROP INDEX IF EXISTS ux_proc_packages_default_work_package_1to1;

ALTER TABLE proc_packages
  DROP CONSTRAINT IF EXISTS proc_packages_default_work_package_id_fkey;

ALTER TABLE proc_packages
  ADD CONSTRAINT proc_packages_default_work_package_id_fkey
  FOREIGN KEY (default_work_package_id)
  REFERENCES work_packages(id)
  ON DELETE RESTRICT;

COMMIT;
