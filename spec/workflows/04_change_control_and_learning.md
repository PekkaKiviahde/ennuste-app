# Muutosmuistio ja oppiminen: “oli tavoitearviossa” vs “ei ollut” (MVP)

## 1. Tausta
Teidän sääntö:
- jos rivi oli tavoitearviossa (laskentavaiheessa) mutta jäi pois työvaiheesta → saa korjata retroaktiivisesti
- jos rivi EI ollut tavoitearviossa → sitä EI SAA koskaan lisätä baselineen (oppiminen säilyy)

## 2. Muutosluokat (MVP)
### A) Korjaus (Correction)
Käytetään kun:
- asia oli tavoitearviossa, mutta työvaiheen koostumuksesta/baselinesta puuttui

Sääntö:
- korjaus sallittu vain jos lisättävä rivi löytyy **samasta TARGET_ESTIMATE import_batchista**
  - 4-num taso: löytyy `budget_lines` samalla `import_batch_id`:llä
  - nimiketaso: löytyy `budget_items` samalla `import_batch_id`:llä

Vaikutus:
- baseline korjautuu
- EV ja KPI-historia korjautuvat taaksepäin (retroaktiivinen)
- vaatii muutosmuistion tekstin: “mikä puuttui ja miksi”

### B) Puuttui tavoitearviosta (Missing from Target Estimate)
Käytetään kun:
- toteumassa/ghostissa näkyy asia, jota ei ollut tavoitearviossa (laskenta unohtanut tai uusi asia)

Sääntö:
- EI SAA lisätä baselineen koskaan
- mutta pitää voida kohdistaa työvaiheelle (jotta kustannus ei jää ilman kotia)

Vaikutus:
- näkyy oppimisraportissa (“puuttui tavoitearviosta”)
- heikentää CPI:tä (koska AC kasvaa, EV ei kasva)

Alaluokat (valinnainen MVP):
- “laskenta unohtanut”
- “muutostyö / lisätyö”
- “muu”

## 3. Selvitettävät / ei kohdistettu
Jos kustannus/ghost ei sovi mihinkään työvaiheeseen:
- se menee “selvitettävät”-listalle
- ennustekierroksessa lista on pakko käsitellä (kohdistus tai perustelu)

## 4. Käyttösääntö: mitä saa muuttaa ja kuka
- työnjohto voi ehdottaa korjausta ja kirjata perustelun
- tuotantojohtaja hyväksyy:
  - baselineen menevät korjaukset (Correction)
  - “puuttui tavoitearviosta” -merkinnät (oppiminen)

## 5. Oppimisraportti (MVP)
Raportissa näkyy vähintään:
- työvaihe
- item_code / littera
- selite
- toteuma € (AC/ghost)
- luokka (puuttui tavoitearviosta / muutostyö / muu)
- kuka kirjasi ja milloin

## 5.1 Paketit, split-estot ja “mihin rivi kuuluu”
Tässä MVP:ssä oppiminen ja korjaukset sidotaan paketteihin, ei yksittäiseen litteraan.

- Työpaketti = `work_packages`, hankintapaketti = `proc_packages`.
- Paketin `header_code` on paketin tunnus (4-num Talo80-koodi merkkijonona).
- Paketti voi sisältää useita litteroita (`work_package_members` / `proc_package_members`, `member_type='LITTERA'`).
- Yksi tavoitearvion koontirivi (`budget_lines.budget_line_id`) kuuluu vain yhteen pakettiin:
  - kytkentä `package_budget_line_links`
  - split ei ole sallittu: `UNIQUE(budget_line_id)`

Kun rivi puuttuu tavoitearviosta (Missing from Target Estimate):
- se kirjataan oppimiseen/selvitettäväksi (ei baselineen)
- se voidaan edelleen kohdistaa pakettiin (työnjohto + tuotantojohtaja hyväksyy), jotta kustannus “saa kodin”

## 6. MVP-valmis määritelmä
- korjaus baselineen onnistuu vain jos “oli tavoitearviossa”
- “ei ollut” ohjautuu oppimiseen eikä koskaan baselineen
- selvitettävät-lista on olemassa

## Mitä muuttui
- Täsmennetty “sama TARGET_ESTIMATE import_batch” -ehto korjauksille (Correction).
- Lisätty pakettirakenne: monilittera-paketit, `header_code` ja split-estot (`budget_line_id`).

## Miksi
- Korjaukset ovat sallittuja vain “oli tavoitearviossa” -tapauksissa; muutostyöt ja lisätyöt kuuluvat oppimiseen eikä niillä saa muuttaa baselinea.
- Split-estot pitävät tavoitearviorivin kohdistuksen yksiselitteisenä (MVP: ei jaeta samaa riviä kahteen pakettiin).

## Miten testataan (manuaali)
- Valitse TARGET_ESTIMATE import_batch ja `budget_line_id`, joka löytyy siitä → kytke se yhteen pakettiin ja lukitse baseline (BAC päivittyy).
- Yritä kytkeä sama `budget_line_id` kahteen eri pakettiin → odota UNIQUE-virhe.
