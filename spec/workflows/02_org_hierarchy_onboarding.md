# Konserni, yhtiö ja projekti – hierarkia ja onboarding

## Tavoite
Mallintaa konserni/yhtiö/projekti‑hierarkia ja SaaS‑myyjän onboarding‑virta siten,
että roolit ja workflow‑vastuut ovat selkeät ja auditoitavat.

## Termit
- Konserni: usean yhtiön kokonaisuus (Group)
- Yhtiö: asiakasorganisaatio (Company/Organization)
- Projekti: yhtiön yksittäinen työmaa
- SaaS‑myyjä: sisäinen myyntirooli (ei asiakasrooli)
- Yrityksen pääkäyttäjä: ORG_ADMIN

## Päätökset (yhteenveto)
- Konserni on oma entiteetti.
- SaaS‑myyjä luo yhtiön ja lähettää kutsulinkin pääkäyttäjälle.
- Yhtiön luonnissa luodaan demoprojekti.
- Pääkäyttäjä saa ORG_ADMIN + demoprojektin owner‑roolin.
- Konserni‑adminilla on lukuoikeus kaikkiin konsernin yhtiöihin.
- Konsernitasolle tulee oma ylätason raportointi.
- Kaikki tapahtumat kirjataan append‑only audit‑logiin.

## Hierarkia
Konserni
-> Yhtiö
-> Projekti

Rooliperintä:
- Konserni‑admin -> ORG_ADMIN kaikkiin konsernin yhtiöihin.
- ORG_ADMIN -> kaikki projektitasoroolit yhtiön sisällä.
- Projektitasoroolit eivät periydy muihin yhtiöihin.

## Esimies‑alaissuhteet (workflow‑näkökulma)
- ORG_ADMIN: hallitsee kaikkia rooleja kaikissa projekteissa.
- PRODUCTION_MANAGER (owner): hallitsee PROJECT_MANAGER, GENERAL_FOREMAN, SITE_FOREMAN, PROCUREMENT, EXEC_READONLY.
- PROJECT_MANAGER (manager): hallitsee GENERAL_FOREMAN, SITE_FOREMAN, PROCUREMENT.
- GENERAL_FOREMAN (editor): hallitsee SITE_FOREMAN.
- SITE_FOREMAN (editor): ei alaisia.
- PROCUREMENT / EXEC_READONLY (viewer): ei alaisia.

Workflow‑vastuut:
- Suunnitelma: GENERAL_FOREMAN / SITE_FOREMAN kirjaa, PROJECT_MANAGER hyväksyy.
- Ennuste: PROJECT_MANAGER luo ennustetapahtuman, PRODUCTION_MANAGER lukitsee.

## Onboarding‑virta (SaaS‑myyjä)
1) SaaS‑myyjä luo konsernin (valinnainen) ja yhtiön.
2) SaaS‑myyjä luo kutsulinkin yrityksen pääkäyttäjälle.
3) Yhtiöön luodaan demoprojekti automaattisesti.
4) Pääkäyttäjä hyväksyy kutsun, saa ORG_ADMIN + demoprojektin owner‑roolin.
5) Pääkäyttäjä luo varsinaiset projektit ja roolittaa henkilöt.

## Tietomalli (ehdotus)
### Taulut
1) groups
- group_id (uuid, PK)
- name (text)
- created_at, created_by

2) organizations
- organization_id (uuid, PK)
- group_id (uuid, FK -> groups)
- name, slug
- created_at, created_by

3) org_invites
- invite_id (uuid, PK)
- organization_id (uuid, FK)
- email (text)
- role_code (text, default ORG_ADMIN)
- token_hash (text)
- expires_at (timestamptz)
- accepted_at (timestamptz)
- created_at, created_by

4) project_role_assignments
- project_id, user_id, role_code (existing)
- granted_by, granted_at

5) organization_role_assignments
- organization_id, user_id, role_code (existing)
- granted_by, granted_at

### Indeksit
- groups(name)
- organizations(group_id, slug)
- org_invites(organization_id, expires_at)
- org_invites(token_hash) UNIQUE

## API (ehdotus)
SaaS‑myyjä (sisäinen):
- POST /api/saas/groups (luo konserni)
- POST /api/saas/organizations (luo yhtiö + demoprojekti)
- POST /api/saas/organizations/:id/invites (kutsulinkki adminille)

Pääkäyttäjä:
- POST /api/invites/accept (kutsulinkin hyväksyntä)
- POST /api/projects (uusi projekti)
- POST /api/admin/roles (roolitus)

## Audit‑tapahtumat (append‑only)
- group.create
- organization.create
- invite.create
- invite.accept
- project.create
- role.assign

---

## Mitä muuttui
- Kuvattiin konserni/yhtiö/projekti‑hierarkia ja onboarding‑virta.

## Miksi
- Tarvitaan yhtenäinen malli SaaS‑myyjän luontiprosessille ja rooliperinnälle.

## Miten testataan (manuaali)
- Lue dokumentti ja varmista, että virta vastaa sovittuja 10/10 vastauksia.
