# LUKITTU #1 status (L-20260104-055)

Paivitetty: 2026-01-04

## Tavoite (LUKITTU #1)
Perusta: migraatioanalyysi + ajettava web-runko + auth (tunnistus) / RBAC (roolipohjainen paasyhallinta) / tenant (asiakasilmentyma) + demo-roolit + katkosjatko.

## Deliverable-tila
- Migraatioanalyysi: valmis (docs/MIGRATION_LOGIC_ANALYSIS.md).
  - Sisaltaa 0001-0027 migraatiot, append-only -suojaus ja tenant/RBAC-yhteys.
- Ajettava web-runko: valmis (apps/web/).
  - Suojattu layout (apps/web/src/app/(app)/layout.tsx) + login (apps/web/src/app/login).
- Auth + session: valmis (apps/web/src/server/session.ts, packages/infrastructure/src/auth.ts, migrations/0025_sessions.sql).
- RBAC: valmis (migrations/0009_saas_rbac_phase19.sql, packages/infrastructure/src/rbac.ts).
- Tenant-eristys (MVP): valmis sovelluskerroksessa (packages/infrastructure/src/db.ts).
- Demo-roolit + demo-tenantit: valmis (tools/scripts/db-seed-demo.mjs).
- Katkosjatko: valmis (docs/CODEX_HISTORY.md, .codex/state.json).

## Huomiot ja aukot
- db:status ok (pending 0), viimeisin ajo 2026-01-04.
- Myyjan onboarding + kutsulinkki on toteutettu (apps/web/src/app/sales/page.tsx, apps/web/src/app/invite/[token]/page.tsx).
- Untracked tiedosto: logo_draft_jp_v2.png (repo-hygienia auki).
- UI-kavely kesken: kirjautumisessa ilmeni NEXT_REDIRECT (tarvitsee varmistuksen kayttajalta).

## Seuraavat tarkistukset
- Aja db:status jos DATABASE_URL on saatavilla.
- Varmista UI-kavely login -> role-based redirect -> raportit.

## Mitä muuttui
- Lisatty LUKITTU #1 deliverable-tilannekuva.

## Miksi
- Katkosjatko ja auditointi vaativat selkean, yhdessa paikassa olevan statuskuvauksen.

## Miten testataan (manuaali)
- Avaa dokumentti ja varmista, etta deliverable-tilat vastaavat nykyista toteutusta.
