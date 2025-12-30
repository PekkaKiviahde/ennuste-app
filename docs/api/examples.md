# API examples (curl) – Ennustus (MVP)

Päivitetty: 2025-12-30

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
curl -X POST /api/projects/<project_id>/months/2025-12:send-reports \
  -H "Authorization: Bearer $TOKEN"
```

## Request correction after lock (TJ)
```bash
curl -X POST /api/projects/<project_id>/months/2025-12/corrections:request \
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
