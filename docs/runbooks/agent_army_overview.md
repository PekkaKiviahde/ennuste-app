# ALOITA TÄSTÄ: agenttiarmeija (MVP) – käyttö, ylläpito, troubleshooting

## 1) Tavoite
Tämä koonti kertoo “amatöörille sopivasti” miten agenttiarmeija ajetaan läpi MVP:ssä:
- mitä agenttiarmeija on
- miten se käynnistetään (Docker)
- miten sitä käytetään (`mission0`, `change dryRun=true`, `change dryRun=false`)
- mitä env-muuttujia tarvitaan
- mitä `prUrl` vs `compareLink` tarkoittaa
- mitä turvarajoja on (allowed paths)
- yleisimmät virheet ja korjaukset

Jos haluat pelkän smoke-ajon: katso `docs/runbooks/agent_api.md`.

---

## 2) Mitä agenttiarmeija tekee (mission0 + change)

**`POST /agent/run`** on ainoa MVP-endpoint.

Kaksi ajotilaa:
- `mode=mission0`: read-only inventaario/diagnoosi (ei tee git-muutoksia).
- `mode=change`: tekee muutoksen worktreeyn, ajaa gate-komennot, ja:
  - `dryRun=true`: palauttaa mitä muuttuisi (ei commit/push).
  - `dryRun=false`: tekee commit + push + avaa PR (tai antaa `compareLink` fallbackina).

Lisätieto arkkitehtuurista ja taustapäätöksistä: `docs/agenttiarmeija_kaynnistys_paketti_v2.md`.

---

## 3) Turvallisuusrajat (allowed paths)

MVP:ssä agentin muutosalueet ovat rajatut, mutta eivät “doc-only”:
- `docs/runbooks`
- `docs/workflows`
- `apps/api/src`
- `apps/web/src`
- `packages`
- `migrations`
- `spec/` on kanoninen totuus (erityisesti `spec/workflows/*`) → älä anna agentin muokata speksejä ilman erillistä päätöstä

Jos agentti yrittää koskea kiellettyihin polkuihin, ajo epäonnistuu ja vastauksessa näkyy tyypillisesti `deniedFiles`.

Workflow-raportin rajaukset: `docs/runbooks/agent_workflow_report.md`.

Source of truth: `apps/api/src/agent/orchestrator.ts:37` ja `apps/api/agent.config.json:3`. Docs kuvaa näitä.

---

## 4) Quickstart (Docker + 3 curlia)

Täydet smoke-ohjeet: `docs/runbooks/agent_api.md`.

### 4.1 Pakolliset envit
- `AGENT_INTERNAL_TOKEN` (API:n sisäinen token-header)
- `DATABASE_URL` (`mode=change`)
- `OPENAI_API_KEY` (`mode=change`)
- `GH_TOKEN` (`mode=change`, myös PR-automaatio + git fetch/push)

Huom:
- `mode=change` vaatii nämä kaikki; jos puuttuu, agentti failaa nopeasti selkeällä virheellä.

### 4.2 Käynnistä (Docker)
```bash
export AGENT_INTERNAL_TOKEN=dev-token
export DATABASE_URL="postgresql://codex:codex@db:5432/codex"
export OPENAI_API_KEY="sk-..."
export GH_TOKEN="ghp_..."

docker compose -f docker-compose.yml -f docker-compose.agent-api.yml up -d --build db agent_api
docker compose -f docker-compose.yml -f docker-compose.agent-api.yml logs -f --tail=200 agent_api
```

Huom (fresh DB volume):
- `agent_api` ajaa automaattisesti migraatiot käynnistyksessä (`npm run db:migrate`). Odota että se valmistuu ennen `mode=change`-ajoja.

### 4.3 Ajo 1: mission0 (read-only)
```bash
curl -sS -X POST "http://127.0.0.1:3011/agent/run" \
  -H "x-internal-token: ${AGENT_INTERNAL_TOKEN}" \
  -H "content-type: application/json" \
  -d '{ "mode":"mission0" }'
```

### 4.4 Ajo 2: change (dryRun=true)
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

### 4.5 Ajo 3: change (dryRun=false) – commit + push + PR
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

---

## 5) Miten PR syntyy (prUrl vs compareLink)

Agentin `dryRun=false`-ajo pyrkii luomaan PR:n automaattisesti:
- `prUrl`: suora linkki avattuun PR:ään (onnistui).
- `compareLink`: GitHub “compare” -linkki, jolla voit luoda PR:n käsin (fallback).

Tyypillinen MVP-käytäntö:
- agentti tekee PR:n
- ihminen tarkistaa ja mergaa

Miksi `prUrl` voi olla `null` vaikka push onnistui:
- GitHub API -kutsu epäonnistui (rate limit, puuttuvat oikeudet, verkko-ongelma)
- `GH_TOKEN` on väärä / vanhentunut / oikeudet puuttuvat

---

## 6) Workflow-raportin rutiini (Task B)

Workflow-raportti pidetään docs-yhteenvedossa:
- generointi: `docs/runbooks/agent_workflow_report.md`
- ylläpitorytmi ja checklist: `docs/runbooks/workflow_report_maintenance.md`

### 6.1 Yksi komento: workflow_report PR (amatöörille)
Tavoite: päivitä `docs/workflows/workflow_report.md` vain `spec/workflows/*` pohjalta ja tee PR automaattisesti.

Pakolliset envit:
- `AGENT_INTERNAL_TOKEN`
- `OPENAI_API_KEY`
- `GH_TOKEN`

Valinnainen:
- `AGENT_PROJECT_ID` (default: `demo`)

Yksi komento:
```bash
export AGENT_INTERNAL_TOKEN=dev-token
export OPENAI_API_KEY="sk-..."
export GH_TOKEN="ghp_..."
export AGENT_PROJECT_ID=demo

npm run agent:workflow-report
```

Odotus:
- Skripti käynnistää `db` + `agent_api` Dockerilla.
- Ajaa yhden `mode=change` (`dryRun=false`) -pyynnön, joka saa muokata vain `docs/workflows/workflow_report.md`.
- Tulostaa lopuksi joko `PR: <url>` tai `COMPARE: <url>`.

---

## 7) Troubleshooting (yleisimmät virheet)

### 7.1 `401 Unauthorized` / “invalid token”
Oire:
- endpoint palauttaa 401/403 tai “Unauthorized”.

Tarkista:
- `x-internal-token` header vastaa `AGENT_INTERNAL_TOKEN` arvoa
- agent_api-kontti käyttää samaa env-arvoa (compose + `.env`)

### 7.2 “Missing env” (DATABASE_URL / OPENAI_API_KEY / GH_TOKEN)
Oire:
- `mode=change` failaa heti (esim. `GH_TOKEN missing`).

Korjaus:
- aseta puuttuva env ja käynnistä agent_api uudelleen
- perusrunbook: `docs/runbooks/agent_api.md`

### 7.3 “relation does not exist” (DB migraatiot puuttuu)
Oire:
- virhe kuten `relation "agent_sessions" does not exist`.

Korjaus:
```bash
docker compose -f docker-compose.yml -f docker-compose.agent-api.yml exec -T agent_api npm run db:migrate
```

### 7.4 GitHub auth: `git fetch origin --prune` / `git push` authentication failed
Oire:
- `Authentication failed` tai “Invalid username or token”.

Korjaus:
- varmista että `GH_TOKEN` on asetettu ja sillä on write-oikeudet repo:hon
- jos `origin` on HTTPS GitHub, agentti asettaa `origin`-URL:n token-muotoon ajon ajaksi

### 7.5 `prUrl` puuttuu / `null`
Oire:
- push onnistui, mutta PR-linkki puuttuu.

Korjaus:
- avaa `compareLink` ja luo PR käsin
- tarkista `GH_TOKEN` oikeudet (pull requests + contents write)

### 7.6 `npm ERR! ENOTDIR` (apps/web/node_modules ei ole hakemisto)
Oire:
- CI (tai paikallinen `npm ci`) kaatuu, koska `apps/web/node_modules` on tiedosto/symlink, ei hakemisto.

Korjaus:
- varmista että `node_modules` ja `apps/web/node_modules` eivät ole gitissä seurattuja (symlink/tiedosto)
- CI:ssä on siivous-step ennen `npm ci` (belt & suspenders)

### 7.7 Commit signing / `403 | Author is invalid`
Oire:
- commitointi/push blokkaa Codespaces signeerauksen tai author-identiteetin takia.

Korjaus:
- katso päätöspuu: `docs/runbooks/commit_signing.md`

---

## 8) Päätökset joita pitää kysyä Pekalta

Ennen kuin laajennat agentin kykyjä, kysy päätös (ja dokumentoi tarvittaessa ADR:ään):
- Saako agentti muokata `spec/*` (erityisesti `spec/workflows/*`) vai pidetäänkö ne read-only?
- Laajennetaanko allowed paths -listaa doc-polkujen ulkopuolelle (ja mitkä polut)?
- Mitkä gate-komennot ovat pakollisia ja mitkä ovat “best effort” (CI vs paikallinen)?

---

## 9) Linkit (lähde-runbookit)
- `docs/runbooks/agent_api.md`
- `docs/runbooks/agent_workflow_report.md`
- `docs/runbooks/workflow_report_maintenance.md`
- `docs/runbooks/commit_signing.md`
- `docs/runbooks/CODEX_STARTUP.md`
