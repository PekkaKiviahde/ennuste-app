# Docs index – Ennustus (MVP)

Päivitetty: 2025-12-30

## Workflows (tuotteen näkökulma)
- `docs/workflows/master.md` – master-kaavio (Sales/Admin/Production/DevOps)
- `docs/workflows/nappipolut.md` – nappipolut (UI: mitä painetaan missä järjestyksessä)
- `docs/workflows/state-machines.md` – tilakoneet (status + transitions + lukitukset)
- `docs/workflows/supplier-sdlc.md` – toimittajan polku (SDLC, ympäristöt ja portit)
- `docs/traceability.md` – traceability (päätös → doc → UI/tila → toteutus)
- `docs/workflows/business-rules.md` – business rules (“kultaiset säännöt”)
- `docs/workflows/rbac-matrix.md` – roolit ja oikeudet (RBAC-matriisi)
- `docs/workflows/glossary.md` – sanasto (glossary)

## Compliance
- `docs/compliance/gdpr.md` – GDPR & compliance-päätökset (anonymisointi, säilytys, EU/ETA, DPA-oletus)

## Runbooks (operatiivinen)
- `docs/runbooks/incident.md` – incident (SEV1–3), banneri, hotfix, postmortem
- `docs/runbooks/data-fix.md` – data-korjaukset (migrations/backfill/verify)
- `docs/runbooks/release.md` – julkaisuprosessi (dev→test→staging→prod)
- `docs/runbooks/db-smoke.md` – DB-smoke (core invariants)

## Decisions
- `docs/decisions/decision-log.md` – päätösloki (keskustelupäätökset koottuna)
- `docs/decisions/open-questions.md` – avoimet kysymykset / TODO

## Käyttövinkki
- Nämä tiedostot on tarkoitettu suoraan repon sisään (versionhallinta).
- Mermaid-kaaviot renderöityvät GitHubissa Markdownissa.
- Perusseed (dev): `node api/scripts/seed.js` (luo suunnitelma + ennuste + liitteet).

## API
- `docs/api/README.md` – API docs (OpenAPI + esimerkit)
- `docs/api/openapi.yaml` – OpenAPI 3.1
- `docs/api/examples.md` – curl-esimerkit
- `docs/api/security.md` – API security (token/SSO + audit)

## SQL (verify/smoke)
- `docs/sql/VERIFY_INVARIANTS.sql` – invarianttien verify
- `docs/sql/SMOKE_E2E_CORE.sql` – E2E-smoke (rollback)
- `migrations/0023_spec_attachments.sql` – liitteiden append-only taulu (speksin mukainen)

## Mitä muuttui
- Lisätty linkit DB-smoke-runbookiin ja verify/smoke-SQL-skripteihin.

## Miksi
- Linkit helpottavat löydettävyyttä ja käyttöä CI/QA-polussa.

## Miten testataan (manuaali)
- Avaa `docs/README.md` ja varmista, että linkit löytyvät ja osoittavat oikeisiin tiedostoihin.
