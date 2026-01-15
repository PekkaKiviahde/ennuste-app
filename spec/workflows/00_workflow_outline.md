# Workflow-dokumenttien otsikkorakenne (MVP)

Tämä on “sisällysluettelo” workflow-dokumenteille otsikkotasolla.

## Nimeäminen (S/E)
- SaaS-vaiheet (org-taso): `S-1`, `S0` (myynti/provisiointi → onboarding).
- Ennustusprosessin vaiheet (projektitaso): `E0..E5` (tavoitearvion import → suunnittelu → baseline → seuranta → loki → raportti).
- `spec/workflows/01_mvp_flow.md` käyttää otsikoissa numerointia `0)–5)` = sama asia kuin `E0..E5`.

# spec/workflows/00_sales_phase.md
- Vaihe −1: Myynti ja asiakkuuden avaus (SaaS‑myyjä)
  - Tavoite
  - Termit
  - Päätökset (yhteenveto)
  - Myynti → asiakkuuden avaus (vaiheittain)
  - Kutsulinkin säännöt (turva + idempotenssi)
  - Audit‑tapahtumat (append‑only)
  - Rajapinnat (nykyinen kutsulinkkimalli)
  - Mitä muuttui
  - Miksi
  - Miten testataan (manuaali)

## spec/workflows/02_org_hierarchy_onboarding.md
- Konserni, yhtiö ja projekti – hierarkia ja onboarding
  - Tavoite
  - Termit
  - Päätökset (yhteenveto)
  - Hierarkia
  - Esimies‑alaissuhteet (workflow‑näkökulma)
  - Onboarding‑virta (SaaS‑myyjä)
  - Tietomalli (ehdotus)
    - Taulut
    - Indeksit
  - API (ehdotus)
  - Audit‑tapahtumat (append‑only)
  - Mitä muuttui
  - Miksi
  - Miten testataan (manuaali)

## spec/workflows/02_work_phases_and_baseline.md
- Työvaihepaketti ja baseline (MVP-prosessi)
  - 0. Esivaatimukset
  - 1. Tavoite
  - 2. Käsitteet (lyhyesti)
  - 3. Roolit (MVP)
  - 4. Työvaiheen elinkaari (tilat)
  - 5. Työvaiheen perustaminen (DRAFT)
  - 6. Työvaiheen koostaminen (tuotanto + hankinta)
    - 6.1 4-num taso (Talo80-litterat)
    - 6.2 Nimiketaso (tarkka koodi)
  - 7. Baseline muodostaminen (taloudellinen suunnittelu)
  - 8. Baseline lukitus (LOCKED)
  - 9. EV ja KPI/CPI (raportointiperiaate)
  - 10. “Oli tavoitearviossa” -sääntö baselineen
  - 11. MVP-valmis määritelmä
  - Mitä muuttui
  - Miksi
  - Miten testataan (manuaali)

## spec/workflows/01_mvp_flow.md
- MVP-työnkulku
  - 0) Tavoitearvioesityksen import (lähtötieto laskentaosastolta)
  - 1) Tuotannon työpakettien taloudellinen suunnittelu (tavoitearviorivit → työpaketti + hankintapaketti)
    - 1.1 Hankintapaketin luonti
    - 1.2 Työpakettisuunnittelu
  - 2) Baseline-lukitus (hyväksyntä)
  - 3) Seuranta/ennuste (ennustetapahtumat, append-only)
  - 4) Loki
  - 5) Raportti
  - Mitä muuttui
  - Miksi
  - Miten testataan (manuaali)

## spec/workflows/03_weekly_update_ghost_and_reconciliation.md
- Viikkopäivitys, ghost-kustannukset ja täsmäytys (MVP)
  - 1. Miksi tämä on pakollinen osa
  - 2. Viikkopäivitys (rytmitys)
  - 3. Ghost-kustannus: mitä kirjataan
  - 4. Ghostin tilat (MVP)
  - 5. Ennustekierroksen täsmäytys (kuukausi / valittu päivä)
  - 6. Miksi tämä tukee oppimista
  - 7. MVP-valmis määritelmä

## spec/workflows/04_change_control_and_learning.md
- Muutosmuistio ja oppiminen: “oli tavoitearviossa” vs “ei ollut” (MVP)
  - 1. Tausta
  - 2. Muutosluokat (MVP)
    - A) Korjaus (Correction)
    - B) Puuttui tavoitearviosta (Missing from Target Estimate)
  - 3. Selvitettävät / ei kohdistettu
  - 4. Käyttösääntö: mitä saa muuttaa ja kuka
  - 5. Oppimisraportti (MVP)
  - 6. MVP-valmis määritelmä

## Mitä muuttui
- Kirjattu workflow-dokumenttien otsikko- ja alaotsikkorakenne yhteen paikkaan.
- Päivitetty `spec/workflows/01_mvp_flow.md`-osion otsikot vastaamaan nykyistä vaiheistusta (baseline = 2, seuranta/ennuste = 3).
- Lisätty nimeämiskappale: SaaS-vaiheet `S-1/S0` ja ennustusprosessin vaiheet `E0..E5`.

## Miksi
- Helpottaa navigointia ja keskustelua “mikä vaihe/osa” ilman, että pitää avata useita tiedostoja.

## Miten testataan (manuaali)
- Avaa `spec/workflows/00_workflow_outline.md` ja tarkista, että otsikot vastaavat workflow-tiedostojen `#`, `##` ja `###` otsikoita.
