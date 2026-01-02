# ADR-0002: MVP-työnkulkujen päätökset

**Status:** Accepted  
**Date:** 2026-01-02

## Konteksti
MVP-työnkulkujen siirrossa tarvitaan yhteinen päätöspohja, jotta UI, API ja DB
ovat linjassa. Erityisesti importit, roolit, lukitukset ja audit on päätettävä
ennen integraatiotestausta.

## Päätös
- Työnkulku kuvaa UI + API + DB -tasot.
- MVP-polku: projekti -> budjetti -> JYDA -> mapping -> tyopaketin taloudellinen suunnittelu -> ennustetapahtuma -> raportti.
- Viikkopaivitys (ghost + % + memo) on oma polku.
- Month close käyttää M1_READY_TO_SEND-tilaa ja korjauspolku vaatii hyväksynnän.
- Terminologia/i18n UI-muokkaus mukana MVP:ssa.
- Roolit ovat tekniset, ja työmaan roolit mapataan niihin (alias-mappaus).
- Acting role sallitaan (tilapäinen roolinkorotus).
- Importit käyttävät joustavaa sarakemappausta MVP:ssa.
- Laskenta sisältää AC/EV/CPI/SPI ja EAC/BAC jos specissä.
- Exportit: PDF + Excel (ei PPT MVP:ssa).
- Append-only pakotetaan kaikille kirjoittaville tapahtumille.

## Seuraukset
- Spec ja workflow-kuvaukset voidaan kirjata yhdellä totuudella.
- Integraatiotestit voidaan rakentaa päätettyä polkua vasten.
- Roolit ja lukitukset edellyttävät RBAC- ja audit-implementaatiota.

## Mitä muuttui
- Päätettiin MVP-polku ja roolien/mappingin periaatteet.
- Lukittiin month close -tilat ja korjauspolku.
- Valittiin importien joustava mappaus ja exportit (PDF/Excel).
- Yhdenmukaistettiin ADR-otsikon Status/Date-muoto ja päiväys.

## Miksi
- Integraatiotestit vaativat yhteisen, lukitun työnkulun.
- SaaSissa roolit, audit ja append-only ovat kriittisiä.
- ADR-päivämäärien on oltava yhdenmukaisia, jotta päätöshistoria on selkeä.

## Miten testataan (manuaali)
- Aja integraatiopolku end-to-end ja varmista audit-loki.
- Testaa roolit (alias + acting role) ja lukitukset (M0->M1->M2).
- Varmista, että ADR-otsikossa on sama Status/Date-muoto kuin muissa ADR:issä.
