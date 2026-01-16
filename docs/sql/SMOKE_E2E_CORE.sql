-- SMOKE_E2E_CORE.sql
-- End-to-end DB-smoke (ydinsäännöt), ajetaan transaktion sisällä ja rollbackataan.
--
-- Tämän smoketestin "totuus" = `migrations/*.sql`.
-- Tavoite: mahdollisimman pieni mutta validi testi, joka ajaa läpi CI:ssä.
--
-- Mitä muuttui (tarkoituksella yksinkertaistettu):
-- - Poistettu vanha domain-smoke, joka viittasi poistettuihin tauluihin/sarakkeisiin:
--   - projects.customer, users/roles/project_role_assignments, work_phases/*, planning_events,
--     mapping_versions/mapping_lines, jne.
-- - Korvattu vanha mapping-rakenne nykyisellä:
--   - mapping_versions/mapping_lines -> item_mapping_versions/item_row_mappings (+ v_current_item_mappings)
-- - Korvattu "work phase" -polut nykyisillä työpaketeilla:
--   - work_phases -> work_packages (+ proc_packages)
--
-- Miksi:
-- - CI DB smoke kaatui skeemamismatchiin; smoke on testi, joten vanha domain-logiikka poistetaan.
--
-- Miten testataan (manuaali / CI-pariteetti):
-- - Aja migraatiot + verify + smoke:
--   for f in $(ls migrations/*.sql | sort); do psql -v ON_ERROR_STOP=1 -f "$f"; done
--   psql -v ON_ERROR_STOP=1 -f docs/sql/VERIFY_INVARIANTS.sql
--   psql -v ON_ERROR_STOP=1 -f docs/sql/SMOKE_E2E_CORE.sql

BEGIN;

CREATE TEMP TABLE smoke_ids (
  tenant_id uuid,
  organization_id uuid,
  project_id uuid,
  import_batch_id uuid,
  littera_id uuid,
  target_estimate_item_id uuid,
  work_package_id uuid,
  proc_package_id uuid,
  item_mapping_version_id uuid,
  item_row_mapping_id uuid,
  forecast_event_id uuid
) ON COMMIT DROP;

DO $$
DECLARE
  v_tenant_id uuid;
  v_org_id uuid;
  v_project_id uuid;
  v_import_batch_id uuid;
  v_littera_id uuid;
  v_target_estimate_item_id uuid;
  v_work_package_id uuid;
  v_proc_package_id uuid;
  v_item_mapping_version_id uuid;
  v_item_row_mapping_id uuid;
  v_forecast_event_id uuid;
  v_current_mapping_count integer;
  v_stored_littera_code text;
BEGIN
  -- Tenant (multi-tenant): luodaan oma tenant, jotta projects.tenant_id on aina asetettu.
  INSERT INTO tenants (name, created_by)
  VALUES (
    'smoke-tenant-' || substring(gen_random_uuid()::text, 1, 8),
    'smoke'
  )
  RETURNING tenant_id INTO v_tenant_id;

  -- Tenant-raja: org + project
  INSERT INTO organizations (slug, name, created_by)
  VALUES (
    'smoke-org-' || substring(gen_random_uuid()::text, 1, 8),
    'Smoke org',
    'smoke'
  )
  RETURNING organization_id INTO v_org_id;

  INSERT INTO projects (tenant_id, organization_id, name, customer, project_state)
  VALUES (v_tenant_id, v_org_id, 'Smoke project', 'Smoke', 'P1_PROJECT_ACTIVE')
  RETURNING project_id INTO v_project_id;

  -- Littera (Talo 80): 4-num merkkijono + leading zeros säilyy.
  INSERT INTO litteras (project_id, code, title, created_by)
  VALUES (v_project_id, '0310', 'Smoke littera 0310', 'smoke')
  RETURNING littera_id INTO v_littera_id;

  -- Tavoitearvio (import_batch + item-rivi)
  INSERT INTO import_batches (project_id, kind, source_system, file_name, file_hash, created_by)
  VALUES (v_project_id, 'TARGET_ESTIMATE', 'smoke', 'smoke.csv', 'smoke', 'smoke')
  RETURNING id INTO v_import_batch_id;

  INSERT INTO target_estimate_items (
    import_batch_id,
    item_code,
    littera_code,
    description,
    qty,
    unit,
    sum_eur,
    row_type,
    cost_breakdown_json
  ) VALUES (
    v_import_batch_id,
    'SMOKE-ITEM-1',
    '0310',
    'Smoke item 0310',
    1,
    'kpl',
    100,
    'ITEM',
    '{}'::jsonb
  )
  RETURNING id INTO v_target_estimate_item_id;

  SELECT littera_code
  INTO v_stored_littera_code
  FROM target_estimate_items
  WHERE id = v_target_estimate_item_id;

  IF v_stored_littera_code IS DISTINCT FROM '0310' THEN
    RAISE EXCEPTION 'Leading zeros rikkoutuivat: odotettu 0310, saatiin %', COALESCE(v_stored_littera_code, '(null)');
  END IF;

  -- Työpaketti + hankintapaketti (MVP: 1:1 oletus)
  INSERT INTO work_packages (project_id, code, name, status)
  VALUES (v_project_id, '2500', 'Smoke työpaketti 2500', 'ACTIVE')
  RETURNING id INTO v_work_package_id;

  INSERT INTO proc_packages (project_id, code, name, owner_type, vendor_name, contract_ref, default_work_package_id, status)
  VALUES (v_project_id, '9000', 'Smoke hankintapaketti 9000', 'CONTRACT', 'Smoke vendor', 'SMOKE-001', v_work_package_id, 'ACTIVE')
  RETURNING id INTO v_proc_package_id;

  -- Mäppäys: ACTIVE item_mapping_versions on "suunnittelu tehty" (plan-before-forecast gate käyttää tätä).
  INSERT INTO item_mapping_versions (project_id, import_batch_id, status, created_by, activated_at)
  VALUES (v_project_id, v_import_batch_id, 'ACTIVE', 'smoke', now())
  RETURNING id INTO v_item_mapping_version_id;

  INSERT INTO item_row_mappings (
    item_mapping_version_id,
    target_estimate_item_id,
    work_package_id,
    proc_package_id,
    created_by
  ) VALUES (
    v_item_mapping_version_id,
    v_target_estimate_item_id,
    v_work_package_id,
    v_proc_package_id,
    'smoke'
  )
  RETURNING id INTO v_item_row_mapping_id;

  -- v_current_item_mappings näyttää ACTIVE-version viimeisimmän mappingin per item
  SELECT count(*) INTO v_current_mapping_count
  FROM v_current_item_mappings
  WHERE target_estimate_item_id = v_target_estimate_item_id
    AND work_package_id = v_work_package_id;

  IF v_current_mapping_count <> 1 THEN
    RAISE EXCEPTION 'Odotettiin 1 current-mäppäys-riviä, saatiin %', v_current_mapping_count;
  END IF;

  -- Append-only: UPDATE/DELETE pitää estyä item_row_mappings-taulussa
  BEGIN
    UPDATE item_row_mappings
    SET work_package_id = v_work_package_id
    WHERE id = v_item_row_mapping_id;
    RAISE EXCEPTION 'Append-only rikkoutui: UPDATE item_row_mappings onnistui';
  EXCEPTION
    WHEN others THEN
      IF SQLERRM NOT ILIKE '%append-only%' THEN
        RAISE EXCEPTION 'Append-only: odotettu virhe, saatiin: %', SQLERRM;
      END IF;
  END;

  BEGIN
    DELETE FROM item_row_mappings WHERE id = v_item_row_mapping_id;
    RAISE EXCEPTION 'Append-only rikkoutui: DELETE item_row_mappings onnistui';
  EXCEPTION
    WHEN others THEN
      IF SQLERRM NOT ILIKE '%append-only%' THEN
        RAISE EXCEPTION 'Append-only: odotettu virhe, saatiin: %', SQLERRM;
      END IF;
  END;

  -- Ennuste (onnistuu vain jos ACTIVE item_mapping_versions löytyy projektille)
  INSERT INTO forecast_events (
    project_id,
    target_littera_id,
    forecast_date,
    created_by,
    note,
    source
  ) VALUES (
    v_project_id,
    v_littera_id,
    CURRENT_DATE,
    'smoke',
    'smoke forecast',
    'SMOKE'
  )
  RETURNING id INTO v_forecast_event_id;

  INSERT INTO forecast_event_rows (
    forecast_event_id,
    work_package_id,
    proc_package_id,
    forecast_eur,
    explanation
  ) VALUES (
    v_forecast_event_id,
    v_work_package_id,
    v_proc_package_id,
    100,
    'smoke'
  );

  INSERT INTO smoke_ids (
    tenant_id,
    organization_id,
    project_id,
    import_batch_id,
    littera_id,
    target_estimate_item_id,
    work_package_id,
    proc_package_id,
    item_mapping_version_id,
    item_row_mapping_id,
    forecast_event_id
  ) VALUES (
    v_tenant_id,
    v_org_id,
    v_project_id,
    v_import_batch_id,
    v_littera_id,
    v_target_estimate_item_id,
    v_work_package_id,
    v_proc_package_id,
    v_item_mapping_version_id,
    v_item_row_mapping_id,
    v_forecast_event_id
  );
END $$;

SELECT * FROM smoke_ids;

ROLLBACK;
