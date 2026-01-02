# ADR-0010: Ensisijainen UI-polku

**Status:** Accepted  
**Date:** 2026-01-02

## Konteksti
Repossa on kaksi UI-polkuja:
- `ui/` (legacy UI, oma login ja logiikka)
- `api/public/` (uusi public-UI, login erillisessä `/login`-reitissä)

Kaksipolkuisuus aiheuttaa epäselvyyttä kehitykseen, testaukseen ja tukiin.

## Päätös
- Ensisijainen UI-polku on `api/public/`.
- `ui/` merkitään legacyksi, eikä sinne lisätä uusia ominaisuuksia.
- UI-muutokset tehdään jatkossa `api/public/`-polkuun.

## Seuraukset
- Login- ja UI-polut yhtenäistetään public-UI:n alle.
- Legacy-UI pidetään vain historiaa varten, kunnes se voidaan poistaa.
- Dokumentaatio viittaa ensisijaisesti `api/public/`-polkuun.

## Mitä muuttui
- Päätettiin ensisijainen UI-polku ja legacy-status toiselle polulle.

## Miksi
- Yksi pääpolku vähentää sekaannusta ja nopeuttaa kehitystä.

## Miten testataan (manuaali)
- Avaa `api/public/` UI ja varmista, että login ja pääsivun polut toimivat.
- Varmista, ettei `ui/`-polkua enää referoida pääpolkuohjeissa.
