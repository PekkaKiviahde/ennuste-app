# Tavoitearvion (budget) import-speksi (MVP)

Päivitetty: 2026-01-02

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
- `data/samples/budget.csv`
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

C) Esimäppäys (koodi → vastinpari `litteras`)
- Varmista, että jokaiselle importoidulle 4-num litterakoodille löytyy `litteras`-rivi (project_id, code).
- Koodi on aina merkkijono `^\d{4}$` ja leading zerot säilyvät (esim. "0310" ei saa muuttua "310").
- Jos koodi on virheellinen tai puuttuu, rivi jää stagingiin issueksi eikä siirry `budget_lines`-tauluun.

D) “Oliko tavoitearviossa” -todennus (tulevaa baseline-logiikkaa varten)
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
- code normalisoidaan merkkijonona muotoon `^\\d{4}$`:
  - leading zeroja ei koskaan poisteta (esim. "0310" säilyy "0310")
  - jos lähde antaa numeron (esim. 310), se täydennetään vasemmalta nollilla ("0310")
- budjettiarvot >= 0
- jos cost_type puuttuu, kayta OTHER
- jos kustannuslajisarakkeet puuttuvat, total_eur pakollinen

Virheilmoitukset:
- ilmoita rivit, joissa code tai budjetti puuttuu
- ilmoita rivit, joissa budjetti ei ole numero

## 6. Import staging + puhdistus (tarvitaan manuaaliseen siirtoon)

Tavoitearvio-data voi olla rikkinainen (NaN, negatiiviset, puuttuvat koodit).
Jotta **yrityksen pääkäyttäjä** voi siivota datan ennen tuotantoon siirtoa,
tarvitaan staging-kerros ennen `budget_lines`-kirjausta.

### 6.1 Staging-taulut (append-only loki)
MVP:n vaatimus: raakadata säilyy muuttumattomana ja korjaukset kirjataan lokiin.

- `import_staging_batches`
  - batch_id, project_id, source_system, file_name, signature, created_at, created_by
- `import_staging_lines_raw`
  - line_id, batch_id, row_no, raw_json, created_at, created_by
- `import_staging_line_edits`
  - edit_id, line_id, edit_json, reason, edited_at, edited_by
- `import_staging_issues`
  - issue_id, line_id, issue_code, issue_message, severity, created_at

**Nykytila** muodostetaan yhdistamalla `raw_json` + viimeisin edit (append-only).

### 6.2 Validointi
Stagingiin saapuessa ajetaan validointi:
- pakolliset kentat (koodi, budjetti tai kustannuslaji-eurot)
- numeric/format (ei NaN, ei tekstia euro-kentissa)
- budjettiarvot >= 0 (negatiiviset merkitään issueksi)
- litterakoodi validoidaan (4 numeroa merkkijonona); virheet listataan (leading zeroja ei muuteta)

Validointi EI kirjoita `budget_lines`-tauluun.

### 6.3 Puhdistus UI (pääkäyttäjä)
UI tarjoaa listan issueista:
- riveittäin korjattavat arvot (koodi, eurot, kustannuslaji)
- toiminto: korjaa / ohita rivi / merkitse poikkeus
- kaikki korjaukset kirjataan `import_staging_line_edits`-lokiin

### 6.4 Hyvaksynta ja siirto
Kun batch on "PUHDAS":
- luodaan `import_batches`
- kirjataan `budget_lines` vain hyvaksytyista riveista
- siirron yhteenveto (montako rivia, montako ohitettu)

### 6.5 Auditointi
- kaikki staging-eventit ovat append-only
- siirrosta kirjataan erillinen audit-merkinta

### 6.6 Ehdotukset (oppiva/yrityskohtainen, ei pakottava)
Importin jälkeen järjestelmä voi tuottaa **ehdotuksia**, mutta ne eivät ole automaatiota.

Periaate (MVP):
- järjestelmä saa ehdottaa
- ihminen hyväksyy (ja tarvittaessa kirjaa perustelun)
- ei automaattisia koodimuunnoksia tai “kovakoodattuja sääntöjä” (esim. 6700→2500)

Tyypillisiä ehdotuksia:
- `litteras.title` import-selite-kentästä tai aiemmista projekteista
- koonti/roll-up ehdotus konfiguroitavalla taululla (ei oleteta “viimeinen numero nollaksi”)
- myöhemmässä vaiheessa: item-tason mäppäysehdotus työpakettiin/hankintapakettiin historiadatan perusteella (mutta hyväksyntä vaaditaan)

## Mita muuttui
- Lisatty CSV-esimerkkisarakkeet ja kustannuslajimappaus MVP-tuontiin.
- Lisatty staging + puhdistus -vaihe ennen budget_lines-siirtoa.
- Lisatty esimäppäys (koodi → litteras) osaksi importin jälkitarkistuksia ja selkeytetty leading zero -sääntö validoinnissa.
- Täsmennetty sarakemappauksen validointi: koodi normalisoidaan merkkijonona `^\\d{4}$` ilman leading zerojen pudottamista.
- Lisatty “ehdotukset” erotettuna automaatiosta: järjestelmä voi ehdottaa, mutta ei pakota yrityskohtaista koodisääntöä.

## Miksi
- Esimerkkidata ohjaa MVP-importin pakolliset sarakkeet ja validoinnin.
- Manuaalinen siirto vaatii puhdistusvaiheen ennen lopullista kirjausta.
- Järjestelmän on tunnistettava kaikki tavoitearvion koodit master-dataksi, jotta tuotanto voi aloittaa mäppäyksen ja raportointi toimii.
- Yrityskohtainen “kovakoodaus” rikkoo helposti prosessia ja audit trailia: MVP:ssä vain ehdotetaan ja ihminen hyväksyy.

## Miten testataan (manuaali)
- Importoi kaksi eri layoutia sarakemappauksella ja varmista rivien laskenta.
- Luo staging-importti, korjaa yksi rivi ja varmista, että hyvaksytty siirto kirjoittaa budget_lines.
- Testaa leading zero: tuo koodi "0310" ja varmista, että se säilyy `litteras.code`-kentässä muodossa "0310".
- Testaa numeerinen koodi: tuo koodi 310 ja varmista, että se normalisoituu muotoon "0310" (ei "310").
