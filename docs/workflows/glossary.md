# Sanasto (Glossary) – Ennustus (MVP)

Päivitetty: 2025-12-30

Tavoite: yhtenäistää puhe ja koodi (UI-termit, tilatunnukset, laskennan käsitteet).

---

## Keskeiset objektit

- **Yritys (Company / Tenant)**  
  Asiakasyritys. Data eristetään tenantin sisällä.

- **Projekti (Project)**  
  Yksi seurattava kokonaisuus (esim. rakennushanke).

- **Työpaketti (Work package / Work phase)**  
  Seurannan perusyksikkö. Siirtyy SETUP → TRACK baseline-lukituksella.

- **Baseline**  
  Lukittu suunnitelma (koostumus + budjetti), jota vasten seurataan.

- **Report package**  
  Arkistoitu “lähetetty raporttipaketti” (PDF/Excel tai linkki) + metadata (aikaleima, lähettäjä, vastaanottajat).

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

## Laskennan termit (MVP)

- **BAC** (Budget at Completion) – baseline-budjetti
- **EV** (Earned Value) – ansaittu arvo (esim. BAC * %)
- **AC** (Actual Cost) – toteuma
- **AC\*** – toteuma + ghostit
- **CPI** (Cost Performance Index) – EV / AC\*

---

## Tilatunnukset (status codes)

### Tenant onboarding
- `C0_PROVISIONED`
- `C1_ONBOARDING_LINK_SENT`
- `C2_ONBOARDING_IN_PROGRESS`
- `C3_READY`

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
