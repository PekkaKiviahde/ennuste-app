# Jyda-ajo import-speksi (MVP)

Päivitetty: 2026-01-02

Tämä määrittelee, miten Excelin **Jyda-ajo**-välilehti (tai siitä tehty CSV) tuodaan
Postgres-tietokantaan tauluihin:

- `litteras`
- `actual_cost_lines`

## 0. Taustaoletus (tärkeä)

**Jyda-ajo on snapshot**: se näyttää *kumulatiiviset kokonaisluvut* (tavoite/toteuma/ennuste) per koodi.
Jos tuot saman tiedoston uudestaan tai tuot uuden päivityksen, **samaa ei saa summata**, vaan raportoinnin
pitää käyttää *viimeisintä snapshotia*.

➡️ Siksi import kirjataan `actual_cost_lines`-tauluun **snapshot-riveinä** (occurred_on = import-päivä).
Raportointi ottaa viimeisimmän snapshotin (ks. liitteenä `migrations/0003_jyda_snapshot_views.sql`).

> Jos teillä myöhemmin saadaan transaktiotason toteumat (delta/kuukausi), voidaan siirtyä “summaa rivit” -malliin.

---

## 1. Jyda-ajo lähdesarakkeet

Jyda-ajo -välilehden otsikot (rivi 1) ovat:

| Excel sarake | Otsikko | Tyyppi | Huomio |
|---|---|---|---|
| A | Koodi | string | litterakoodi / kustannuspaikka (esim. 2200, 0310) |
| B | Nimi | string | selite |
| C | Tavoitekustannus | money | tavoite (budjetti) |
| D | Sidottu kustannus | money | sitoumukset (optional) |
| E | Toteutunut kustannus | money | toteuma (approved) – Excelin ryhmäsummat käyttää tätä |
| F | Toteutunut kustannus (sis. hyväksymätt.) | money | toteuma incl. unapproved (optional) |
| G | Ennustettu kustannus | money | JYDA:n oma ennuste (fallback, optional) |
| K | Kust.valm.aste-% | decimal | prosentti (ei viedä actual_cost_linesiin suoraan) |
| L | Tavoitetuotto | money | tuotto (ei MVP:ssä tässä importissa) |
| M | Toteutunut tuotto | money | tuotto |
| N | Ennustettu tuotto | money | tuotto |

Tässä importissa keskitytään kustannuksiin (C/D/E/F/G).

CSV-esimerkki:
- `excel/Jyda-ajo Kaarnatien Kaarna.csv`
  - delimiter: `;`
  - encoding: UTF-8 (voi sisältää merkistöpoikkeamia, esim. "hyväksymätt")
  - header:
    - Koodi
    - Nimi
    - Tavoitekustannus
    - Sidottu kustannus
    - Toteutunut kustannus
    - Toteutunut kustannus (sis. hyväksymätt.)
    - Ennustettu kustannus
    - Tav.kust. - Enn.kust.
    - Tav.kust. - Tot.kust.
    - Enn.kust. - Tot.kust.
    - Kust.valm.aste-%
    - Tavoitetuotto
    - Toteutunut tuotto
    - Ennustettu tuotto

---

## 2. Rivisuodatus (mitkä rivit tuodaan)

### 2.1 Koodi-filteri (pakollinen)
Tuo vain rivit, joissa:
- `Koodi` täsmää regexiin `^\d{4}$`

Jyda-ajo sisältää myös koodeja kuten `L` ja `LSOS` (yhteenvedot). Nämä **ohitetaan**.

### 2.2 Nollat ja tyhjät
- Jos kustannusarvo puuttuu → käsittele 0:na tai jätä rivi tuomatta kyseisen metrin osalta (suositus: 0 = ok).

---

## 3. Tuonti: `litteras`

### 3.1 Kenttäkartoitus
Jyda-ajo → `litteras`:

- `project_id`: valitaan importin kontekstissa (käyttäjä/konfigi)
- `code` = `Koodi` (A)
- `title` = `Nimi` (B)
- `group_code` = `int(LEFT(code,1))` (0–9)
- `is_active` = true

### 3.2 Upsert-sääntö
- Jos (project_id, code) ei löydy → INSERT
- Jos löytyy:
  - jos title muuttunut → UPDATE title
  - group_code voidaan päivittää jos puuttuu

> Huom: `litteras` ei ole append-only MVP:ssä, koska se on master-dataa.
> Audit voidaan lisätä myöhemmin (littera_events), jos halutaan.

---

## 4. Tuonti: `actual_cost_lines` (snapshot)

### 4.1 Mitä viedään?
Viedään snapshot-arvot kustannusmetriikoille. Koska JYDA ei jaa kustannuslajeihin (Työ/Aine/…), käytetään:
- `cost_type = 'OTHER'` (tarkoittaa “kokonaissumma” tässä lähteessä)

### 4.2 external_ref (metriikan nimeäminen)
Käytetään `external_ref`-kenttää erottelemaan metriikat. Suositellut arvot:

- `JYDA.ACTUAL_COST` = sarake E
- `JYDA.COMMITTED_COST` = sarake D (optional)
- `JYDA.ACTUAL_COST_INCL_UNAPPROVED` = sarake F (optional)
- `JYDA.FORECAST_COST` = sarake G (optional)
- `JYDA.TARGET_COST` = sarake C (optional – mutta suositus: vie tämä mieluummin `budget_lines`-tauluun)

### 4.3 occurred_on (päivä)
- `occurred_on` = import-päivä (esim. tiedoston päivityspäivä tai tämän päivän pvm)

> Tämä rivi on “tilannekuva” kyseisenä päivänä, ei kuukausikulu.

### 4.4 Kenttäkartoitus
Jyda-ajo → `actual_cost_lines` (esim. sarake E):

- `project_id`: sama kuin litterassa
- `work_littera_id`: haetaan `litteras`-taulusta (project_id, code)
- `cost_type`: `OTHER`
- `amount`: sarakkeen arvo (money)
- `occurred_on`: import-päivä
- `source`: `JYDA`
- `import_batch_id`: luodaan `import_batches`-tauluun per import
- `external_ref`: metriikan nimi (esim. `JYDA.ACTUAL_COST`)

### 4.5 Dedup/tuplatuonnin estäminen
Koska taulu on append-only, samaa importtia ei pidä ajaa kahdesti.

Suositus:
- laske lähdetiedostosta hash (signature) ja tallenna `import_batches.signature`-kenttään
- jos signature löytyy jo projektilla → estä tuonti

---

## 5. Raportointisääntö snapshotille (pakollinen)

Koska rivit ovat snapshotteja, raportin pitää käyttää **viimeisintä snapshotia** per (work_littera, metriikka).

Tämä toteutetaan näkymällä `v_actuals_latest_snapshot` (ks. liite: `migrations/0003_jyda_snapshot_views.sql`).

Ilman tätä toistuvat importit **tuplaavat** toteumat.

---

## 6. Minimitarkistukset importin jälkeen

1) Rivimäärä
- Jyda-ajo rivit (koodi \d{4}) = litteras-rivit lisätty/olemassa

2) Kokonaissumma tarkistus (sample)
- Σ(JYDA.ACTUAL_COST) pitäisi täsmätä Jyda-ajo välilehden kokonaisiin (jos sellainen on)

3) Unmapped-lista
- myöhemmin kun mapping on tehty: `v_actuals_unmapped` pitää olla pieni
- coverage ≥ sovittu raja (esim. 99%)

---

## 7. Sarakemappaus (MVP, joustava)

MVP:ssa tuonti sallii sarakemappauksen, jotta eri Jyda-formaatit voidaan ottaa sisaan.
Pakolliset kentat:
- koodi (4 numeroa)
- nimi (valinnainen)
- ainakin yksi kustannusmetriikka (esim. actual)

Suositeltu mappauskonfiguraatio:
- sheet_name
- header_row
- column_map:
  - code
  - name
  - target_cost (optional)
  - committed_cost (optional)
  - actual_cost
  - actual_cost_incl_unapproved (optional)
  - forecast_cost (optional)

Validointi:
- code tulee normalisoida muotoon 4 numeroa
- metrika-arvot ovat numeric (>= 0)
- tuntemattomat sarakkeet ohitetaan
- jos yksikaan metriikka ei kelpaa, import keskeytetaan
- encodingissa korvaa tuntemattomat merkit (esim. Ã¤ -> ä)

Virheilmoitukset:
- ilmoita rivit, joissa code puuttuu tai muoto virheellinen
- ilmoita rivit, joissa arvot eivat ole numeroita

---

## 8. Suositus jatkoon (seuraavat importit)

Kun tämä toimii:
- tuo `budget_lines` Jyda-ajo sarakkeesta C (tai Tavo_Ennuste-taulusta, jos se on tarkempi)
- tuo “tavoitearvio-litterat” myös Tavo_Ennuste:sta `litteras`-tauluun (koska target-koodit voivat puuttua Jyda-ajosta)

## Mita muuttui
- Lisatty CSV-esimerkin otsikot, delimiter ja encoding-ohje.

## Miksi
- Eri Jyda-formaateissa sarakepaikat vaihtelevat; joustava mappaus nopeuttaa integraatiotestausta.

## Miten testataan (manuaali)
- Tee import joustavalla mappauksella ja varmista, etta pakolliset kentat tulevat sisaan.

## Mitä muuttui
- Lisätty muutososiot dokumentin loppuun.

## Miksi
- Dokumentaatiokäytäntö: muutokset kirjataan näkyvästi.

## Miten testataan (manuaali)
- Avaa dokumentti ja varmista, että osiot ovat mukana.
