# DEMO_ONBOARDING_VERIFICATION_NOTES

Tämä runbook kirjaa todennetun “täytetty demo” -verifioinnin.

## Mitä muuttui
- Demo-onboardingin verifiointi kattaa nyt myös MT/LT ja toteumien mapped/unmapped-näkymät.
- Canonical smoke toimii psql:ssa ilman `\if :var = 1` -ongelmaa.
- Toteumien mapping-version `valid_from` sidotaan demo-datan earliest toteumapäivään.

## Miksi
- Canonical smoke edellyttää: baseline, MT/LT APPROVED, ACTUALS latest sekä mapped/unmapped-näkymät.
- Aiemmin puuttui toteumanäkymiä ja mapping saattoi olla “tulevaisuudesta”.

## Miten testataan (manuaali)
1) Käynnistä ympäristö:
```bash
bash tools/scripts/dev-up.sh --auto
docker exec codex_next_web npm run db:migrate
```

2) Aja onboarding (kirjautuneena UI:ssa tai session-cookiella):
```bash
curl -X POST http://localhost:3000/api/saas/organizations \
  -H "content-type: application/json" \
  -H "cookie: ennuste_session=<SESSION_COOKIE>" \
  -d '{"name":"Demo Oy","slug":"demo-oy","adminEmail":"admin@demo.local"}'
```

3) Aja smoket:
```bash
docker exec -i codex_saas_db psql -v ON_ERROR_STOP=1 -U codex -d codex -f - < docs/sql/SMOKE_DEMO_CANONICAL.sql
docker exec -i codex_saas_db psql -v ON_ERROR_STOP=1 -U codex -d codex -f - < docs/sql/SMOKE_DEMO_ONBOARDING_DATA.sql
```

4) Budjettimuutos-idempotenssi (pakollinen case):
- Muuta vain budjettisummaa tiedostossa `demo_exports/v1/data.json`.
- Aja onboarding uudelleen.
- Varmista, että uusi `import_batches.kind='TARGET_ESTIMATE'` syntyy.
