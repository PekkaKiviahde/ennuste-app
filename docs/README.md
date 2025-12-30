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

## Decisions
- `docs/decisions/decision-log.md` – päätösloki (keskustelupäätökset koottuna)
- `docs/decisions/open-questions.md` – avoimet kysymykset / TODO

## Käyttövinkki
- Nämä tiedostot on tarkoitettu suoraan repon sisään (versionhallinta).
- Mermaid-kaaviot renderöityvät GitHubissa Markdownissa.

## API
- `docs/api/README.md` – API docs (OpenAPI + esimerkit)
- `docs/api/openapi.yaml` – OpenAPI 3.1
- `docs/api/examples.md` – curl-esimerkit
- `docs/api/security.md` – API security (token/SSO + audit)
