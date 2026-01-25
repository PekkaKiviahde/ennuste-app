-- docs/sql/SMOKE_DEMO_ONBOARDING_DATA.sql
-- Tarkistaa, että onboarding luo täytetyn demoprojektin (demo_exports/v1).
-- Ajo: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/sql/SMOKE_DEMO_ONBOARDING_DATA.sql

DO $$
DECLARE
  v_project_id uuid;
  v_seed_key text;
  v_count int;
  v_mapping_version_id uuid;
BEGIN
  SELECT project_id, project_details->>'demo_seed_key'
  INTO v_project_id, v_seed_key
  FROM projects
  WHERE is_demo IS TRUE
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Demo-projektia ei löytynyt (projects.is_demo=true).';
  END IF;

  IF v_seed_key IS DISTINCT FROM 'demo_exports/v1' THEN
    RAISE EXCEPTION 'Demo-projektin demo_seed_key ei ole demo_exports/v1 (project_id=%).', v_project_id;
  END IF;

  SELECT COUNT(*)::int
  INTO v_count
  FROM import_batches
  WHERE project_id = v_project_id
    AND kind = 'TARGET_ESTIMATE';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'TARGET_ESTIMATE import puuttuu (project_id=%).', v_project_id;
  END IF;

  SELECT COUNT(*)::int
  INTO v_count
  FROM target_estimate_items
  WHERE import_batch_id IN (
    SELECT id FROM import_batches WHERE project_id = v_project_id AND kind = 'TARGET_ESTIMATE'
  );
  IF v_count < 1 THEN
    RAISE EXCEPTION 'target_estimate_items puuttuu demosta (project_id=%).', v_project_id;
  END IF;

  SELECT COUNT(*)::int
  INTO v_count
  FROM budget_lines
  WHERE project_id = v_project_id;
  IF v_count < 10 THEN
    RAISE EXCEPTION 'Budget-rivejä liian vähän: % (odotettiin >=10).', v_count;
  END IF;

  SELECT mapping_version_id
  INTO v_mapping_version_id
  FROM mapping_versions
  WHERE project_id = v_project_id
    AND status = 'ACTIVE'
  ORDER BY created_at DESC
  LIMIT 1;
  IF v_mapping_version_id IS NULL THEN
    RAISE EXCEPTION 'ACTIVE mapping_version puuttuu (project_id=%).', v_project_id;
  END IF;

  SELECT COUNT(*)::int
  INTO v_count
  FROM mapping_lines
  WHERE mapping_version_id = v_mapping_version_id;
  IF v_count < 5 THEN
    RAISE EXCEPTION 'mapping_lines rivejä liian vähän: % (odotettiin >=5).', v_count;
  END IF;

  SELECT COUNT(*)::int
  INTO v_count
  FROM import_batches
  WHERE project_id = v_project_id
    AND kind = 'ACTUALS';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'ACTUALS import puuttuu (project_id=%).', v_project_id;
  END IF;

  SELECT COUNT(*)::int
  INTO v_count
  FROM actuals_lines a
  JOIN import_batches b ON b.id = a.import_batch_id
  WHERE b.project_id = v_project_id;
  IF v_count < 1 THEN
    RAISE EXCEPTION 'ACTUALS-rivejä ei löytynyt demossa (project_id=%).', v_project_id;
  END IF;
END $$;

SELECT
  p.project_id,
  p.name,
  p.project_details,
  (SELECT COUNT(*) FROM budget_lines bl WHERE bl.project_id = p.project_id) AS budget_lines,
  (SELECT COUNT(*) FROM mapping_lines ml WHERE ml.project_id = p.project_id) AS mapping_lines,
  (SELECT COUNT(*) FROM actuals_lines al JOIN import_batches b ON b.id = al.import_batch_id WHERE b.project_id = p.project_id) AS actuals_lines
FROM projects p
WHERE p.is_demo IS TRUE
ORDER BY p.created_at DESC
LIMIT 1;
