# ADR-0001: Append-only event log ennustukseen

**Status:** Accepted  
**Date:** 2026-01-02

## Context
Tarvitsemme tavan, jolla kaikki ennusteet ja perustelut ovat jaljitettavissa. Ennustetapahtumia syntyy viikoittain, ja muutosten historia on raportoinnin ydin. Suunnitelma on oma vaihe ennen ennustetapahtumaa, mutta ennustuksen totuus muodostuu silti tapahtumista.

## Decision
Valitaan append-only event log -malli ennustukseen:
- Kaikki ennustetapahtumat kirjataan muuttumattomina.
- Korjaukset tehdään aina uutena tapahtumana.
- Nykytila lasketaan tapahtumista (uusin tapahtuma tai aggregaatti).

## Alternatives considered
1) Vain viimeisin ennuste
- Plussat: yksinkertainen malli ja pienempi datamaara.
- Miinukset: historia katoaa, perustelut haviaavat, audit trail puuttuu.

2) Versionoitu ennuste per tavoitearvio-littera
- Plussat: historia saatavilla.
- Miinukset: vaatii erillisen versionoinnin ja rinnakkaisen lukituslogiikan.

## Consequences
+ Käyttö ja raportointi ovat jäljitettavia ja auditoitavia.
+ "Miksi muuttui" -raportointi on suora tapahtumista.
- Tapahtumia kertyy paljon, mutta malli on skaalautuva aggregoinneilla.

## Mitä muuttui
- Paivitetty ADR-0001 vastaamaan suunnitelma -> ennustetapahtuma -ketjua.
- Vahvistettu, etta suunnitelma ei korvaa append-only lokia vaan taydentaa sita.

## Miksi
- Tarvitaan pysyvä historia ennustetapahtumista ja perusteluista.
- Raportointi ja audit trail ovat keskeisiä liiketoimintavaatimuksia.

## Miten testataan (manuaali)
- Kirjaa kaksi peräkkäistä ennustetapahtumaa ja varmista, että molemmat näkyvät lokissa.
- Varmista, että nykytila lasketaan uusimmasta tapahtumasta.
