# Tyokalut (tools/scripts)

Tama dokumentti kuvaa `tools/scripts/`-hakemiston ajettavat apuohjelmat
ja niiden nykyisen kayton.

## Node.js (mjs)

- `check-web-routes.mjs`
  Tarkistaa web-reittien login-ohjaukset. Kaytto: `BASE_URL=... node tools/scripts/check-web-routes.mjs`.
- `db-migrate.mjs`
  Ajaa SQL-migraatiot `migrations/`-hakemistosta ja paivittaa `schema_migrations`.
  Vaatii `DATABASE_URL`.
- `db-seed-demo.mjs`
  Luo demo-tenantit (A/B), demo-kayttajat ja roolit, litterat, target estimate
  -budjettilinjat, budget_items, mapping_versions + mapping_lines, JYDA-actualit,
  suunnitelma- ja ennustetapahtumat, tyonohjauksen work phase -dataa
  (baseline, weekly update, ghost cost). Vaatii `DATABASE_URL`.
- `db-status.mjs`
  Tulostaa migraatioiden tilan (applied/pending) ja seuraavan ajettavan.
  Vaatii `DATABASE_URL`.
- `env-check.mjs`
  Failaa, jos `DATABASE_URL` tai `SESSION_SECRET` puuttuu (integraatiotesteille).

## Python (importit ja apurit)

Yleista: useimmat skriptit kayttavat `DATABASE_URL`-muuttujaa; jos se puuttuu,
ne käyttavat paikallista oletus-URLia (127.0.0.1:5433).

- `apply_jyda_unapproved_delta.py`
  Laskee JYDA-CSV:sta hyvaksy-mattomien kustannusten deltan ja insertoi sen
  `actual_cost_lines`-tauluun (append-only).
- `build_budget_items_from_budget_lines.py`
  Rakenna `budget_items`-rivit uusimmasta TARGET_ESTIMATE-importista
  (aggregointi budget_lines -> budget_items).
- `db_url_redact.py`
  Apufunktio DB-URLin salasanan peittamiseen lokeissa.
- `import_budget.py`
  CSV-pohjainen tavoitearvion tuonti: `import_batches` + `budget_lines`.
- `import_budget_items.py`
  Excel-tavoitearvion erittelyt `budget_items`-tauluun (openpyxl vaaditaan).
- `import_forecast_from_jyda_csv.py`
  JYDA-CSV-ennusteet `forecast_cost_lines`-tauluun.
- `import_jyda.py`
  Excel "Jyda-ajo" -> snapshot-tyylinen actual-tuonti `actual_cost_lines`.
- `import_jyda_csv.py`
  CSV "Jyda-ajo" -> snapshot-tyylinen actual-tuonti `actual_cost_lines`.
- `seed_litteras_from_budget_csv.py`
  Luo `litteras`-rivit budget-CSV:n Litterakoodi-sarakkeen perusteella.

## Runbook

- `RUNBOOK_JYDA_IMPORT.md` kuvaa JYDA-importtien asennuksen ja ajon.

## Mita muuttui

Lisatty ajantasainen listaus `tools/scripts/`-hakemiston tyokaluista ja
niiden kaytosta.

## Miksi

Tarvitaan selkea ja nykytilaa vastaava dokumentti dev- ja data-ajojen tueksi.

## Miten testataan (manuaali)

- Avaa `docs/tools-scripts.md` ja varmista, etta lista vastaa `tools/scripts/`
  hakemiston nykyista sisaltoa.
