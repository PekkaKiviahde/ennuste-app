# Agenttiarmeija: task-katalogi (amatöörille)

## Mita muuttui
- Uusi task-katalogi: valmiit, pienet tehtavamallit agenttiarmeijalle.

## Miksi
- Vahentaa "miten kirjoitan taskin" -epavarmuutta.
- Vahentaa shell-quote virheita (kaytetaan /tmp/agent_req.json -tapaa).

## Miten testataan (manuaali)
1) Aja `bash tools/scripts/dev-up.sh --auto`.
2) Kaynnista agentti: `docker compose -f docker-compose.yml -f docker-compose.agent-api.yml up -d --build agent_api`
3) Aja task T00 (DIAG: fast) ja varmista `status: ok`.

---

## Perussaannot (pidä nama aina)
- Aloita aina `dryRun: true`.
- Rajaa muutos yhteen tiedostoon / yhteen pieneen asiaan.
- Ala koske `spec/*` ilman erillista paatosta/tehtavaa (AGENTS.md).
- Jos taskissa on paljon lainausmerkkeja, kayta /tmp JSON -tiedostoa (alla).
- `projectId` on UUID (ei "demo").

## Kuinka ajetaan (suositus: /tmp/agent_req.json)

1) Kirjoita pyynto tiedostoon:
```bash
cat > /tmp/agent_req.json <<'JSON'
{
  "mode": "change",
  "dryRun": true,
  "projectId": "cb1b9b85-d1d4-4b00-b0b4-774b8a35e241",
  "task": "T00: DIAG: fast gate smoke"
}
JSON
```

2) Laheta pyynto:
```bash
curl -sS -X POST http://127.0.0.1:3011/agent/run \
  -H "x-internal-token: dev-token" \
  -H "content-type: application/json" \
  --data-binary @/tmp/agent_req.json
```

3) Kun dryRun on ok, muuta pyyntoon `dryRun: false` ja aja sama curl uudelleen.

---

## Taskit (kopioi sellaisenaan task-kenttaan)

### T00 (diag): DIAG: fast gate smoke
Kuvaus: nopea tarkistus (lint + typecheck), ei `npm test`.
Task:
`DIAG: fast gate smoke`

### T01 (docs): Paivita yksi runbook
Kuvaus: pieni docs-muutos, vain `docs/runbooks/*`.
Task:
`Paivita tiedostoa docs/runbooks/CODEX_STARTUP.md: lisa auki "Nopea tarkistus" -osio. Ala muokkaa muita tiedostoja.`

### T02 (ui): Pieni tekstikorjaus UI:ssa
Kuvaus: vain `apps/web/src` (UI), pida muutos pienenä.
Task:
`Paivita tiedostoa apps/web/src/app/(app)/raportti/page.tsx: tarkenna otsikon tai kuvauksen sanamuotoa suomeksi. Ala muokkaa muita tiedostoja.`

### T03 (ui+report): Koostumusnakyma tarkistus
Kuvaus: tarkista/korjaa vain yksi UI-tiedosto.
Task:
`Paivita tiedostoa apps/web/src/app/(app)/raportti/koostumus/page.tsx: paranna tyhjan tilan teksti (kun riveja ei ole). Ala muokkaa muita tiedostoja.`

### T10 (workflow report): Paivita docs/workflows/workflow_report.md
Kuvaus: aja valmiilla runbookilla (Task B).
Ohje: katso `docs/runbooks/agent_workflow_report.md`.

### T20 (db-smoke): Korjaa VERIFY/SMOKE SQL
Kuvaus: kayta valmista runbookia.
Ohje: katso `docs/runbooks/db_smoke_maintenance.md`.

---

## Vianhaku (nopea)
- Jos saat `strict_json_parse_failed`: taskissa on usein lainausmerkki/escape-ongelma -> kayta /tmp JSON -tiedostoa ja pida task yksinkertaisena.
- Jos saat `deniedFiles`: agentti yritti koskea kiellettyyn polkuun -> tiukenna task (yksi tiedosto).
- Jos saat `git fetch ... Authentication failed`: tarkista `GH_TOKEN` ja etta agentti saa sen `.env`-tiedostosta.
- Jos ajo jumittaa `npm test`: kayta `DIAG: fast` tai tee docs-only muutos.

