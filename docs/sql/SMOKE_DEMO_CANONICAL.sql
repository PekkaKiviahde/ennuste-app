-- docs/sql/SMOKE_DEMO_CANONICAL.sql
-- Kanoninen demo smoke (read-only): todentaa, että demo-seed kattaa vähintään ydindatan.
--
-- Read-only: ei INSERT/UPDATE/DELETE (vain SELECT + DO/RAISE EXCEPTION).
--
-- Ajo:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/sql/SMOKE_DEMO_CANONICAL.sql

DO $$
DECLARE
  v_project_id uuid;
  v_project_name text;

  v_count int;

  v_work_package_baseline_id uuid;
  v_actuals_batch_id uuid;

  v_has_wp_mapped_view boolean;
  v_has_proc_mapped_view boolean;
BEGIN
  -- A) Demo-projekti löytyy.
  -- Miksi tämä tarvitaan: kaikki demo-assertit nojaavat siihen, että canonical demo on seedattu (projects.is_demo=true).
  SELECT project_id, name
  INTO v_project_id, v_project_name
  FROM projects
  WHERE is_demo IS TRUE
  ORDER BY project_id DESC
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'No demo project found (projects.is_demo IS TRUE). Run: npm run db:seed-demo';
  END IF;

  -- B) Litterat (Talo80): vähintään 2 kpl 4-numeroisia.
  -- Miksi tämä tarvitaan: raportointi/koonnit ja validointi olettavat Talo80-litterat 4-numeroisina merkkijonoina (leading zero säilyy).
  SELECT COUNT(*)::int
  INTO v_count
  FROM litteras
  WHERE project_id = v_project_id
    AND code ~ '^[0-9]{4}$';

  IF v_count < 2 THEN
    RAISE EXCEPTION 'Talo80-litterat puuttuvat: odotettiin >=2 (litteras.code ~ ^[0-9]{4}$), saatiin % (project_id=%). Run: npm run db:seed-demo', v_count, v_project_id;
  END IF;

  -- C) Työpaketti: vähintään 1.
  -- Miksi tämä tarvitaan: demo-UI ja raportointi tarvitsee tuotannon työpakettirakenteen.
  SELECT COUNT(*)::int
  INTO v_count
  FROM work_packages
  WHERE project_id = v_project_id;

  IF v_count < 1 THEN
    RAISE EXCEPTION 'Työpaketti puuttuu: odotettiin >=1 work_packages-rivi (project_id=%). Run: npm run db:seed-demo', v_project_id;
  END IF;

  -- D) Hankintapaketti: vähintään 1.
  -- Miksi tämä tarvitaan: MVP:ssa työpaketti voidaan liittää yhteen hankintapakettiin; demo varmistaa hankintakerroksen.
  SELECT COUNT(*)::int
  INTO v_count
  FROM proc_packages
  WHERE project_id = v_project_id;

  IF v_count < 1 THEN
    RAISE EXCEPTION 'Hankintapaketti puuttuu: odotettiin >=1 proc_packages-rivi (project_id=%). Run: npm run db:seed-demo', v_project_id;
  END IF;

  -- E) Baseline-snapshot (työpaketti): v_work_package_latest_baseline + baseline_lines.
  -- Miksi tämä tarvitaan: baseline (lukitus/snapshot) on raportoinnin perusta (BAC) ja append-only audit trail.
  IF to_regclass('public.v_work_package_latest_baseline') IS NULL THEN
    RAISE EXCEPTION 'Näkymä puuttuu: v_work_package_latest_baseline. Aja migraatiot (0047_package_baselines.sql).';
  END IF;

  SELECT work_package_baseline_id
  INTO v_work_package_baseline_id
  FROM v_work_package_latest_baseline
  WHERE project_id = v_project_id
  ORDER BY locked_at DESC, work_package_baseline_id DESC
  LIMIT 1;

  IF v_work_package_baseline_id IS NULL THEN
    RAISE EXCEPTION 'Baseline-snapshot puuttuu: v_work_package_latest_baseline ei palauta rivejä (project_id=%). Run: npm run db:seed-demo', v_project_id;
  END IF;

  SELECT COUNT(*)::int
  INTO v_count
  FROM work_package_baseline_lines
  WHERE work_package_baseline_id = v_work_package_baseline_id;

  IF v_count < 1 THEN
    RAISE EXCEPTION 'Baseline-linjat puuttuvat: work_package_baseline_lines tyhjä (work_package_baseline_id=%). Run: npm run db:seed-demo', v_work_package_baseline_id;
  END IF;

  -- F) MT/LT (APPROVED) raporttinäkymässä: vähintään 1 MT ja 1 LT.
  -- Miksi tämä tarvitaan: muutoshallinnan MT/LT pitää näkyä hyväksyttyinä raporteissa.
  IF to_regclass('public.v_report_project_mt_lt_approved') IS NULL THEN
    RAISE EXCEPTION 'Näkymä puuttuu: v_report_project_mt_lt_approved. Aja migraatiot (0048_change_requests_mt_lt.sql).';
  END IF;

  SELECT COUNT(*)::int
  INTO v_count
  FROM v_report_project_mt_lt_approved
  WHERE project_id = v_project_id
    AND change_type = 'MT';

  IF v_count < 1 THEN
    RAISE EXCEPTION 'MT (APPROVED) puuttuu: v_report_project_mt_lt_approved(change_type=MT) 0 riviä (project_id=%). Run: npm run db:seed-demo', v_project_id;
  END IF;

  SELECT COUNT(*)::int
  INTO v_count
  FROM v_report_project_mt_lt_approved
  WHERE project_id = v_project_id
    AND change_type = 'LT';

  IF v_count < 1 THEN
    RAISE EXCEPTION 'LT (APPROVED) puuttuu: v_report_project_mt_lt_approved(change_type=LT) 0 riviä (project_id=%). Run: npm run db:seed-demo', v_project_id;
  END IF;

  -- G) ACTUALS latest batch + vähintään 1 4-num littera actuals_lines:ssä.
  -- Miksi tämä tarvitaan: toteumat (ACTUALS) ovat ennusteen ja raportoinnin syöte; demo varmistaa vähintään yhden toteumarivin.
  SELECT id
  INTO v_actuals_batch_id
  FROM import_batches
  WHERE project_id = v_project_id
    AND kind = 'ACTUALS'
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  IF v_actuals_batch_id IS NULL THEN
    RAISE EXCEPTION 'No ACTUALS import found (import_batches.kind=ACTUALS). Run: npm run db:seed-demo (tai lisää ACTUALS seuraavassa vaiheessa). project_id=%', v_project_id;
  END IF;

  SELECT COUNT(*)::int
  INTO v_count
  FROM actuals_lines
  WHERE import_batch_id = v_actuals_batch_id
    AND (dimensions_json->>'littera_code') ~ '^[0-9]{4}$';

  IF v_count < 1 THEN
    RAISE EXCEPTION 'ACTUALS lines puuttuu latest batchille: odotettiin >=1 (dimensions_json.littera_code ~ ^[0-9]{4}$). import_batch_id=%', v_actuals_batch_id;
  END IF;

  -- H) UNMAPPED (latest): vähintään 1 rivi raporttinäkymässä.
  -- Miksi tämä tarvitaan: demo todentaa, että järjestelmä tunnistaa ainakin yhden mäppäämättömän toteumarivin (työnjohdon työjonoon).
  IF to_regclass('public.v_report_unmapped_actuals_latest') IS NULL THEN
    RAISE EXCEPTION 'Näkymä puuttuu: v_report_unmapped_actuals_latest.';
  END IF;

  SELECT COUNT(*)::int
  INTO v_count
  FROM v_report_unmapped_actuals_latest
  WHERE project_id = v_project_id;

  IF v_count < 1 THEN
    RAISE EXCEPTION 'UNMAPPED tyhjä: v_report_unmapped_actuals_latest 0 riviä (project_id=%). Run: npm run db:seed-demo', v_project_id;
  END IF;

  -- I) MAPPED (latest): vähintään 1 rivi työpaketti- tai hankintapaketti-koonnissa.
  -- Miksi tämä tarvitaan: demo todentaa, että vähintään osa toteumista on mäpätty työpakettiin/hankintapakettiin ja näkyy koonnissa.
  v_has_wp_mapped_view := to_regclass('public.v_report_work_package_actuals_latest') IS NOT NULL;
  v_has_proc_mapped_view := to_regclass('public.v_report_proc_package_actuals_latest') IS NOT NULL;

  IF NOT v_has_wp_mapped_view AND NOT v_has_proc_mapped_view THEN
    RAISE EXCEPTION 'MAPPED-näkymät puuttuvat: v_report_work_package_actuals_latest / v_report_proc_package_actuals_latest.';
  END IF;

  v_count := 0;
  IF v_has_wp_mapped_view THEN
    EXECUTE 'SELECT COUNT(*)::int FROM v_report_work_package_actuals_latest WHERE project_id = $1'
    INTO v_count
    USING v_project_id;
  END IF;

  IF v_count < 1 AND v_has_proc_mapped_view THEN
    EXECUTE 'SELECT COUNT(*)::int FROM v_report_proc_package_actuals_latest WHERE project_id = $1'
    INTO v_count
    USING v_project_id;
  END IF;

  IF v_count < 1 THEN
    RAISE EXCEPTION 'MAPPED koonti tyhjä: odotettiin >=1 rivi mapped-näkymistä (project_id=%). Run: npm run db:seed-demo', v_project_id;
  END IF;
END $$;

-- Sanity SELECTit (tulostuu vain jos kaikki assertit menivät läpi)

-- Demo project_id + name
SELECT project_id, name
FROM projects
WHERE is_demo IS TRUE
ORDER BY project_id DESC
LIMIT 1;

-- 5 ensimmäistä litteraa
WITH demo AS (
  SELECT project_id
  FROM projects
  WHERE is_demo IS TRUE
  ORDER BY project_id DESC
  LIMIT 1
)
SELECT code AS littera_code
FROM litteras
WHERE project_id = (SELECT project_id FROM demo)
  AND code ~ '^[0-9]{4}$'
ORDER BY code
LIMIT 5;

-- v_report_project_mt_lt_approved (demo-projektille)
WITH demo AS (
  SELECT project_id
  FROM projects
  WHERE is_demo IS TRUE
  ORDER BY project_id DESC
  LIMIT 1
)
SELECT *
FROM v_report_project_mt_lt_approved
WHERE project_id = (SELECT project_id FROM demo)
ORDER BY change_type;

-- v_report_unmapped_actuals_latest (demo-projektille, limit 20)
WITH demo AS (
  SELECT project_id
  FROM projects
  WHERE is_demo IS TRUE
  ORDER BY project_id DESC
  LIMIT 1
)
SELECT *
FROM v_report_unmapped_actuals_latest
WHERE project_id = (SELECT project_id FROM demo)
LIMIT 20;

-- v_report_work_package_actuals_latest ja v_report_proc_package_actuals_latest (jos olemassa)
SELECT project_id AS demo_project_id
FROM projects
WHERE is_demo IS TRUE
ORDER BY project_id DESC
LIMIT 1
\gset

SELECT
  (to_regclass('public.v_report_work_package_actuals_latest') IS NOT NULL)::int AS has_wp_mapped_view,
  (to_regclass('public.v_report_proc_package_actuals_latest') IS NOT NULL)::int AS has_proc_mapped_view
\gset

\if :has_wp_mapped_view = 1
SELECT *
FROM v_report_work_package_actuals_latest
WHERE project_id = :'demo_project_id'::uuid
LIMIT 20;
\endif

\if :has_proc_mapped_view = 1
SELECT *
FROM v_report_proc_package_actuals_latest
WHERE project_id = :'demo_project_id'::uuid
LIMIT 20;
\endif
