# ADR-0014: Konserni/yhtiö/projekti‑hierarkia ja onboarding

**Status:** Accepted  
**Date:** 2026-01-04

## Konteksti
Asiakkailla voi olla konsernirakenne. Lisäksi SaaS‑myyjä vastaa uusien
yhtiöiden luonnista ja yrityksen pääkäyttäjän kutsumisesta.

## Päätös
- Konserni on oma entiteetti (Group).
- SaaS‑myyjä luo yhtiön ja lähettää kutsulinkin yrityksen pääkäyttäjälle.
- Yhtiön luonnissa luodaan demoprojekti.
- Pääkäyttäjä saa ORG_ADMIN + demoprojektin owner‑roolin.
- Konserni‑adminilla on lukuoikeus konsernin kaikkiin yhtiöihin.
- Konsernitasolle lisätään ylätason raportointi.
- Kaikki tapahtumat kirjataan append‑only audit‑logiin.

## Seuraukset
- Rooliperintä on selkeä: konserni -> yhtiö -> projekti.
- Kutsulinkkivirta vaatii token‑hallinnan ja audit‑tapahtumat.
- Dokumentaatio ohjaa Next‑UI:hin, Express on API‑only.

## Mitä muuttui
- Päätettiin konsernirakenne ja SaaS‑myyjän onboarding‑virta.

## Miksi
- Yksi malli vähentää sekaannusta ja tukee asiakkaiden konsernirakenteita.

## Miten testataan (manuaali)
- Varmista, että speksi `spec/workflows/02_org_hierarchy_onboarding.md` vastaa päätöstä.
