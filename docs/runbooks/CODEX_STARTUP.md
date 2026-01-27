# Codex-kaynnistys (Next-UI)

Tama runbook on tarkoitettu Codexille: lue aina ennen dev-ympariston kaynnistamista.

## Mita muuttui (tahan runbookiin)
- Lisatty dev-only ohje agenttiarmeijan Docker-palvelun (`agent_api`) kaynnistykseen ja pysaytykseen erillaan Next-UI:sta.
- Lisatty `DIAG: fast` -smoke `mode=change` -ajolle (ajaa vain lint+typecheck, ei testeja).

## Miksi
- Agenttiarmeija ei ole pakollinen UI-kehityksessa, ja sen halutaan olevan selkea "opt-in" devissa.

## Miten testataan (manuaali)
1) Aja `bash tools/scripts/dev-up.sh --auto` ja varmista, etta UI aukeaa `http://localhost:3000`.
2) Aja `docker compose -f docker-compose.yml -f docker-compose.agent-api.yml up -d --build db agent_api` ja varmista, etta `codex_agent_api` kaynnistyy.
3) Aja `curl` smoke (katso "Smoke (Docker, mode=mission0)") ja varmista, etta saat JSON-responsen.
4) Aja `curl` smoke (katso "Smoke (Docker, mode=change, DIAG: fast)") ja varmista, etta saat JSON-responsen nopeasti.

## Nopea tarkistus

1) curl -sS -H "x-internal-token: dev-token" http://127.0.0.1:3011/agent/health
2) curl -sS -X POST http://127.0.0.1:3011/agent/run -H "x-internal-token: dev-token" -H "content-type: application/json" -d '{"mode":"mission0"}' 
3) curl -sS -X POST http://127.0.0.1:3011/agent/run -H "x-internal-token: dev-token" -H "content-type: application/json" -d '{"mode":"change","dryRun":true,"projectId":"cb1b9b85-d1d4-4b00-b0b4-774b8a35e241","task":"DIAG: fast gate smoke"}'

## Miksi (Next-UI)
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

Vaihtoehto (suositus Codespacesissa): yksi komento, joka hoitaa myos porttikolarit (3000/5433):
```bash
bash tools/scripts/dev-up.sh --auto
```

## Agenttiarmeija (Docker) – dev-only kaytto (ei pakollinen UI:lle)
Tama on erillinen `agent_api`-palvelu (portti `3011`), jota kaytetaan dev-tyohon (mission0/change).
Se ei ole osa Next-UI:n normaalia kayttoa, eika tata tarvitse kaynnistaa, ellei halua ajaa agenttia.

Kaynnista (kun tarvitset agenttia):
```bash
docker compose -f docker-compose.yml -f docker-compose.agent-api.yml up -d --build db agent_api
```

Pysayta (kun et tarvitse agenttia):
```bash
docker compose -f docker-compose.yml -f docker-compose.agent-api.yml down
```

### Smoke (Docker, mode=mission0)
```bash
curl -sS -X POST "http://127.0.0.1:3011/agent/run" \
  -H "x-internal-token: ${AGENT_INTERNAL_TOKEN:-dev-token}" \
  -H "content-type: application/json" \
  -d '{ "mode":"mission0" }'
```

### Smoke (Docker, mode=change, DIAG: fast)
Tama ajaa vain `lint` + `typecheck` (ei `npm test`), eli palautuu tyypillisesti nopeammin.
```bash
curl -sS -X POST "http://127.0.0.1:3011/agent/run" \
  -H "x-internal-token: ${AGENT_INTERNAL_TOKEN:-dev-token}" \
  -H "content-type: application/json" \
  -d '{ "mode":"change", "dryRun": true, "projectId":"demo", "task":"DIAG: fast gate smoke" }'
```

Huom:
- `mode=change` vaatii myos `OPENAI_API_KEY` + `GH_TOKEN` + `DATABASE_URL` (katso `docs/runbooks/agent_army_overview.md`).
 - `DIAG: gate smoke` ajaa myos `npm test` ja voi kestaa pitkaan.

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
