# ADR-0007: Kaikki merkittävät päätökset kirjataan ADR:iin

**Status:** Accepted  
**Date:** 2026-01-02

## Context
Päätöksiä syntyy iteratiivisesti käyttöliittymän testauksen myötä. Ilman yhteistä käytäntöä
on riski, että merkittävät linjaukset hajaantuvat ja muutokset jäävät kirjaamatta.

## Decision
- Kaikki merkittävät arkkitehtuuriin, tietomalliin, turvallisuuteen, työnkulkuun tai
  käyttökokemukseen liittyvät päätökset kirjataan ADR:iin.
- Jokainen ADR sisaltaa “Mita muuttui / Miksi / Miten testataan (manuaali)”.
- Speksi-dokumenteissa muutokset kirjataan muutososioihin.

## Consequences
+ Päätöshistoria on selkeä ja auditoitava.
+ Muutokset ovat seurattavissa ja nopeuttavat testauksen iterointia.
- Lisää pientä dokumentaatiotyötä jokaisen merkittävän päätöksen yhteydessä.

## Mitä muuttui
- Lukittu periaate: merkittävät päätökset kirjataan ADR:iin.
- Lisatty speksi-dokumenttien muutososioiden kaytanto.

## Miksi
- Halutaan selkeä audit trail ja yhteinen totuus linjauksista.
- Speksien muutokset pitää olla auditoitavissa samalla tavalla.

## Miten testataan (manuaali)
- Tarkista, että jokaisesta uudesta merkittävästä päätöksestä syntyy ADR-tiedosto.
- Tarkista, että speksi-dokumenteissa on muutososiot.
