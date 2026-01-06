# Arkkitehtuuri (MVP)

Paivitetty: 2026-01-02

## Tavoite
Rakennetaan sovellus, joka muuntaa Excel-ennustelogikan palveluksi ja tallentaa kaikki ennusteet append-only lokiin. Työpakettisuunnittelu on oma vaihe ennen ennustetapahtumaa, ja mapping erottaa työpakettilitterat tavoitearvio-litteroista sekä mahdollistaa aggregoinnin group_code 0-9 tasolla.

## Komponentit
- UI: selainkayttoinen kasittely nakymille (työpakettisuunnittelu, ennuste, raportti)
- API: palvelukerros, joka validoi kirjoitukset ja lukee raportoinnin
- DB: PostgreSQL, jossa tapahtumat ja master-data
- Storage: liitteet erillisessa objektivarastossa (polkureferenssi DB:ssa)

## Keskeinen tietovirta
1) Työpakettisuunnittelu kirjataan tavoitearvio-litteralle.
2) Ennustetapahtuma kirjataan append-only lokiin.
3) Lukitus kirjataan omana ennustetapahtumana.
4) Raportti muodostetaan tapahtumista ja mappingista.

## Tietokerrokset
- Master-data: Littera, Mapping, Project
- Tapahtumat: Ennustetapahtuma, EnnusteRivi, Liitteet
- Laskenta: nykytila ja raportoinnin aggregaatit

## Rajaukset (MVP)
- Ei automaattista Excel-kaavojen tulkintaa, vain talteenotto.
- Raportointi kattaa työpakettilittera- ja tavoitearvio-littera-nakymat sekä group_code 0-9.

## Mitä muuttui
- Päivitetty terminologia: työpakettilittera ja työpakettisuunnittelu.
- Tarkennettu mappingin rooli raportoinnin aggregoinnissa (group_code 0-9).
- Yhtenaisistetty tietovirta työpakettisuunnittelusta lokiin ja raporttiin.

## Miksi
- Terminologia vastaa työpakettien suunnitteluprosessia ja baseline-lukitusta.
- Tarvitaan lyhyt, yhtenainen kuvaus tiimille ja toteutuksen pohjaksi.
- Event-loki ja mapping ovat arkkitehtuurin ydinratkaisuja.

## Miten testataan (manuaali)
- Kulje UI-polku työpakettisuunnittelusta ennustetapahtumaan ja tarkista lokin kasvu.
- Tee lukitus ja varmista, ettei uusia tapahtumia synny ilman vapautusta.
- Aja raportti ja varmista, etta se nojaa mappingiin ja tapahtumiin.
