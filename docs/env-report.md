# Raportti koodareille: ympäristömuuttujat ja integraatiotestien toimivuus

## Tilannekuva

- Integraatiotestit skippaavat, jos `DATABASE_URL` tai `SESSION_SECRET` puuttuu.
  Lähde: `packages/infrastructure/src/integration.test.ts`.
- Nykyinen dev-ajo käyttää `.env`-tiedostossa `APP_PORT=3001`, mutta
  `.env.example` määrittelee `APP_PORT=3000`. Tämä aiheuttaa portti-sekaannusta,
  ellei ympäristöä synkronoida.
  Lähteet: `.env`, `.env.example`, `docker-compose.yml`.

## Pakolliset ympäristömuuttujat (integraatiotestit + app)

- `DATABASE_URL`
  Käyttö: DB-pooli ja integraatiotestit.
  Lähteet: `api/db.js`, `packages/infrastructure/src/db.ts`,
  `packages/infrastructure/src/integration.test.ts`,
  `tools/scripts/db-migrate.mjs`.
- `SESSION_SECRET`
  Käyttö: Next-UI sessioiden allekirjoitus, integraatiotestit.
  Lähteet: `apps/web/src/server/session.ts`,
  `packages/infrastructure/src/integration.test.ts`.
- `APP_PORT` / `PORT`
  Käyttö: API/UI-palvelun kuuntelu.
  Lähteet: `api/server.js`, `docker-compose.yml`.

## Suositellut (dev + demo + turvallisuus)

- `DEMO_MODE`
  Käyttö: demo-kirjautumiset.
  Lähteet: `apps/web/src/app/login/page.tsx`,
  `apps/web/src/server/actions/auth.ts`,
  `apps/web/src/server/env.ts`.
- `NODE_ENV`
  Käyttö: evästeiden secure-lippu + demo-turva.
  Lähteet: `apps/web/src/server/session.ts`,
  `apps/web/src/server/env.ts`.
- `PIN_SALT`
  Käyttö: PIN-hash API:ssa.
  Lähde: `api/server.js`.
- `JWT_SECRET`
  Käyttö: API-auth.
  Lähde: `docker-compose.yml` (env).
- `ALLOW_CROSS_ORG_QUERY`
  Käyttö: org-rajauksen hallinta.
  Lähde: `docker-compose.yml` (env).

## Valinnaiset

- `OPENAI_API_KEY`, `OPENAI_MODEL`
  Käyttö: AI-rajapinnat (jos käytössä).
  Lähde: `api/server.js`.
- `DATABASE_URL_DOCKER`, `DATABASE_URL_HOST`
  Käyttö: vaihtoehtoiset DB-osoitteet.
  Lähde: `api/db.js`.

## CI-minimi (jotta integraatiotestit eivät skippaa)

- `DATABASE_URL`
- `SESSION_SECRET`
- `NODE_ENV=test` (suositus; ei pakollinen mutta selkeyttää käytöstä)

Lisätiedot: `docs/README.md`.

## Dev-minimi (Next-UI + API)

- `DATABASE_URL`
- `SESSION_SECRET`
- `DEMO_MODE=true` (jos demo-login tarvitaan)
- `APP_PORT` (valitse 3000 tai 3001 ja pidä yhdenmukaisena)

## Docker-huomio

- `docker-compose.yml` pakottaa API:n käyttämään sisäistä DB-URLia
  `postgresql://codex:codex@db:5432/codex`. Tämä ohittaa `.env`-tiedoston
  DB-asetuksen app-kontissa.

## Ehdotus “toimiva baseline” -asetuksiksi

- `.env` (dev):
  - `DATABASE_URL=postgresql://codex:codex@127.0.0.1:5433/codex`
  - `SESSION_SECRET=change-me-in-dev`
  - `APP_PORT=3000` (tai 3001, mutta pidä sama dockerissa)
  - `DEMO_MODE=true`
- CI:
  - `DATABASE_URL` → testidb
  - `SESSION_SECRET` → CI-secret
  - `NODE_ENV=test`

## Toimenpide-ehdotukset

- Lisää “env-check” ennen integraatiotestejä, jotta puuttuvat envit
  failaavat selkeästi (ei skippausta).
- Synkronoi `APP_PORT` `.env` ja `.env.example` välillä, jotta portti-ohjeet
  pysyvät yhdenmukaisina.
- Dokumentoi CI-vaatimukset (minimi-envit) tiiviisti `docs/`-puolelle.
