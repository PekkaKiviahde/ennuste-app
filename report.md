# 1. Executive summary

- **Sovelluksen tarkoitus**: Tuotannonhallinta‑SaaS korvaa ruutupaperit, Excelit ja PowerPointit. Se yhdistää projektin perustamisen, budjetin tuonnin, työvaiheiden seurannan, korjausten hallinnan ja raportoinnin yhdeksi järjestelmäksi.  
- **Käyttäjäpolku‑painotus**: Pääpaino on käyttäjän UI‑poluissa – mitä käyttäjä näkee ja tekee sovelluksessa – mutta taustalla kuvataan myös API‑kutsut ja tietokannan päivitykset.  
- **Ydintyönkulut**: (1) projektin perustaminen ja asetukset; (2) budjetin tuonti ja korjaukset; (3) JYDA‑datatuonti (jos käytössä); (4) työvaiheiden ja toteumien hallinta; (5) kustannusindeksien (CPI/AC) laskenta; (6) raportointi ja viennit (Excel/PPT‑korvaus); (7) terminologian hallinta ja i18n.  
- **RBAC**: Roolit (esim. järjestelmänvalvoja, projektipäällikkö, työnjohtaja, taloushallinto, katselija) määrittelevät, mitä näkymiä ja toimintoja kukin käyttäjä saa käyttää. Jokaisessa työnkulussa on checkpoint, jossa tarkistetaan oikeudet.  
- **Data‑integraatio**: Sovellus lukee budjetti‑ ja toteumatiedot ulkoisista järjestelmistä (esim. JYDA) ja tallentaa ne tietokantatauluihin. Dataa aggrekoidaan näkymien kautta raportointia varten.  
- **Laskentasäännöt**: AC/CPI‑laskenta perustuu SPEC_CALC_RULES_V1‑säännöihin (esim. AC = actual cost, CPI = EV/AC).  
- **Risikit ja avoimet kysymykset**: Dokumenteissa ei ollut täyttä näkyvyyttä kaikkiin prosesseihin. Budjetin tuonnin ja JYDA‑importin formaatista tarvitaan lisätietoja, samoin terminologian ja i18n‑määritysten vaikutuksista käyttöliittymään.  

# 2. Master workflow (end‑to‑end)

```mermaid
flowchart TD
    A[UI: Projektin perustaminen] -->|createProject API| B(DB: projects, roles)
    A2[UI: Budjetin tuonti] -->|upload budget file| C[Backend script: import_budget]
    C -->|INSERT| CDB(DB: budget_items)
    A3[UI: JYDA‑tuonti] -->|trigger import| D[Backend script: import_jyda]
    D -->|INSERT| DDB(DB: jyda_snapshot)
    A4[UI: Työvaiheiden syöttö] -->|create/update work phases API| E[Backend: work_phases]
    A5[UI: Toteumien syöttö] -->|submit actuals API| F[Backend: work_phase_actuals]
    E -->|JOIN| G[Calculation service: CPI/AC]
    F -->|JOIN| G
    G -->|write| GDB(DB: cpi_results)
    A6[UI: Korjausten hallinta] -->|submit corrections| H[Backend: corrections]
    H -->|UPDATE| HDB(DB: work_phase_corrections)
    A7[UI: Raportointi] -->|request report| I[Reporting service]
    I -->|query views| J[DB views: reports]
    I -->|export| K[Export (Excel/PPT replacement)]
    A8[UI: Terminologian hallinta] -->|manage terms| L[Backend: terminology]
    L -->|UPDATE| LDB(DB: terminology tables)
    I -->|use terms| L
```

**Selite (lyhyesti)**: Käyttäjä aloittaa projektin perustamisella, mikä luo projektin ja määrittää roolit. Budjetti voidaan tuoda CSV/Excel‑tiedostosta (import_budget), ja JYDA‑data (jos käytössä) tuodaan erillisellä importilla. Työvaiheet ja toteumat tallennetaan tauluihin. Laskentapalvelu laskee CPI/AC‑indeksit yhdistämällä budjetoidut ja toteutuneet kustannukset. Käyttäjä voi tehdä korjauksia, jotka päivittävät työvaiheita. Raportointipalvelu hakee näkymistä aggregoidut tiedot ja vie ne tarvittaessa ulkoisiin formaatteihin. Terminologiaa hallitaan erikseen, jotta käsitteet näkyvät oikein raporteissa ja käyttöliittymässä.

# 3. Käyttäjäpolut (step‑by‑step)

## 3.1 Projektin perustaminen
- **Tavoite**: Luoda uusi projekti ja määrittää sen asetukset (nimi, valuutta, aikajaksot, käyttäjäroolit).  
- **Kenelle**: Järjestelmänvalvoja tai projektipäällikkö.  
- **Vaiheet**:  
  1. Avaa *“Uusi projekti”* ‑näkymä.  
  2. Syötä projektin perustiedot (nimi, koodi, alku/loppupäivä).  
  3. Valitse oletusvaluutta ja aikajaksot.  
  4. Lisää käyttäjät ja määritä heille roolit (admin, PM, työnjohtaja, taloushallinto, katselija).  
  5. Tallenna projekti.  
- **Data**: Kirjautuu `projects`‑tauluun, `project_users`‑tauluun ja `roles`‑tauluun.  
- **Oikeudet**: Vain admin/PM voi luoda projektin ja antaa rooleja; tarkistus ennen tallennusta.  
- **Edge caset**:  
  - Projektin nimi on jo käytössä → näytä virhe.  
  - Roolien puuttuminen → estä tallennus.  
  - Palvelinvirhe → näytä ilmoitus ja yritä uudelleen.  

## 3.2 Budjetin tuonti
- **Tavoite**: Tuoda talousbudjetti (työvaiheiden budjetoidut kustannukset ja työtunnit) järjestelmään.  
- **Kenelle**: Taloushallinto tai projektipäällikkö.  
- **Vaiheet**:  
  1. Avaa *“Budjetin tuonti”* ‑näkymä.  
  2. Lataa budjetti‑CSV/Excel (oletussarakejärjestys: cost_type, work_phase, budget_amount, hours).  
  3. Sovellus näyttää esikatselun ja tarkistaa, että sarakkeet täsmäävät.  
  4. Klikkaa *“Tuo budjetti”*; taustaskripti importoi rivit.  
  5. Järjestelmä raportoi onnistuneet ja epäonnistuneet rivit.  
- **Data**: `budget_items`‑taulu (kustannustyypit, työvaiheet, määrät); metadata import‑tauluun.  
- **Oikeudet**: Vain admin/PM/taloushallinto voi tehdä tuonnin.  
- **Edge caset**:  
  - Virheellinen tiedostoformaatti → hylätään.  
  - Budjetti jo olemassa → kysytään korvaamisesta.  
  - Puuttuvat sarakkeet → ohjeistus.  

## 3.3 JYDA‑datatuonti
- **Tavoite**: Importoida ulkoisesta järjestelmästä toteumatiedot (JYDA).  
- **Kenelle**: Taloushallinto tai integraatioasiantuntija.  
- **Vaiheet**:  
  1. Avaa *“JYDA‑import”* ‑näkymä.  
  2. Valitse ajanjakso (esim. kuukaudet) ja paina *“Tuo data”*.  
  3. Taustaskripti hakee JYDA‑rajapinnasta toteumat (työvaihe, kustannus, tunnit).  
  4. Järjestelmä tallentaa snapshot‑näkymään (`jyda_snapshot`).  
  5. Lokinäkymässä näytetään importin tulokset.  
- **Data**: `jyda_snapshot`‑taulu + mahdolliset audit‑taulut.  
- **Oikeudet**: Vain rooli, jolla on import‑oikeudet.  
- **Edge caset**:  
  - Rajapinnan virhe → näytä virheilmoitus.  
  - Tuonti osittain epäonnistuu → tee loki ja mahdollisuus yrittää uudelleen.  
  - Puutteelliset tunnisteet työvaiheille → avoin kysymys.  

## 3.4 Työvaiheiden ja toteumien syöttö
- **Tavoite**: Hallita työvaiheita (work phases) ja kirjata toteumat (actuals) projektin aikana.  
- **Kenelle**: Työnjohtaja ja projektipäällikkö.  
- **Vaiheet**:  
  1. Avaa *“Työvaiheet”*‑näkymä ja lisää uusi vaihe: anna nimi, kuvaus, budjetti, aloitus‑ ja loppupäivä.  
  2. Tallenna vaihe; se näkyy listassa.  
  3. Syötä toteuma: valitse työvaihe → *“Lisää toteuma”* → syötä päivämäärä, tunnit, kustannus → tallenna.  
  4. Sovellus laskee välittömästi päivittyneen CPI/AC‑tilanteen ja näyttää sen.  
- **Data**: `work_phases`‑taulu, `work_phase_actuals`‑taulu; liittyvät näkymät CPI/AC‑laskentaan.  
- **Oikeudet**: Työnjohtaja voi lisätä toteumia; PM voi muokata työvaiheita; katselijalla vain luku.  
- **Edge caset**:  
  - Täytettävien kenttien validaatiovirheet (negatiiviset tuntimäärät).  
  - Päällekkäiset toteumat samalle päivälle → yhdistä automaattisesti tai estä.  
  - CPI laskee alle 1 → merkitään punaisella.  

## 3.5 Korjausten hallinta (Phase17)
- **Tavoite**: Korjata budjetti‑ tai toteumatietoja jälkikäteen (esim. virheellinen työvaihe, unohdettu kustannus).  
- **Kenelle**: Taloushallinto ja projektipäällikkö.  
- **Vaiheet**:  
  1. Avaa *“Korjaukset”*‑näkymä.  
  2. Valitse korjattava kohde (budjettirivi tai toteuma).  
  3. Syötä korjattu arvo, selite ja päivämäärä.  
  4. Lähetä korjaus hyväksyttäväksi (tarvittaessa).  
  5. Pääkäyttäjä hyväksyy tai hylkää korjauksen.  
  6. Hyväksytty korjaus päivittää `work_phase_corrections`‑taulun ja recalculoi CPI/AC.  
- **Data**: `work_phase_corrections`‑taulu; audit‑lokit.  
- **Oikeudet**: Korjauksen voi syöttää taloushallinto/PM; hyväksynnän tekee admin/PM.  
- **Edge caset**:  
  - Useita korjauksia samaan rivin; näytä historia.  
  - Hylkäysperusteet, jos arvo poikkeaa liian paljon.  
  - Lokitus ja jäljitettävyys.  

## 3.6 Raportointi ja viennit (Phase18)
- **Tavoite**: Tuottaa selkeät raportit projektin tilanteesta (budjetti vs. toteuma, CPI/AC) ja korvata perinteiset Excel/PPT‑raportit.  
- **Kenelle**: Projektipäällikkö, johto, asiakkaat.  
- **Vaiheet**:  
  1. Avaa *“Raportit”*‑näkymä.  
  2. Valitse raporttityyppi (budjetti, CPI, AC, aikataulu).  
  3. Suodata aikajakso ja valitse yksityiskoiden taso (projekti, työvaihe, kustannustyyppi).  
  4. Näytä raportti interaktiivisessa taulukossa/kaaviossa.  
  5. Vie raportti PDF/Excel‑muodossa tai generoi PPT‑tyylinen dia.  
- **Data**: Raportit perustuvat näkymiin (`views`), jotka agregoivat `budget_items`, `actuals`, `corrections`, `cpi_results`.  
- **Oikeudet**: Katselijat voivat nähdä raportteja; vienti käyttöön PM/johto.  
- **Edge caset**:  
  - Suuret datamäärät → hitaat haut; tarvitaan välimuisti.  
  - Terminologia‐i18n: sanaston on oltava ajan tasalla raporteissa.  
  - Oikeuksien mukaan jotkin raportit saattavat olla piilotettuja.  

## 3.7 Terminologian hallinta (Phase20)
- **Tavoite**: Ylläpitää sanastoa ja käännöksiä, joita käytetään käyttöliittymässä ja raporteissa.  
- **Kenelle**: Järjestelmänvalvoja tai kielivastaava.  
- **Vaiheet**:  
  1. Avaa *“Terminologia”*‑näkymä.  
  2. Hae termi tai lisää uusi: määritä avain (key), suomenkielinen arvo, mahdolliset englanti/ruotsi‑käännökset.  
  3. Tallenna; päivitys kirjoitetaan `terminology`‑tauluun.  
  4. UI ja raportit lukevat aina ajantasaisen sanaston.  
- **Data**: `terminology_i18n`‑taulu; mahdolliset dictionary‑funktiot tietokannassa.  
- **Oikeudet**: Vain admin saa muokata terminologiaa.  
- **Edge caset**:  
  - Päällekkäiset avaimet.  
  - Päivitysten yhteydessä vaaditaan cache‑invalidation.  
  - Käännösten puuttuminen tietyille kielille.  

# 4. RBAC‑matriisi

| Rooli                    | Näytä projektit | Luo/muokkaa projekteja | Tuo budjetti | Tuo JYDA‑dataa | Hallitse työvaiheita | Syötä toteumia | Korjaa tietoja | Näytä raportteja | Vie raportteja | Hallitse termistöä |
|--------------------------|------------------|-------------------------|--------------|----------------|----------------------|-----------------|---------------|-----------------|---------------|--------------------|
| **Admin**                | ✔️               | ✔️                      | ✔️           | ✔️             | ✔️                   | ✔️              | ✔️            | ✔️              | ✔️            | ✔️                 |
| **Projektipäällikkö**    | ✔️               | ✔️                      | ✔️           | —              | ✔️                   | ✔️              | ✔️            | ✔️              | ✔️            | —                  |
| **Työnjohtaja**          | ✔️               | —                       | —            | —              | ✔️                   | ✔️              | —             | ✔️              | —             | —                  |
| **Taloushallinto**       | ✔️               | —                       | ✔️           | ✔️             | —                    | —               | ✔️            | ✔️              | ✔️            | —                  |
| **Katselija**            | ✔️               | —                       | —            | —              | —                    | —               | —             | ✔️              | —             | —                  |

Selite: ✔️ tarkoittaa, että roolilla on oikeus kyseiseen toiminnallisuuteen. Tyhjä kohta tarkoittaa, että roolilla ei ole pääsyä. Viivoilla (—) on toimintoja, joihin rooli ei edes näe liittyvää näkymää.

# 5. Data & laskentasäännöt (tiivis)

| Laskentasääntö                          | Kuvaus ja työnkulun vaikutus |
|-----------------------------------------|-------------------------------|
| **AC (Actual Cost)**                    | Toteutuneet kustannukset kootaan `work_phase_actuals`‑taulusta. AC lasketaan summaamalla toteutuneet kustannukset (tai tunnit × yksikköhinta) per työvaihe.  |
| **EV (Earned Value)**                   | Arvo, joka kuvaa tehtyä työtä: EV = (valmistumisaste × budjetti). Valmistumisaste saadaan joko toteumien perusteella tai manuaalisesti syöttämällä.  |
| **CPI (Cost Performance Index)**        | CPI = EV / AC. Jos CPI < 1, projekti ylittää budjetin. Näytetään punaisena raporteissa. Vaikuttaa raportointipolkuun ja riskien monitorointiin.  |
| **SPI (Schedule Performance Index)**    | SPI = EV / PV (planned value). Mittaa aikataulussa pysymistä; raporteissa.  |
| **Korjausten käsittely**                | Kun korjaus (Phase17) hyväksytään, se päivittää `work_phase_corrections` ja uudelleen laskee CPI/AC‐luvut.  |
| **Terminologian nosto**                | `terminology_i18n`‑taulusta haetaan termit. Jos termi puuttuu, käytetään oletuskieltä; tämä vaikuttaa UI/raportointipolkuun.  |

# 6. Avoimet kysymykset & riskit

1. **Tiedostomuodot** – Tarkempi määrittely budjetin ja JYDA‑tuonnin formaatista puuttuu. Millaisia sarakkeita ja validointeja tarvitaan?  
2. **Laskentasääntöjen yksityiskohdat** – SPEC_CALC_RULES_V1‑tiedostosta ei ollut käytettävissä yksityiskohtaisia sääntöjä; onko muita indeksejä (esim. EAC, BAC)?  
3. **Terminologia/i18n** – Miten terminologiaa hyödynnetään reaaliaikaisesti käyttöliittymässä? Tarvitaanko välimuistia ja miten uudet termit päivittyvät.  
4. **Roolien tarkat oikeudet** – RBAC on vedetty yhteen runbookista, mutta puuttuuko rooleja (esim. asiakasrooli)?  
5. **Audit‑trail** – Missä tauluissa säilytetään historiatiedot tuonneista, korjauksista ja roolimuutoksista? Tämä on kriittinen riskienhallinnan kannalta.  
6. **Integraatiorajapinnat** – JYDA‑tuonnista ei ollut selkeää rajapintakuvausta. Onko API‑avain tai token, joka tulee suojata?  
7. **Dokumenttien puutteet** – Useita runbookeja mainittiin (Phase16–20), mutta niitä ei voitu lukea tässä ympäristössä. Tarvitaan selkeät lähdedokumentit lähdetiedostoista.  

# 7. “Definition of Done” työnkuluille

Checklist, joka varmistaa, että sovellus voi korvata ruutupaperit, Excelit ja PowerPointit:

- [ ] **Projektin perustaminen**: UI‑lomake toimii, vaaditut kentät ja validointi, roolien asetus, tallennus tietokantaan.  
- [ ] **Budjetin tuonti**: Tukee sovittua formaattia, näyttää esikatselun, käsittelee virheet, tallentaa rivit `budget_items`‑tauluun, luo import‑lokit.  
- [ ] **JYDA‑integraatio**: Import toimii valitulle aikajaksolle, käsittelee virheitä ja kirjaa lokiin, tallentaa snapshotin.  
- [ ] **Työvaiheiden ja toteumien hallinta**: UI‑näkymät mahdollistavat uusien vaiheiden lisäämisen, muokkauksen ja poistamisen; toteumien kirjaus toimii; tiedot tallennetaan; CPI/AC päivittyy reaaliaikaisesti.  
- [ ] **Korjausten hallinta**: Korjausten luonti, hyväksyntä tai hylkäys; päivitys tietokantaan; vaikutus laskentoihin; audit‑trail.  
- [ ] **Raportointi & Viennit**: Raporttinäkymät kattavat kaikki tarpeelliset mittarit (budjetti vs. toteuma, CPI/AC, aikataulu); vienti PDF/Excel/PPT korvaa manuaaliset PowerPointit; käyttäjä voi suodattaa ja viedä raportit roolin mukaan.  
- [ ] **Terminologia & i18n**: Sanasto on ylläpidettävissä; UI ja raportit käyttävät oikeita termejä; käännökset toimivat.  
- [ ] **RBAC**: Kaikissa poluissa on oikeuscheck; testattu, että rooleilla on pääsy vain omiin näkymiinsä ja toimintoihin.  
- [ ] **Dokumentaatio ja runbookit**: Projektin runbookit ja SQL‑migraatiot ovat ajan tasalla; mahdolliset ristiriidat on ratkaistu; tieto löytyy yhdestä “single source of truth” ‑dokumentista.  

