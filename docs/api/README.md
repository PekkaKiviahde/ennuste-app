# API docs – Ennustus (MVP)

Päivitetty: 2025-12-30

Tämä kansio sisältää **API-dokumentoinnin** (toteutusta varten).  
Tavoite: että UI-työnkulkujen (nappipolut + tilakoneet) toteutus on suoraviivaista ja testattavaa.

## Sisältö
- `docs/api/openapi.yaml` – OpenAPI 3.1 -luonnos (endpointit + skeemat)
- (Tuleva) `docs/api/examples.md` – esimerkkipyynnöt/palautukset (curl)

## Periaatteet (MVP)
- **Tenant-eristys**: backend johdattaa `tenant_id`:n sessiosta/tokenista (ei clientiltä).
- **RBAC**: jokaiselle endpointille sekä rooli- että tilatarkistus.
- **Lukitukset**:
  - kuukauden `M2_SENT_LOCKED` jälkeen kirjoitukset vain “corrections workflow” -polun kautta
  - työpaketin `W2_TRACK_ACTIVE` jälkeen koostumus ei muutu (paitsi korjauspolulla)
- **Append-only & audit**: kirjoitukset tallennetaan tapahtumina/versioina; tapahtumiin vain `actor_user_id`.

Katso myös:
- Nappipolut: `docs/workflows/nappipolut.md`
- Tilakoneet: `docs/workflows/state-machines.md`
- RBAC-matriisi: `docs/workflows/rbac-matrix.md`
- Traceability: `docs/traceability.md`


## Security
- `docs/api/security.md` – token/SSO-oletukset + audit-logit
