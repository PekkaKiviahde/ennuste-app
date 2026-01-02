# ADR-005: Projektin SaaS-tyypilliset metatiedot

**Status:** Accepted  
**Date:** 2026-01-02

## Konteksti
Projektin perustiedot ovat MVP:ssa liian suppeat (pelkkä nimi ja asiakas).
SaaS-ympäristössä projektilla on tyypillisesti tila ja lisätietoja
(osoite, aikaväli, vastuuhenkilö). Nämä tiedot tarvitaan onboardingissa
ja hallinnon työnkulussa.

## Päätös
- Projektilla on eksplisiittinen tila (`project_state`).
- Projektin lisätiedot tallennetaan `project_details`-JSONB-kenttään.
- Projektin perustiedot ovat edelleen `name` + `customer`, mutta SaaS-tyypilliset
  tiedot ovat saatavilla onboarding-polun kautta.

## Seuraukset
* Projektin metatiedot voidaan lisätä ilman heti uusia tauluja/migraatioita.
* UI voi näyttää/kerätä lisätiedot roolipohjaisesti.
* Raportoinnissa voidaan hyödyntää projektin tilaa ja aikaväliä.

## Mitä muuttui
- Täydennettiin projektin tietomalli SaaS-tyypillisillä kentillä (tila + metatiedot).

## Miksi
- SaaS-projekti vaatii enemmän kontekstia kuin pelkkä nimi.
- Onboarding ja hallinto tarvitsevat yhtenäiset metatiedot.

## Miten testataan (manuaali)
- Tarkista, että projektin lisätiedot ovat speksissä.
- Varmista, että UI:n onboarding-lomakkeet vastaavat metatietoihin.
