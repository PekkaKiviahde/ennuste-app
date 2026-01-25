## ONBOARDING_DEMO_PROJECT

Tämä runbook kuvaa täytetyn demoprojektin luonnin onboarding-API:n kautta (demo_exports/v1).

### Edellytykset
- Käytössä Next-UI + API (`docker compose -f docker-compose.yml -f docker-compose.next.yml up -d db web_next`).
- `DATABASE_URL` asetettu.
- Sinulla on kirjautumiscookie (`session=<...>`) Next-UI:sta.

### Vaiheet (idempotentti)
1) Luo demo-org + demoprojekti (täytetty data):
```bash
curl -X POST http://localhost:3000/api/saas/organizations \
  -H "content-type: application/json" \
  -H "cookie: session=<SESSION_COOKIE>" \
  -d '{"name":"Demo Oy","slug":"demo-oy","adminEmail":"admin@demo.local"}'
```
- Kutsu on idempotentti: jos org/demoprojekti on jo olemassa, sama demodata varmistetaan (ei duplikaatteja).

2) Vahvista smoke-testit:
```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/sql/SMOKE_DEMO_CANONICAL.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/sql/SMOKE_DEMO_ONBOARDING_DATA.sql
```
3) Budjetin päivitys (hash päivittyy):
   - Muuta `demo_exports/v1/data.json` budjetin summia (ilman että `targetEstimateItems` muuttuu).
   - Aja vaihe 1 uudelleen.
   - Tarkista, että `import_batches` saa uuden `TARGET_ESTIMATE`-rivin (file_hash muuttuu) ja `budget_lines` sisältää uudet summat.

### Mitä demodata sisältää (demo_exports/v1)
- TARGET_ESTIMATE + target_estimate_items + budget_lines (>=10 riviä)
- ACTIVE mapping_versions + mapping_lines (>=5 sääntöä)
- ITEM mapping_version + item_row_mappings
- ACTUALS + mapping_rules (sekä mapped että unmapped)
- Suunnitelma + forecast-näkyvyys (minimi)

### Rollback
- Poista demoprojekti/organisaatio tarvittaessa manuaalisesti (append-only: ei poisteta rivejä, luo uusi org slugilla jos tarvitset uuden demon).

## Mitä muuttui
- Demo-exportin `data.json` etsitään nyt kävelemällä ylöspäin hakemistopuuta (`process.cwd()` + `__dirname`).
- Baseline-lukituksen funktion olemassaolo tarkistetaan nyt `pg_proc`-kyselyllä (ei `to_regclass`).
- Onboarding varmistaa nyt myös MT/LT change requestit APPROVED-tilassa.
- Lisättiin latest toteumien raporttinäkymät migraatiossa `migrations/0054_actuals_latest_report_views.sql`.
- Actuals mapping -version `valid_from` sidotaan demo-datan earliest toteumapäivään.

## Miksi
- Nextin workspace-ajossa polku ei osoittanut repojuureen, jolloin onboarding kaatui virheeseen “data.json ei löydy”.
- `to_regclass` ei toimi funktioihin, joten baselinea ei koskaan lukittu ja canonical smoke kaatui.
- Canonical smoke edellyttää sekä MT että LT hyväksyttynä raporttinäkymässä.
- Canonical smoke edellyttää myös mapped/unmapped toteumanäkymät ja voimassa olevan mapping-version.

## Miten testataan (manuaali)
- `bash tools/scripts/dev-up.sh --auto`
- Aja vaiheen 1 curl kirjautumiscookiella.
- Aja smoke-testit:
  - `docs/sql/SMOKE_DEMO_CANONICAL.sql`
  - `docs/sql/SMOKE_DEMO_ONBOARDING_DATA.sql`
- Aja onboarding kahdesti; MT/LT ei duplikoidu ja smokes pysyvät vihreinä.
- Tarvittaessa aja migraatiot erikseen: `docker exec codex_next_web npm run db:migrate`
