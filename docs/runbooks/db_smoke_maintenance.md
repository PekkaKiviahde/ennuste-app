# Runbook: DB smoke / VERIFY ylläpito (MVP)

Tavoite: pitää `docs/sql/VERIFY_INVARIANTS.sql` ja `docs/sql/SMOKE_E2E_CORE.sql` linjassa migraatioiden (`migrations/*`) kanssa.

Periaate:
- Skeeman totuus = `migrations/*`.
- Smoke/verify seuraa skeemaa. Smoke ei ole historian museo.
- Agentti saa muuttaa vain `docs/sql/*` (ei migraatioita).

---

## Milloin tämä ajetaan

Aja aina heti, kun:
- `migrations/*` muuttuu, TAI
- CI “DB smoke” kaatuu.

---

## Mitä agentti saa muuttaa

Sallittu:
- `docs/sql/VERIFY_INVARIANTS.sql`
- `docs/sql/SMOKE_E2E_CORE.sql`

Kielletty:
- `migrations/*`
- kaikki muut polut

---

## DB smoke (CI-pariteetti)

Käytä olemassa olevaa runbookia:
- `docs/runbooks/db-smoke.md`

CI-pariteetin ydin:
- aja migraatiot järjestyksessä
- aja VERIFY_INVARIANTS.sql
- aja SMOKE_E2E_CORE.sql
- odota: ei virheitä, lopussa tyypillisesti ROLLBACK

---

## Agentti-ajo (dryRun=true)

Aja agentti ja pyydä korjaamaan VERIFY/SMOKE vastaamaan skeemaa:

```bash
curl -sS -X POST "http://127.0.0.1:3011/agent/run" \
  -H "x-internal-token: dev-token" \
  -H "authorization: Bearer dev-token" \
  -H "content-type: application/json" \
  -d '{"mode":"change","projectId":"demo","dryRun":true,"task":"Korjaa docs/sql/VERIFY_INVARIANTS.sql ja/tai docs/sql/SMOKE_E2E_CORE.sql niin, että ne vastaavat migrations/* skeemaa. ALA muuta migrations tiedostoja. ALA muuta muita polkuja. Pida muutos minimissa. Tavoite: DB smoke menee lapi (migrations -> VERIFY -> SMOKE)."}'
