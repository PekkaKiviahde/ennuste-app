# HANDOFF 2026-01-27: Agenttiarmeija + dev-ymparisto (LUKITTU)

Tama dokumentti on "master-kooste" taman keskustelun tuloksista. Se lukitsee teknisen totuuden siita, mita rakennettiin ja miten sita kaytetaan.

## Mita muuttui
- Agenttiarmeija (agent_api) saatiin toimimaan vakaasti devissa ja PR-automaatio kuntoon.
- Lisattiin "DIAG: fast" (lint + typecheck) ja docs-only gate-kevennys, jotta docs-muutokset eivat jumitu testeihin.
- Lisattiin raporttiin uusi nakyma: **tyopaketin koostumus item-tasolla** (`/raportti/koostumus`).
- Lisattiin agenttiryhmalle task-katalogi (valmiit task-mallit + /tmp JSON -ajotapa).

## Miksi
- Amatoorille helppo ja ennustettava dev-tyo: agentti tekee PR:n, mutta ei mergea.
- Vahennetaan yleisimmat kompastukset:
  - shell-quote/JSON virheet (`curl -d '{...}'` vs /tmp tiedosto)
  - GH_TOKEN yliajo ja muotovirheet
  - porttien sekoittaminen (Postgres 5433 ei ole selaimelle)

## Tekninen totuus (lukittu)

### Kontit ja portit (dev)
- Next UI: portti `3000` (kontti `codex_next_web`)
- Postgres: portti `5433` (kontti `codex_saas_db`) -> EI selaimelle
- pgAdmin: portti `5050` (kontti `codex_saas_pgadmin`)
- agent_api: portti `3011` (kontti `codex_agent_api`) -> vain kun kaytetaan agenttia

### Oikeat URLit (Codespaces)
- UI: `https://<codespace>-3000.app.github.dev/login`
- Raportti: `/raportti`
- Koostumus (item-taso): `/raportti/koostumus`
- Tavoitearvion mappays: `/tavoitearvio/mappaus`
- pgAdmin: `https://<codespace>-5050.app.github.dev`

Huom:
- `127.0.0.1:5433` on Postgresin portti. Jos avaat sen selaimessa, saat `ERR_EMPTY_RESPONSE` (oikein, koska se ei ole HTTP-palvelu).

### Agenttiarmeija (MVP)
- Agentin endpoint: `POST /agent/run`
- Modet:
  - `mode=mission0`: read-only inventaario/diagnoosi
  - `mode=change`: tekee muutoksen worktreehen, ajaa gate-komennot ja voi avata PR:n
- PR/merge:
  - agentti tekee branch + commit + push + PR
  - agentti EI mergea itse

### Task-ajotapa (vakio)
Suositus: kayta aina `/tmp/agent_req.json` -tiedostoa, jotta lainausmerkki- ja escape-ansat eivat riko pyyntoa.
Katso: `docs/runbooks/agent_task_catalog.md`.

### Gate-kaytanto
- `DIAG: fast` ajaa vain `lint + typecheck` (ei `npm test`).
- Docs-only muutosajossa gate on kevennetty (ei `npm test`), jotta docs-taskit eivat roiku.

### GH_TOKEN (GitHub auth)
MVP-oppitunti:
- `GH_TOKEN` ei saa olla muotoa `export GH_TOKEN=...` (valilyonnit -> auth failaa).
- agent_api ottaa `GH_TOKEN` arvon `.env`-tiedostosta (compose-yliajo poistettu).

## Toteutetut PR:t (taman keskustelun aikana)
- PR #193: DIAG: fast -kuvaus runbookiin.
- PR #194: infra-fixit (GH_TOKEN override, DIAG: fast, docs-only gate, parserin sieto virheelliselle `\\${...}` escapelle, testit).
- PR #195: CODEX_STARTUP "Nopea tarkistus".
- PR #196: Raportti: tyopaketin koostumus item-tasolla (`/raportti/koostumus`) + report-query.
- PR #197: Agenttiarmeijan task-katalogi (`docs/runbooks/agent_task_catalog.md`).

## Miten testataan (manuaali)

### A) Dev stack
1) `bash tools/scripts/dev-up.sh --auto`
2) Avaa UI (Codespaces Ports -> 3000 -> Open in Browser)

### B) Agentti (nopea tarkistus)
1) Kaynnista agentti:
   `docker compose -f docker-compose.yml -f docker-compose.agent-api.yml up -d --build agent_api`
2) Health:
   `curl -sS -H "x-internal-token: dev-token" http://127.0.0.1:3011/agent/health`
3) DIAG:
   `curl -sS -X POST http://127.0.0.1:3011/agent/run -H "x-internal-token: dev-token" -H "content-type: application/json" -d '{"mode":"change","dryRun":true,"projectId":"cb1b9b85-d1d4-4b00-b0b4-774b8a35e241","task":"DIAG: fast gate smoke"}'`

### C) Koostumusnakyma
1) Mene `/tavoitearvio/mappaus` ja mappaa ainakin yksi leaf item tyopakettiin.
2) Mene `/raportti/koostumus` ja varmista:
   - tyopaketti-nakyma listaa itemit
   - EUR-summa naytetaan

## Rajaukset ja tiedossa olevat asiat
- `projectId` on UUID (ei "demo").
- Integraatiot (Gmail/Graph tms.) eivat kuulu tahan koosteeseen; tassa keskityttiin dev-tyohon ja sovelluksen domain-nakymaan.

