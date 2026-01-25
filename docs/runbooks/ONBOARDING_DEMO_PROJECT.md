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

### Mitä demodata sisältää (demo_exports/v1)
- TARGET_ESTIMATE + target_estimate_items + budget_lines (>=10 riviä)
- ACTIVE mapping_versions + mapping_lines (>=5 sääntöä)
- ITEM mapping_version + item_row_mappings
- ACTUALS + mapping_rules (sekä mapped että unmapped)
- Suunnitelma + forecast-näkyvyys (minimi)

### Rollback
- Poista demoprojekti/organisaatio tarvittaessa manuaalisesti (append-only: ei poisteta rivejä, luo uusi org slugilla jos tarvitset uuden demon).
