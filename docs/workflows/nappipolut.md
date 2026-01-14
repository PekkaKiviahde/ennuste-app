# Nappipolut – Ennustus (MVP)

Päivitetty: 2026-01-02

Tässä dokumentissa on “nappipolut” eli **mitä käyttäjä painaa, missä järjestyksessä**.
Tarkoitus: tehdä UI- ja RBAC-toteutuksesta yksiselitteinen.

> Termit: *Yritys* = tenant, *projekti* = project, *työpaketti* = work package / work phase.  
> *Month close* = kuukausi menee lukkoon, kun raportit on lähetetty.

---

## 1) Myyjä (Seller) – asiakkuus → ORG_ADMIN-kutsulinkki (Invite)

1. **[Asiakkuudet] → [Uusi sopimus]**
2. **[Luo yhtiö + demoprojekti]** *(idempotentti slugilla)*
3. **[Luo ORG_ADMIN-kutsulinkki ja toimita asiakkaalle]** *(Invite: email-sidottu, kertakäyttöinen, vanheneva)*
4. (valinn.) **[Näytä käyttöönoton tila]**: “lomake täytetty / käyttäjät kutsuttu / valmis tuotantoon”

---

## 2) Superadmin – kaikki yritykset (multi-tenant)

### 2.1 Perustaminen / tuki
1. **[Yritykset] → [Etsi yritys] → [Avaa]**
2. **[Aseta yritysadmin]** (kenellä hallintaoikeus)
3. **[Override / tuki]** (jos onboarding jumissa)

### 2.2 Häiriöbanneri (Incident)
1. **[Incident banner] → [Aseta ON]**
2. **[Päivitä teksti / status / next update]**
3. **[Aseta OFF]**

(Detaleihin: `docs/runbooks/incident.md`)

---

## 3) Yritysadmin – oman yrityksen hallinnollinen polku

### 3.1 Onboarding-linkistä (ensikerta)
1. **[Onboarding] → [Yrityksen tiedot] → [Tallenna]**
2. **[Onboarding] → [Projektin tiedot] → [Tallenna]**
3. **[Onboarding] → [Kutsu käyttäjät] → [Lähetä kutsut]** *(automatisoitu)*
4. **[Onboarding] → [Roolit] → [Tallenna]** *(automatisoitu + muokattavissa)*

### 3.2 Raportoinnin asetukset (pakollinen ennen “Lähetä raportit”)
5. **[Projektin asetukset] → [Raportointi] → [Vastaanottajat] → [Tallenna]**
   - yksikön johtaja
   - talousjohtaja
6. **[Projektin asetukset] → [Hyväksyntäketjut] → [Korjaus lukon jälkeen] → [Tallenna]**
   - “Korjaaja = tuotantojohtaja”
   - “Hyväksyjä = yksikön johtaja”

### 3.3 Mäppäysten tarkistus/korjaus (integraatiot)
7. **[Integraatiot] → [Näytä mäppäykset]**
8. (tarv.) **[Korjaa mäppäys] → [Tallenna]**
9. **[Testaa/Esikatsele]** (pieni otos / sanity check)

> Integraatiot ovat pääosin kiinteitä, mutta admin saa korjata virhemäppäyksiä.

### 3.4 Projekti käyttöön / arkisto
10. **[Projektin asetukset] → [Avaa tuotantoon]**
11. (lopuksi) **[Projektin asetukset] → [Arkistoi projekti]**

---

## 4) Tuotanto – Ennustus (SETUP → TRACK, viikko → kuukausi → lähetys → lukko)

### 4.1 Työpaketti: SETUP (baseline ei lukittu)
1. **[Työpaketit] → [Uusi työpaketti]**
2. **[Perustiedot]** → nimi, kuvaus, lead-littera → **[Tallenna]**
3. **[Koostumus]**
   - **[Lisää littera]** / **[Poista littera]**
   - (tarv.) **[Lisää item-koodista]** → hyväksyntäpolku (jos käytössä)
4. **[Baseline-esikatselu]**
5. **[Pyydä baseline-lukitus]**
   - PM hyväksyy **[Hyväksy 1/2]**
   - Tuotantojohtaja hyväksyy **[Hyväksy 2/2]**
6. Työpaketti siirtyy **TRACK**-tilaan.

### 4.2 Viikko: ghostit + valmiusaste + memo (toistuu)
1. **[Työpaketti] → [Viikkopäivitykset] → [Uusi viikkopäivitys]**
2. Syötä: **% valmiusaste + memo** → **[Tallenna]**
3. **[Ghostit] → [Lisää ghost]** → € + selite → **[Tallenna]**
4. (tarv.) **[Selvitettävät] → [Liitä työpakettiin]** / **[Luo uusi työpaketti]**

### 4.3 Kuukausi: kuukausiennuste (kuun vaihteessa, manuaalinen)
1. **[Kuukausi] → [Ennuste] → [Muokkaa]**
2. Syötä €/työpaketti (tai valittu taso) + perustelu → **[Tallenna luonnos]**
3. Ennen lähetystä voi muokata myös:
   - **[% valmiusasteita]**
   - **[ghosteja]**
   - **[memoja]**

### 4.4 Lähetys: raportit + month close (lukitus)
1. **[Raportit] → [Esikatsele]**
2. **[Lähetä raportit]**
   - lähettää sähköpostin vastaanottajille (yksikön johtaja + talousjohtaja)
   - arkistoi “report package” (muuttumaton kopio)
   - asettaa kuukauden tilaan **SENT_LOCKED**

### 4.5 Lukon jälkeen: korjauspolku (tuotantojohtaja + yksikön johtaja)
1. **[Kuukausi (lukittu)] → [Tee korjauspyyntö]** *(vain tuotantojohtaja)*
2. Valitse mitä korjataan: ennuste / % / ghost / memo + perustelu → **[Lähetä hyväksyntään]**
3. **[Yksikön johtaja] → [Hyväksy] / [Hylkää]**
4. Hyväksynnän jälkeen:
   - luodaan korjausversio (append-only)
   - kuukausi on taas lukossa (**CORRECTED_LOCKED**)
   - (valinn.) **[Lähetä korjatut raportit]**

---

## 5) Linkit
- Tilakoneet: `docs/workflows/state-machines.md`
- Incident-runbook: `docs/runbooks/incident.md`
- Data-fix-runbook: `docs/runbooks/data-fix.md`
- Release-runbook: `docs/runbooks/release.md`
---

## Implementation notes (API + DB-enforcement)

Tämä osio kertoo **miten nappipolut kannattaa toteuttaa** (API-rajapinnat + missä lukitukset pakotetaan).

### Periaate: UI ei saa olla ainoa “lukko”
- UI voi piilottaa nappeja roolin/tilan mukaan, mutta **backend/DB on lopullinen totuus**.
- Jokaisella “kirjoittavalla” endpointilla pitää olla:
  1) **RBAC-tarkistus** (kuka saa)
  2) **State-tarkistus** (missä tilassa saa)
  3) **Audit** (kuka teki, milloin, mitä muuttui)

### Suositeltu API-pinta (MVP, esimerkkipolut)

> Nämä ovat “hyviä oletus-endpointeja”. Nimeä lopulliset polut teidän koodityylin mukaan.

#### Hallinnollinen (Company/Project)
- `POST /api/saas/groups` → luo konserni *(valinnainen; myyjä/superadmin)*
- `POST /api/saas/organizations` → luo yhtiö + demoprojekti + ensimmäinen ORG_ADMIN-kutsu *(myyjä/superadmin)*
- `POST /api/saas/organizations/{organizationId}/invites` → resend / uusi ORG_ADMIN-kutsu *(myyjä/superadmin)*
- `POST /api/invites/accept` → ORG_ADMIN hyväksyy kutsun *(julkinen kutsun kautta)*

- `POST /api/admin/tenants/{tenant_id}/onboarding/submit` → asiakkaan lomake “valmis”
- `POST /api/admin/tenants/{tenant_id}/users:invite` → kutsu käyttäjät (automaatiolla)
- `PUT  /api/admin/tenants/{tenant_id}/rbac` → roolit (automaattinen + muok.)
- `PUT  /api/admin/projects/{project_id}/reporting-settings` → vastaanottajat + lähetysasetukset
- `PUT  /api/admin/projects/{project_id}/approval-settings` → hyväksyntäketjut
- `GET  /api/admin/projects/{project_id}/mappings` → näytä mäppäykset
- `PATCH /api/admin/projects/{project_id}/mappings/{mapping_id}` → korjaa mäppäys *(limited edit)*
- `POST /api/projects/archive` → arkistoi demoprojekti *(ORG_ADMIN, jos käytössä)*

#### Työpaketti (Work package) – SETUP/TRACK
- `POST /api/projects/{project_id}/work-packages` → uusi työpaketti
- `PUT  /api/work-packages/{wp_id}` → muokkaa perustietoja *(vain SETUP)*
- `POST /api/work-packages/{wp_id}/members` → lisää littera/item (append)
- `DELETE /api/work-packages/{wp_id}/members/{member_id}` → poista (vain SETUP; toteutus voi olla “soft delete” append-only-mallissa)

**Baseline-lukitus:**
- `POST /api/work-packages/{wp_id}/baseline-lock:request` → pyyntö (W0→W1)
- `POST /api/work-packages/{wp_id}/baseline-lock:approve?step=1` → PM 1/2
- `POST /api/work-packages/{wp_id}/baseline-lock:approve?step=2` → TJ 2/2 (W1→W2)

#### Viikkopäivitys (TRACK)
- `POST /api/work-packages/{wp_id}/weekly-updates` → % + memo
- `POST /api/work-packages/{wp_id}/ghosts` → ghost-rivi (€)

**Selvitettävät (unmapped actuals):**
- `GET  /api/projects/{project_id}/unmapped-actuals` → listaa
- `POST /api/projects/{project_id}/unmapped-actuals/{id}:assign` → liitä työpakettiin

#### Kuukausi (Month close)
- `PUT  /api/projects/{project_id}/months/{YYYY-MM}/forecast` → kuukausiennuste (M0)
- `PUT  /api/projects/{project_id}/months/{YYYY-MM}/lock-candidates` → (valinn.) READY_TO_SEND (M1)

**Lähetä raportit (= Month close):**
- `POST /api/projects/{project_id}/months/{YYYY-MM}/send-reports`  
  Tekee atomisesti:
  1) generate raportit
  2) lähettää emailit
  3) luo report package -arkiston
  4) asettaa tilan M2_SENT_LOCKED

**Korjaus lukon jälkeen:**
- `POST /api/projects/{project_id}/months/{YYYY-MM}/corrections/request` *(TJ)* → M3
- `POST /api/projects/{project_id}/months/{YYYY-MM}/corrections/{corr_id}/approve` *(yksikön johtaja)* → M4
- `POST /api/projects/{project_id}/months/{YYYY-MM}/corrections/{corr_id}/reject` → takaisin M2

**Report package (arkisto):**
- `GET  /api/projects/{project_id}/months/{YYYY-MM}/report-packages` → listaa arkistot
- `GET  /api/report-packages/{package_id}/download` → lataa PDF/CSV (tai signed URL)

#### Incident banner (toimittaja)
- `GET /api/incident-banner` → kaikki käyttäjät (read-only)
- `PUT /api/superadmin/incident-banner` → superadmin asettaa ON/OFF + status (I1–I4)

### DB-enforcement (suositus)

#### Tenant-eristys
- Kaikki business-taulut sisältävät `tenant_id`.
- Backend pakottaa `tenant_id` sessionista (ei lueta clientiltä).
- (Jos käytätte RLS:ää Postgresissa) `tenant_id = current_setting('app.tenant_id')`.

#### Lukitukset
- `months`-taulussa `month_state` (M0–M4).
- Kirjoittavat operaatiot (forecast/weekly/ghost) tarkistavat:
  - `month_state IN (M0_OPEN_DRAFT, M1_READY_TO_SEND)`  
  - `month_state IN (M2..)` → blokkaa, ellei kyse ole “correction workflow” -kirjoituksesta.

#### Append-only / audit
- Käytä “insert only” -tauluja (esim. `*_events`, `*_versions`).
- Älä tallenna nimiä/emailia event-riveille; vain `actor_user_id`.
- Tallenna aina `created_at`, `created_by`, `reason` (korjauksissa).

#### Report package immutability
- `report_packages` sisältää:
  - `package_id`, `project_id`, `month`, `created_at`, `sent_to[]`, `sent_by_user_id`
  - `artifact_uri` (object storage) + `checksum`
- Päivitykset estetään (no UPDATE/DELETE) → vain uusi paketti uutta lähetystä/korjausta varten.

### Testit (minimi)
- Unit: state transitions + “allowed fields” (korjaus)
- Integration: DB gate (lukitukset, immutability), näkymät compile
- E2E: 1) send-reports locks month 2) correction after lock requires approvals

## Mitä muuttui
- Lisätty muutososiot dokumentin loppuun.
- Päivitetty raporttipaketin lataus PDF/CSV-linjaukseen.
- Päivitetty päivämäärä 2026-01-02.
- Päivitetty myyjän (Seller) polku ja hallinnolliset API-ehdotukset nykyiseen kutsulinkkimalliin (/api/saas/* + /api/invites/accept).

## Miksi
- Dokumentaatiokäytäntö: muutokset kirjataan näkyvästi.
- Päätösloki lukitsee MVP-exportit PDF + CSV -muotoon.

## Miten testataan (manuaali)
- Avaa dokumentti ja varmista, että osiot ovat mukana.
- Varmista, että report package -lataus mainitaan PDF/CSV-muodossa.
- Varmista, että myyjän polku ei viittaa /api/seller/* stub-endpointeihin.
