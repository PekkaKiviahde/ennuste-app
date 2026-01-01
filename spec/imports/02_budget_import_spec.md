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
CSV-esimerkit:
- `data/budget.csv`
- `excel/Tavoitearvio Kaarna Päivitetty 17.12.2025.csv`

Koska tiedostorakenteet vaihtelevat, import-työkalu tukee:

- automaattista layoutin tunnistusta (otsikkorivi ja sarakkeet)
- manuaaliset override-parametrit (sheet, header_row, code_col, budget_col)

## 2. Minimisisältö (MVP)

Importtaa vähintään:

- `Koodi` (4-numeroinen)
- `Nimi` / selite (valinnainen)
- `Tavoite` / budjetti € (yksi summa)

### CSV-esimerkkisarakkeet (MVP)
Semikolonieroteltu (;) ja UTF-8, joskus BOM.
Sarakkeet:
- Litterakoodi
- Litteraselite
- Koodi
- Selite
- Määrä
- Yksikkö
- Työ €/h
- Työ €/yks.
- Työ €
- Aine €/yks.
- Aine €
- Alih €/yks.
- Alih €
- Vmiehet €/yks.
- Vmiehet €
- Muu €
- Summa

### Cost type (MVP)
Jos CSV:ssa on kustannuslajisarakkeet, importoi ne erikseen:
- Työ € -> LABOR
- Aine € -> MATERIAL
- Alih € -> SUBCONTRACT
- Vmiehet € -> RENTAL
- Muu € -> OTHER

Jos kustannuslajisarakkeita ei ole, käytä:
- Summa -> OTHER

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

---

## 5. Sarakemappaus (MVP, joustava)

MVP:ssa tuonti sallii sarakemappauksen, jotta eri budget-formaatit voidaan ottaa sisaan.
Pakolliset kentat:
- koodi (4 numeroa)
- budjetti EUR (numeric) tai kustannuslaji-eurot

Valinnaiset kentat:
- nimi / selite
- cost_type (jos eritelty valmiiksi)
- labor_eur / material_eur / subcontract_eur / rental_eur / other_eur
- total_eur (Summa)

Suositeltu mappauskonfiguraatio:
- sheet_name
- header_row
- column_map:
  - code
  - name (optional)
  - budget_amount
  - cost_type (optional)

Validointi:
- code normalisoidaan 4 numeroon
- budjettiarvot >= 0
- jos cost_type puuttuu, kayta OTHER
- jos kustannuslajisarakkeet puuttuvat, total_eur pakollinen

Virheilmoitukset:
- ilmoita rivit, joissa code tai budjetti puuttuu
- ilmoita rivit, joissa budjetti ei ole numero

## Mita muuttui
- Lisatty CSV-esimerkkisarakkeet ja kustannuslajimappaus MVP-tuontiin.

## Miksi
- Esimerkkidata ohjaa MVP-importin pakolliset sarakkeet ja validoinnin.

## Miten testataan (manuaali)
- Importoi kaksi eri layoutia sarakemappauksella ja varmista rivien laskenta.
