# Migration Logic Analysis

Paivitys: 2026-01-01

## Timeline per migration

- 0001_init.sql
  - Perustaulut: projects, litteras, mapping_versions, mapping_lines, planning_events, import_batches, budget_lines, actual_cost_lines, forecast_events + _lines, forecast_row_memos, forecast_calc_panel_snapshots.
  - Append-only suojat (prevent_update_delete), suunnitelma ennen ennustetta (forecast_requires_planning), mapping-versioiden overlap-suoja.
  - mapping event log (mapping_event_log) audit trail.
- 0002_views.sql
  - Raportoinnin nakymat: v_planning_current, v_forecast_current(_lines), v_actuals_mapped, v_actuals_unmapped, v_target_month_cost_report.
  - Helper-funktio mapping_version date-luontiin.
- 0003_jyda_snapshot_views.sql
  - JYDA snapshot -nakyma ketju (latest snapshot, mapped, unmapped, coverage).
- 0004_budget_items.sql
  - tavoitearvio-rivit item-tasolla (budget_items), append-only.
- 0005_work_phases_mvp.sql
  - tyovaiheet, versiot, jasenet, baseline, weekly updates, ghost cost, change events + approvals.
  - useita helper-nakymia ja baseline lock -funktio.
- 0006_work_phase_actuals_cpi.sql
  - AC/AC* ja CPI laskenta work phase -nakymina, selvitettavat-raportti.
- 0007_work_phase_corrections_phase17.sql
  - korjausprosessi item-lahteesta: work_phase_corrections, propose/approve funktiot, jononakyma.
- 0008_reporting_phase18.sql
  - raportointi- ja trendinakyma ketjut (work phase / paaryhma / projekti), budget_lines normalisointi.
- 0009_saas_rbac_phase19.sql
  - tenants/organizations, users, memberships, roles, permissions, role_assignments, RBAC funktiot.
  - projects -> organizations linkitys ja oletus-org.
- 0010_terminology_i18n.sql
  - terminologia (append-only) + org-perm funktiot.
- 0011_fix_terminology_get_dictionary.sql
  - hotfix term_key ambiguiteettiin.
- 0012_fix_monthly_work_phase_report.sql
  - monthly work phase -raportin korjaus.
- 0013_amount_kind_npss_cutover.sql
  - amount_kind + cost_type_origin, effective views.
- 0014_fix_monthly_work_phase_by_code.sql
  - kuukausiraportin korjaus (littera linkitys).
- 0015_npss_opening_snapshot_views.sql
  - COST-only snapshot ketju + opening snapshot -nakymat.
- 0016_accounting_api_raw_ledger_lines.sql
  - raakakirjanpidon staging-taulu (accounting_api_raw_ledger_lines) + FKs.
- 0017_add_user_pin_hash.sql
  - users.pin_hash (dev-auth).
- 0018_tenant_onboarding.sql
  - tenants + onboarding state events, project_state events, onboarding_links.
- 0019_import_jobs.sql
  - import_jobs + import_job_events (append-only status log).
- 0020_import_mappings.sql
  - import_mappings per projekti.
- 0021_month_close.sql
  - month close: months, month_state_events, report_packages, month_forecasts, month_corrections + events.
- 0022_report_snapshots.sql
  - report_package_snapshots + artifact_type laajennus.
- 0023_spec_attachments.sql
  - liitteet (attachments) append-only.
- 0024_app_audit_log.sql
  - yleinen sovelluksen audit log (app_audit_log).
- 0025_sessions.sql
  - session-taulu tenant- ja projekti-sidonnalla (revokointi + expiry).
- 0026_import_staging.sql
  - importin staging-alue: batchit, tapahtumat, raakalinjat, editit ja issue-logit (append-only).
- 0027_group_onboarding.sql
  - konserni (groups), org-kutsulinkit (org_invites) ja konserniroolit + permissionit.

## Core entities + relationships

- projects
  - 1..n litteras
  - 1..n planning_events, forecast_events, budget_lines, actual_cost_lines, mapping_versions
  - 1..n work_phases (ja alitaulut)
- litteras
  - työpakettilittera ja tavoitearvio-littera erotetaan mapping_lines-taululla
- mapping_versions + mapping_lines
  - mapping_version 1..n mapping_lines
  - mapping_line viittaa work_littera_id -> target_littera_id
- planning_events (suunnitelma)
  - latest per target_littera -> v_planning_current
- forecast_events (ennustetapahtuma)
  - 1..n forecast_event_lines
  - gate: suunnitelma ennen ennustetta
- budget_lines + budget_items
  - budget_lines: tavoitearvio-littera taso
  - budget_items: item-rivit (Excel A-Q)
- work_phases + work_phase_versions + work_phase_members
  - baseline + weekly updates + ghost costs + change events/approvals
- RBAC
  - organizations -> projects
  - users -> memberships -> (org/project) role assignments -> permissions
- audit
  - app_audit_log yleinen append-only tapahtuma
  - mapping_event_log erillinen mapping-audit
- sessions
  - sessions: user_id + project_id + tenant_id sidottu kirjautuminen
- import staging
  - import_staging_*: esikäsittelyn audit trail ja korjaukset ennen varsinaista importtia
- konserni
  - groups + org_invites + group_role_assignments

## Invariants + constraints (what must always be true)

- Append-only: triggerit estavat UPDATE/DELETE (planning_events, forecast_events, budget_lines, actual_cost_lines, audit-logit, ym.).
- Import staging: append-only triggerit batch/even/line/issue-tauluihin (audit trail).
- mapping_versions: ACTIVE ei saa overlapata (gist exclude).
- mapping_lines: saa muokata vain DRAFT-tilassa (triggerit).
- planning_events -> forecast_events: ennustetapahtuma vaatii viimeisimman suunnitelman status READY_FOR_FORECAST tai LOCKED.
- budget_lines/budget_items: valid_range ja row_no -uniikit.
- work_phase_members: member_type LITTERA/ITEM validointi.
- work_phase_baselines: baseline immutable, new baseline = uusi rivi.
- RBAC: role assignments append-only (revoked_at/left_at).

## RBAC model summary

- roolit: SITE_FOREMAN, GENERAL_FOREMAN, PROJECT_MANAGER, PRODUCTION_MANAGER, PROCUREMENT, EXEC_READONLY, ORG_ADMIN.
- permission-mapping role_permissions taulussa.
- rbac_user_has_permission ja rbac_assert_project_permission funktiot tukevat API/UI enforcementia.
- org-level roolit periytyvat kaikkiin orgin projekteihin.

## Tenant isolation summary

- projects.organization_id ja projects.tenant_id ovat tenant-rajat.
- tenant_state_events + project_state_events tarjoavat audit trail -logiikan.
- enforcement kaytannossa vaatii project_id + tenant_id rajausta kyselyissa ja session-scopessa.
- sessions-taulu sitoo tenant_id:n session-kontekstiin (sovelluskerroksen tarkistus).

## Risks / gaps

- Ei RLS: tenant-eristys nojaa sovelluskerroksen project_id + tenant_id -rajoituksiin.
- Osa tauluista viittaa vain project_id (ei tenant_id): riskina virheellinen join tai admin-raportti.
- app_audit_log on projekti-sidonnainen; org/tenant tapahtumat vaativat mahdollisen laajennuksen.
- Joissain rooli- ja permission-kyselyissa ei ole explicit tenant-filteria (vaatii API-guard).
- Useissa tauluissa actor/created_by on text -> heikko viite users-tauluun.
- Konserniroolit ja -permissionit vaativat sovelluskerroksen enforce-polun, muuten ne eivat vaikuta.

## Mitä muuttui
- Päivitetty terminologia: työpakettilittera.

## Miksi
- Yhtenäistetään dokumentaatio työpakettisuunnittelun termistöön.

## Miten testataan (manuaali)
- Avaa dokumentti ja varmista, että termi työpakettilittera näkyy mapping-rivillä.
