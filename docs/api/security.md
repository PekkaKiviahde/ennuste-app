# API Security – Ennustus (MVP)

Päivitetty: 2025-12-30

Tässä dokumentissa kuvataan MVP-tason **authn/authz** (token/SSO-oletukset), sekä **audit-lokituksen** periaatteet.

> Tavoite: että toteutus on yhdenmukainen `RBAC-matriisin` ja `GDPR`-päätösten kanssa.

---

## 1) Oletus: token-pohjainen autentikointi (Bearer JWT)

### Päätös / oletus
- Kaikki API-kutsut käyttävät `Authorization: Bearer <token>` -otsaketta.
- Token on **lyhytikäinen** (esim. 15–60 min) ja se voidaan uusia refresh-tokenilla tai SSO-session kautta.

### Tokenin minimiclaimit (suositus)
- `sub` = user_id (uuid)
- `tenant_id` = tenantin tunniste (uuid)
- `roles` = lista rooleja (esim. `COMPANY_ADMIN`, `PM`, `PRODUCTION_MANAGER`, `UNIT_HEAD`, `CFO`, `USER`)
- `exp` = expiry
- `iat` = issued at
- (valinn.) `email` ja `name` vain jos tarvitaan UI:lle (muista GDPR-minimointi)

> Huom: vaikka `email` olisi mukana tokenissa, se on henkilötietoa. Pidä se minimissä.

---

## 2) SSO (tuleva / suositus)

### Oletusmalli
- SSO toteutetaan OIDC:n (OpenID Connect) päälle, jolloin:
  - käyttäjä kirjautuu yrityksen IdP:llä (Azure AD/Entra, Okta, tms.)
  - Ennustus validoi tokenit (issuer, audience, signature)
  - roolit voidaan mapata claimien kautta (group → role)

### MVP-minimi
- MVP voi alkaa myös “native auth”:lla (email+magic link), mutta sama Bearer-token-malli kannattaa säilyttää API:ssa.

---

## 3) Tenant-eristys (multi-tenant)

### Päätös
- `tenant_id` johdetaan tokenista/sessionista, ei clientin lähettämänä.
- Kaikki data-queryt filtteroidaan tenantin mukaan.

### Suositus toteutukseen
- Backend asettaa DB-session kontekstiin `app.tenant_id` ja käyttää sitä kaikissa kyselyissä.
- Varmista myös verify-skripteillä, että kaikki kriittiset näkymät/taulut sisältävät tenant-filtterin.

---

## 4) Autorisointi (RBAC + tilagaatit)

### RBAC
- Roolit ja oikeudet dokumentoitu: `docs/workflows/rbac-matrix.md`
- API tekee jokaiselle kirjoittavalle endpointille:
  1) **roolitarkistuksen**
  2) **tilatarkistuksen** (esim. kuukauden lock)
  3) **audit-kirjauksen**

### Tilagaatit (esimerkit)
- `month_state >= M2_SENT_LOCKED` → estä `weekly-updates`, `ghosts`, `forecast`  
  (salli vain `corrections` workflow)
- `work_package_state == W2_TRACK_ACTIVE` → estä `members`-muutokset

UI:lle suositellaan `GET /api/me/capabilities` endpointia (napit).

---

## 5) Audit-lokit (mitä kirjataan)

### Päätös (MVP)
- Audit-logit ovat **pseudonymisoituja**: tapahtumiin tallennetaan `actor_user_id` (ei nimi/email event-riveihin).
- Audit-lokit eivät ole “access logit” – access logit voidaan pitää erillään.

### Kirjattavat tapahtumat (suositus)
- Auth:
  - login success/failure (jos omassa authissa)
- Admin:
  - user invite / role changes
  - reporting settings changes
  - approval settings changes
  - mapping corrections
- Workflow:
  - baseline lock request + approvals (step1/step2)
  - weekly update created
  - ghost entry created
  - month forecast set
  - send reports + recipients + report package id
  - correction requested + approved/rejected
- Incident:
  - incident banner state changes (I1–I4)

### Audit-lokien säilytys
- Oletus: 12 kk operatiivinen access-log, audit säilyy projektidatan mukana pseudonymisoituna (ks. `docs/compliance/gdpr.md`).

---

## 6) Rate limiting ja abuse (MVP-suositus)
- Per-user/per-tenant rate limit (erityisesti write endpointit)
- “send-reports” ja “invite users” suojataan:
  - idempotency key tai cooldown (estetään spam)

---

## 7) Tietoturvan minimi-checklist ennen tuotantoa
- [ ] JWT-allekirjoituksen validointi + issuer/audience
- [ ] Token expiry + refresh strategy
- [ ] Tenant-eristys varmistettu (testit + verify)
- [ ] RBAC-matriisin kriittiset polut testattu (E2E)
- [ ] Audit eventit syntyy kaikista write-toiminnoista
- [ ] Henkilötieto minimissä (ei event-riveihin)
- [ ] Incident-runbook käytössä (SEV + banneri)

