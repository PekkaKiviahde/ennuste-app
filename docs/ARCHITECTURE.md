# Arkkitehtuuri (MVP)

Paivitetty: 2026-01-02

## Tavoite
Rakennetaan sovellus, joka muuntaa Excel-ennustelogikan palveluksi ja tallentaa kaikki ennusteet append-only lokiin. Suunnittelu on oma vaihe ennen ennustetapahtumaa, ja mapping erottaa tyolitterat tavoitearvio-litteroista.

## Komponentit
- UI: selainkayttoinen kasittely nakymille (suunnitelma, ennuste, raportti)
- API: palvelukerros, joka validoi kirjoitukset ja lukee raportoinnin
- DB: PostgreSQL, jossa tapahtumat ja master-data
- Storage: liitteet erillisessa objektivarastossa (polkureferenssi DB:ssa)

## Keskeinen tietovirta
1) Suunnitelma kirjataan tavoitearvio-litteralle.
2) Ennustetapahtuma kirjataan append-only lokiin.
3) Lukitus kirjataan omana ennustetapahtumana.
4) Raportti muodostetaan tapahtumista ja mappingista.

## Tietokerrokset
- Master-data: Littera, Mapping, Project
- Tapahtumat: Ennustetapahtuma, EnnusteRivi, Liitteet
- Laskenta: nykytila ja raportoinnin aggregaatit

## Rajaukset (MVP)
- Ei automaattista Excel-kaavojen tulkintaa, vain talteenotto.
- Raportointi kattaa tyolittera- ja tavoitearvio-littera-nakymat sekä group_code 0-9.

## Mitä muuttui
- Lisatty oma arkkitehtuurikuvaus MVP-kokonaisuudesta.
- Korostettu suunnitelma -> ennuste -> lukitus -> loki -> raportti -ketju.
- Kuvattu UI, API ja DB komponentit seka liitteiden varastointi.
- Lisatty paivitetty-paivamaara dokumenttiin.

## Miksi
- Tarvitaan lyhyt, yhtenainen kuvaus tiimille ja toteutuksen pohjaksi.
- Event-loki ja mapping ovat arkkitehtuurin ydinratkaisuja.

## Miten testataan (manuaali)
- Kulje UI-polku suunnitelmasta ennustetapahtumaan ja tarkista lokin kasvu.
- Tee lukitus ja varmista, ettei uusia tapahtumia synny ilman vapautusta.
- Aja raportti ja varmista, etta se nojaa mappingiin ja tapahtumiin.
