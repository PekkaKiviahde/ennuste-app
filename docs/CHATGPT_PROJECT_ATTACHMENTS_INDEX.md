# ChatGPT-projektin liitteet — indeksi

Päivitetty: 2026-01-23

Tämä tiedosto on yhden liitteen “hakemisto”.
Se kertoo mitä liitteitä on ja mitä ne ovat.

## 1) Päätökset ja speksit
- `docs/ARCHITECTURE.md` — arkkitehtuuri: UI API DB
- `docs/workflows/workflow_report.md` — workflow-koonti ja gate-säännöt
- `docs/adr/0001-event-sourcing.md` — append-only event log -päätös
- `docs/adr/0002-mvp-workflow-decisions.md` — MVP-vaiheet ja porttipäätökset
- `docs/adr/0015-append-only-item-mapping.md` — item-mäppäys päätös ja rajat
- `docs/adr/0016-clean-baseline-and-mapping-separation.md` — baseline ja mäppäys erotetaan
- `docs/adr/0019-procurement-and-work-package-planning-append-only.md` — hankinta→työpaketti ja append-only
- `docs/adr/0020-hp-maksuerat-ja-tp-aikajanat.md` — HP maksuerät ja TP aikajanat
- `spec/README.md` — speksikansion tavoite ja rajat
- `spec/data-model/01_entities.md` — entiteetit ja termien tarkennus
- `spec/data-model/02_mapping_spec.md` — mäppäys: säännöt ja audit
- `spec/workflows/01_mvp_flow.md` — import→mäppäys→baseline→ennuste
- `spec/workflows/02_work_phases_and_baseline.md` — baseline-lukitus ja BAC-periaate
- `spec/workflows/04_change_control_and_learning.md` — korjaus vs oppiminen

## 2) Runbookit
- `docs/runbooks/CODEX_STARTUP.md` — Codex-ajon käynnistys ja rajat
- `docs/runbooks/workflow_report_maintenance.md` — workflow-raportin päivitysohje
- `docs/RUNBOOK_BUDGET_IMPORT.md` — tavoitearvio/budjetti tuonti käytännössä
- `tools/scripts/RUNBOOK_JYDA_IMPORT.md` — Jyda-importin ajaminen ja virheet

## 3) SQL-migraatiot
- `migrations/0001_baseline.sql` — baseline-skeema ja append-only
- `migrations/0044_budget_lines.sql` — budget_lines koontitaso tavoitearviolle
- `migrations/0042_saas_rbac_phase19.sql` — RBAC taulut ja roolit
- `migrations/0043_reporting_phase18_views.sql` — raporttinäkymät ja aggregaatit

## 4) UI/UX
- `docs/UI_ONE_SCREEN_V1.md` — yhden ruudun UI-kuvaus
- `spec/ui/01_work_phase_ui.md` — työpaketti UI: peruspolku
- `spec/ui/02_saas_onboarding_ui.md` — SaaS onboarding UI: portit

## 5) Importit & handoffit
- `docs/Talo80_handoff_v2.md` — Talo80-tulkinta, Phase21 + snapshot-raportointi, RBAC-vastuut, VSS ja audit-trail
- `spec/imports/01_jyda_import_spec.md` — Jyda-ajo tuonti speksi
- `spec/imports/02_budget_import_spec.md` — budjetti tuonti speksi
- `docs/HANDOFF_20260115.md` — viimeisin handoff tiivistelmä
- `docs/import-mapping-examples.json` — import-mäppäys esimerkkidata

## Mitä liitetään ChatGPT-projektiin

### Prioriteetti A (pakollinen)
- `docs/Talo80_handoff_v2.md`
- `docs/workflows/workflow_report.md`
- `spec/workflows/01_mvp_flow.md`
- `spec/data-model/01_entities.md`
- `spec/data-model/02_mapping_spec.md`

### Prioriteetti B (suositus)
- `spec/workflows/02_work_phases_and_baseline.md`
- `spec/workflows/04_change_control_and_learning.md`
- `docs/ARCHITECTURE.md`
- `docs/adr/0001-event-sourcing.md`
- `docs/adr/0015-append-only-item-mapping.md`
- `docs/adr/0019-procurement-and-work-package-planning-append-only.md`
- `docs/adr/0020-hp-maksuerat-ja-tp-aikajanat.md`

### Prioriteetti C (tarpeen mukaan)
- `docs/UI_ONE_SCREEN_V1.md`
- `docs/RUNBOOK_BUDGET_IMPORT.md`
- `tools/scripts/RUNBOOK_JYDA_IMPORT.md`
- `migrations/0001_baseline.sql`
- `migrations/0044_budget_lines.sql`
