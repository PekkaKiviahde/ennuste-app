# Mapping-speksi: työlitterat → tavoitearvio-littera (MVP)

Päivitetty: 2025-12-16

## 0. Miksi tämä on olemassa?

Työmaalla **toteumat ja ostot kirjautuvat usein työlitteroille** (useita koodeja), mutta
taloudellinen suunnittelu ja ennustaminen halutaan tehdä **tavoitearvio-litteralla** (yksi “paketti”).

Tämän speksin tavoite on määrittää:

- miten usean työlitteran kulut **yhdistetään** tavoitearvio-litteralle (mapping)
- miten muutokset mappingiin tehdään **hallittuna versiona** (aikaleimattu, perusteltu)
- miten varmistetaan **audit trail** (kaikki jää lokiin)
- miten ennuste ja suunnitelma sidotaan mappingiin (ennuste tehdään vasta suunnitelman jälkeen)

> Tärkein periaate: **Mapping on osa taloudellista suunnittelua.**
> Ennusteen saa tehdä vain, kun suunnitelma on tehty ja mapping on kunnossa.

---

## 1. Termit

- **Työlittera**: littera, jolla työ tehdään ja jolle toteuma/ostot kirjautuvat (lähde)
- **Tavoitearvio-littera**: littera, jolla tavoite ja taloudellinen suunnittelu tehdään (kohde)
- **Mapping**: säännöt, joilla työlitterat kohdistetaan tavoitearvio-litteralle
- **Mapping-versio**: joukko mapping-sääntöjä, joilla on voimassaoloaika + tekijä + perustelu
- **Valid from / valid to**: ajallinen rajaus (mapping voi muuttua työmaan aikana)
- **Coverage**: kuinka suuri osa toteumasta on kohdistettavissa (0–100%)
- **Unmapped**: toteumarivi, jolle ei löydy mappingia (pitää näkyä raportissa “selvitettävät”)

---

## 2. Toiminnalliset vaatimukset (MVP)

### 2.1 Mappingin perusominaisuudet
1) Yksi työlittera voidaan kohdistaa:
- **yhteen tavoitearvio-litteraan 100%** (FULL) **tai**
- **useaan tavoitearvio-litteraan prosenttina** (PERCENT) *(laajennus, mutta suositellaan mukaan heti jos tarve on todellinen)*

2) Useita työlitteroita voidaan kohdistaa samaan tavoitearvio-litteraan (many-to-one).

3) Mapping on **ajallinen**:
- sama työlittera voi kohdistua eri tavoitearvio-litteraan eri ajanjaksoina

4) Mapping-muutokset ovat **lokiin kirjattavia tapahtumia**:
- kuka teki
- milloin
- miksi
- mistä → mihin
- miltä ajalta vaikutus

### 2.2 Suunnittelu ennen ennustetta
- Järjestelmä estää ennusteen tallennuksen, jos:
  - tavoitearvio-litteralla ei ole suunnitelmaa tilassa `READY_FOR_FORECAST` tai `LOCKED`
  - tai mappingin coverage ei ole hyväksyttävä (ks. 5.2)

### 2.3 Ennustetapahtuma sitoutuu mappingiin
- Kun ennuste tallennetaan, ennustetapahtumaan talletetaan:
  - `mapping_version_id` (millä mappingilla ennuste tehtiin)
- Näin myöhemmin voidaan raportoida:
  - “ennuste tehtiin näillä kohdistuksilla” (audit trail)

---

## 3. Tietomalli (minimi)

### 3.1 Mapping-versio
**MappingVersion**
- `mapping_version_id` (UUID)
- `project_id`
- `valid_from` (date)
- `valid_to` (date, nullable)
- `status` (enum): `DRAFT`, `ACTIVE`, `RETIRED`
- `reason` (text) – miksi tätä muutetaan
- `created_at`, `created_by`
- `approved_at`, `approved_by` *(optional MVP: voi olla sama kuin created)*

> Suositus: Vain yksi `ACTIVE` per projekti per päivämäärä.

### 3.2 Mapping-rivi
**MappingLine**
- `mapping_line_id`
- `mapping_version_id`
- `work_littera_code` (string)  ← työlittera
- `target_littera_code` (string) ← tavoitearvio-littera
- `allocation_rule` (enum): `FULL` / `PERCENT`
- `allocation_value` (decimal) – FULL=1.0, PERCENT=0–1
- `cost_type` (nullable) – jos null, koskee kaikkia kustannuslajeja
- `note` (text, optional)

> MVP: cost_type voidaan aluksi jättää aina nulliksi (koskee kaikkia).  
> Jos teillä oikeasti pitää pystyä kohdistamaan eri kustannuslajit eri tavalla, tämä otetaan käyttöön.

### 3.3 Audit trail
**MappingEventLog** (append-only)
- `event_id`
- `project_id`
- `event_time`
- `user`
- `action` (CREATE_VERSION / ACTIVATE / RETIRE / EDIT_DRAFT / APPROVE / APPLY_RETROACTIVE)
- `payload_json` (sis. ennen/jälkeen rivit, valid_from/to, perustelu)

---

## 4. Laskentasäännöt: miten toteuma kohdistetaan

### 4.1 Kohdistuksen hakusääntö (yhdelle toteumariville)
Kun tulee `ActualCostLine` (work_littera_code, cost_type, amount, date):

1) Etsi **mapping-versio**, joka on voimassa toteumarivin päivänä:
- `valid_from <= date <= valid_to` (tai valid_to puuttuu)

2) Etsi mapping-rivit, jotka täsmää:
- sama `work_littera_code`
- ja (cost_type täsmää tai mapping-rivillä cost_type = null)

3) Jos ei löydy rivejä:
- rivi on **UNMAPPED** (ei hävitetä!)
- näytetään “selvitettävät” -listassa ja coverage putoaa

### 4.2 Allocation-säännöt
- **FULL**: koko summa kohdistuu target_litteralle
- **PERCENT**: summa jaetaan usealle target_litteralle prosentilla

Validointi PERCENT:
- saman work_littera_code (+cost_type) ryhmän `allocation_value` summa = 1.0 (±0.001)

### 4.3 Pyöristys ja senttien jako
Kun jaetaan prosentilla, summat pitää lopulta täsmätä sentilleen:

Suositusalgoritmi:
- laske jokaiselle kohdistukselle “raakasumma”
- pyöristä 2 desimaaliin
- jos senttejä jää yli/puuttuu, jaa erotus suurimman desimaalijäännöksen kohteille (largest remainder)

Näin:
- Σ(kohdistettu) = alkuperäinen toteuma aina

---

## 5. Validointi ja “coverage”

### 5.1 Coverage-metriikka (raportointiin)
Coverage tarkoittaa: “kuinka paljon toteumasta saatiin kohdistettua tavoitearvio-litteroille”

- `coverage = mapped_amount / total_amount`
- lasketaan valitulle aikavälille (esim. kk, kvarttaali, koko projekti)

### 5.2 Gate ennen ennustetta (suositus)
Ennusteen tallennus sallitaan vain jos:
- coverage ≥ **99%** (tai teidän valitsema raja) viimeiseltä 30 päivältä **tai**
- käyttäjä merkitsee “poikkeus hyväksytty” ja antaa perustelun (tämäkin lokiin)

Perustelu:
- jos mapping ei ole kunnossa, ennuste vääristyy (toteuma menee “pimeäksi”)

---

## 6. Muutoshallinta (tavoitearvio-litteran numeron vaihtaminen)

Tämä on teidän kuvaama kriittinen tarve:
> Laskennassa tavoitearvio-littera voi olla eri kuin työn työlitterat, ja sitä pitää pystyä vaihtamaan.

### 6.1 Mitä “vaihto” tarkoittaa teknisesti?
Se tarkoittaa, että mapping päivitetään niin, että:
- sama työlittera kohdistuu **uudelle target_littera_code:lle** tietyllä voimassaoloajalla.

### 6.2 Turvasäännöt vaihtoon
Kun vaihdat target-litteraa:

1) Tee uusi MappingVersion (DRAFT)
2) Kopioi vanha mapping siihen pohjaksi
3) Muuta tarvittavat rivit (work→target)
4) Kirjaa perustelu (miksi vaihdetaan)
5) Esikatsele vaikutus:
- “ennen” ja “jälkeen” toteumasummat target-litteroittain
6) Aktivoi uusi versio (ACTIVE)

### 6.3 Retroaktiivinen muutos (menneisyys)
Jos haluat siirtää myös menneet toteumat uudelle targetille:
- tee valid_from taaksepäin (esim. 2025-01-01)
- järjestelmä kirjaa MappingEventLogiin action = APPLY_RETROACTIVE

Suositus käytäntö:
- retroaktiiviset muutokset vaativat “hyväksyjän” (approved_by) tai vähintään pakollisen perustelun.

---

## 7. Esimerkit (konkreettiset)

### Esimerkki 1: Usea työlittera → yksi tavoitearvio-littera (FULL)
- Tavoitearvio-littera: **2200**
- Työlitterat: **2201**, **2202**, **2203**
- Sääntö: FULL

MappingLine:
- 2201 → 2200 (FULL 1.0)
- 2202 → 2200 (FULL 1.0)
- 2203 → 2200 (FULL 1.0)

Raportointi:
- Toteuma 2200 = toteuma(2201+2202+2203)

### Esimerkki 2: Yksi työlittera jaetaan kahteen tavoitearvio-litteraan (PERCENT)
- Työlittera: 9999
- Targetit: 2200 (60%), 2300 (40%)

MappingLine:
- 9999 → 2200 (PERCENT 0.60)
- 9999 → 2300 (PERCENT 0.40)

### Esimerkki 3: Tavoitearvio-littera vaihtuu kesken projektin
- 1.1–31.3: työlitterat 2201/2202 → target 2200
- 1.4–: työlitterat 2201/2202 → target 2205

Ratkaisu:
- MappingVersion A: valid_to = 2025-03-31
- MappingVersion B: valid_from = 2025-04-01

Audit:
- lokiin: kuka vaihtoi, miksi, mikä vaikutus

---

## 8. Edge caset (ja mitä tehdään)

1) **Unmapped toteumat** (uusi työlittera ilmestyy)
- Näytetään listassa “selvitettävät”
- Ennuste voidaan estää (coverage-gate) tai vaatia poikkeusperustelu

2) **PERCENT summat eivät ole 100%**
- Estä aktivointi (ACTIVE)
- Näytä virhe: “Työlittera 9999 jakautuu 90% – lisää puuttuva 10% tai korjaa.”

3) **Päällekkäiset mapping-versiot**
- Ei sallita kahta ACTIVE-versiota samalle päivälle
- Aktivointi estetään automaattisella validoinnilla

4) **Negatiiviset toteumarivit** (hyvitykset)
- Kohdistetaan samoilla säännöillä
- Pyöristys huomioi negatiivisen

5) **Cost type -kohtainen mapping**
- Jos käytössä: haetaan ensin cost_type täsmäävät rivit
- jos ei löydy, käytä cost_type=null fallbackia
- jos löytyy molemmat: cost_type täsmäävä voittaa

6) **Mappingin muutos ilman suunnitelmaa**
- Sallitaan DRAFT-muokkaus
- Mutta ennustetta ei saa tehdä ennen kuin suunnitelma READY_FOR_FORECAST

---

## 9. Hyväksymiskriteerit (MVP “valmis”)

Mapping-toiminto on MVP-valmis kun:

- [ ] käyttäjä voi määrittää työlitterat → tavoitearvio-littera (FULL)
- [ ] järjestelmä laskee target-litteran toteuman mappingin kautta
- [ ] unmapped-rivit näkyvät ja coverage lasketaan
- [ ] mapping on versionoitu (valid_from/to) ja audit-logi tallentuu
- [ ] ennustetapahtuma tallentaa mapping_version_id:n
- [ ] raportointi voi näyttää “miksi muuttui” (ennustetapahtumaloki)

---

## 10. Päätöspisteet (valitaan kun rakennetaan)

Nämä 3 asiaa pitää päättää toteutuksessa, mutta ei estä speksin käyttöä nyt:

1) Sallitaanko PERCENT MVP:ssä heti vai vasta myöhemmin?
2) Sallitanko ennusteen tallennus, jos coverage < raja, poikkeusperustelulla?
3) Retroaktiivisen mapping-muutoksen hyväksyntä: tarvitaanko hyväksyjä vai riittääkö pakollinen perustelu?

