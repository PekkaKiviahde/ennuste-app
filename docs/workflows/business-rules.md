# Business rules – Ennustus (MVP)

Päivitetty: 2025-12-30

Tämä dokumentti kokoaa “kultaiset säännöt” (business rules), jotta:
- UI-napit ja lukitukset ovat johdonmukaiset
- raportit ovat todennettavia (audit)
- kuukausi- ja baseline-lukitukset eivät “vuoda”

---

## 1) Perusperiaatteet

### 1.1 Suunnitelma ennen ennustetta
- KPI-seuranta ja ennuste perustuvat **baselineen** (lukittu suunnitelma).
- Jos baselinea ei ole lukittu, työpaketti on SETUP-tilassa eikä kuulu seurantaan samalla tavalla.

### 1.2 Viikko- ja kuukausirytmi
- **Viikko**: päivitetään **% valmius + ghost + memo**
- **Kuu (kuun vaihde)**: syötetään **kuukausiennuste (manuaalinen)**

---

## 2) Baseline-lukitus (työpaketti)

### 2.1 SETUP → TRACK
- Työpaketin koostumus (litterat/itemit) rakennetaan SETUP-tilassa.
- Baseline-lukitus vaatii hyväksynnät:
  - **PM 1/2**
  - **Tuotantojohtaja 2/2**

### 2.2 Muutokset baselineen
- TRACK-tilassa koostumusta ei muuteta “suoraan”.
- Jos tarvitaan muutos, käytetään **korjauspolkua** (versiointi + hyväksynnät).

---

## 3) Viikkopäivitys (TRACK)

### 3.1 Mitä viikottain syötetään
- **% valmius**
- **ghost (€)**
- **memo**

### 3.2 Selvitettävät (unmapped)
- Toteumat, joita ei saada kohdistettua työpakettiin, näkyvät “selvitettävät” listana.
- Käyttäjä liittää ne työpakettiin tai luo uuden työpaketin.

---

## 4) Kuukausi (Month close)

### 4.1 Avoin kuukausi (M0_OPEN_DRAFT)
Ennen raporttien lähettämistä saa muuttaa:
- kuukausiennustetta
- % valmiuksia
- ghost-rivejä
- memoja

### 4.2 Lähetä raportit = lukitse kuukausi (M2_SENT_LOCKED)
Kun painetaan **[Lähetä raportit]**:
1) järjestelmä lähettää sähköpostit (yksikön johtaja + talousjohtaja + muut vastaanottajat)
2) järjestelmä **arkistoi report package** (todiste: mitä lähetettiin)
3) kuukausi siirtyy tilaan **SENT_LOCKED**

### 4.3 Lukon jälkeinen korjaus
- Kun kuukausi on lukossa, korjaus tehdään vain:
  - **Tuotantojohtajan korjauspyyntö**
  - **Yksikön johtajan hyväksyntä**
- Korjaus saa koskea myös:
  - ennustetta
  - % valmiuksia
  - ghost-rivejä
  - memoja
- Korjaus toteutetaan versionoituna (append-only): “vanha lähetetty paketti” säilyy arkistossa, uusi versio arkistoidaan erikseen.

---

## 5) Incident ja Data-fix – erot

### 5.1 Incident (häiriö)
- Akutti asiakasvaikutus → ulkoinen tiketti + in-app banneri + hotfix tarvittaessa  
  → `docs/runbooks/incident.md`

### 5.2 Data-fix (tuotannon data korjattava)
- Korjaukset tuotantodatassa tehdään **vain versionoiduilla skripteillä** (migrations/backfill/verify), ei manuaali-DB-editeillä  
  → `docs/runbooks/data-fix.md`

---

## 6) “Do not break” -invariantit (MVP)

- Tenant-eristys: yritysadmin ei näe muiden tennanttien dataa
- Lukitukset: SENT_LOCKED kuukauden data ei muutu ilman hyväksyntäpolkua
- Arkisto: jokaisesta “Lähetä raportit” -toiminnosta jää muuttumaton report package
- Audit: muutokset ovat jäljitettävissä (kuka, mitä, milloin) ilman että henkilötieto on embedattuna tapahtumariveihin
