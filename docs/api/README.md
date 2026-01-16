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
- **Base path**: OpenAPI käyttää polkulistauksessa basea `/api`, joten alla olevat polut ovat muodossa `/...` (kutsuissa: `/api/...`). `month` on muodossa `YYYY-MM`.

Katso myös:
- Nappipolut: `docs/workflows/nappipolut.md`
- Tilakoneet: `docs/workflows/state-machines.md`
- RBAC-matriisi: `docs/workflows/rbac-matrix.md`
- Traceability: `docs/traceability.md`

## Endpointit (MVP UI)

### Public
- `GET /health` – healthcheck
- `GET /version` – build/version info
- `POST /login` – dev-login (username + pin -> token)
- `GET /users` – käyttäjälista login-valintaan

### Authenticated
- `GET /me` – käyttäjä + organisaatiot
- `GET /me/capabilities` – UI-oikeudet (napit)
- `GET /organizations`
- `GET /projects`
- `POST /session/switch-org`
- `GET /projects/{project_id}/permissions`
- `GET /projects/{project_id}/litteras`
- `GET /projects/{project_id}/target-batches`
- `GET /projects/{project_id}/work-packages`
- `POST /projects/{project_id}/work-packages`
- `PUT /work-packages/{wp_id}`
- `GET /work-packages/{wp_id}/context`
- `POST /work-packages/{wp_id}/version`
- `POST /work-packages/{wp_id}/members`
- `POST /work-packages/{wp_id}/baseline-lock:request`
- `POST /work-packages/{wp_id}/baseline-lock:approve?step=1`
- `POST /work-packages/{wp_id}/baseline-lock:approve?step=2`
- `POST /work-packages/{wp_id}/weekly-updates`
- `POST /work-packages/{wp_id}/ghosts`
- `GET /projects/{project_id}/unmapped-actuals`
- `POST /projects/{project_id}/unmapped-actuals/{unmapped_id}:assign`
- `PUT /projects/{project_id}/months/{month}/forecast`
- `PUT /projects/{project_id}/months/{month}/lock-candidates`
- `POST /projects/{project_id}/months/{month}/send-reports`
- `POST /projects/{project_id}/months/{month}/corrections/request`
- `POST /projects/{project_id}/months/{month}/corrections/{correction_id}/approve`
- `POST /projects/{project_id}/months/{month}/corrections/{correction_id}/reject`
- `GET /projects/{project_id}/months/{month}/report-packages`
- `GET /report-packages/{package_id}/download`
- `GET /projects/{project_id}/reports/project-current`
- `GET /projects/{project_id}/reports/work-phase-current`
- `GET /projects/{project_id}/reports/main-group-current`
- `GET /projects/{project_id}/reports/weekly-ev`
- `GET /projects/{project_id}/reports/monthly-target-raw`
- `GET /projects/{project_id}/reports/monthly-work-phase`
- `GET /projects/{project_id}/reports/top-overruns`
- `GET /projects/{project_id}/reports/lowest-cpi`
- `GET /projects/{project_id}/reports/top-selvitettavat`
- `GET /projects/{project_id}/reports/overlap`
- `GET /projects/{project_id}/selvitettavat`
- `GET /projects/{project_id}/corrections/queue`
- `GET /terminology/dictionary?orgId=&locale=&fallback=`
- `PUT /import-mappings`
- `GET /incident-banner`

### Seller / Admin
- `POST /saas/groups` *(valinnainen konserni)*
- `POST /saas/organizations` *(yhtiö + demoprojekti + ensimmäinen ORG_ADMIN-kutsu)*
- `POST /saas/organizations/{organizationId}/invites` *(resend / uusi ORG_ADMIN-kutsu)*
- `POST /invites/accept` *(julkinen kutsulinkin hyväksyntä)*
- `POST /admin/tenants/{tenant_id}/onboarding/submit`
- `POST /admin/tenants/{tenant_id}/users:invite`
- `PUT /admin/tenants/{tenant_id}/rbac`
- `PUT /admin/projects/{project_id}/reporting-settings`
- `PUT /admin/projects/{project_id}/approval-settings`
- `GET /admin/projects/{project_id}/mappings`
- `PATCH /admin/projects/{project_id}/mappings/{mapping_id}`

### Superadmin
- `PUT /superadmin/incident-banner`

## Write-endpointtien permissions + tilat

- `POST /projects/{project_id}/work-packages`
  - Permission: `WORK_PHASE_CREATE`
- `POST /work-packages/{wp_id}/members`
  - Permission: `WORK_PHASE_MEMBER_CREATE`
  - Tila: **SETUP** (baseline ei lukittu), muuten `409 BASELINE_ALREADY_LOCKED`
- `POST /work-packages/{wp_id}/version`
  - Permission: `WORK_PHASE_VERSION_CREATE`
  - Tila: **SETUP** (baseline ei lukittu)
- `POST /work-packages/{wp_id}/baseline-lock:request`
  - Permission: `BASELINE_LOCK`
  - Tila: **SETUP** (baseline ei lukittu)
- `POST /work-packages/{wp_id}/baseline-lock:approve?step=1`
  - Permission: `BASELINE_LOCK_APPROVE_PM`
- `POST /work-packages/{wp_id}/baseline-lock:approve?step=2`
  - Permission: `BASELINE_LOCK_APPROVE_TJ`
- `POST /work-packages/{wp_id}/weekly-updates`
  - Permission: `WORK_PHASE_WEEKLY_UPDATE_CREATE`
  - Tila: **TRACK** (baseline lukittu), muuten `409 BASELINE_REQUIRED`
- `POST /work-packages/{wp_id}/ghosts`
  - Permission: `GHOST_ENTRY_CREATE`
  - Tila: **TRACK** (baseline lukittu), muuten `409 BASELINE_REQUIRED`
- `POST /projects/{project_id}/months/{month}/corrections/request`
  - Permission: `CORRECTION_PROPOSE`
- `POST /projects/{project_id}/months/{month}/corrections/{correction_id}/approve`
  - Permission: `CORRECTION_APPROVE_FINAL`
- `POST /projects/{project_id}/months/{month}/corrections/{correction_id}/reject`
  - Permission: `CORRECTION_APPROVE_FINAL`

## Tenant / org -konteksti

- `POST /session/switch-org`: vaihtaa tokenin org-kontekstin (membership tarkistus).
- `GET /projects`: käyttää tokenin `organization_id`:tä. `orgId` sallitaan vain jos `ALLOW_CROSS_ORG_QUERY=true` + membership.
- `GET /terminology/dictionary?orgId=...`: jos orgId annettu, vaatii auth ja membershipin; ilman orgId käyttää tokenin orgId:tä tai publicia.

## Muutosmuisti

### Mitä muuttui
- Lisättiin base-path -selite ja vaihdettiin polkulistaukset OpenAPI-muotoon (ilman `/api`-prefiksiä).
- Lisättiin puuttuvat endpointit (unmapped-actuals, work-package context, seller/admin/superadmin).
- Yhdenmukaistettiin placeholderit `{project_id}`, `{month}`, `{correction_id}` ja `{mapping_id}`.
- Päivitettiin myyjän provisioning-polut vastaamaan nykyistä kutsulinkkimallia (`/saas/*` + `/invites/accept`).

### Miksi
- UI tarvitsee raporttinäkymät (pääryhmät, viikko- ja kuukausitason seuranta sekä poikkeamat) suoraan DB-näkymistä.
- Nappipolut ja esimerkit käyttävät work-packages- ja month close -polkuja.
 - OpenAPI on toteutuksen “source of truth” polkulistauksessa, joten README:n pitää heijastaa sitä.

### Miten testataan (manuaali)
- `curl http://localhost:3000/api/projects/<project_id>/reports/main-group-current`
- `curl http://localhost:3000/api/projects/<project_id>/reports/weekly-ev`
- Avaa UI → valitse “Projekti”-tabi ja varmista taulukoiden data.
- Avaa `docs/api/examples.md` ja varmista, että polut vastaavat tätä listaa.
- Varmista, että `docs/workflows/nappipolut.md` myyjäpolku käyttää samoja `/saas/*` polkuja.


## Security
- `docs/api/security.md` – token/SSO-oletukset + audit-logit
