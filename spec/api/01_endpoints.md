# API-endpointit (MVP)

## Ydinsisältö: suunnitelma -> ennustetapahtuma

GET /api/projects/{projectId}/litteras
- Palauttaa työlittera- ja tavoitearvio-littera-listan.

GET /api/planning-events?projectId={projectId}&targetLitteraId={litteraId}
- Palauttaa suunnitelma-tapahtumat (append-only) tavoitearvio-litteralle.

POST /api/planning-events
- Body: projectId, targetLitteraId, createdBy, status, summary?, observations?, risks?, decisions?, attachments?
- Luonti on append-only. Ei päivityksiä.

GET /api/forecast-events?projectId={projectId}&targetLitteraId={litteraId}
- Palauttaa ennustetapahtumat (append-only) tavoitearvio-litteralle.

POST /api/forecast-events
- Body: projectId, targetLitteraId, createdBy, comment?, technicalProgress?, financialProgress?, kpiValue?, lines[], ghostEntries?
- lines[]: { costType, forecastValue, memoGeneral? }
- Luonti on append-only. Ei päivityksiä.

GET /api/report/target-summary?projectId={projectId}&targetLitteraId={litteraId}
- Yhteenveto suunnitelma + ennustetapahtuma + kustannuslajisummat.

## Mitä muuttui
- Päivitettiin endpointit vastaamaan toteutusta (suunnitelma ja ennustetapahtuma).

## Miksi
- API-minimi tarvitaan selkeään suunnitelma -> ennustetapahtuma -virtaan.

## Miten testataan (manuaali)
- Aja POST /api/planning-events ja vahvista GET /api/planning-events listassa.
- Aja POST /api/forecast-events ja vahvista GET /api/forecast-events listassa.
- Aja GET /api/report/target-summary ja varmista yhteenveto.
