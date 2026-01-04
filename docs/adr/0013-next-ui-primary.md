# ADR-0013: Next-UI ainoa käyttöliittymä

**Status:** Accepted  
**Date:** 2026-01-04

## Konteksti
Repo sisälsi kaksi UI-polkuja:
- `apps/web/` (Next-UI)
- `api/public/` + `ui/` (legacy UI)

Kaksipolkuisuus aiheutti epäselvyyttä ja päällekkäistä kehitystä.

## Päätös
- Ainoa aktiivinen UI on Next-UI `apps/web/`.
- Express-palvelin on API-only (ei UI:ta).
- Legacy-UI-tiedostot poistetaan reposta.

## Seuraukset
- UI-kehitys keskitetään Next-UI:hin.
- Express-UI-reitit poistuvat (palauttavat 404).
- Dokumentaatio ohjaa vain Next-UI:hin.

## Mitä muuttui
- Siirrettiin kaikki uusi UI-kehitys Next-UI:hin ja poistettiin legacy-UI-tiedostot.

## Miksi
- Yksi UI-polku vähentää sekaannusta, nopeuttaa kehitystä ja selkeyttää omistajuuden.

## Miten testataan (manuaali)
- Avaa Next-UI ja varmista, että sovellus toimii normaalisti.
- Kokeile Express-palvelimen UI-reittejä ja varmista 404 JSON -vastaukset.
