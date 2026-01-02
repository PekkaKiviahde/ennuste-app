# Decision log – Ennustus (MVP)

Päivitetty: 2026-01-02

Tämä dokumentti kokoaa keskusteluissa tehdyt päätökset yhteen paikkaan.
Tarkoitus: että “miksi ja mitä päätettiin” ei jää vain chat-historiaan.

---

## 2025-12-30 – Tuotteen nimi ja rytmi
- Tuotteen nimi: **Ennustus**
- Viikkorytmi: päivitetään **ghost + % valmius + memo**
- Kuukausirytmi: tehdään **manuaalinen kuukausiennuste** kuun vaihteessa

---

## 2025-12-30 – Month close ja lukitus
- Kuukausi lukitaan, kun raportit on lähetetty (Month close).
- Ennen lähettämistä saa muuttaa myös valmiuksia/ghosteja.
- Lähetyksen jälkeen korjaus:
  - **Tuotantojohtaja** tekee korjauspyynnön
  - **Yksikön johtaja** hyväksyy
  - Korjaus saa koskea ennustetta + valmiuksia + ghost + memo
- Jokaisesta lähetyksestä jää **arkistoitu report package** (todiste).

---

## 2025-12-30 – Hallinnollinen polku ja roolit
- Superadmin näkee kaikki yritykset.
- Yritysadmin näkee oman yrityksen ja hallitsee asetukset.
- Myyjällä on omat näkymät: sopimus → stub → onboarding-linkki.
- Integraatiot/mäppäykset ovat pääosin kiinteät, mutta admin voi tarkistaa/korjata.

---

## 2025-12-30 – Toimittajan SDLC
- Pakollinen **Staging**.
- Testit: unit → integration(DB+migrations+views) → e2e(UI).
- Staging→Prod julkaisu vaatii hyväksyjän (go/no-go).
- Tuotantoon aina: DB backup + migrations + verify.

---

## 2025-12-30 – Incident ja Data-fix
- Incident-tiketti ulkoisessa järjestelmässä.
- Appissa in-app häiriöbanneri (status-sivu ei MVP:ssä).
- Hotfix-kaista sallittu, mutta portit säilyy.
- Data-korjaukset tuotannossa vain versionoiduilla skripteillä (ei manuaali-DB-edit).

---

## 2025-12-30 – GDPR/compliance
- Asiakas = rekisterinpitäjä, me = käsittelijä (DPA oletus).
- Data EU/ETA-alueella.
- Importit eivät sisällä henkilötietoa.
- Käyttäjän poisto = anonymisointi, audit säilyy pseudonymisoituna.

---

## 2025-12-31 – MVP-työnkulkujen siirto
- MVP-polku: projekti -> budjetti -> JYDA -> mapping -> tyopaketin taloudellinen suunnittelu -> ennustetapahtuma -> raportti.
- Viikkopaivitys (ghost + % + memo) on oma polku.
- M1_READY_TO_SEND mukana month close -polussa ja korjaus vaatii hyväksynnän.
- Terminologia/i18n UI-muokkaus mukana.
- Roolit teknisina + alias-mappaus; acting role sallitaan.
- Importeissa joustava sarakemappaus.
- Laskenta: AC/EV/CPI/SPI + EAC/BAC jos specissä.
- Exportit: PDF + CSV (ei XLSX MVP:ssa).
- Append-only pakotetaan kaikkiin kirjoittaviin tapahtumiin.
- Viikkopäivitys: append-only event + ghost settlement; lukitus estää muokkaukset, korjaus correction-polulla.
- Month close: M0→M1→M2; korjaus luo uuden report-package-version.

## 2026-01-01 – Onboarding + RBAC (scope ja kontrollit)
- Onboarding toteutetaan laajalla scopella (täysi roolipinta ja hallinnollinen polku).
- Onboarding-data pysyy JSONB-kentissä MVP:ssä.
- API on RBAC-gatingin totuus (UI vain näyttää).
- Onboarding-linkit ovat kertakäyttöisiä ja idempotentteja.
- Smoke-testit varmistavat tenant-eristyksen, rooligatingin ja audit-eventit.

## 2026-01-01 – Onboarding + RBAC (tarkennukset)
- Projektin roolit: viewer/editor/manager/owner.
- Järjestelmäroolit: superadmin/admin/director/seller; director on read-only.
- Acting role sallittu (owner/superadmin, TTL 7pv/30pv, audit).
- Seller saa stub + onboarding-linkin; demo-tenant erillinen ja esitäytetty.
- Onboarding-linkki kertakäyttöinen (TTL 7pv).
- Pakolliset kentät: nimi + y-tunnus + projekti + aikajakso + valuutta (laaja kenttälista sallittu).
- Kutsu: sähköposti + kertakäyttöinen linkki + PIN/OTP.
- Oletusrooli viewer.
- Audit: kaikki kirjoitukset + roolimuutokset + hyväksynnät.
- Break-glass vain superadmin (audit + syy).
- Roolit poistuvat käyttäjän poistuessa projektista.

## 2026-01-01 – Importit + mapping (scope, malli, oikeudet, evidence)
- MVP: budjetti + JYDA.
- Importit: import_job + event-loki + mapping_versions (append-only).
- Oikeudet: import admin/PM/talous; mapping-korjaus admin/manager.
- Retry + validointiraportti käytössä.
- Smoke-testit + invariantit (ei duplikaatteja, ACTIVE-mapping).

## 2026-01-01 – Importit + mapping (tarkennukset)
- MVP sisältää budjetti + JYDA; laajennusvara avoin.
- Import-mapping on joustava per projekti (import_mappings JSONB).
- Mapping-korjaukset aina uusina versioina (append-only).
- Mapping-korjauksia saa tehdä vain admin/manager.

## 2026-01-01 – Raportointi + export (scope, malli, oikeudet, evidence)
- MVP: kuukausiraportti + PDF + CSV (ei XLSX).
- Raporttipaketti snapshot + checksum + append-only.
- Export-oikeus: PM/johto; audit kaikista exporteista.
- Manuaalinen send-reports; versiointi report-package-ketjuna.
- Smoke-testit: ketju + checksum + lukitus + korjausversio.

## 2026-01-01 – Raporttien snapshot-on-demand
- Raportin “totuus” säilytetään snapshot-tauluissa (append-only).
- PDF/CSV generoidaan pyynnöstä snapshotista (on-demand), ei pysyvää tiedostovarastoa.
- Kaikki versiot säilytetään; korjaus luo uuden snapshot-version.
- RBAC + tenant-eristys + audit-eventit koskevat generointia ja latausta.
- Smoke-testit: tenant-eristys + RBAC + on-demand generointi + audit.

## 2026-01-01 – Onboarding + RBAC (minimi)
- API tekee projektitasoisen gatingin rooleilla viewer/editor/manager/owner; system-roolit ovat erillinen polku.
- Onboarding-linkki on kertakäyttöinen, TTL 7 pv, ja kaikki käytöt auditoidaan.
- Varmistus tehdään smoke-testeillä: tenant-eristys, rooligating, idempotentti submit, audit-eventit.

## 2026-01-01 – Importit + mapping (minimi)
- Rakenne on import_job + event-loki + mapping_versions (append-only).
- API tekee rooligatingin ja kaikki import/mapping-kirjoitukset auditoidaan.
- Varmistus tehdään smoke-testeillä: tenant-eristys, rooligating, idempotentti submit, audit-eventit.

## 2026-01-01 – Raportointi + export (minimi)
- Export-oikeus: PM/johto; audit kaikista exporteista.
- Report-package snapshotit arkistoidaan append-only.
- Varmistus tehdään smoke-testeillä: tenant-eristys, rooligating, idempotentti submit, audit-eventit.

## 2026-01-01 – Importit + mapping (D-039)
- Rakenne: import_job + event-loki + mapping_versions (append-only).
- API-gating + audit kaikista import/mapping-kirjoituksista.
- Todennus: smoke-testit (tenant-eristys, rooligating, idempotentti submit, audit-eventit).

## 2026-01-01 – Importit + mapping (vahvistus)
- Vahvistettu: import_job + event-loki + mapping_versions, API-gating, audit ja smoke-testit.

## 2026-01-02 – WIP-päätös (ADR-päivämäärät + auth-virta)
- Jatketaan nykyistä polkua: ADR-päivämäärien yhdenmukaistus ja auth-virran yhtenäistäminen.
- Muu v1-sisältö parkkeerataan, kunnes WIP on siivottu ja ristiriidat poistettu.
- Uusia speksi- tai UI-muutoksia ei lisätä ennen kuin ADR- ja auth-polku on yhtenäinen.
- WIP-riveihin kosketaan vain tämän polun osalta, jotta audit trail pysyy selkeänä.

## 2026-01-02 – Export-formaatti (tarkennus)
- MVP: PDF + CSV (ei Excel/XLSX).
- Excel/XLSX siirtyy myöhempään vaiheeseen.

## Ristiriidat (koonti)

### Dokumenttiviitteet ja otsikot
- ADR-0001: README-otsikko ei vastannut päätösdokumentin otsikkoa (korjattu).
- Traceability: globi-viitteet `docs/` ja `docs/workflows/` täsmennettiin polkuihin (korjattu).
- API-docs: work-phases vs work-packages ja month close -polut yhdenmukaistettiin (korjattu).

### Raporttiformaatit
- Exportit: 2025-12-31 mainitsi PDF + Excel, tarkennus 2026-01-02 lukitsee PDF + CSV (korjattu).
- Open questions: raporttiformaatit-kysymys poistettu, koska päätös on PDF + CSV (korjattu).
- Workflows: nappipolut ja glossary mainitsivat PDF/Excel, tarkennus PDF/CSV (korjattu).
- Runbooks: MVP-checklist mainitsi PDF/Excel, tarkennus PDF/CSV (korjattu).
- Report: report.md mainitsi Excel/PPT, tarkennus PDF/CSV (korjattu).

### Päivämäärät ja muutososiot
- Workflows/Runbooks: päivämäärät linjattu päätöslokin kanssa (korjattu).
- Speksi/tools/excel/report: muutososiot puuttuivat (korjattu).

### Päätökset vs speksit
- Päätösloki vs `spec/`: ristiriitoja ei löytynyt (tarkistettu).

### UI/API-viitteet
- KARTTA + nappipolut + ADR-0006 viitteet tarkistettu, ristiriitoja ei löytynyt.

## Mitä muuttui
- Lisätty päätös raportoinnin ja exportin scopesta, mallista, oikeuksista ja evidencestä.
- Lisätty onboarding + RBAC minimipäätös (gating, linkki, smoke).
- Lisätty importit + mapping minimipäätös (rakenne, oikeudet, smoke).
- Lisätty raportointi + export minimipäätös (oikeus, arkistointi, smoke).
- Lisätty vahvistusmerkintä importit + mapping -päätöksestä.
- Lisätty WIP-päätös ADR-päivämäärien yhdenmukaistuksesta ja auth-virran yhtenäistämisestä.
- Lisätty export-formaatin tarkennus ja ristiriitojen koonti.
- Lisätty ADR-0001-otsikon ristiriidan koontimerkintä.
- Lisätty traceability-viitepolkujen ristiriidan koontimerkintä.
- Lisätty open-questions-raporttiformaattikohdan ristiriidan koontimerkintä.
- Lisätty workflow-raporttiformaattiristiriidan koontimerkintä.
- Lisätty runbook-raporttiformaattiristiriidan koontimerkintä.
- Täsmennetty traceability-koontirivin polkuviitteet.
- Päivitetty workflows- ja runbooks-päivämäärät linjaan päätöslokin kanssa.
- Lisätty speksi- ja tools-dokumenttien muutososioiden koontimerkintä.
- Ryhmitelty ristiriidat teemoittain koonnissa.
- Lisätty päätösloki vs speksit -tarkistus koontiin.
- Lisätty report.md-raporttiformaattiristiriidan koontimerkintä.
- Lisätty API-dokumenttien polkujen yhtenäistys koontiin.
- Lisätty UI/API-viitteiden tarkistus koontiin.

## Miksi
- Tarvitaan yhteinen totuus raportoinnin ja exportin toteutusmallista ja testivaatimuksista.
- Tarvitaan minimivarmistus onboarding-polun turvallisuudesta ja toistettavuudesta.
- Tarvitaan minimivarmistus import-ketjun oikeuksista ja auditoinnista.
- Tarvitaan minimivarmistus raporttien luovutuksesta ja auditoinnista.
- Päätöksen vahvistus halutaan näkyvästi myös decision-logissa.
- WIP pitää rajata yhteen polkuun, jotta v1-muutokset eivät sekoitu keskeneräiseen linjaan.
- Ristiriidat pitää näkyä koontina ja tarkennus lukita yhteen formaattiin.
- Ristiriitojen koonti pidetään ajantasaisena otsikko- ja viitepoikkeamille.
- Traceability-viitteiden pitää osoittaa olemassa oleviin polkuihin.
- Open-questions-lista ei saa sisältää jo päätettyjä kohtia.
- Workflow-dokumenttien pitää käyttää päätöslokin raporttiformaattia.
- Runbook-dokumenttien pitää käyttää päätöslokin raporttiformaattia.
- Traceability-koontirivien viitteet eivät saa olla globi-muotoa.
- Päivämäärät pidetään linjassa päätöslokin kanssa dokumenteissa.
- Speksi- ja tools-dokumenteissa muutokset kirjataan muutososioihin.
- Koonti pidetään luettavana ryhmittelemällä ristiriidat teemoihin.
- Päätösloki ja speksit pidetään linjassa.
- Report-dokumentin raporttiformaatin pitää vastata päätöslokia.
- API-dokumenttien polut pidetään yhtenäisinä nappipolkujen kanssa.
- UI/API-viitteet pidetään linjassa dokumenttien kanssa.

## Miten testataan (manuaali)
- Aja report-polku: send-reports → lukitus → correction → uusi report-package.
- Aja smoke-testit: tenant-eristys, rooligating, idempotentti submit, audit-eventit.
- Tarkista, että vahvistus näkyy decision-logissa eikä ristiriitaa MASTERissa ole.
- Tarkista, että WIP-päätös näkyy decision-logissa ja ohjaa etenemisen yhteen polkuun.
- Tarkista, että export-formaatti on PDF + CSV sekä päätöslokissa että MASTERissa.
- Tarkista, että ADR-0001-otsikko vastaa päätösdokumenttia ADR-README:ssa.
- Tarkista, että traceabilityn viitepolut osoittavat olemassa oleviin kansioihin.
- Tarkista, että open-questions ei sisällä jo päätettyjä päätöksiä.
- Tarkista, että workflow-dokumenteissa report package on PDF/CSV.
- Tarkista, että runbook-checklistassa export on PDF/CSV.
- Tarkista, että traceability-koontirivien polkuviitteet ovat täsmällisiä.
- Tarkista, että workflows- ja runbooks-päivämäärät ovat 2026-01-02.
- Tarkista, että speksi- ja tools-dokumenteissa on muutososiot.
- Tarkista, että ristiriitojen koonti on ryhmitelty teemoittain.
- Tarkista, että päätösloki vs speksit -tarkistuksessa ei ole ristiriitoja.
- Tarkista, että report.md käyttää PDF/CSV-vientimuotoa.
- Tarkista, että `docs/api/README.md` ja `docs/api/examples.md` käyttävät samoja polkuja.
- Tarkista, että `docs/KARTTA_STATUS_V1.md`, `docs/workflows/nappipolut.md` ja `docs/adr/0006-auth-session-flow.md` viitteet osuvat olemassa oleviin tiedostoihin.
