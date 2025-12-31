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

## Endpointit (MVP UI)

### Public
- `GET /health` – healthcheck
- `GET /version` – build/version info
- `POST /api/login` – dev-login (username + pin -> token)
- `GET /api/users` – käyttäjälista login-valintaan

### Authenticated
- `GET /api/me` – käyttäjä + organisaatiot
- `GET /api/organizations`
- `GET /api/projects`
- `POST /api/session/switch-org`
- `GET /api/projects/:projectId/permissions`
- `GET /api/projects/:projectId/litteras`
- `GET /api/projects/:projectId/target-batches`
- `GET /api/projects/:projectId/work-phases`
- `POST /api/projects/:projectId/work-phases`
- `GET /api/work-phases/:id`
- `POST /api/work-phases/:id/version`
- `GET /api/work-phases/:id/members`
- `POST /api/work-phases/:id/members`
- `POST /api/work-phases/:id/lock-baseline`
- `POST /api/work-phases/:id/weekly-update`
- `POST /api/work-phases/:id/ghost`
- `GET /api/projects/:projectId/reports/project-current`
- `GET /api/projects/:projectId/reports/work-phase-current`
- `GET /api/projects/:projectId/reports/main-group-current`
- `GET /api/projects/:projectId/reports/weekly-ev`
- `GET /api/projects/:projectId/reports/monthly-target-raw`
- `GET /api/projects/:projectId/reports/monthly-work-phase`
- `GET /api/projects/:projectId/reports/top-overruns`
- `GET /api/projects/:projectId/reports/lowest-cpi`
- `GET /api/projects/:projectId/reports/top-selvitettavat`
- `GET /api/projects/:projectId/reports/overlap`
- `GET /api/projects/:projectId/selvitettavat`
- `GET /api/projects/:projectId/corrections/queue`
- `POST /api/work-phases/:id/corrections/propose`
- `POST /api/corrections/:id/approve-pm`
- `POST /api/corrections/:id/approve-final`
- `POST /api/corrections/:id/reject`
- `GET /api/terminology/dictionary?orgId=&locale=&fallback=`

## Write-endpointtien permissions + tilat

- `POST /api/projects/:projectId/work-phases`
  - Permission: `WORK_PHASE_CREATE`
- `POST /api/work-phases/:id/members`
  - Permission: `WORK_PHASE_MEMBER_CREATE`
  - Tila: **SETUP** (baseline ei lukittu), muuten `409 BASELINE_ALREADY_LOCKED`
- `POST /api/work-phases/:id/version`
  - Permission: `WORK_PHASE_VERSION_CREATE`
  - Tila: **SETUP** (baseline ei lukittu)
- `POST /api/work-phases/:id/lock-baseline`
  - Permission: `BASELINE_LOCK`
  - Tila: **SETUP** (baseline ei lukittu)
- `POST /api/work-phases/:id/weekly-update`
  - Permission: `WORK_PHASE_WEEKLY_UPDATE_CREATE`
  - Tila: **TRACK** (baseline lukittu), muuten `409 BASELINE_REQUIRED`
- `POST /api/work-phases/:id/ghost`
  - Permission: `GHOST_ENTRY_CREATE`
  - Tila: **TRACK** (baseline lukittu), muuten `409 BASELINE_REQUIRED`
- `POST /api/work-phases/:id/corrections/propose`
  - Permission: `CORRECTION_PROPOSE`
  - Tila: **TRACK** (baseline lukittu), muuten `409 BASELINE_REQUIRED`
- `POST /api/corrections/:id/approve-pm`
  - Permission: `CORRECTION_APPROVE_PM`
- `POST /api/corrections/:id/approve-final`
  - Permission: `CORRECTION_APPROVE_FINAL`
- `POST /api/corrections/:id/reject`
  - Permission: `CORRECTION_APPROVE_PM` **tai** `CORRECTION_APPROVE_FINAL`

## Tenant / org -konteksti

- `POST /api/session/switch-org`: vaihtaa tokenin org-kontekstin (membership tarkistus).
- `GET /api/projects`: käyttää tokenin `organization_id`:tä. `orgId` sallitaan vain jos `ALLOW_CROSS_ORG_QUERY=true` + membership.
- `GET /api/terminology/dictionary?orgId=...`: jos orgId annettu, vaatii auth ja membershipin; ilman orgId käyttää tokenin orgId:tä tai publicia.

## Muutosmuisti

### Mitä muuttui
- Lisättiin Phase 18 -raporttien endpointit ja MVP UI:lle listaus.
- Kuvattiin write-endpointtien permissions + tilavaatimukset ja tenant-konteksti.

### Miksi
- UI tarvitsee raporttinäkymät (pääryhmät, viikko- ja kuukausitason seuranta sekä poikkeamat) suoraan DB-näkymistä.

### Miten testataan (manuaali)
- `curl http://localhost:3000/api/projects/<projectId>/reports/main-group-current`
- `curl http://localhost:3000/api/projects/<projectId>/reports/weekly-ev`
- Avaa UI → valitse “Projekti”-tabi ja varmista taulukoiden data.


## Security
- `docs/api/security.md` – token/SSO-oletukset + audit-logit
