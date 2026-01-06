# AGENTS.md (Codex-ohjeet tälle repolle)

Tämä tiedosto kertoo Codexille (ja ihmisille) miten tässä repossa toimitaan.

## Missio

Muunna Excel-ennustetyökalun toimintalogiikka sovellukseksi siten, että:
- kaikki ennusteet ja perustelut jäävät **append-only lokiin**
- työnjohdon **suunnittelu** on oma vaihe ennen ennustusta
- **tavoitearvio-littera** voidaan erottaa **työlitteroista** ja yhdistää mappingilla
- raportointi pystyy aggregoimaan sekä työpakettilitterat että tavoitearvio-litterat (ryhmittely 0–9)

## Tärkeät rajoitteet

- ÄLÄ poista historiaa: loki on append-only (audit trail).
- Kaikki muutokset speksiin vaativat päivityksen myös `docs/adr/` päätöksiin (ADR).
- Excel on lähde/proto: älä oleta, että Excelin kaavat ovat sovelluksen totuus – sovelluksen totuus on `spec/`.

## Repon kartta

- `spec/data-model/` – tietomalli ja kenttämäärittelyt
- `spec/workflows/` – prosessikaaviot ja MVP-virrat
- `spec/imports/` – Jyda/Excel tuonnit ja validointi
- `docs/adr/` – päätösdokumentit (miksi tehtiin näin)
- `tools/scripts/` – analyysi- ja validointiskriptit
- `excel/` ja `vba/` – nykyisen työkalun lähdeaineisto

## Ensimmäisen sprintin tuotokset (pyydettäessä tee PR)

1) `spec/data-model/01_entities.md`
   - Littera, Mapping, Suunnitelma, Ennustetapahtuma, EnnusteRivi (kustannuslajit), Liitteet
2) `spec/workflows/01_mvp_flow.md`
   - Suunnittelu → ennustetapahtuma → lukitus → loki → raportti
3) `docs/ARCHITECTURE.md`
   - lyhyt arkkitehtuurikuvaus ja komponentit (API/UI/DB)
4) `docs/adr/0001-event-sourcing.md`
   - päätös: append-only event log (perustelut + vaihtoehdot)

## Tyylisäännöt

- Käytä suomea (selkeä, lyhyt, tekninen).
- Käytä termejä: työpakettilittera / tavoitearvio-littera / mapping / työpakettisuunnittelu / ennustetapahtuma / lukitus (baseline).
- Kun teet muutoksia, lisää aina:
  - “Mitä muuttui”
  - “Miksi”
  - “Miten testataan (manuaali)”

## Testattavuus (MVP)

- Lisää vähintään 3 skenaariota `data/samples/`:
  1) uusi tavoitearvio-littera ilman historiaa
  2) tavoitearvio-littera, jolla on 2–3 ennustetapahtumaa
  3) mapping, jossa 3 tavoitearvio-litteraa yhdistyy yhteen työpakettilitteraan (alkuperäiset koodit säilyvät)

## Codex-tehtäväpromptien mallit

- “Luo tietomalli markdownina ja ehdota Postgres-taulut + avaimet + indeksit.”
- “Kirjoita MVP-työnkulku: käyttäjä tekee suunnitelman, sen jälkeen ennustetapahtuman, kaikki lokiin.”
- “Tee ADR: miksi valitsimme append-only event log -mallin eikä ‘vain viimeisin’.”
