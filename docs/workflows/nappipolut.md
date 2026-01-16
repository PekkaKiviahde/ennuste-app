# Nappipolut – Ennustus (MVP)

Päivitetty: 2026-01-15

Tässä dokumentissa on “nappipolut” eli **mitä käyttäjä painaa, missä järjestyksessä**.
Tarkoitus: tehdä UI- ja RBAC-toteutuksesta yksiselitteinen.

## Rajaus: missä on “totuus”
- Liiketoimintalogiikka, päätökset ja validoinnit: `spec/workflows/*`.
- Tämä dokumentti kuvaa UI-polut (”nappipolut”), ei kanonista prosessispeksiä.
- Jos ristiriita, `spec/` voittaa.

> Termit: *Yritys* = tenant, *projekti* = project, *työpaketti* = work package / work phase.  
> *Month close* = kuukausi menee lukkoon, kun raportit on lähetetty.

---

## 1) Myyjä (Seller) – asiakkuus → ORG_ADMIN-kutsulinkki (Invite)

Huom:
- Pre-sales (esittely, demo, hinnoittelu, tarjous) tapahtuu pääosin järjestelmän ulkopuolella.
- Suositus: demo toimitetaan demo-ympäristössä (ei asiakasdataa), ja asiakkuuden avaus tehdään vasta sopimuksen jälkeen.

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

## Rajapinnat ja toteutus (linkit)
- Kanoninen API-kuvaus: `docs/api/openapi.yaml`.
- Kanoninen prosessi (päätökset + validoinnit): `spec/workflows/*`.
- Tilat ja siirtymät: `docs/workflows/state-machines.md`.

## Mitä muuttui
- Lisätty muutososiot dokumentin loppuun.
- Päivitetty raporttipaketin lataus PDF/CSV-linjaukseen.
- Päivitetty päivämäärä 2026-01-15.
- Päivitetty myyjän (Seller) polku nykyiseen kutsulinkkimalliin (/api/saas/* + /api/invites/accept).
- Lisätty huomio pre-sales demosta (demo erillään asiakasprovisionoinnista).
- Poistettu päällekkäinen API/DB-toteutusosio ja korvattu linkeillä kanonisiin dokumentteihin.

## Miksi
- Dokumentaatiokäytäntö: muutokset kirjataan näkyvästi.
- Päätösloki lukitsee MVP-exportit PDF + CSV -muotoon.

## Miten testataan (manuaali)
- Avaa dokumentti ja varmista, että osiot ovat mukana.
- Varmista, että report package -lataus mainitaan PDF/CSV-muodossa.
- Varmista, että myyjän polku ei viittaa /api/seller/* stub-endpointeihin.
