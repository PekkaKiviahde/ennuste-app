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
- korjaus sallittu vain jos löytyy TARGET_ESTIMATE import_batchista (`budget_lines` tai `budget_items`)

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

## 6. MVP-valmis määritelmä
- korjaus baselineen onnistuu vain jos “oli tavoitearviossa”
- “ei ollut” ohjautuu oppimiseen eikä koskaan baselineen
- selvitettävät-lista on olemassa
