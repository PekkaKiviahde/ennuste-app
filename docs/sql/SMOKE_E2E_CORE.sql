-- SMOKE_E2E_CORE.sql
-- End-to-end DB-smoke (ydinsäännöt), ajetaan transaktion sisällä ja rollbackataan.
--
-- Mitä muuttui:
-- - Lisätty E2E-smoke, joka luo minimidatan ja validoi ydinsäännöt (policy A, plan-before-forecast, korjauspolku).
-- Miksi:
-- - Varmistetaan, että keskeiset invarianssit pysyvät kunnossa muutosten jälkeen.
-- Miten testataan (manuaali):
-- - psql -v ON_ERROR_STOP=1 -f docs/sql/SMOKE_E2E_CORE.sql

BEGIN;

CREATE TEMP TABLE smoke_ids (
  organization_id uuid,
  project_id uuid,
  work_phase_id uuid,
  baseline_id uuid,
  correction_id uuid,
  correction_baseline_id uuid
) ON COMMIT DROP;

DO $$
DECLARE
  v_org_id uuid;
  v_project_id uuid;
  v_target_littera_id uuid;
  v_work_littera_id uuid;
  v_correction_littera_id uuid;
  v_nobaseline_littera_id uuid;
  v_mapping_version_id uuid;
  v_target_batch_id uuid;
  v_jyda_batch_id uuid;
  v_work_phase_id uuid;
  v_work_phase_version_id uuid;
  v_work_phase_nobase_id uuid;
  v_work_phase_nobase_version_id uuid;
  v_baseline_id uuid;
  v_correction_id uuid;
  v_correction_baseline_id uuid;
  v_forecast_event_id uuid;
  v_ev numeric;
  v_ac_star numeric;
  v_cpi numeric;
  v_no_baseline_ac_star numeric;
  v_no_baseline_cpi numeric;
  v_baseline_count integer;
BEGIN
  -- Organisaatio + projekti (tenant-raja)
  INSERT INTO organizations (slug, name, created_by)
  VALUES (
    'smoke-org-' || substring(gen_random_uuid()::text, 1, 8),
    'Smoke org',
    'smoke'
  )
  RETURNING organization_id INTO v_org_id;

  INSERT INTO projects (organization_id, name, customer)
  VALUES (v_org_id, 'Smoke project', 'Smoke')
  RETURNING project_id INTO v_project_id;

  -- Litterat (tavoite + työ + korjaus + ilman baselinea)
  INSERT INTO litteras (project_id, code, title, group_code)
  VALUES (v_project_id, 'T1000', 'Smoke tavoite 1000', 1)
  RETURNING littera_id INTO v_target_littera_id;

  INSERT INTO litteras (project_id, code, title, group_code)
  VALUES (v_project_id, 'W1000', 'Smoke työ 1000', 1)
  RETURNING littera_id INTO v_work_littera_id;

  INSERT INTO litteras (project_id, code, title, group_code)
  VALUES (v_project_id, 'T2000', 'Smoke tavoite 2000', 2)
  RETURNING littera_id INTO v_correction_littera_id;

  INSERT INTO litteras (project_id, code, title, group_code)
  VALUES (v_project_id, 'T3000', 'Smoke tavoite 3000', 3)
  RETURNING littera_id INTO v_nobaseline_littera_id;

  -- Mapping-versio (DRAFT -> ACTIVE) + mapping-rivi (FULL)
  INSERT INTO mapping_versions (
    project_id,
    valid_from,
    valid_to,
    status,
    reason,
    created_by
  ) VALUES (
    v_project_id,
    current_date - 30,
    NULL,
    'DRAFT',
    'smoke',
    'smoke'
  )
  RETURNING mapping_version_id INTO v_mapping_version_id;

  INSERT INTO mapping_lines (
    project_id,
    mapping_version_id,
    work_littera_id,
    target_littera_id,
    allocation_rule,
    allocation_value,
    cost_type,
    note,
    created_by
  ) VALUES (
    v_project_id,
    v_mapping_version_id,
    v_work_littera_id,
    v_target_littera_id,
    'FULL',
    1.0,
    'LABOR',
    'smoke',
    'smoke'
  );

  UPDATE mapping_versions
  SET status = 'ACTIVE', approved_at = now(), approved_by = 'smoke'
  WHERE mapping_version_id = v_mapping_version_id;

  -- Suunnittelutapahtuma (READY_FOR_FORECAST)
  INSERT INTO planning_events (
    project_id,
    target_littera_id,
    created_by,
    status,
    summary
  ) VALUES (
    v_project_id,
    v_target_littera_id,
    'smoke',
    'READY_FOR_FORECAST',
    'Smoke suunnitelma'
  );

  -- Import batchit (TARGET_ESTIMATE + JYDA)
  INSERT INTO import_batches (project_id, source_system, imported_by, notes)
  VALUES (v_project_id, 'TARGET_ESTIMATE', 'smoke', 'smoke target')
  RETURNING import_batch_id INTO v_target_batch_id;

  INSERT INTO import_batches (project_id, source_system, imported_by, notes)
  VALUES (v_project_id, 'JYDA', 'smoke', 'smoke jyda')
  RETURNING import_batch_id INTO v_jyda_batch_id;

  -- Budget lines (tavoite + korjauslittera)
  INSERT INTO budget_lines (
    project_id,
    target_littera_id,
    cost_type,
    amount,
    source,
    import_batch_id,
    created_by
  ) VALUES
    (v_project_id, v_target_littera_id, 'LABOR', 1000, 'IMPORT', v_target_batch_id, 'smoke'),
    (v_project_id, v_correction_littera_id, 'LABOR', 200, 'IMPORT', v_target_batch_id, 'smoke');

  -- Budget items (korjauspolku tarvitsee item_code -> littera)
  INSERT INTO budget_items (
    project_id,
    import_batch_id,
    littera_id,
    item_code,
    item_desc,
    row_no,
    total_eur,
    created_by
  ) VALUES (
    v_project_id,
    v_target_batch_id,
    v_correction_littera_id,
    'ITEM-2000',
    'Smoke item 2000',
    1,
    200,
    'smoke'
  );

  -- Actual cost (JYDA snapshot)
  INSERT INTO actual_cost_lines (
    project_id,
    work_littera_id,
    cost_type,
    amount,
    occurred_on,
    source,
    import_batch_id,
    external_ref
  ) VALUES (
    v_project_id,
    v_work_littera_id,
    'LABOR',
    400,
    current_date - 7,
    'JYDA',
    v_jyda_batch_id,
    'JYDA.ACTUAL_COST'
  );

  -- Forecast event + line (onnistuu koska plan on READY_FOR_FORECAST)
  INSERT INTO forecast_events (
    project_id,
    target_littera_id,
    mapping_version_id,
    created_by,
    source,
    comment
  ) VALUES (
    v_project_id,
    v_target_littera_id,
    v_mapping_version_id,
    'smoke',
    'UI',
    'Smoke ennuste'
  )
  RETURNING forecast_event_id INTO v_forecast_event_id;

  INSERT INTO forecast_event_lines (forecast_event_id, cost_type, forecast_value)
  VALUES (v_forecast_event_id, 'LABOR', 1200);

  -- Work phases (baseline + ilman baselinea)
  INSERT INTO work_phases (
    project_id,
    name,
    description,
    owner,
    lead_littera_id,
    status,
    created_by
  ) VALUES (
    v_project_id,
    'Smoke vaihe A',
    'Baseline vaihe',
    'smoke',
    v_target_littera_id,
    'ACTIVE',
    'smoke'
  )
  RETURNING work_phase_id INTO v_work_phase_id;

  INSERT INTO work_phases (
    project_id,
    name,
    description,
    owner,
    lead_littera_id,
    status,
    created_by
  ) VALUES (
    v_project_id,
    'Smoke vaihe B',
    'Ei baselinea',
    'smoke',
    v_nobaseline_littera_id,
    'ACTIVE',
    'smoke'
  )
  RETURNING work_phase_id INTO v_work_phase_nobase_id;

  INSERT INTO work_phase_versions (
    project_id,
    work_phase_id,
    version_no,
    status,
    notes,
    created_by
  ) VALUES (
    v_project_id,
    v_work_phase_id,
    1,
    'ACTIVE',
    'smoke',
    'smoke'
  )
  RETURNING work_phase_version_id INTO v_work_phase_version_id;

  INSERT INTO work_phase_versions (
    project_id,
    work_phase_id,
    version_no,
    status,
    notes,
    created_by
  ) VALUES (
    v_project_id,
    v_work_phase_nobase_id,
    1,
    'ACTIVE',
    'smoke',
    'smoke'
  )
  RETURNING work_phase_version_id INTO v_work_phase_nobase_version_id;

  INSERT INTO work_phase_members (
    project_id,
    work_phase_version_id,
    member_type,
    littera_id,
    note,
    created_by
  ) VALUES
    (v_project_id, v_work_phase_version_id, 'LITTERA', v_target_littera_id, 'smoke', 'smoke'),
    (v_project_id, v_work_phase_nobase_version_id, 'LITTERA', v_nobaseline_littera_id, 'smoke', 'smoke');

  -- RBAC: käyttäjä + roolit (secure wrapperit)
  INSERT INTO users (username, display_name, email, created_by)
  VALUES ('smoke_user', 'Smoke user', NULL, 'smoke')
  ON CONFLICT (username) DO NOTHING;

  INSERT INTO project_role_assignments (project_id, user_id, role_code, granted_by)
  SELECT v_project_id, u.user_id, r.role_code, 'smoke'
  FROM users u
  JOIN roles r ON r.role_code IN ('SITE_FOREMAN', 'PROJECT_MANAGER', 'PRODUCTION_MANAGER')
  WHERE u.username = 'smoke_user'
    AND NOT EXISTS (
      SELECT 1
      FROM project_role_assignments pra
      WHERE pra.project_id = v_project_id
        AND pra.user_id = u.user_id
        AND pra.role_code = r.role_code
        AND pra.revoked_at IS NULL
    );

  -- Lukitse baseline secure-wrapperilla
  SELECT work_phase_lock_baseline_secure(
    v_work_phase_id,
    v_work_phase_version_id,
    v_target_batch_id,
    'smoke_user',
    'smoke baseline'
  ) INTO v_baseline_id;

  -- Viikkopäivitys + ghost
  INSERT INTO work_phase_weekly_updates (
    project_id,
    work_phase_id,
    week_ending,
    percent_complete,
    progress_notes,
    created_by
  ) VALUES
    (v_project_id, v_work_phase_id, current_date - 7, 50, 'smoke', 'smoke'),
    (v_project_id, v_work_phase_nobase_id, current_date - 7, 20, 'smoke', 'smoke');

  INSERT INTO ghost_cost_entries (
    project_id,
    work_phase_id,
    week_ending,
    cost_type,
    amount,
    description,
    created_by
  ) VALUES (
    v_project_id,
    v_work_phase_id,
    current_date - 7,
    'LABOR',
    50,
    'smoke ghost',
    'smoke'
  );

  -- Korjauspolku: propose -> PM -> FINAL (secure)
  SELECT work_phase_propose_add_littera_from_item_secure(
    v_work_phase_id,
    'ITEM-2000',
    'smoke_user',
    'smoke correction'
  ) INTO v_correction_id;

  PERFORM work_phase_approve_correction_pm_secure(v_correction_id, 'smoke_user', 'ok');

  SELECT work_phase_approve_correction_final_secure(
    v_correction_id,
    'smoke_user',
    'ok'
  ) INTO v_correction_baseline_id;

  -- Assert: uusi baseline luotu korjauksessa
  SELECT COUNT(*) INTO v_baseline_count
  FROM work_phase_baselines
  WHERE work_phase_id = v_work_phase_id;

  IF v_baseline_count < 2 THEN
    RAISE EXCEPTION 'Korjaus ei luonut uutta baselinea (count=%)', v_baseline_count;
  END IF;

  IF v_correction_baseline_id IS NULL OR v_correction_baseline_id = v_baseline_id THEN
    RAISE EXCEPTION 'Korjaus-baseline puuttuu tai on sama kuin alkuperäinen';
  END IF;

  -- Policy A: KPI näkyy vain baselinella
  SELECT ev_value, ac_star_total, cpi
  INTO v_ev, v_ac_star, v_cpi
  FROM v_work_phase_summary_v16_all
  WHERE work_phase_id = v_work_phase_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Baseline work phase row missing from v_work_phase_summary_v16_all';
  END IF;

  IF v_ev IS NULL OR v_ac_star IS NULL OR v_cpi IS NULL THEN
    RAISE EXCEPTION 'Policy A rikottu: EV/AC*/CPI puuttuu lukitulta baselinelta';
  END IF;

  SELECT ac_star_total, cpi
  INTO v_no_baseline_ac_star, v_no_baseline_cpi
  FROM v_work_phase_summary_v16_all
  WHERE work_phase_id = v_work_phase_nobase_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No-baseline work phase row missing from v_work_phase_summary_v16_all';
  END IF;

  IF v_no_baseline_ac_star IS NOT NULL OR v_no_baseline_cpi IS NOT NULL THEN
    RAISE EXCEPTION 'Policy A rikottu: KPI-kentät eivät saa täyttyä ilman baselinea';
  END IF;

  INSERT INTO smoke_ids (
    organization_id,
    project_id,
    work_phase_id,
    baseline_id,
    correction_id,
    correction_baseline_id
  ) VALUES (
    v_org_id,
    v_project_id,
    v_work_phase_id,
    v_baseline_id,
    v_correction_id,
    v_correction_baseline_id
  );
END $$;

-- Näkyvyys: tulosta avain-ID:t
SELECT
  organization_id,
  project_id,
  work_phase_id,
  baseline_id,
  correction_id,
  correction_baseline_id
FROM smoke_ids;

ROLLBACK;
