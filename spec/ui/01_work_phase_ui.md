# UI/Toiminnallisuus (MVP): Työvaihe, baseline, viikkopäivitys, ghost, muutosmuistio

## 1. Näkymä: Työvaihelista
Näyttää:
- työvaiheen nimi
- status (DRAFT/ACTIVE/CLOSED)
- johtolittera
- BAC (baseline €) jos lukittu
- viimeisin valmiusaste %
- viimeisin CPI

Toiminnot:
- “Luo työvaihe”
- “Avaa työvaihe”

## 2. Näkymä: Työvaiheen detalji (tabit)
### Tab 1: Perustiedot
- nimi, kuvaus
- vastuuhenkilö
- johtolittera (valittavissa)
- status

### Tab 2: Koostumus
- lista 4-num koodeista (Talo80-litterat)
- (valinn.) lista nimikekoodeista (item_code)
Toiminnot:
- lisää/poista koodeja (DRAFT-tilassa vapaasti)
- lukitun baselinen jälkeen: muutokset vain muutosmuistiolla (ks. säännöt)

### Tab 3: Baseline
Näyttää:
- linkitys: TARGET_ESTIMATE import_batch
- BAC yhteensä ja kustannuslajeittain
- lukituksen metadata (kuka, milloin)
Toiminnot:
- “Lukitse baseline” (vain hyväksyjälle)

### Tab 4: Viikkopäivitys
- viikko (pvm)
- valmiusaste %
- tekstikenttä: mitä tehtiin / mitä seuraavaksi
- riskit
Toiminnot:
- “Lisää viikkopäivitys”

### Tab 5: Ghost
Näyttää OPEN ghostit
Toiminnot:
- “Lisää ghost” (viikkokohtainen)
- “Sulje/settle ghost” ennustekierroksessa

### Tab 6: Muutosmuistio & oppiminen
- Correction (oli tavoitearviossa) → baseline korjaus
- Missing-from-target-estimate → oppiminen, ei baselineen
Toiminnot:
- “Kirjaa korjaus” (pakottaa valitsemaan budjettirivin tai itemin, joka löytyy tavoitearviosta)
- “Kirjaa puuttuva” (oppimisluokka)

## 3. MVP-käyttöpolku (käyttäjän näkökulmasta)
1) Luo työvaihe (nimi)
2) Lisää koodeja (koostumus)
3) Valitse johtolittera (oletus: suurin €)
4) Lukitse baseline
5) Joka viikko: päivitä valmiusaste + ghost
6) Ennustekierroksessa: sulje ghosteja laskujen mukaan
7) Jos löytyy “puuttuva”: kirjaa oppimiseen (ei baselineen)
