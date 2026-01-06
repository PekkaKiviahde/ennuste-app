# API-endpointit (MVP)

## Ydinsisältö: suunnitelma -> ennustetapahtuma

GET /api/projects/{projectId}/litteras
- Palauttaa työpakettilittera- ja tavoitearvio-littera-listan.

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
- Yhteenveto työpakettisuunnittelu + ennustetapahtuma + kustannuslajisummat.

## SaaS-myyjan onboarding (konserni/yhtio)

POST /api/saas/groups
- Body: name
- Luo konsernin.

POST /api/saas/organizations
- Body: groupId?, name, slug, adminEmail
- Luo yhtiön, demoprojektin ja kutsulinkin pääkäyttäjälle.

POST /api/saas/organizations/{organizationId}/invites
- Body: email, roleCode=ORG_ADMIN
- Luo kutsulinkin yrityksen pääkäyttäjälle.

POST /api/invites/accept
- Body: token, pin, displayName?
- Hyväksyy kutsun, luo käyttäjän ja myöntää ORG_ADMIN + demoprojektin owner.

## Mitä muuttui
- Lisatty SaaS-myyjan onboarding-endpointit.
- Paivitettiin terminologia työpakettisuunnitteluun.
- Paivitettiin endpointit vastaamaan toteutusta (työpakettisuunnittelu ja ennustetapahtuma).

## Miksi
- API-minimi tarvitaan selkeään työpakettisuunnittelu -> ennustetapahtuma -virtaan.
- Onboarding tarvitsee erillisen polun konserni/yhtio/kutsu.

## Miten testataan (manuaali)
- Aja POST /api/planning-events ja vahvista GET /api/planning-events listassa.
- Aja POST /api/forecast-events ja vahvista GET /api/forecast-events listassa.
- Aja GET /api/report/target-summary ja varmista yhteenveto.
- Aja POST /api/saas/organizations ja vahvista kutsulinkki.
- Aja POST /api/invites/accept ja varmista ORG_ADMIN + demoprojektin owner.
