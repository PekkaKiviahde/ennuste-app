# Tavoitearvion (budget) import-speksi (MVP)

Päivitetty: 2025-12-17

## 0. Miksi tämä import tarvitaan?

Teillä on tiukka ja erittäin hyvä sääntö:

- Jos kustannusrivi **oli tavoitearviossa** mutta jäi työvaiheesta pois, se **saa ja pitää** lisätä jälkikäteen → KPI-historia korjautuu.
- Jos kustannusrivi **ei ollut tavoitearviossa**, sitä **ei saa koskaan** lisätä baselineen → oppiminen säilyy.

Jotta järjestelmä voi todentaa tämän (“oliko tavoitearviossa vai ei”), tavoitearvio pitää tuoda tietokantaan ja
versionoida import-batchilla.

Tässä importissa viedään tavoitearvion summat tauluun:

- `budget_lines`

ja liitetään jokainen rivi importiin `import_batch_id`-kentällä.

## 1. Lähde

Excel-tiedosto: `excel/Tavoitearvio ... .xlsx/.xlsm`

Koska tiedostorakenteet vaihtelevat, import-työkalu tukee:

- automaattista layoutin tunnistusta (otsikkorivi ja sarakkeet)
- manuaaliset override-parametrit (sheet, header_row, code_col, budget_col)

## 2. Minimisisältö (MVP)

Importtaa vähintään:

- `Koodi` (4-numeroinen)
- `Nimi` / selite (valinnainen)
- `Tavoite` / budjetti € (yksi summa)

### Cost type
Koska tavoitearvio voi olla ensin “kokonaisbudjetti per littera”, MVP vie sen:

- `cost_type = OTHER`

Laajennus myöhemmin:
- LABOR / MATERIAL / SUBCONTRACT / RENTAL erikseen.

## 3. Tietokantakartoitus

### 3.1 `litteras`
- upsert (project_id, code)
- title päivitetään jos löytyy

### 3.2 `import_batches`
- uusi batch per import
- `signature` estää tuplatuonnin

### 3.3 `budget_lines`
- yksi rivi per (littera, cost_type)
- `import_batch_id` viittaa siihen batchiin, josta rivi tuli
- `valid_from` = import-hetki (tai annetun parametrin mukainen)

## 4. Tarkistukset importin jälkeen

A) Rivimäärä
- montako budget-riviä syntyi

B) Satunnaistarkistus
- valitse 3 koodia Excelistä ja tarkista että sama summa löytyy budget_linesistä.

C) “Oliko tavoitearviossa” -todennus (tulevaa baseline-logiikkaa varten)
- kun työvaiheeseen lisätään rivi retroaktiivisesti, järjestelmä tarkistaa että (koodi, import_batch_id) löytyy `budget_lines`-taulusta.

