# API docs – Ennustus (MVP)

Päivitetty: 2026-01-02

Tämä kansio sisältää **API-dokumentoinnin** (toteutusta varten).  
Tavoite: että UI-työnkulkujen (nappipolut + tilakoneet) toteutus on suoraviivaista ja testattavaa.

## Sisältö
- `docs/api/openapi.yaml` – OpenAPI 3.1 -luonnos (endpointit + skeemat)
- (Tuleva) `docs/api/examples.md` – esimerkkipyynnöt/palautukset (curl)
- `docs/import-mapping-examples.json` – import-mapping esimerkit (budjetti + JYDA)

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
- `GET /api/me/capabilities` – UI-oikeudet (napit)
- `GET /api/organizations`
- `GET /api/projects`
- `POST /api/session/switch-org`
- `GET /api/projects/:projectId/permissions`
- `GET /api/projects/:projectId/litteras`
- `GET /api/projects/:projectId/target-batches`
- `GET /api/projects/:projectId/work-packages`
- `POST /api/projects/:projectId/work-packages`
- `GET /api/work-packages/:id`
- `POST /api/work-packages/:id/version`
- `GET /api/work-packages/:id/members`
- `POST /api/work-packages/:id/members`
- `POST /api/work-packages/:id/baseline-lock:request`
- `POST /api/work-packages/:id/baseline-lock:approve?step=1`
- `POST /api/work-packages/:id/baseline-lock:approve?step=2`
- `POST /api/work-packages/:id/weekly-updates`
- `POST /api/work-packages/:id/ghosts`
- `PUT /api/projects/:projectId/months/:YYYY-MM/forecast`
- `PUT /api/projects/:projectId/months/:YYYY-MM/lock-candidates`
- `POST /api/projects/:projectId/months/:YYYY-MM/send-reports`
- `POST /api/projects/:projectId/months/:YYYY-MM/corrections/request`
- `POST /api/projects/:projectId/months/:YYYY-MM/corrections/:corr_id/approve`
- `POST /api/projects/:projectId/months/:YYYY-MM/corrections/:corr_id/reject`
- `GET /api/projects/:projectId/months/:YYYY-MM/report-packages`
- `GET /api/report-packages/:package_id/download`
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
- `GET /api/terminology/dictionary?orgId=&locale=&fallback=`
- `PUT /api/import-mappings`
- `GET /api/incident-banner`

### Seller / Admin
- `POST /api/seller/tenants`
- `POST /api/seller/projects`
- `POST /api/seller/onboarding-links`
- `POST /api/admin/tenants/:tenantId/onboarding/submit`
- `POST /api/admin/tenants/:tenantId/users:invite`
- `PUT /api/admin/tenants/:tenantId/rbac`
- `PUT /api/admin/projects/:projectId/reporting-settings`
- `PUT /api/admin/projects/:projectId/approval-settings`
- `GET /api/admin/projects/:projectId/mappings`
- `PATCH /api/admin/projects/:projectId/mappings/:mappingId`

### Superadmin
- `PUT /api/superadmin/incident-banner`

## Write-endpointtien permissions + tilat

- `POST /api/projects/:projectId/work-packages`
  - Permission: `WORK_PHASE_CREATE`
- `POST /api/work-packages/:id/members`
  - Permission: `WORK_PHASE_MEMBER_CREATE`
  - Tila: **SETUP** (baseline ei lukittu), muuten `409 BASELINE_ALREADY_LOCKED`
- `POST /api/work-packages/:id/version`
  - Permission: `WORK_PHASE_VERSION_CREATE`
  - Tila: **SETUP** (baseline ei lukittu)
- `POST /api/work-packages/:id/baseline-lock:request`
  - Permission: `BASELINE_LOCK`
  - Tila: **SETUP** (baseline ei lukittu)
- `POST /api/work-packages/:id/baseline-lock:approve?step=1`
  - Permission: `BASELINE_LOCK_APPROVE_PM`
- `POST /api/work-packages/:id/baseline-lock:approve?step=2`
  - Permission: `BASELINE_LOCK_APPROVE_TJ`
- `POST /api/work-packages/:id/weekly-updates`
  - Permission: `WORK_PHASE_WEEKLY_UPDATE_CREATE`
  - Tila: **TRACK** (baseline lukittu), muuten `409 BASELINE_REQUIRED`
- `POST /api/work-packages/:id/ghosts`
  - Permission: `GHOST_ENTRY_CREATE`
  - Tila: **TRACK** (baseline lukittu), muuten `409 BASELINE_REQUIRED`
- `POST /api/projects/:projectId/months/:YYYY-MM/corrections/request`
  - Permission: `CORRECTION_PROPOSE`
- `POST /api/projects/:projectId/months/:YYYY-MM/corrections/:corr_id/approve`
  - Permission: `CORRECTION_APPROVE_FINAL`
- `POST /api/projects/:projectId/months/:YYYY-MM/corrections/:corr_id/reject`
  - Permission: `CORRECTION_APPROVE_FINAL`

## Tenant / org -konteksti

- `POST /api/session/switch-org`: vaihtaa tokenin org-kontekstin (membership tarkistus).
- `GET /api/projects`: käyttää tokenin `organization_id`:tä. `orgId` sallitaan vain jos `ALLOW_CROSS_ORG_QUERY=true` + membership.
- `GET /api/terminology/dictionary?orgId=...`: jos orgId annettu, vaatii auth ja membershipin; ilman orgId käyttää tokenin orgId:tä tai publicia.

## Muutosmuisti

### Mitä muuttui
- Lisättiin Phase 18 -raporttien endpointit ja MVP UI:lle listaus.
- Kuvattiin write-endpointtien permissions + tilavaatimukset ja tenant-konteksti.
- Yhdenmukaistettiin work-packages-terminologia ja month close -endpointit.

### Miksi
- UI tarvitsee raporttinäkymät (pääryhmät, viikko- ja kuukausitason seuranta sekä poikkeamat) suoraan DB-näkymistä.
- Nappipolut ja esimerkit käyttävät work-packages- ja month close -polkuja.

### Miten testataan (manuaali)
- `curl http://localhost:3000/api/projects/<projectId>/reports/main-group-current`
- `curl http://localhost:3000/api/projects/<projectId>/reports/weekly-ev`
- Avaa UI → valitse “Projekti”-tabi ja varmista taulukoiden data.
- Avaa `docs/api/examples.md` ja varmista, että polut vastaavat tätä listaa.


## Security
- `docs/api/security.md` – token/SSO-oletukset + audit-logit
