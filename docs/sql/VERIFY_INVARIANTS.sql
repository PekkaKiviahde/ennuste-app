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

-- Report-all: kerää kaikki puutteet ja kaada kerran lopussa.
DO $$
DECLARE
  errors text[] := ARRAY[]::text[];

  v_table text;
  v_missing text[] := ARRAY[]::text[];

  v_org_id uuid;
  v_tenant_id uuid;
  v_project_id uuid;
  v_littera_id uuid;
BEGIN
  -- 1) Append-only triggerit olemassa keskeisissä tauluissa
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
    errors := array_append(
      errors,
      'APPEND_ONLY: Append-only trigger puuttuu tauluista: ' || array_to_string(v_missing, ', ')
    );
  END IF;

  -- 2) Tenant-raja: projects.organization_id olemassa + NOT NULL + FK
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'projects'
  ) THEN
    errors := array_append(errors, 'TENANT: relation "projects" does not exist');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'organizations'
  ) THEN
    errors := array_append(errors, 'TENANT: relation "organizations" does not exist');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tenants'
  ) THEN
    errors := array_append(errors, 'TENANT: relation "tenants" does not exist');
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'projects'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'projects'
        AND column_name = 'organization_id'
        AND is_nullable = 'NO'
    ) THEN
      errors := array_append(errors, 'TENANT: projects.organization_id puuttuu tai sallii NULL-arvon (tenant-raja rikki)');
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'projects_organization_id_fkey'
    ) THEN
      errors := array_append(errors, 'TENANT: projects.organization_id FK puuttuu (tenant-raja rikki)');
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'projects'
        AND column_name = 'tenant_id'
        AND is_nullable = 'NO'
    ) THEN
      errors := array_append(errors, 'TENANT: projects.tenant_id puuttuu tai sallii NULL-arvon (tenant-raja rikki)');
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'projects_tenant_id_fkey'
    ) THEN
      errors := array_append(errors, 'TENANT: projects.tenant_id FK puuttuu (tenant-raja rikki)');
    END IF;

    BEGIN
      IF EXISTS (
        SELECT 1
        FROM projects
        WHERE organization_id IS NULL
      ) THEN
        errors := array_append(errors, 'TENANT: projects.organization_id sisältää NULL-arvoja (tenant-raja rikki)');
      END IF;
      IF EXISTS (
        SELECT 1
        FROM projects
        WHERE tenant_id IS NULL
      ) THEN
        errors := array_append(errors, 'TENANT: projects.tenant_id sisältää NULL-arvoja (tenant-raja rikki)');
      END IF;
    EXCEPTION WHEN undefined_column THEN
      errors := array_append(errors, 'TENANT: projects.organization_id puuttuu (undefined_column): ' || SQLERRM);
    END;
  END IF;

  -- 3) Plan-before-forecast: forecast ilman suunnitelmaa pitää estyä
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tenants') OR
     NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='organizations') OR
     NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='projects') OR
     NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='litteras') OR
     NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='forecast_events')
  THEN
    errors := array_append(errors, 'PLAN_BEFORE_FORECAST: tarvittavat taulut puuttuvat (tenants/organizations/projects/litteras/forecast_events)');
  ELSE
    BEGIN
      INSERT INTO tenants (name, created_by)
      VALUES (
        'verify-tenant-' || substring(gen_random_uuid()::text, 1, 8),
        'verify'
      )
      RETURNING tenant_id INTO v_tenant_id;

      INSERT INTO organizations (slug, name, created_by)
      VALUES (
        'verify-org-' || substring(gen_random_uuid()::text, 1, 8),
        'Verify org',
        'verify'
      )
      RETURNING organization_id INTO v_org_id;

      INSERT INTO projects (tenant_id, organization_id, name, customer, project_state)
      VALUES (v_tenant_id, v_org_id, 'Verify project', 'Verify', 'P1_PROJECT_ACTIVE')
      RETURNING project_id INTO v_project_id;

      INSERT INTO litteras (project_id, code)
      VALUES (v_project_id, '1000')
      RETURNING littera_id INTO v_littera_id;

      BEGIN
        INSERT INTO forecast_events (
          project_id,
          target_littera_id,
          forecast_date,
          created_by,
          source
        ) VALUES (
          v_project_id,
          v_littera_id,
          CURRENT_DATE,
          'verify',
          'UI'
        );

        errors := array_append(errors, 'PLAN_BEFORE_FORECAST: Plan-before-forecast gate ei estänyt insertiä');
      EXCEPTION
        WHEN others THEN
          IF SQLERRM NOT LIKE 'Cannot create forecast:%' THEN
            errors := array_append(errors, 'PLAN_BEFORE_FORECAST: Odotettu gate-virhe puuttui. Syy: ' || SQLERRM);
          END IF;
      END;
    EXCEPTION WHEN others THEN
      errors := array_append(errors, 'PLAN_BEFORE_FORECAST: testidata epäonnistui. Syy: ' || SQLERRM);
    END;
  END IF;

  IF array_length(errors, 1) IS NOT NULL THEN
    RAISE EXCEPTION E'Verify invariants failed:\n- %', array_to_string(errors, E'\n- ');
  END IF;
END $$;

ROLLBACK;
