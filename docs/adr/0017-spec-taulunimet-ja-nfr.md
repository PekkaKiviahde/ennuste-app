# ADR-0017: Speksin taulunimet (monikko) + NFR-baseline

**Status:** Accepted  
**Date:** 2026-01-14

## Konteksti
Speksi ja toteutus olivat ajautuneet eri nimikäytäntöihin (yksikkö vs monikko) ja ei-toiminnalliset vaatimukset (suorituskyky/tietoturva/varmistukset) olivat hajallaan. Tämä hidastaa kehitystä ja vaikeuttaa testauksen hyväksymiskriteerejä.

## Päätös
- Fyysiset Postgres-taulut dokumentoidaan **monikkomuotoisina** (esim. `planning_events`, `forecast_events`, `mapping_versions`, `mapping_lines`, `litteras`).
- Työpakettisuunnittelu on **append-only tapahtuma** (`planning_events`), ei päivitettävä “plan”-rivi.
- Lisätään NFR-minimi speksiin tiedostoon `spec/05_nonfunctional_and_security.md` ja pidetään se linjassa ADRien kanssa (tenant-eristys, audit, RBAC).

## Vaihtoehdot
1) Pidetään speksissä yksikkömuoto ja muutetaan toteutus
- Miinukset: iso refaktori, riski rikkoa olemassa oleva toteutus ja testit.

2) Jätetään NFR vaatimukset toteutuksen “implisiittisiksi”
- Miinukset: ei hyväksymiskriteerejä, vaikea todentaa turvallisuutta ja suorituskykyä.

## Seuraukset
+ Speksi, koodi ja testit puhuvat samaa kieltä (taulunimet ja käsitteet).
+ Append-only suunnittelutapahtumat tukevat audit trailia ja “miksi muuttui” -raportointia.
- Toteutuksen migraatiot voivat tarvita päivityksiä, jos skeema ei vielä noudata speksin taulunimiä.

## Mitä muuttui
- Päätettiin monikkomuotoiset taulunimet speksin DDL:ään.
- Päätettiin kirjata työpakettisuunnittelu planning_events-tapahtumina (append-only).
- Lisättiin NFR-baseline speksiin.

## Miksi
- Yhdenmukaiset nimet vähentävät virheitä ja nopeuttavat kehitystä.
- NFR-vaatimukset ovat osa “valmis” -määritelmää (turva, suorituskyky, palautettavuus).

## Miten testataan (manuaali)
- Vertaile speksin taulunimiä toteutuksen kyselyihin (esim. `planning_events`, `forecast_events`).
- Tarkista, että suunnittelun muutos tehdään uutena tapahtumana (ei UPDATE).
- Tarkista, että `spec/05_nonfunctional_and_security.md` kattaa tenant-eristyksen, auditin ja RBAC:n minimit.
