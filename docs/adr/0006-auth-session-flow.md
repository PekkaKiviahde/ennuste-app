# ADR-0006: Yhtenäinen kirjautumis- ja uloskirjautumisvirta

**Status:** Accepted  
**Date:** 2026-01-02

## Context
Kirjautumisen ja uloskirjautumisen käyttäytyminen on ollut epäyhtenäinen eri UI-polkujen välillä.
Tämä hidastaa testausta ja voi aiheuttaa kaksiklikkista käytöstä.

## Decision
Valitaan yhtenäinen auth-tilan nollaus ja ohjaus:
- Resetoi auth-tila aina yhdellä yhteisellä nollauksella.
- Poista authToken localStoragesta ja authToken-cookie heti client-puolella.
- Uloskirjautuminen ohjaa aina `/login`-sivulle.
- 401-virheessä nollataan auth-tila (MVP UI + legacy UI), jotta UI ei jää vanhaan tilaan.

## Toteutusviitteet
- API: `api/server.js` (`/api/login`, `/api/logout`, authToken cookie + token-payload).
- MVP UI: `api/public/app.js` (`fetchJson` 401-nollaus, `resetAuthState`, `performLogout`, `redirectIfNeeded`).
- Login-sivu: `api/public/login.js` (`/api/login`, localStorage authToken, redirect `/`).
- Legacy UI: `ui/app.js` (login/logout + `resetAuthState` + 401-nollaus).

## Consequences
+ Käyttökokemus on yhtenäinen kaikissa UI-polkuissa.
+ Testaus nopeutuu ja virhetilat ovat selkeämpiä.
- Tiukempi ohjaus `/login`-sivulle voi vaatia lisäpoikkeuksia jatkossa.

Mitä muuttui
- Lukittu yhtenäinen kirjautumis- ja uloskirjautumisvirta sekä 401-käyttäytyminen.
- Lisätty toteutusviitteet auth-virran keskeisiin tiedostoihin.
- Lisätty legacy UI:n 401-nollaus auth-virtaan.

Miksi
- Poistetaan kaksiklikkinen uloskirjautuminen ja varmistetaan selkeä sessiotila.
- Toteutusviitteet nopeuttavat WIP-siivoa ja estävät ristiriidat.
- Legacy UI:n 401-nollaus estää vanhan tokenin käyttöä.

Miten testataan (manuaali)
- Kirjaudu sisään, kirjaudu ulos, varmista siirtymä `/login`-sivulle.
- Kirjaudu uudelleen sisään ja varmista, että tila on puhdas.
- Tee 401 API-kutsu (esim. muokattu token) ja varmista, että auth-tila nollautuu.
- Tee 401 API-kutsu legacy UI:ssa ja varmista ohjaus `/login`-sivulle.
