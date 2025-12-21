# SPEC – Laskentasäännöt v1 (lukittu merkitys, vaihdettava sanasto)

Päivitetty: 2025-12-19

## Periaate
- Laskentasäännöt (merkitys) lukitaan ja käytetään koodeina: `BAC`, `AC`, `GHOST_OPEN`, `AC_STAR`, `PCT`, `EV`, `CPI`.
- Käyttöliittymä voi näyttää nimet (labelit) eri kielillä ja yrityskohtaisesti (ks. `terminology_terms`).

## Työvaihekohtaiset luvut
**BAC (Budget at Completion / Baseline €)**  
- Määritelmä: työvaiheen *lukittu baseline* euroina  
- Ehto: lasketaan vain työvaiheille, joilla on lukittu baseline (policy A)

**PCT (Percent complete / Valmiusaste %)**  
- Määritelmä: viimeisin viikkopäivityksen tekninen valmiusaste (0–100)  
- Jos puuttuu → EV ja CPI voivat olla NULL

**EV (Earned Value €)**  
- Kaava: `EV = ROUND(BAC * (PCT / 100), 2)`  
- Ehto: baseline lukittu + PCT olemassa

**AC (Actual cost €)**  
- Määritelmä: toteuma euroina (kirjanpito/JYDA/import) työvaiheen jäsenlitteroille  
- Huom: toteuma on usein viiveellinen (laskut/palkat)

**GHOST_OPEN (€)**  
- Määritelmä: työmaan kirjaamat “viivekulut” (työ tehty / kustannus tiedossa, mutta ei vielä toteumassa)

**AC\* (Actual + Ghost €)**  
- Kaava: `AC_STAR = ROUND(AC + GHOST_OPEN, 2)`

**CPI (Cost Performance Index)**  
- Kaava: `CPI = ROUND(EV / AC_STAR, 4)`  
- Ehto: EV ei NULL ja `AC_STAR > 0`

**Cost variance €**  
- `CV = EV - AC_STAR`  
- “Overrun €” voidaan esittää myös: `AC_STAR - EV`

## Projektitaso
- Projektin BAC/EV/AC\* = baseline-lukittujen työvaiheiden summa  
- Lisäksi näytetään erillisenä: `UNMAPPED_ACTUAL_TOTAL` (selvitettävät)
