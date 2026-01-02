# API examples (curl) – Ennustus (MVP)

Päivitetty: 2026-01-02

> Huom: nämä ovat esimerkkejä. Tarkat polut, auth ja payloadit riippuvat toteutuksesta.
> Katso OpenAPI: `docs/api/openapi.yaml`

## Auth
Oletus:
- `Authorization: Bearer <token>`

---

## Create work package
```bash
curl -X POST /api/projects/<project_id>/work-packages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"LVIS-työt","description":"LVI kokonaisuus","lead_code":"3200"}'
```

## Request baseline lock
```bash
curl -X POST /api/work-packages/<wp_id>/baseline-lock:request \
  -H "Authorization: Bearer $TOKEN"
```

## Approve baseline lock (PM step=1)
```bash
curl -X POST "/api/work-packages/<wp_id>/baseline-lock:approve?step=1" \
  -H "Authorization: Bearer $TOKEN"
```

## Weekly update
```bash
curl -X POST /api/work-packages/<wp_id>/weekly-updates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"week_ending":"2025-12-27","percent_complete":35,"memo":"Työt etenee"}'
```

## Add ghost
```bash
curl -X POST /api/work-packages/<wp_id>/ghosts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"month":"2025-12","amount_eur":12000,"note":"Alkavat ostolaskut"}'
```

## Set monthly forecast
```bash
curl -X PUT /api/projects/<project_id>/months/2025-12/forecast \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"project_id":"<project_id>","month":"2025-12","forecast_total_eur":250000,"note":"Kuukausiennuste"}'
```

## Send reports (locks month)
```bash
curl -X POST /api/projects/<project_id>/months/2025-12/send-reports \
  -H "Authorization: Bearer $TOKEN"
```

## Request correction after lock (TJ)
```bash
curl -X POST /api/projects/<project_id>/months/2025-12/corrections/request \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Korjaus: ghost puuttui","patch":{"ghost_adjustments":[{"amount_eur":5000,"note":"Lisäghost"}]}}'
```

## Set incident banner (superadmin)
```bash
curl -X PUT /api/superadmin/incident-banner \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"state":"I1_INVESTIGATING","severity":"SEV1","title":"Häiriö: raportit","message":"Selvitämme","affects":["REPORTS"],"next_update_at":"2025-12-30T12:00:00Z"}'
```

## Set import mapping (budget)
```bash
curl -X PUT /api/import-mappings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "<project_id>",
    "type": "BUDGET",
    "createdBy": "admin",
    "mapping": {
      "columns": {
        "littera_code": "Litterakoodi",
        "littera_title": "Litteraselite",
        "labor_eur": "Työ €",
        "material_eur": "Aine €",
        "subcontract_eur": "Alih €",
        "rental_eur": "Vmiehet €",
        "other_eur": "Muu €",
        "sum_eur": "Summa"
      }
    }
  }'
```

## Set import mapping (JYDA)
```bash
curl -X PUT /api/import-mappings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "<project_id>",
    "type": "JYDA",
    "createdBy": "admin",
    "mapping": {
      "mapping": {
        "sheet_name": "Jyda-ajo",
        "code_column": "A",
        "name_column": "B",
        "metrics": {
          "JYDA.TARGET_COST": "C",
          "JYDA.COMMITTED_COST": "D",
          "JYDA.ACTUAL_COST": "E",
          "JYDA.ACTUAL_COST_INCL_UNAPPROVED": "F",
          "JYDA.FORECAST_COST": "G"
        },
        "csv_code_header": "Koodi",
        "csv_name_header": "Nimi",
        "csv_headers": {
          "JYDA.TARGET_COST": "Tavoitekustannus",
          "JYDA.COMMITTED_COST": "Sidottu kustannus",
          "JYDA.ACTUAL_COST": "Toteutunut kustannus",
          "JYDA.ACTUAL_COST_INCL_UNAPPROVED": "Toteutunut kustannus (sis. hyväksymätt.)",
          "JYDA.FORECAST_COST": "Ennustettu kustannus"
        }
      }
    }
  }'
```

## Mitä muuttui
- Lisätty muutososiot dokumentin loppuun.
- Päivitetty month close -polut yhdenmukaisiksi API-dokumentin kanssa.
- Täsmennetty placeholderit vastaamaan README/OpenAPI-linjaa.

## Miksi
- Dokumentaatiokäytäntö: muutokset kirjataan näkyvästi.
- API-polkujen pitää vastata nappipolkuja ja toteutusta.
 - Esimerkkien pitää olla luettavissa yhdessä README:n polkulistauksen kanssa.

## Miten testataan (manuaali)
- Avaa dokumentti ja varmista, että osiot ovat mukana.
- Vertaile polut `docs/api/README.md` -listaan ja varmista yhtenäisyys.
