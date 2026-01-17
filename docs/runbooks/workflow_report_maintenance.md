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
```

---

## Ajo 2: change (dryRun=true)

Aja:

```bash
curl -sS -X POST "http://127.0.0.1:3011/agent/run" \
  -H "x-internal-token: dev-token" \
  -H "authorization: Bearer dev-token" \
  -H "content-type: application/json" \
  -d '{"mode":"change","projectId":"demo","dryRun":true,"task":"Paivita OLEMASSA OLEVAA tiedostoa docs/workflows/workflow_report.md spec/workflows/* pohjalta. Kirjoita suomeksi. ALA muuta yhtaan muuta tiedostoa. ALA koske spec/workflows/* tiedostoihin. Pida rakenne 00_workflow_outline.md mukaisena (Tavoite, Termit, Paatokset, Gate, Audit-eventit, Mita muuttui, Miksi, Miten testataan). Lisaa loppuun Source specs -lista kaikista luetuista spec/workflows/*.md tiedostoista."}'
```

Tarkista tulosteesta:
- mitä muutoksia agentti ehdottaa (diff / patch / ohje)
- että `dryRun` on `true`
- että vain `docs/workflows/workflow_report.md` muuttuu

---

## Muutoksen vienti PR:n kautta (käsin)

1) Päivitä `docs/workflows/workflow_report.md` agentin ehdotuksen mukaan (käsin).
2) Aja paikallisesti:

```bash
git status
git diff
```

3) Varmista, että vain `docs/workflows/workflow_report.md` muuttuu.
4) Tee commit ja push omalle branchille.
5) Avaa PR mainiin, pyydä katselmointi ja yhdistä.
