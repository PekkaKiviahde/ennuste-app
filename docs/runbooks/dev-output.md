# Runbook: dev-näkymä ei avaudu

## Tarkoitus
Varmista, että MVP:n UI + API näkyy kehitysvaiheessa ja löydä yleisin syy, jos näkymä ei avaudu.

## Oletuspolku (Docker Compose)

1. Kopioi ympäristömuuttujat:

```bash
cp .env.example .env
```

2. Käynnistä palvelut:

```bash
docker compose up -d
```

3. Varmista palvelut:

```bash
docker compose ps
```

4. Testaa health:

```bash
curl -s http://localhost:${APP_PORT:-3000}/api/health
```

5. Testaa agent /agent/run (change, dryRun):

```bash
curl -s -X POST "http://localhost:${APP_PORT:-3000}/agent/run" \
  -H "Content-Type: application/json" \
  -H "x-internal-token: ${AGENT_INTERNAL_TOKEN}" \
  -d '{"mode":"change","projectId":"<project_id>","task":"Smoke run","dryRun":true}'
```

## Jos etäympäristö (Codespaces/Container)

- Avaa portti 3000 Ports-näkymästä ja käytä sieltä annettua URL:ia.
- Älä käytä paikallista `localhost`-osoitetta, jos selain on eri koneella kuin kontti.

## Jos app ei käynnisty

1. Tarkista lokit:

```bash
docker compose logs app --tail=200
```

2. Jos `npm ci` kaatuu verkon vuoksi:

```bash
cd api && npm ci
```

3. Käynnistä uudelleen:

```bash
docker compose up -d --build
```

## Pikalista (todennäköiset syyt)

- Portti ei ole forwardoitu (etäympäristössä).
- `npm ci` ei onnistunut ja app ei käynnistynyt.
- Portti 3000 on varattu → vaihda `APP_PORT`.
