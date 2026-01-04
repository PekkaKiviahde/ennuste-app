# Kide-Asunnot Ot - testidata (tyomaat)

Kaikki tyomaat kuuluvat samaan yritykseen (Kide-Asunnot Ot) ja kayttavat
tavoitearvio-testidataa `excel/testdata_generated_kaarna/`.

## Tyomaat

- Kide Kaarna
  - Vaihe: Suunnittelu
  - Tila: P0_PROJECT_DRAFT
  - Tavoitearvio CSV: excel/testdata_generated_kaarna/seed_control.csv
  - Tyopaallikko: Petri Paallikko
  - Vastaava mestari: Vastaava Mestari 1
  - Tyonjohtaja: Tyonjohtaja 1
- Kide Puro
  - Vaihe: Maanrakennus
  - Tila: P1_PROJECT_ACTIVE
  - Tavoitearvio CSV: excel/testdata_generated_kaarna/numbers_formats.csv
  - Tyopaallikko: Petri Paallikko
  - Vastaava mestari: Vastaava Mestari 2
  - Tyonjohtaja: Tyonjohtaja 2
- Kide Kivi
  - Vaihe: Perustukset
  - Tila: P1_PROJECT_ACTIVE
  - Tavoitearvio CSV: excel/testdata_generated_kaarna/broken_totals.csv
  - Tyopaallikko: Petri Paallikko
  - Vastaava mestari: Vastaava Mestari 3
  - Tyonjohtaja: Tyonjohtaja 3
- Kide Sointu
  - Vaihe: Runko
  - Tila: P1_PROJECT_ACTIVE
  - Tavoitearvio CSV: excel/testdata_generated_kaarna/bad_codes.csv
  - Tyopaallikko: Sari Paallikko
  - Vastaava mestari: Vastaava Mestari 4
  - Tyonjohtaja: Tyonjohtaja 4
- Kide Kajo
  - Vaihe: Julkisivu
  - Tila: P1_PROJECT_ACTIVE
  - Tavoitearvio CSV: excel/testdata_generated_kaarna/duplicates_conflicts.csv
  - Tyopaallikko: Sari Paallikko
  - Vastaava mestari: Vastaava Mestari 5
  - Tyonjohtaja: Tyonjohtaja 5
- Kide Utu
  - Vaihe: Sisavalmius
  - Tila: P2_PROJECT_ARCHIVED
  - Tavoitearvio CSV: excel/testdata_generated_kaarna/text_encoding.csv
  - Tyopaallikko: Sari Paallikko
  - Vastaava mestari: Vastaava Mestari 6
  - Tyonjohtaja: Tyonjohtaja 6

## Mita muuttui
- Koottu Kide-Asunnot Ot -tyomaiden testidata ja roolijaot yhteen listaukseen.

## Miksi
- Tarvitaan yksi paikka, josta nakyy tyomaiden vaihe, roolit ja kaytettava tavoitearvio-data.

## Miten testataan (manuaali)
- Avaa `docs/testdata/kide-tyomaat.md` ja varmista, etta listaus vastaa seediin luotuja tyomaita.
