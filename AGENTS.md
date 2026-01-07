# AGENTS.md (Codex-ohjeet tälle repolle)

Tämä tiedosto kertoo Codexille (ja ihmisille) miten tässä repossa toimitaan.

## Missio

Muunna Excel-ennustetyökalun toimintalogiikka sovellukseksi siten, että:
- kaikki ennusteet ja perustelut jäävät **append-only lokiin**
- työnjohdon **suunnittelu** on oma vaihe ennen ennustusta
- **tavoitearvio-littera** voidaan erottaa **työlitteroista** ja yhdistää mappingilla
- raportointi pystyy aggregoimaan sekä työpakettilitterat että tavoitearvio-litterat (ryhmittely 0–9)
- Talo 80 -koodit ja yrityskohtaiset sovellukset toimivat oikein (4-numeroiset, leading zeros)

## Tärkeät rajoitteet

- ÄLÄ poista historiaa: loki on append-only (audit trail).
- Kaikki muutokset speksiin vaativat päivityksen myös `docs/adr/` päätöksiin (ADR).
- Excel on lähde/proto: älä oleta, että Excelin kaavat ovat sovelluksen totuus – sovelluksen totuus on `spec/`.
- Kun teet muutoksia budjetin tuontiin / mappingiin / raportointiin:
  - päivitä myös asiaankuuluva runbook (esim. `RUNBOOK_BUDGET_IMPORT.md`, `RUNBOOK_WORK_PHASES_MVP.md`)
  - lisää sample-data / smoke test.

## Repon kartta

- `spec/data-model/` – tietomalli ja kenttämäärittelyt
- `spec/workflows/` – prosessikaaviot ja MVP-virrat
- `spec/imports/` – Jyda/Excel tuonnit ja validointi
- `docs/adr/` – päätösdokumentit (miksi tehtiin näin)
- `tools/scripts/` – analyysi- ja validointiskriptit
- `excel/` ja `vba/` – nykyisen työkalun lähdeaineisto

## Domain context (Talo 80)

### Pakolliset lähteet (Codex: lue nämä ennen muutoksia)
- `docs/talo80/TALO80_HANDOFF.md`
  - keskustelun päätökset + yrityskohtaiset sovellukset (esim. 4101/4102, VSS 6700→2500 sisällytys).
- Tavoitearvion tuonnin lähde-CSV (projektikohtainen): import luo aina projektin koodisanakirjan (`litteras`).

### Talo 80 -koodisäännöt (MUST FOLLOW)
- **Littera on aina 4-numeroisena merkkijonona** (regex `^\d{4}$`).
  - Esim. `"0310"` ei saa muuttua `"310"`.
- Käsittele koodit DB:ssä ja sovelluksessa **tekstinä** (ei int).
- `group_code` (0–9) voidaan laskea ensimmäisestä numerosta, mutta älä koskaan riko koodin 4-merkkistä muotoa.
- Älä kovakoodaa “virallista” Talo 80 -listaa sovellukseen:
  - **projektin koodisto tulee aina tavoitearvion tuonnista** ja voi poiketa yrityskohtaisesti (esim. alalitterat).

### Koonti vs alalitterat (yrityskohtainen sovellus)
- Yrityksellä voi olla alalitteroita (esim. 4101/4102), jotka raportoidaan koontiin (4100).
- Tämä ei aina ole “virallinen Talo 80” sellaisenaan, mutta tuotannon käytännössä tämä on sallittua.
- Siksi:
  - älä rakenna roll-up logiikkaa pelkällä “viimeinen numero nollaksi” -oletuksella
  - toteuta roll-up **konfiguroitavasti** (dictionary/taulu tai sääntölista), ja dokumentoi poikkeukset `docs/talo80/TALO80_HANDOFF.md`:ään.

## Tavoitearvio (TARGET_ESTIMATE) ja import

- Tavoitearvion tuonti luo:
  - `litteras` (projektin litterat + selitteet)
  - `budget_lines` (tavoitearvion kustannuslajirivit)
  - (jos käytössä) `budget_items` (nimiketaso / item_code-rivit)
- Baseline-lukitus saa käyttää vain koodeja, jotka löytyvät kyseisen import-batchin budjetista.
  - jos saat virheen “missing from TARGET_ESTIMATE”, se on odotettu: jäsenkoodi ei ole budjetissa.

## Työlittera vs tavoitearvio-littera + mapping

### Termit (täsmennys)
- **target_littera** = tavoitearvion (budjetin) littera (budjettilinjat)
- **work_littera** = toteuman / tuotannon ohjauksen littera (toteumalinjat, työpaketit/työvaiheet)

### Mapping (MUST FOLLOW)
- `mapping_versions` + `mapping_lines` on tapa yhdistää work_littera → target_littera.
- Älä muokkaa mappingia “in place”:
  - tee uusi mapping-versio (append-only/audit), aktivoi se.
- Mappingin pitää mahdollistaa:
  - 1 work_littera → usea target_littera (FULL/PERCENT)
  - kustannuslajikohtaiset jaot (cost_type) tarvittaessa

### Esimerkki: ikkunat (yrityskohtainen sovellus)
- 4101 = ikkunatoimitus
- 4102 = ikkuna-asennus
- 4100 = ikkunat yhteensä (raportoinnin koonti)
Toteutus:
- 4101 ja 4102 ovat omia `litteras`-koodeja, jos ne tulevat tavoitearviotuonnista.
- Raportointi saa näyttää sekä 4101/4102 että koonnin 4100 (roll-up).

### Esimerkki: VSS (sisällytä 6700 → 2500 ilman tiedon häviämistä)
Tavoitearviossa voi olla:
- 2500 VSS-rakenteet (budjetti)
- 6700 Väestönsuojan varusteet / valuosat (budjetti)
Tuotannon seurannassa halutaan:
- work_littera 2500 sisältää myös target 6700 osuuden (“mistä 2500 koostuu”)

Toteutus:
- Tee mapping-versioon rivit:
  - work 2500 → target 2500 (FULL)
  - work 2500 → target 6700 (FULL) tai sääntöjen mukaan
- Raportoinnissa on oltava näkymä “koostumus”:
  - work 2500 koostuu target 2500 + target 6700 (ja mahdolliset item_code-erittelyt säilyvät).
- Älä “poista” target 6700:aa, äläkä hukkaa sen item-tasoa – säilytä lähde-erittely auditointiin.

## Tyylisäännöt

- Käytä suomea (selkeä, lyhyt, tekninen).
- Käytä termejä: työpakettilittera / tavoitearvio-littera / mapping / työpakettisuunnittelu / ennustetapahtuma / lukitus (baseline).
- Kun teet muutoksia, lisää aina:
  - “Mitä muuttui”
  - “Miksi”
  - “Miten testataan (manuaali)”

## Testattavuus (MVP)

Lisää vähintään 4 skenaariota `data/samples/` (tai vastaavaan):
1) Tavoitearvion tuonti, jossa on leading zeros (esim. 0310) → varmistus ettei muutu 310.
2) Ikkunat: 4101 + 4102 → raportoinnin koonti 4100 (roll-up).
3) VSS: mapping jossa work 2500 sisältää myös target 6700 → koostumusraportti näyttää lähteet.
4) Mapping jossa usea target-littera yhdistyy yhteen work-litteraan (FULL/PERCENT) ilman tuplalaskentaa.

## Codex-tehtäväpromptien mallit

- “Lue `docs/talo80/TALO80_HANDOFF.md` ja varmista, että muutokset noudattavat sen sääntöjä.”
- “Kirjoita migraatio/taulu/VIEW joka toteuttaa work→target mappingin ja koostumusraportin.”
- “Tee ADR: miksi käytämme append-only event log -mallia eikä ‘vain viimeisin’.”
