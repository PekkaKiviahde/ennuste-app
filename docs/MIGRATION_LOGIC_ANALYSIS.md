# MIGRATION_LOGIC_ANALYSIS

## Laajuus ja lahteet
- Lahteet: `migrations/*.sql`, `db/00-schema.sql`, `db/01-seed-permissions.sql`.
- Analyysi perustuu migraatioihin (kanoninen skeema). `db/00-schema.sql` on erillinen vaihtoehtoinen SaaS-pohja ja voi olla ristiriidassa migraatioiden kanssa.

## Aikajana (mita kukin migraatio tekee)
- `0001_init.sql`: perustaulut (projects, litteras), mapping-versiot + rivit + audit, suunnittelutapahtumat, importit, budjetti- ja toteumarivit, ennustetapahtumat + rivit + memo/snapshotit, append-only triggerit, suunnitelma-ennen-ennuste -gate.
- `0002_views.sql`: raportoinnin perusnakymat (planning/forecast current, actuals mapped/unmapped, kuukausiraportti).
- `0003_jyda_snapshot_views.sql`: JYDA snapshot -nakymat (viimeisin snapshot, mapattu/unmapped, coverage).
- `0004_budget_items.sql`: tavoitearvion nimiketason `budget_items` (append-only).
- `0005_work_phases_mvp.sql`: tyovaiheet, versiot, jasenet, baseline, viikkopaivitykset, ghost-kulut, change control, MVP-raportointinakymat, baseline-lock funktio.
- `0006_work_phase_actuals_cpi.sql`: tyovaiheiden AC/AC* ja CPI-nakymat, selvitettavat toteumat.
- `0007_work_phase_corrections_phase17.sql`: korjausehdotukset (2-vaiheinen hyvaksynta), uuden version ja baselinen lukitus.
- `0008_reporting_phase18.sql`: laajat raporttinakymat (tyovaihe, paaryhma, trendit, top-listat) + best-effort sovitukset.
- `0009_saas_rbac_phase19.sql`: organisaatiot, users, roolit/permissionit, org- ja projektitaso roolijaot, RBAC-funktiot, project->organization FK + default org.
- `0010_terminology_i18n.sql`: terminologia (append-only termit), org-permission, dictionary/resolver.
- `0011_fix_terminology_get_dictionary.sql`: korjaus terminology_get_dictionary -ambiguitettiin.
- `0012_fix_monthly_work_phase_report.sql`: korjaus kuukausiraportin yhdistykseen (target_littera_id).
- `0013_amount_kind_npss_cutover.sql`: amount_kind + cost_type_origin + effective view actualeille.
- `0014_fix_monthly_work_phase_by_code.sql`: korjaus kuukausiraportin yhdistykseen (kommentin mukaan koodilla).
- `0015_npss_opening_snapshot_views.sql`: COST-only ketju + NPSS opening snapshot -nakymat.
- `0016_accounting_api_raw_ledger_lines.sql`: accounting API raw ledger lines (append-only) + latest-nakyma.
- `0017_add_user_pin_hash.sql`: `users.pin_hash` (dev-auth).
- `0018_tenant_onboarding.sql`: tenants, onboarding tilat, project state, onboarding linkit, project/tenant eventit, projects.tenant_id.
- `0019_import_jobs.sql`: import job -seuranta ja eventit.
- `0020_import_mappings.sql`: import mappingit per projekti.
- `0021_month_close.sql`: kuukausisulku, raporttipaketit, kuukausien ennusteet ja korjaukset.
- `0022_report_snapshots.sql`: report package snapshotit (append-only).
- `0023_spec_attachments.sql`: liitteet omaan append-only tauluun.
- `0024_app_audit_log.sql`: yleinen app_audit_log (append-only), projekti- ja aikajono.
- `db/00-schema.sql`: vaihtoehtoinen SaaS-pohja (tenants, users, memberships, roles, permissions, audit_log).
- `db/01-seed-permissions.sql`: permissiot + esimerkkivaltuudet `db/00-schema.sql`:lle.

## Ydinentiteetit ja suhteet (yhteenveto)
- **Projektit ja litterat**: `projects` -> `litteras` (projektikohtaiset koodit, group_code 0-9).
- **Mapping**: `mapping_versions` -> `mapping_lines`; `mapping_event_log` (audit, append-only).
- **Suunnittelu ja ennuste**: `planning_events` (append-only) -> `forecast_events` -> `forecast_event_lines` + memot/snapshotit.
- **Tuonnit**: `import_batches` -> `budget_lines`/`budget_items`/`actual_cost_lines`.
- **Tyovaiheet**: `work_phases` -> `work_phase_versions` -> `work_phase_members`; `work_phase_baselines` + `work_phase_baseline_lines`.
- **Seuranta**: `work_phase_weekly_updates`, `ghost_cost_entries`/`ghost_cost_settlements`, `work_phase_change_events` + approvals.
- **Korjaukset**: `work_phase_corrections` (propose/approve/reject) liittyy `work_phase_versions` ja `work_phase_baselines`.
- **Raportointi**: laaja joukko view-nakymatauluja (work phase / project / main group / trendit / top-listat).
- **RBAC (migrations)**: `organizations`, `users`, `roles`, `permissions`, `role_permissions`, `organization_role_assignments`, `project_role_assignments`.
- **Tenant onboarding (migrations)**: `tenants` + `projects.tenant_id` + `tenant_state_events` + `project_state_events` + `onboarding_links`.
- **Kuukausisulku**: `months`, `month_state_events`, `month_forecasts`, `month_forecast_events`, `month_corrections`, `month_correction_events`, `report_packages`, `report_package_snapshots`.
- **Liitteet**: `attachments` (owner_type: PLAN/FORECAST_EVENT).
- **Audit**: `app_audit_log` (yleinen tapahtumaloki).

## Invariantit ja constraints (olennaiset)
- **Append-only**: useissa tauluissa `prevent_update_delete()`-trigger (mm. mapping_event_log, planning_events, forecast_events, budget_items, baseline/weekly/ghost/change/, app_audit_log).
- **Mapping-versio**: ei paallekkaisia ACTIVE-versioita per projekti + valid_range (gist exclude).
- **Mapping-rivit**: INSERT/UPDATE/DELETE vain DRAFT-versioon (triggerit).
- **Suunnitelma ennen ennustetta**: forecast INSERT estetaan, jos viimeisin suunnitelma ei ole READY_FOR_FORECAST/LOCKED.
- **Littera**: `group_code` 0-9, `code` ei tyhja, uniikki (project_id, code).
- **Budjetti**: valid_range ja valid_from/to -tarkistukset.
- **Ennuste**: progress 0..1, ennusterivit append-only.
- **Tyovaihe**: baseline-lock funktio vaatii target estimate -batchin ja littera-peiton.

## RBAC-malli (migraatiot)
- **Roolit**: `roles` (SITE_FOREMAN, GENERAL_FOREMAN, PROJECT_MANAGER, PRODUCTION_MANAGER, PROCUREMENT, EXEC_READONLY, ORG_ADMIN).
- **Permissionit**: `permissions` + `role_permissions` (esim. REPORT_READ, BASELINE_LOCK, CORRECTION_APPROVE_*).
- **Assignointi**: org- ja projektitaso (`organization_role_assignments`, `project_role_assignments`), append-only peruutus `revoked_at`.
- **Apufunktiot**: `rbac_get_user_id`, `rbac_user_has_permission`, `rbac_assert_project_permission` + secure wrapperit.
- **Terminologia-permission**: `TERMINOLOGY_MANAGE` (ORG_ADMIN).

## Tenant-eristys (migraatioiden perusteella)
- **Organisaatio**: `projects.organization_id` pakollinen (default org backfill 0009).
- **Tenant**: `projects.tenant_id` lisatty 0018 + `tenants`-taulu.
- **Eristys DB:ssa**: ei RLS-politiikkoja migraatioissa; eristys oletetaan sovelluskerrokseen (project_id -> org/tenant).

## Riskit ja aukot (havaintoja)
- **Kaksi tenant-mallia**: `organizations` (0009) ja `tenants` (0018) elavat rinnakkain; kanoninen polku epaselva.
- **RBAC-aikajaksot**: migraatioissa ei `valid_from/to` rooleille, vaikka `db/00-schema.sql` mallintaa ne.
- **Auth-identiteetti**: `users` on omassa DB:ssa + `pin_hash`, mutta docs korostaa Keycloak/OIDC (ulkoisen IdP:n malli puuttuu skeemasta).
- **Append-only poikkeukset**: osa tauluista sallii UPDATE (esim. `import_mappings`, `months`, `month_forecasts`, `month_corrections`) ilman erillista audit-logia.
- **FK-kattavuus**: useissa tauluissa `created_by`/`actor` on text ilman FK:ta `users`-tauluun.
- **Raportin yhdistys**: `0014_fix_monthly_work_phase_by_code.sql` kommentoi koodiyhdistysta, mutta join tapahtuu edelleen littera_id:lla (tulkinnan riski).
- **Lukitusmalli**: specissa mainitaan ennusteen lukitus eventtina, mutta skeemassa ei ole `is_locked` tai lukitusta kuvaavaa kenttaa.

## Mita sovelluksen on pakko taata (checklist)
- [ ] Kaikki append-only -taulut: ei UPDATE/DELETE operaatioita sovelluksessa.
- [ ] Ennustetapahtuma vain, jos suunnitelma on READY_FOR_FORECAST tai LOCKED.
- [ ] Mapping-rivit vain DRAFT-versioon; ACTIVE-versioita ei paallekkain.
- [ ] Tenant/organisaatio eristys: joka queryssa project_id -> tenant/org -tarkistus.
- [ ] RBAC: jokainen server-action tekee permission-checkin.
- [ ] Baseline-lukitus vain target estimate -batchista (work_phase_lock_baseline). 
- [ ] Raportointi lukee viimeisimman tilan (current views) ja huomioi cost-only/NPSS rules.
- [ ] Liitteet tallennetaan `attachments`-tauluun owner_type/owner_id perusteella.

## Mita muuttui
- Lisatty migraatioiden ja seedien pohjalta yhteenveto skeemasta, invariantsaannoista ja riskeista.

## Miksi
- Tarvitaan yhteinen ymmarrys migraatioiden kanonisesta logiikasta ennen toteutusta.

## Miten testataan (manuaali)
- Avaa `docs/MIGRATION_LOGIC_ANALYSIS.md` ja tarkista, etta jokainen migraatio on listattu ja keskeiset rajoitteet on kuvattu.
