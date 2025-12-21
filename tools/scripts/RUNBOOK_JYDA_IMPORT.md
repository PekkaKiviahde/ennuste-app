# Jyda Python import - Runbook

Päivitetty: 2025-12-16

## 1) Esivaatimukset
- Python 3.10+ (suositus)
- Postgres käynnissä ja migraatiot ajettu: 0001, 0002, 0003
- Excel-tiedosto suljettuna (ettei OneDrive/Excel lukitse sitä)

## 2) Asennus
Aja repo-juuressa:

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
pip install -r tools/scripts/requirements.txt
```

## 3) Konfigurointi
Tee tiedosto `tools/scripts/.env` (.env.template pohjalta) ja aseta DATABASE_URL.

## 4) Ajo (xlsm)
```bash
set DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DBNAME
python tools/scripts/import_jyda.py --file "excel/OMA_TIEDOSTO.xlsm" --project-id <UUID>
```

## 5) Dry-run (ei kirjoita DB:hen)
```bash
python tools/scripts/import_jyda.py --file "excel/OMA_TIEDOSTO.xlsm" --project-id <UUID> --dry-run
```

## 6) Mitä raporttinäkymää käytän?
Koska Jyda-ajo on snapshot, käytä:
- `v_actuals_latest_snapshot`
- `v_actuals_latest_snapshot_mapped`
- `v_mapping_coverage_latest_snapshot`
(Ne tulevat migraatiosta `0003_jyda_snapshot_views.sql`)

