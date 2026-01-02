# Implementation Brief: Multi-tenant SaaS (MVP)

Tämä dokumentti on tarkoitettu kehittäjälle. Se kertoo mitä rakennetaan, millä säännöillä, ja mitä “done” tarkoittaa.

## 1) MVP-scope
Toteuta toimiva MVP, jossa on:
- Auth (käyttäjä kirjautuu sisään)
- Current tenant -konteksti (valittu tenant)
- RBAC permission-check kaikille write-operaatioille
- Companies + Projects CRUD (minimitaso)
- JSONB details -kentät
- Audit-log create/update/delete + roolimuutokset

## 2) Pakolliset invariants (ei saa rikkoa)
1) Jokainen domain-query suodatetaan `tenant_id`:llä.
2) Jokainen write vaatii permissionin (RBAC).
3) Audit-log kirjoitetaan kaikista kriittisistä muutoksista.
4) Aikarajatut roolit huomioidaan authorizationissa (`valid_from/to`).

## 3) Tietokanta
- Skeema: `db/00-schema.sql`
- Permission seed: `db/01-seed-permissions.sql` (valinnainen, suositeltu)

## 4) API-minimi
Katso endpointit ja payload-esimerkit: `docs/03-api-min-spec.md`.

Pakolliset:
- `GET /me`
- Companies:
  - `GET /companies`
  - `POST /companies`
  - `PATCH /companies/:id`
- Projects:
  - `GET /projects?companyId=...`
  - `POST /projects`
  - `PATCH /projects/:id`
- RBAC:
  - `GET /roles`
  - `POST /role-assignments`
  - `DELETE /role-assignments/:id`

## 5) Authorization: suositeltu toteutus
- Middleware / helper, joka tuottaa:
  - `currentUser`
  - `currentTenantId`
  - `permissions[]` (cache per request)
- Authorization helper:
  - `requirePermission("project.write")` tms.
  - heittää 403, jos puuttuu

Tarkempi kuvaus: `docs/04-rbac.md`.

## 6) Audit-log: minimikäytäntö
Jokaisesta seuraavasta tulee audit:
- company.created / company.updated / company.deleted
- project.created / project.updated / project.deleted
- rbac.role_assigned / rbac.role_revoked

Audit data -suositus:
- `action` (string)
- `entity_type` + `entity_id`
- `data` jsonb:
  - vähintään patch-payload
  - mielellään myös `before/after` tai diff, jos helppo

## 7) Testikriteerit (minimi)
- Tenant-eristys:
  - user A (tenant X) ei näe tenant Y dataa
- RBAC:
  - read ok ilman write-permissionia
  - write estyy ilman write-permissionia
- valid_from/to:
  - rooli ei ole voimassa ennen valid_from
  - rooli ei ole voimassa valid_to jälkeen
- Audit:
  - create/update kirjoittaa audit-rivin

## 8) Done-kriteerit
- API toimii Postman/curl:lla
- CRUD toimii vähintään perus-UI:lla tai swagger/test-clientillä
- tenant_id ei “vuoda”
- RBAC estää väärät operaatiot
- audit_log kertyy järkevästi

## 9) MVP→v2 muistilista
Kun JSONB-avainta käytetään usein suodatukseen/raportointiin:
- nosta se sarakkeeksi/tauluksi hallitulla migraatiolla
- katso tarkka vaiheistus: `docs/06-migration-jsonb-to-normalized.md`

## Mitä muuttui
- Lisätty muutososiot dokumentin loppuun.

## Miksi
- Dokumentaatiokäytäntö: muutokset kirjataan näkyvästi.

## Miten testataan (manuaali)
- Avaa dokumentti ja varmista, että osiot ovat mukana.
