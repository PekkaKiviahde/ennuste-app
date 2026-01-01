# KARTTA – Kehityksen tilannekuva (v1)

Versiointi: KARTTA-YYYY-MM-DD.n (n=juokseva korjausnumero samalle päivälle)

Päivitetty: 2026-01-01

## P0_SCAN — Repo-kartoitus

### Repo-kartta (tiivis)
- Päätökset: `docs/MASTER_DECISIONS_SAAS_V1.md`, `docs/decisions/decision-log.md`
- ADR:t: `docs/adr/`
- Runbookit: `docs/runbooks/`, `docs/RUNBOOK_*.md`
- Migraatiot: `migrations/`
- Speksit: `spec/`
- API/UI: `api/`, `ui/`, `api/public/`
- API-dokit: `docs/api/openapi.yaml`, `docs/api/examples.md`, `docs/api/README.md`
- Yleisdokut: `README.md`, `report.md`

### Nykyiset päätökset (max 7)
- D-033 snapshot-on-demand raportointi — `docs/MASTER_DECISIONS_SAAS_V1.md`
- D-034 onboarding + RBAC tarkennukset — `docs/MASTER_DECISIONS_SAAS_V1.md`
- D-035 importit + mapping (joustava mapping, versionointi, RBAC) — `docs/MASTER_DECISIONS_SAAS_V1.md`
- D-028 report-package-ketju append-only — `docs/MASTER_DECISIONS_SAAS_V1.md`
- D-012 append-only kaikkiin importteihin/kirjauksiin — `docs/MASTER_DECISIONS_SAAS_V1.md`
- Varmenti F-003/F-004 raporttipipeline/forecast — `docs/MASTER_DECISIONS_SAAS_V1.md`
- Avoin cutover-audit — `docs/MASTER_DECISIONS_SAAS_V1.md`

### Nykyiset toteutukset (max 7)
- Report snapshot -taulu + append-only: `migrations/0022_report_snapshots.sql`
- Month close + report_packages + corrections: `migrations/0021_month_close.sql`
- Import job + import mappings: `migrations/0019_import_jobs.sql`, `migrations/0020_import_mappings.sql`
- Snapshot generointi + download: `api/server.js`
- Import mapping validointi API:ssa: `api/server.js`
- Joustava budget-mapping: `tools/scripts/import_budget.py`
- Joustava JYDA-mapping: `tools/scripts/import_jyda.py`

## P1_STATUS — Tilanneraportti

### Yhteenveto
- Päätökset on kirjattu ja raportoinnin snapshot-malli toimii.
- Import mapping on joustava (budjetti + JYDA) ja API validoi mappaukset.
- UI-polkuja on kaksi (kevät UI vs setup UI), mikä aiheuttaa kitkaa.
- Open-questions sisältää jo ratkaistuja kohtia.

### Scoreboard
| Workstream | Status | Evidence |
| --- | --- | --- |
| Onboarding + RBAC | PARTIAL | `docs/MASTER_DECISIONS_SAAS_V1.md`, `migrations/0018_tenant_onboarding.sql` |
| Importit + mapping | PARTIAL | `tools/scripts/import_budget.py`, `tools/scripts/import_jyda.py`, `api/server.js` |
| Raportointi + export | PARTIAL | `migrations/0022_report_snapshots.sql`, `api/server.js`, `docs/RUNBOOK_PHASE18_REPORTING.md` |
| Platform/Ops | PARTIAL | `docs/runbooks/`, `docs/decisions/open-questions.md` |

### Riskit ja epäselvyydet (max 5)
- Open-questions sisältää jo päätettyjä kohtia (raporttiformaatit, arkistointi) — `docs/decisions/open-questions.md`
- Kaksi UI-polkuja (login UI vs setup UI) — `ui/`, `api/public/`
- Cutover-audit päätös auki — `docs/MASTER_DECISIONS_SAAS_V1.md`
- Import mapping -UX hajautunut — `ui/app.js`, `api/public/`
- Operointipäätökset (purge/backup/monitoring) auki — `docs/decisions/open-questions.md`

### Seuraava looginen päätös
Päätä yhtenäinen UI-polku (login UI vs setup UI) ja päivitä open-questions vastaamaan lukittuja päätöksiä.

## P2_PLAN — Kehityssuunnitelma

### 1) Onboarding + RBAC
- Deliverable: onboarding-endpointit + RBAC-gating — riippuvuus: `migrations/0018_tenant_onboarding.sql` — hyväksymiskriteeri: kertakäyttölinkki + rooligating toimii.
- Deliverable: demo-tenant seed + seller-stub — riippuvuus: D-034 — hyväksymiskriteeri: demo aukeaa ilman asiakasdataa.
- Deliverable: onboarding UI — riippuvuus: API — hyväksymiskriteeri: C0→C3, P0→P2 etenee.

### 2) Importit + mapping
- Deliverable: import-mapping editor yhteen UI-polkuun — riippuvuus: `api/server.js` — hyväksymiskriteeri: save/load toimii.
- Deliverable: mapping-korjausversionointi API-polku — riippuvuus: `migrations/0001_init.sql` — hyväksymiskriteeri: uusi versio aina.
- Deliverable: smoke-testit import pipelineen — riippuvuus: runbookit — hyväksymiskriteeri: regressiot läpi.

### 3) Raportointi + export
- Deliverable: snapshot-on-demand täysi näkymäsetti — riippuvuus: `migrations/0022_report_snapshots.sql` — hyväksymiskriteeri: PDF/CSV latautuu.
- Deliverable: report-package UI listaus — riippuvuus: `api/server.js` — hyväksymiskriteeri: RBAC rajaa listan.
- Deliverable: runbook + OpenAPI ajan tasalla — riippuvuus: `docs/RUNBOOK_PHASE18_REPORTING.md` — hyväksymiskriteeri: manuaalitesti kirjattu.

## P3_GAPS — Aukot
- Open-questions päivitys (raporttiformaatit, arkistointi) — `docs/decisions/open-questions.md`
- Cutover-audit päätös — `docs/MASTER_DECISIONS_SAAS_V1.md`, migraatiot
- UI-polun valinta (login vs setup) — `ui/`, `api/public/`
- Import-mapping UX yhtenäistys — `ui/app.js`, `api/public/`
- Operointi (purge/backup/monitoring) — `docs/runbooks/`

## P4_NEXT_QUESTION — Workstream-valinta

Lyhyt selitys: Valitaan seuraava kokonaisuus, jotta eteneminen on hallittua ja päätökset kirjataan oikeassa järjestyksessä.  
Rakennusalan vertaus: Tämä on kuin päätös, aloitetaanko ensin “perustukset”, “runkotyöt” vai “luovutuspaketti”.

Vaihtoehdot:
1) Onboarding + RBAC
   - Kuka pääsee sisään ja mitä saa tehdä (kulkuluvat ja roolit).
2) Importit + mapping
   - Miten data saadaan sisään ja yhdistetään luotettavasti (jäljitettävyys).
3) Raportointi + export
   - Miten tuotetaan raporttipaketit ulos ja arkistoidaan (luovutusmateriaalit).

Suosittelen: 2, koska
- Ilman luotettavaa dataa raportointi ja oikeuksien todellinen käyttö jää epävarmaksi.
- Tämä tukee myöhemmin myös audit trailia (kuka teki mitä ja milloin).

Vastaa: pelkkä numero.

## Mitä muuttui
- Lisättiin KARTTA-tilannekuva ja versionointityyli.

## Miksi
- Tarvitaan selkeä, versionoitu “missä mennään” -dokumentti.

## Miten testataan (manuaali)
- Tarkista, että tiedosto löytyy ja linkit polkuihin ovat oikein.
