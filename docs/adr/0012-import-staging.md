# ADR-0012: Import staging ja manuaalinen puhdistus

**Status:** Proposed  
**Date:** 2026-01-04

## Context
Tavoitearvio-importti saa sisaan rikkinäista dataa (NaN, negatiiviset arvot,
puuttuvat koodit). Suora import `budget_lines`-tauluun estaa manuaalisen
puhdistuksen ja vaarantaa audit trailin. Tarvitaan vaihe, jossa
yrityksen pääkäyttäjä voi korjata rivit ennen lopullista siirtoa.

## Decision
Lisataan import staging -vaihe ennen `budget_lines`-kirjausta:
- raakadata tallennetaan append-only `import_staging_lines_raw`-tauluun
- korjaukset kirjataan append-only `import_staging_line_edits`-tauluun
- validointiongelmat kirjataan `import_staging_issues`-tauluun
- jos batchissa ei ole ERROR-issueita, UI voi auto-hyvaksya ja auto-siirtaa eran
- jos ERROR-issueita on, siirto pysahtyy ja virheloki naytetaan korjausta varten
- vasta hyvaksytty staging-batch siirretaan `import_batches` + `budget_lines`

## Alternatives considered
1) Suora import ja automaattinen sanitointi
- Plussat: nopea ja yksinkertainen.
- Miinukset: vaikea auditointi, ei manuaalista korjausta.

2) Manuaalinen siivous Excelissa ennen tuontia
- Plussat: ei tarvita uutta staging-kerrosta.
- Miinukset: ulkoinen prosessi, vaikea toistaa ja auditoida.

3) In-place korjaus `budget_lines`-taulussa
- Plussat: ei staging-tauluja.
- Miinukset: rikkoo append-only-periaatteen ja auditoinnin.

## Consequences
+ Puhdistus on hallittu, auditoitava ja toistettava.
+ Hyvaksytyt siirrot ovat erikseen raportoituja.
- Tarvitsee uudet taulut ja UI-nakyman (pääkäyttäjä).

## Mita muuttui
- Ehdotettu uusi import staging -kerros tavoitearvion puhdistukseen.

## Miksi
- Manuaalinen puhdistus vaatii oman vaiheensa ennen budget_lines-siirtoa.

## Miten testataan (manuaali)
- Tuo CSV stagingiin, korjaa yksi rivi ja hyvaksya siirto; varmista
  että `budget_lines` saa vain hyvaksytyt rivit.
