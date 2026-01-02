# ADR-0008: Postgres-taulurakenne speksin pohjalta

**Status:** Accepted  
**Date:** 2026-01-02

## Context
Speksi on nyt kirjaillinen, mutta toteutus tarvitsee yhteisen taulurungon. Tarvitaan selkea pohja, jonka mukaan API, migraatiot ja raportointi voidaan toteuttaa johdonmukaisesti.

## Decision
Kirjataan speksin entiteeteille Postgres-taulut, avaimet ja perusindeksit `spec/data-model/03_postgres_tables.md` -tiedostoon. Taulurakenne seuraa append-only -periaatetta ja mapping-versionointia.

## Alternatives considered
1) Suora migraatio ilman dokumentoitua taulurunkua
- Miinukset: speksi ja toteutus eriytyvat, audit trail vaarantuu.

2) Pelkka ERD-kaavio ilman DDL-runkua
- Miinukset: avaimet ja indeksit jaavat tulkinnan varaan.

## Consequences
+ UI, API ja DB voivat nojata samaan taulurakenteeseen.
+ Mapping-versionointi ja ennustetapahtuma sitoutuvat yhteen.
- DDL vaatii paivityksen, jos speksi muuttuu.

## Mita muuttui
- Lisatty ADR-0008, joka lukitsee Postgres-taulurungon dokumentoinnin.

## Miksi
- Speksimuutos vaatii paatoksen dokumentointia.
- Toteutus tarvitsee yhteisen pohjan migraatioille.

## Miten testataan (manuaali)
- Avaa `spec/data-model/03_postgres_tables.md` ja varmista, etta taulut vastaavat speksia.
