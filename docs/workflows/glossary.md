# Sanasto (Glossary) – Ennustus (MVP)

Päivitetty: 2026-01-15

Tavoite: yhtenäistää puhe ja koodi (UI-termit, tilatunnukset, laskennan käsitteet).

---

## Keskeiset objektit

- **Yritys (Company / Tenant)**  
  Asiakasyritys. Data eristetään tenantin sisällä.

- **Projekti (Project)**  
  Yksi seurattava kokonaisuus (esim. rakennushanke).

- **Tavoitearvio-littera**  
  Budjetin ja raportoinnin pääkohde, jota ennustetaan.

- **Työpakettilittera**  
  Toteuman ja ostojen kohde (työpakettitaso), joka mapataan tavoitearvio-litteraan.

- **Mapping**  
  Säännöt, joilla tavoitearvio-litterat kohdistetaan työpakettilitteroille (alkuperäinen tavoitearvion koodi säilyy näkyvissä).

- **Työpakettisuunnittelu**  
  Suunnitteluvaihe, jossa tavoitearvio-littera ja työpakettilitterat kohdistetaan (mapping) ja status asetetaan ennen ennustetta.

- **Lukitus (Baseline)**  
  Työpakettisuunnittelun lukittu lähtötaso; ennusteet sallitaan tämän tai READY_FOR_FORECAST-tilan jälkeen.

- **Ennustetapahtuma**  
  Yksi ennusteen päivitys (append-only), joka viittaa tavoitearvio-litteraan.

- **Työpaketti (Work package / Work phase)**  
  Seurannan perusyksikkö. Siirtyy SETUP → TRACK baseline-lukituksella.

- **Baseline**  
  Lukittu suunnitelma (koostumus + budjetti), jota vasten seurataan.

- **Report package**  
  Arkistoitu “lähetetty raporttipaketti” (PDF/CSV tai linkki) + metadata (aikaleima, lähettäjä, vastaanottajat).

---

## Viikko- ja kuukausikäsitteet

- **Viikkopäivitys**  
  % valmius + memo (+ ghostit erillisinä riveinä)

- **Ghost (haamukulu)**  
  Kustannus joka halutaan huomioida ennen kuin se tulee toteumana (AC).

- **Kuukausiennuste (Forecast)**  
  Kuun vaihteessa syötettävä ennuste, manuaalinen (MVP).

- **Month close**  
  Kuukausi lukitaan, kun raportit on lähetetty.

- **Selvitettävät (Unmapped actuals)**  
  Toteumat, joita ei saada kohdistettua mihinkään työpakettiin.

---

## Keskinäinen logiikka (MVP)

1) **Työpakettilitterat** sisältävät toteumat.  
2) **Mapping** kohdistaa tavoitearvio-litterat **työpakettilitteroille** (koodi säilyy).  
3) **Työpakettisuunnittelu** tehdään tavoitearvio-litteralle ja lukitaan baselineksi.  
4) **Ennustetapahtumat** kirjataan vasta, kun työpakettisuunnittelu on READY_FOR_FORECAST tai LOCKED.  
5) **Raportointi** aggregoi työpakettilitterat ja ryhmittelyn (0–9), mutta näyttää myös alkuperäiset tavoitearvion koodit.

## Laskennan termit (MVP)

- **BAC** (Budget at Completion) – baseline-budjetti
- **EV** (Earned Value) – ansaittu arvo (esim. BAC * %)
- **AC** (Actual Cost) – toteuma
- **AC\*** – toteuma + ghostit
- **CPI** (Cost Performance Index) – EV / AC\*

---

## Tilatunnukset (status codes)

## Vaihe- ja tilakoodit (pikaopas)

### Vaihekoodit (S ja E)
- `S-1`, `S0`, `S1` = SaaS-vaiheet (org-taso): myynti/provisiointi → onboarding → trial/entitlement (PLG).
- `E0..E5` = ennustusprosessin vaiheet (projektitaso): import → suunnittelu → baseline → seuranta → loki → raportti.
- `spec/workflows/01_mvp_flow.md` käyttää otsikoissa numerointia `0)–5)` = sama asia kuin `E0..E5`.
- Älä käytä ilmaisua “Vaihe 0” ilman prefiksiä (`S0` tai `E0`).

### Nimeämissääntö kaavioille (Mermaid)
- Vaihekoodeja (`S-1/S0/E0..`) ei käytetä mermaid-node-id:nä missään kontekstissa.
- Käytä node-id:ssä prefiksiä, joka kertoo kontekstin: esim. `SAAS_*`, `ONB_*`, `WP_*`, `MONTH_*`, `INC_*`.

### Tilakoodit (C/P/W/M/I)
- `C0..C3` = tenant-onboarding (yritystaso)
- `P0..P2` = projekti (elin­kaari)
- `W0..W3` = työpaketti (setup → track)
- `M0..M4` = kuukausi (month close)
- `I0..I4` = incident-banner (in-app)

### PLG entitlement (S1)
- `subscription_status` = `trialing | active | past_due | read_only | canceled`
- `project_status` = `ACTIVE | STANDBY | ARCHIVED`
- Huom: `project_status` (PLG gate) ei ole sama asia kuin `P0..P2` (projektin “hallinnollinen” status). Tarkka määrittely: `spec/workflows/01_plg_entitlement_and_project_lifecycle.md`.

### Tenant onboarding
- `C0_PROVISIONED` – yhtiö (organization) + tenant luotu ja demoprojekti olemassa
- `C1_ONBOARDING_LINK_SENT` – ORG_ADMIN-kutsulinkki (Invite) luotu ja toimitettu
- `C2_ONBOARDING_IN_PROGRESS` – ORG_ADMIN täydentää asetuksia ja kutsuu käyttäjiä
- `C3_READY` – minimiasetukset kunnossa, projekti voidaan avata tuotantoon

### Projekti
- `P0_PROJECT_DRAFT`
- `P1_PROJECT_ACTIVE`
- `P2_PROJECT_ARCHIVED`

### Työpaketti
- `W0_SETUP_DRAFT`
- `W1_BASELINE_APPROVAL_PENDING`
- `W2_TRACK_ACTIVE`
- `W3_WORKPACKAGE_ARCHIVED`

### Kuukausi (Month close)
- `M0_OPEN_DRAFT`
- `M1_READY_TO_SEND`
- `M2_SENT_LOCKED`
- `M3_CORRECTION_PENDING`
- `M4_CORRECTED_LOCKED`

### Incident banner (in-app)
- `I0_NONE`
- `I1_INVESTIGATING`
- `I2_IDENTIFIED`
- `I3_MONITORING`
- `I4_RESOLVED`

## Mitä muuttui
- Päivitetty mappingin suunta: tavoitearvio-littera kohdistetaan työpakettilitteraan.
- Päivitetty terminologia: työpakettilittera ja työpakettisuunnittelu.
- Lisätty käsitteet ja niiden keskinäinen logiikka.
- Päivitetty raporttipaketin formaatti PDF/CSV-linjaukseen.
- Täsmennetty tenant-onboarding-tilojen C0–C3 selitteet kutsulinkkimalliin sopiviksi.
- Lisätty pikaopas vaihe- ja tilakoodien nimeämiseen (S/E sekä C/P/W/M/I).
- Lisätty kaaviosääntö: vaihekoodeja ei käytetä mermaid-node-id:nä.
- Lisätty PLG-entitlementin (S1) sanastorivit: subscription_status ja project_status.
- Päivitetty päivämäärä 2026-01-15.

## Miksi
- Tarvitaan yhteinen sanasto, joka vastaa työpakettisuunnittelua ja tavoitearvion koodin säilytystä.
- Dokumentaatiokäytäntö: muutokset kirjataan näkyvästi.
- Päätösloki lukitsee MVP-exportit PDF + CSV -muotoon.

## Miten testataan (manuaali)
- Avaa dokumentti ja varmista, että termit ja logiikka ovat selkeitä.
- Varmista, että raporttipaketin formaatti on PDF/CSV.
