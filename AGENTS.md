# AGENTS.md (Codex-ohjeet tälle repolle)

Tämä tiedosto kertoo Codexille (ja ihmisille) miten tässä repossa toimitaan.

## Missio

Muunna Excel-ennustetyökalun toimintalogiikka sovellukseksi siten, että:
- kaikki ennusteet ja perustelut jäävät **append-only lokiin**
- työnjohdon **suunnittelu** on oma vaihe ennen ennustusta
- tavoitearvio tuodaan (laskentaosasto) → sen jälkeen alkaa tuotannon **mäppäys** (työntaloudellinen suunnittelu)
- mäppäyksessä tavoitearvion rivit siirretään tuotannon työn alle, jossa kustannus “tehdään”
- mäppäys tukee myös hankintoja: työpaketti voidaan liittää hankintapakettiin (urakka/sopimus)
- raportointi pystyy aggregoimaan sekä työpaketit että tavoitearvion litterat (0–9 pääryhmät)

## Tärkeät rajoitteet

- ÄLÄ poista historiaa: loki on append-only (audit trail).
- Kaikki muutokset speksiin vaativat päivityksen myös `docs/adr/` päätöksiin (ADR).
- Excel on lähde/proto: älä oleta, että Excelin kaavat ovat sovelluksen totuus – sovelluksen totuus on `spec/`.
- ÄLÄ kovakoodaa yrityskohtaisia “koodisääntöjä” MVP:hen (esim. 6700→2500 automaattisesti).
  MVP:ssä mäppäys on tuotannon tekemä (manuaalinen), ja järjestelmä voi vain ehdottaa.

## Repon kartta

- `spec/data-model/` – tietomalli ja kenttämäärittelyt
- `spec/workflows/` – prosessikaaviot ja MVP-virrat
- `spec/imports/` – Jyda/Excel tuonnit ja validointi
- `docs/adr/` – päätösdokumentit (miksi tehtiin näin)
- `tools/scripts/` – analyysi- ja validointiskriptit
- `excel/` ja `vba/` – nykyisen työkalun lähdeaineisto

## Ensimmäisen sprintin tuotokset (pyydettäessä tee PR)

1) `spec/data-model/01_entities.md`
   - Littera, TavoitearvioRivi (item), Työpaketti, Hankintapaketti, Mäppäys, Suunnitelma, Ennustetapahtuma, Lukitus (baseline)
2) `spec/workflows/01_mvp_flow.md`
   - Tavoitearvio import → tuotannon mäppäys → baseline lukitus → viikkopäivitys → raportti
3) `docs/ARCHITECTURE.md`
   - lyhyt arkkitehtuurikuvaus ja komponentit (API/UI/DB)
4) `docs/adr/0001-event-sourcing.md`
   - päätös: append-only event log (perustelut + vaihtoehdot)

## Tyylisäännöt

- Käytä suomea (selkeä, lyhyt, tekninen).
- Käytä termejä: työpaketti / hankintapaketti / tavoitearvio / tavoitearviorivi (item) / mäppäys / työpakettisuunnittelu / ennustetapahtuma / lukitus (baseline).
- Kun teet muutoksia, lisää aina:
  - “Mitä muuttui”
  - “Miksi”
  - “Miten testataan (manuaali)”

## Domain context (Talo 80)

### Kanoninen ohjedokumentti tässä repossa
- `docs/Talo80_handoff_v2.md`
  - Talo 80 -tulkinta + yrityskohtaiset sovellukset + käsitteet (työpaketti vs hankinta vs tavoitearvio).

### Talo 80 -koodisäännöt (MUST FOLLOW)
- Littera on aina **4-numeroisena merkkijonona** (`^\d{4}$`).
- Älä koskaan muuta leading zeroja: “0310” ei saa muuttua “310”.
- Projektin “todellinen koodisto” syntyy tavoitearvion tuonnissa (yrityskohtaiset alalitterat voivat esiintyä).
- Koonti (esim. 4100) vs alalitterat (esim. 4101/4102) on käytäntö:
  - älä tee oletusta “viimeinen numero nollaksi” ainoana sääntönä
  - jos roll-up tarvitaan, tee se konfiguroitavasti (dictionary/taulu) ja dokumentoi.

## Tavoitearvio: tuonti → tuotannon mäppäys (MVP-ydin)

### 1) Laskentaosasto tuottaa tavoitearvioesityksen (esim. Estima)
- Tämä exportataan ja importataan sovellukseen (TARGET_ESTIMATE import_batch).

### 2) Tuonnin jälkeen alkaa tuotannon mäppäys (työntaloudellinen suunnittelu)
Mäppäyksen tarkoitus:
- siirtää tavoitearvion rivit tuotannon töiden alle (työpaketit), joissa kustannus syntyy
- koota rivejä toimittajan ja asennusporukan/aliurakoitsijan mukaisesti (esim. “pystyelementit” yhteen)

MVP:ssä mäppäys EI ole automaattinen koodisääntö.
- Järjestelmä voi ehdottaa (hakusana, toimittaja-teksti, aiempi projekti).
- Ihminen hyväksyy.

### 3) Mäppäyksen perusyksikkö (MVP)
- Perusyksikkö = **tavoitearviorivi** (item / tuontirivi / item-koodi), ei pelkkä 4-num littera.
- Sama 4-num littera voi sisältää useita item-rivejä; tuotanto voi koota ne uudelleen työpaketeiksi.

### 4) Mäppäyksen kohde (MVP)
- Jokainen item-rivi mäpätään:
  1) **työpakettiin** (work_phase / tuotannon työ)
  2) ja työpaketti voidaan liittää **hankintapakettiin** (urakka/sopimus)

Oletus MVP:ssä (KISS):
- työpaketti ↔ hankintapaketti on 1:1 (yksi pääasiallinen sopimus per työpaketti)
- item-tason hankintajako (1 työpaketti → usea sopimus) on myöhempi laajennus

### 5) VSS-esimerkki (ei automaatio)
- Tavoitearviossa voi olla rivejä 6700 ja 2500.
- Tuotanto voi päättää mäpätä 6700-rivejä työpakettiin, jonka “johtotunnus” on 2500 (VSS-rakenteet),
  jotta työpaketin koostumus näyttää mistä se muodostuu.
- Tämä tehdään mäppäyksellä (rivitason valinta), ei kovakoodatulla säännöllä.

## Testattavuus (MVP)

Lisää vähintään 4 skenaariota `data/samples/`:
1) leading zeros: 0310 säilyy tekstinä
2) item-rivit mäpätään työpakettiin (esim. elementtirivejä useasta litterasta samaan työpakettiin)
3) työpaketti linkitetään hankintapakettiin (1:1)
4) raportti näyttää työpaketin “koostumuksen” item-tasolla (mistä muodostuu)

## Codex-tehtäväpromptien mallit

- “Lue AGENTS.md ja `docs/Talo80_handoff_v2.md`. Toteuta tuotannon mäppäys item-tasolla työpaketteihin.”
- “Lisää hankintapaketit (urakka/sopimus) ja linkitä työpaketti yhteen hankintapakettiin (MVP).”
- “Tee näkymä: työpaketin koostumus item-tasolla (mitä rivejä siihen on mäpätty).”
- “Tee ADR: miksi mäppäys on manuaalinen MVP:ssä (yrityskohtaiset tavoitearviotyylit).”
