# Runbook: agenttiarmeija (agent_api) – Task A smoke

## Tarkoitus
- Aja `POST /agent/run` paikallisesti Dockerilla.
- Varmista `mode=mission0` (read-only) ja `mode=change` (`dryRun=true`) toiminta.

## Esivaatimukset
- Docker + Docker Compose
- `.env` tiedosto (tai envit shellissä)

Pakolliset envit:
- `AGENT_INTERNAL_TOKEN`
- `DATABASE_URL` (vain `mode=change`)
- `OPENAI_API_KEY` (vain `mode=change`)
- `GH_TOKEN` (vain `mode=change`)

## Käynnistys (Docker)

Käynnistä DB + agent_api:
```bash
docker compose -f docker-compose.yml -f docker-compose.agent-api.yml up -d --build db agent_api
```

Seuraa agent_api-lokeja:
```bash
docker compose -f docker-compose.yml -f docker-compose.agent-api.yml logs -f --tail=200 agent_api
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
- MVP: `dryRun=false` on estetty toistaiseksi (ei commit/push).

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
