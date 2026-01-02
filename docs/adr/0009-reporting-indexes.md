# ADR-0009: Raportoinnin indeksisuositukset

**Status:** Accepted  
**Date:** 2026-01-02

## Context
Raportointi yhdistaa toteumat, budjetit, mappingin ja ennustetapahtumat. Tarvitsemme yhteisen peruslinjan indekseille, jotta kyselyt ovat luotettavasti nopeita.

## Decision
Dokumentoidaan raportoinnin indeksisuositukset `spec/data-model/04_reporting_indexes.md` -tiedostoon ja pidetaan ne linjassa speksin kanssa.

## Alternatives considered
1) Indeksit vasta toteutusvaiheessa
- Miinukset: raportointi hidastuu ja suorituskyvyn ongelmat tulevat myohaan.

2) Automaattinen indeksien luonti vain migraatioissa ilman speksia
- Miinukset: speksi ja toteutus eivat pysy synkassa.

## Consequences
+ Yhteinen dokumentoitu lista indeksitarpeista.
+ API/DB voivat toteuttaa samat oletuspolut.
- Indeksien tarve tarkentuu EXPLAIN-analyyseilla.

## Mita muuttui
- Lisatty ADR-0009, joka lukitsee raportoinnin indeksisuositusten dokumentoinnin.

## Miksi
- Speksimuutos vaatii paatoksen dokumentointia.
- Raportoinnin suorituskyky on MVP:n kaytettavyyden ydin.

## Miten testataan (manuaali)
- Aja EXPLAIN raporttikyselyille ja varmista, etta indeksit kaytossa.
