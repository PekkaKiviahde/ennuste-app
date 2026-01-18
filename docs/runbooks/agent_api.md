# Runbook: agenttiarmeija (agent_api) – Task A smoke

## Tarkoitus
- Aja `POST /agent/run` paikallisesti Dockerilla.
- Varmista `mode=mission0` (read-only) ja `mode=change` (`dryRun=true`) toiminta.

ALOITA TÄSTÄ (koonti, envit, PR/compareLink, troubleshooting): `docs/runbooks/agent_army_overview.md`

## Esivaatimukset
- Docker + Docker Compose
- `.env` tiedosto (tai envit shellissä)

Pakolliset envit:
- `AGENT_INTERNAL_TOKEN`
- `DATABASE_URL` (vain `mode=change`)
- `OPENAI_API_KEY` (vain `mode=change`)
- `GH_TOKEN` (vain `mode=change`)

## GitHub PR automation (GH_TOKEN)

Agentin automaattinen PR-luonti käyttää GitHub API:a ja vaatii `GH_TOKEN`-ympäristömuuttujan.

Aseta token ennen Docker Compose -käynnistystä:
```bash
export GH_TOKEN=ghp_xxx
```

Vaatimukset tokenille:
- Classic token: `repo`
- Fine-grained token: `contents:write` + `pull_requests:write`

## Käynnistys (Docker)

Käynnistä DB + agent_api:
```bash
docker compose -f docker-compose.yml -f docker-compose.agent-api.yml up -d --build db agent_api
```

Seuraa agent_api-lokeja:
```bash
docker compose -f docker-compose.yml -f docker-compose.agent-api.yml logs -f --tail=200 agent_api
```

Huom (fresh DB volume):
- `agent_api` ajaa automaattisesti migraatiot käynnistyksessä (`npm run db:migrate`).
- Jos näet virheen “relation does not exist” (esim. `agent_sessions`), aja migraatiot käsin:
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.agent-api.yml exec -T agent_api npm run db:migrate
  ```

## Smoke: mission0 (read-only)
```bash
curl -sS -X POST "http://127.0.0.1:3011/agent/run" \
  -H "x-internal-token: ${AGENT_INTERNAL_TOKEN}" \
  -H "content-type: application/json" \
  -d '{ "mode":"mission0" }'
```

Odotus:
- `status: "ok"`
- `mode: "mission0"`
- `report` sisältää mm. `gateCandidates` ja repo tree:n

## Smoke: change (dryRun=true)
```bash
curl -sS -X POST "http://127.0.0.1:3011/agent/run" \
  -H "x-internal-token: ${AGENT_INTERNAL_TOKEN}" \
  -H "content-type: application/json" \
  -d '{
    "mode":"change",
    "dryRun":true,
    "projectId":"cb1b9b85-d1d4-4b00-b0b4-774b8a35e241",
    "task":"DIAG: gate smoke"
  }'
```

Odotus:
- Onnistuu: `status: "ok"` + `branchName` + `changedFiles`
- Jos gate kaatuu: `status: "failed"` + `gateLog`

## Smoke: change (dryRun=false) – auto PR
```bash
curl -sS -X POST "http://127.0.0.1:3011/agent/run" \
  -H "x-internal-token: ${AGENT_INTERNAL_TOKEN}" \
  -H "content-type: application/json" \
  -d '{
    "mode":"change",
    "dryRun":false,
    "projectId":"cb1b9b85-d1d4-4b00-b0b4-774b8a35e241",
    "task":"DIAG: gate smoke"
  }'
```

Odotus:
- Onnistuu: `status: "ok"` + `branchName` + `compareLink` + `prUrl`
- Jos PR:n luonti epäonnistuu: `prUrl` puuttuu tai on `null`, mutta `compareLink` on mukana (fallback)

## Pysäytys
```bash
docker compose -f docker-compose.yml -f docker-compose.agent-api.yml down
```

---

## Mitä muuttui
- Lisättiin ajettava smoke-runbook agent_api:lle.

## Miksi
- Task A vaatii toistettavan paikallisen ajotavan (`docker ... agent_api` + `curl`).

## Miten testataan (manuaali)
- Aja “Käynnistys (Docker)” ja molemmat smoke-curlit.
