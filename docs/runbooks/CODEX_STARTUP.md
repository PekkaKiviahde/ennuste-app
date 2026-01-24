# Codex-kaynnistys (Next-UI)

Tama runbook on tarkoitettu Codexille: lue aina ennen dev-ympariston kaynnistamista.

## Miksi
- Express-UI on poistettu: kayta aina Next-UI:ta.
- Vahennetaan virhetiloja (vaarat kontit, vaara portit).

## Pakolliset envit (agenttiarmeija / API)
- `DATABASE_URL`
- `AGENT_INTERNAL_TOKEN`

Lisaksi:
- `OPENAI_API_KEY` vaaditaan vain `mode=change` -ajossa.

Defaultit (tarvittaessa overridella):
- `APP_HOST=127.0.0.1`
- `APP_PORT=3011`

## Kaynnistys (suositus)
1) Varmista, etta vain DB + pgAdmin + Next-UI kaynnistetaan:

```bash
docker compose -f docker-compose.yml -f docker-compose.next.yml up -d --remove-orphans db pgadmin web_next
```

2) Avaa UI:
- `http://localhost:3000`

## Agenttiarmeija (API) – smoke
1) Tee tyopuu tarkoituksella likaiseksi:
```bash
echo "// dirty test" >> apps/api/src/routes/agent.routes.ts
```

2) Kaynnista API (standardi: 127.0.0.1:3011 + dev-token):
```bash
APP_PORT=3011 APP_HOST=127.0.0.1 AGENT_INTERNAL_TOKEN=dev-token \
DATABASE_URL="postgres://codex:codex@localhost:5433/codex" \
OPENAI_API_KEY="(ei commitissa)" \
npm --prefix apps/api run dev
```

3) Aja smoke (mode=change + projectId pakollinen):
```bash
curl -sS -X POST "http://127.0.0.1:3011/agent/run" \
  -H "x-internal-token: dev-token" \
  -H "content-type: application/json" \
  -d '{
    "mode":"change",
    "dryRun":true,
    "projectId":"cb1b9b85-d1d4-4b00-b0b4-774b8a35e241",
    "task":"Lisaa kommentti tiedoston apps/api/src/routes/agent.routes.ts ensimmaiseksi riviksi: // change dryRun smoke test (unified)"
  }'
```

Odotus (response, avainkentat):
- `status`: `ok`
- `preflight`: aina mukana (dirty -> agent-autostash)
- `cleanup`: aina mukana (agent-autostash keep=5)

Jos `projectId` puuttuu (mode=change), odota `400`:
```json
{ "error":"Missing field", "missing":["projectId"] }
```

## Pysaytys
```bash
docker compose -f docker-compose.yml -f docker-compose.next.yml down
```

## Ongelmatilanteet
- Virhe: "Express-UI poistettu. Kayta Next-UI:ta."
  - Kaynnista vain `web_next` (komento ylla).
- Orpokontit:
  - Aja sama kaynnistyskomento `--remove-orphans` -lipulla.
- Next-UI ei lataudu / logissa `EBADENGINE` (node 24.x vaaditaan) tai `Failed to patch lockfile`:
  - Paivita kontti uusiksi: `docker compose -f docker-compose.yml -f docker-compose.next.yml up -d --build web_next`
  - Jos logissa edelleen `Failed to patch lockfile`: varmista, etta `web_next`-palvelulla on `NEXT_IGNORE_INCORRECT_LOCKFILE=1`
