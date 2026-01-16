# ADR-0014: Konserni/yhtiö/projekti‑hierarkia ja onboarding

**Status:** Accepted  
**Date:** 2026-01-04

## Konteksti
Asiakkailla voi olla konsernirakenne. Lisäksi SaaS‑myyjä vastaa uusien
yhtiöiden luonnista ja yrityksen pääkäyttäjän kutsumisesta.

## Päätös
- Konserni‑taso (Group) on olemassa ja käytettävissä, mutta valinnainen käyttää (aina ei ole konsernia).
- SaaS‑myyjä luo yhtiön (Organization) ja luo ORG_ADMIN‑kutsulinkin yrityksen pääkäyttäjälle.
- Yhtiön luonnissa luodaan demoprojekti automaattisesti (`is_demo=true`, oletusnimi “Demo – <Yhtiö>”).
- Kutsulinkki on sähköpostiin sidottu, kertakäyttöinen ja vanheneva.
- Roolit ovat scopekohtaisia:
  - `ORG_ADMIN` = organisaatiotaso (yhtiö)
  - `PROJECT_OWNER` = projektitaso
  - kutsun hyväksyjä saa `ORG_ADMIN` + demoprojektin `PROJECT_OWNER` onboardingissa.
- Kaikki tapahtumat kirjataan append‑only audit‑logiin.

Suositus (ei lukittu päätös):
- vältä NULL‑konsernia: jos konsernia ei anneta, luo yhtiölle “oma konserni” ‑Group (`is_implicit=true`) ja liitä yhtiö siihen.

## Seuraukset
- Rooliperintä on selkeä: konserni -> yhtiö -> projekti.
- Kutsulinkkivirta vaatii token‑hallinnan ja audit‑tapahtumat.
- Dokumentaatio ohjaa Next‑UI:hin, Express on API‑only.

## Mitä muuttui
- Päivitettiin ADR vastaamaan nykyistä kutsulinkkimallia (email-sidonta, kertakäyttö, vanheneminen) ja demoprojektin `is_demo`-mallia.

## Miksi
- Yksi malli vähentää sekaannusta ja tukee asiakkaiden konsernirakenteita.

## Miten testataan (manuaali)
- Varmista, että speksi `spec/workflows/02_org_hierarchy_onboarding.md` vastaa päätöstä.
