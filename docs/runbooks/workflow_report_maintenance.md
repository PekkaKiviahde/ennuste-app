# Runbook: workflow_report ylläpito (MVP)

Tavoite: pitää `docs/workflows/workflow_report.md` ajan tasalla kanonisten speksien (`spec/workflows/*`) mukaan.

Periaate:
- `spec/workflows/*` on totuus.
- `docs/workflows/workflow_report.md` on yhteenveto (docs).
- Agentti ajetaan ensin `dryRun=true`.
- Muutos viedään mainiin PR:n kautta käsin.

---

## Milloin tämä ajetaan

Aja, kun:
- `spec/workflows/*` muuttuu, TAI
- vähintään kerran viikossa (jos halutaan rytmi).

---

## Ennen ajoa (1 minuutti)

1) Varmista, että agent_api on käynnissä (portti 3011).
2) Varmista, että sinulla on tokenit käytössä:
- `AGENT_INTERNAL_TOKEN` (esim. `dev-token`)

---

## Ajo 1: mission0 (varmistus)

Aja:

```bash
curl -sS -X POST "http://127.0.0.1:3011/agent/run" \
  -H "x-internal-token: dev-token" \
  -H "authorization: Bearer dev-token" \
  -H "content-type: application/json" \
  -d '{ "mode":"mission0" }'
