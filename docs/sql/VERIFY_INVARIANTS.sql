-- VERIFY_INVARIANTS.sql
-- Tarkistukset ydininvarianteille (append-only, plan-before-forecast, tenant-raja).
--
-- Mitä muuttui:
-- - Append-only tarkistus rajattu baseline-tauluihin ja triggerihaun konventio täsmennetty.
-- Miksi:
-- - Vältetään vanhoihin tauluihin viittaaminen ja varmistetaan baselinen mukainen audit trail.
-- Miten testataan (manuaali):
-- - psql -v ON_ERROR_STOP=1 -f docs/sql/VERIFY_INVARIANTS.sql

BEGIN;

-- 1) Append-only triggerit olemassa keskeisissä tauluissa
DO $$
DECLARE
  v_table text;
  v_missing text[] := ARRAY[]::text[];
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'item_row_mappings',
    'forecast_events',
    'forecast_event_rows',
    'actuals_row_overrides',
    'import_batches'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      WHERE c.relname = v_table
        AND NOT t.tgisinternal
        AND t.tgname = v_table || '_append_only'
    ) THEN
      v_missing := array_append(v_missing, v_table);
    END IF;
  END LOOP;

  IF array_length(v_missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Append-only trigger puuttuu tauluista: %', array_to_string(v_missing, ', ');
  END IF;
END $$;

-- 2) Tenant-raja: projects.organization_id olemassa + NOT NULL + FK
DO $$
DECLARE
  v_missing integer;
BEGIN
  SELECT COUNT(*) INTO v_missing
  FROM information_schema.columns
  WHERE table_name = 'projects'
    AND column_name = 'organization_id'
    AND is_nullable = 'NO';

  IF v_missing = 0 THEN
    RAISE EXCEPTION 'projects.organization_id puuttuu tai sallii NULL-arvon (tenant-raja rikki)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'projects_organization_id_fkey'
  ) THEN
    RAISE EXCEPTION 'projects.organization_id FK puuttuu (tenant-raja rikki)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM projects
    WHERE organization_id IS NULL
  ) THEN
    RAISE EXCEPTION 'projects.organization_id sisältää NULL-arvoja (tenant-raja rikki)';
  END IF;
END $$;

-- 3) Plan-before-forecast: forecast ilman suunnitelmaa pitää estyä
DO $$
DECLARE
  v_org_id uuid;
  v_project_id uuid;
  v_littera_id uuid;
BEGIN
  INSERT INTO organizations (slug, name, created_by)
  VALUES (
    'verify-org-' || substring(gen_random_uuid()::text, 1, 8),
    'Verify org',
    'verify'
  )
  RETURNING organization_id INTO v_org_id;

  INSERT INTO projects (organization_id, name)
  VALUES (v_org_id, 'Verify project')
  RETURNING project_id INTO v_project_id;

  INSERT INTO litteras (project_id, code)
  VALUES (v_project_id, 'V1000')
  RETURNING littera_id INTO v_littera_id;

  BEGIN
    INSERT INTO forecast_events (
      project_id,
      target_littera_id,
      created_by,
      source
    ) VALUES (
      v_project_id,
      v_littera_id,
      'verify',
      'UI'
    );

    RAISE EXCEPTION 'Plan-before-forecast gate ei estänyt insertiä';
  EXCEPTION
    WHEN others THEN
      IF SQLERRM NOT LIKE 'Cannot create forecast:%' THEN
        RAISE EXCEPTION 'Odotettu gate-virhe puuttui. Syy: %', SQLERRM;
      END IF;
  END;
END $$;

ROLLBACK;
