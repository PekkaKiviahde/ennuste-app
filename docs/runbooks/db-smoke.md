# RUNBOOK – DB smoke (core invariants) – Ennustus (MVP)

Päivitetty: 2026-01-02

Tämä runbook kuvaa miten ajetaan **DB-smoke** ja **invarianttien verify** paikallisesti.

---

## 1) Milloin tätä käytetään
- Ennen mergeä, kun DB-näkymiä tai sääntöjä on muutettu
- Ennen staging/prod-deployta (gate: verify + smoke)
- Kun epäillään että **plan-before-forecast**, **policy A** tai **append-only** on rikkoutunut

---

## 2) Esivaatimukset
- Postgres käynnissä
- Migrations ajettu (kaikki `migrations/*.sql`)
- `psql` käytettävissä

---

## 3) Aja migraatiot (esimerkki)

```bash
export PGHOST=localhost
export PGPORT=5432
export PGUSER=postgres
export PGPASSWORD=postgres
export PGDATABASE=ennuste

for f in $(ls migrations/*.sql | sort); do
  echo "Running $f"
  psql -v ON_ERROR_STOP=1 -f "$f"
done
```

### PowerShell (Windows)

```powershell
$env:PGHOST="localhost"
$env:PGPORT="5432"
$env:PGUSER="postgres"
$env:PGPASSWORD="postgres"
$env:PGDATABASE="ennuste"

Get-ChildItem migrations\*.sql | Sort-Object Name | ForEach-Object {
  Write-Host "Running $($_.FullName)"
  psql -v ON_ERROR_STOP=1 -f $_.FullName
}

psql -v ON_ERROR_STOP=1 -f docs/sql/VERIFY_INVARIANTS.sql
psql -v ON_ERROR_STOP=1 -f docs/sql/SMOKE_E2E_CORE.sql
```

---

## 4) Aja invarianttien verify

```bash
psql -v ON_ERROR_STOP=1 -f docs/sql/VERIFY_INVARIANTS.sql
```

---

## 5) Aja E2E-smoke (rollback)

```bash
psql -v ON_ERROR_STOP=1 -f docs/sql/SMOKE_E2E_CORE.sql
```

> Huom: `SMOKE_E2E_CORE.sql` ajetaan transaktion sisällä ja **ROLLBACK** lopussa. Se ei jätä pysyvää dataa.

---

## 6) Mitä muuttui
- Lisätty DB-smoke-runbook, joka kuvaa migraatiot + verify + smoke -ajot.

## 7) Miksi
- Tarvitaan toistettava tapa varmistaa ydininvariantit ilman pysyvää datan likaamista.

## 8) Miten testataan (manuaali)
- Aja kohdan 3–5 komennot paikallisesti.
- Varmista, että `SMOKE_E2E_CORE.sql` tulostaa ID-rivit eikä jätä dataa (ROLLBACK).
