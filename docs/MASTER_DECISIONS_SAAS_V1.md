# MASTER – SaaS v1 päätösloki

Päivitetty: 2025-02-14  
Tämä dokumentti on “yksi totuus” -päätösloki: tänne kirjataan vain lukitut päätökset, varmennukset (gate/known-good) ja avoimet päätökset.

---

## LUKITTU
- **D-007 (LUKITTU)** Kuukausiraportti toimii vain jos `v_target_month_cost_report` tuottaa rivejä; tyhjä = data pipeline puuttuu/ei ajettu.  
  **Tulkinta:** tyhjä kuukausi on data-pipeline-ongelma, ei UI-/join-bugi.
- **D-012 (LUKITTU)** Kaikki importit/kirjaukset append-only; ei UPDATE/DELETE; audit-ketju `import_batches` (tai vastaava).  
  **Tulkinta:** historialoki on muuttumaton ja auditoitavissa.
- **D-013 (LUKITTU)** `cost_type` pidetään perusluokissa LABOR/MATERIAL/SUBCONTRACT/RENTAL/OTHER; jaottelematonta ei dumpata OTHERiin.  
  **Tulkinta:** puuttuva luokitus pysyy “unclassified”, ei vääristystä OTHERiin.
- **D-014 (LUKITTU)** LABOR-alaluokitus tehdään `labor_kind`=HOURLY/SALARY (ei kahta `cost_type`:a).  
  **Tulkinta:** LABOR on yksi `cost_type`, alaluokka erotetaan omalla kentällä.
- **D-015–D-016 (LUKITTU)** `amount_kind` erottaa COST vs NPSS_UNCLASSIFIED/UNCLASSIFIED; TOTAL ei ole `cost_type`; TOTAL_CALC lasketaan; TOTAL_EXT talteen erilliseen kontrolliin.  
  **Tulkinta:** TOTAL ei ole syötetty kustannuslaji vaan laskettu/valvottu kenttä.
- **D-017 (LUKITTU)** Ensisijainen toteuma ennustepäivälle = “Toteutunut kustannus (sis. hyväksymätt.)”; Approved vain vertailuun.  
  **Tulkinta:** päätoteuma ei suodata hyväksyntästatuksella.
- **D-022 (LUKITTU)** NPSS_UNCLASSIFIED on opening snapshot ilman sisäerittelyä; ei saa sekoittua OTHER-kuluihin.  
  **Tulkinta:** opening snapshot on erillinen kori, ei kustannuslaji.
- **D-024 (LUKITTU)** Ennen cutoveria ei tehdä kuukausijakaumaa (vain to-date/kumulatiivinen).  
  **Tulkinta:** pre-cutover raportointi on kumulatiivinen, ei kuukausijakoinen.
- **D-025 (LUKITTU)** NPSS on vain cutover-hetken opening snapshot; cutoverin jälkeen ajantasainen toteuma tulee ERP:stä.  
  **Tulkinta:** NPSS ei päivity cutoverin jälkeen, ERP on ainoa lähde.
- **D-026 (LUKITTU)** NPSS_UNCLASSIFIED siistintä vapaaehtoinen v1:ssä; ei vaikuta KPI/EV/CPI; jälkiluokitus append-only myöhemmin.  
  **Tulkinta:** v1 ei vaadi siistintää eikä muuta KPI-laskentaa.
- **D-027 (LUKITTU)** Viikkopäivitys tallennetaan append-only eventtinä; ghost-kulut erillisinä tapahtumina ja suljetaan settlement-rivillä; lukitussa kuussa muutokset vain correction-polulla; RBAC: SITE_FOREMAN/GENERAL_FOREMAN luonti, PM/PRODUCTION_MANAGER hyväksyntä.  
  **Tulkinta:** viikkopäivitys on event-loki, ghostit eivät päivity, vaan kuittaus tehdään settlementilla ja lukitus estää muokkauksen.
- **D-028 (LUKITTU)** Kuukausiraportointi on append-only report-package-ketju checksumilla; M1_READY_TO_SEND käytössä; lähetys lukitsee kuukauden; korjaus luo uuden report-package-version; smoke-testi varmistaa ketjun.  
  **Tulkinta:** raportit eivät ylikirjoitu, lukitus ja korjaus ovat tilasiirtymiä, ja audit on todennettu.
- Työmaata ei ennusteta suoraan: työmaan ennuste = työpakettien koonti.  
  **Tulkinta:** työmaa on aggregaatti, ei oma ennusteyksikkö.
- KPI/EV/CPI vain baseline-lukituille työpaketeille (policy A).  
  **Tulkinta:** mittarit lasketaan vain lukitusta baselinesta.
- Tavoitearviossa olleet mutta puuttuvat rivit saa lisätä työpakettiin hyväksynnällä.  
  **Tulkinta:** baselineen saa lisätä vain hyväksytyn täydennyksen.
- Tavoitearviossa EI olleita rivejä ei lisätä baselineen.  
  **Tulkinta:** uusia rivejä ei saa “hiljaisesti” baselineen.
- “Selvitettävät” = unmapped actuals.  
  **Tulkinta:** selvitettävä = toteuma ilman mappingia.
- Terminologia UI: `terminology_get_dictionary` (org+locale), ei kovakoodattuja tekstejä.  
  **Tulkinta:** UI-tekstit tulevat sanastosta, eivät koodista.
- Windows local dev (Docker+Postgres): host-portti lukitaan 5433 (compose: `5433:5432`).  
  **Tulkinta:** paikallinen DSN on aina 5433.
- Windows local dev: yhteysosoite käyttää aina IPv4:ää `127.0.0.1` (ei `localhost`), DSN: `postgresql://codex:codex@127.0.0.1:5433/codex`.  
  **Tulkinta:** IPv6/localhost-ongelmat vältetään pakottamalla IPv4.
- smoke.ps1: asettaa `DATABASE_URL`-fallbackin Windows-polulle jos `.env` ei aseta URL:ia, ja tulostaa redacted `DATABASE_URL` ajon alussa.  
  **Tulkinta:** smoke-ajon pitää olla deterministinen ilman .env:ää.
- smoke.ps1: välittää DSN:n Python-skripteille aina eksplisiittisesti `--database-url $env:DATABASE_URL` (ei luoteta env-scopen periytymiseen).  
  **Tulkinta:** DSN kulkee aina parametrina, ei implisiittisesti.
- psql `\d ...` avaa pagerin (END) — poistu `q` tai aja `-P pager=off` (ei virhe, vain dev-UX).  
  **Tulkinta:** pageri on käyttöliittymäominaisuus, ei virhe.

---

## VARMENNETTU
> “VARMENNETTU” = gate/known-good: tämän on todistettavasti toiminut, ja siihen voidaan nojata (UI/API/backlog).  
> Tarkat ajokomennot ja rivimäärät kuuluvat runbookiin.

- **F-001 (VARMENNETTU)** `v_actuals_latest_snapshot_mapped` tuottaa rivejä, kun ACTIVE `mapping_version` on olemassa ja `mapping_lines` osuu actualeihin (`work_littera_id` + mahdollinen `cost_type`).  
  **Tulkinta:** mapping-ketju on käynnissä vain ACTIVE-versiolla ja osumilla.
- **F-002 (VARMENNETTU)** Windows-local smoke on toistettava, kun käytetään DSN:ää `127.0.0.1:5433` ja `smoke.ps1`-ajossa DSN välitetään eksplisiittisesti (ei `localhost`-oletuksia; käytä `127.0.0.1:5433`).  
  **Tulkinta:** local-dev onnistuu vain IPv4+eksplisiittinen DSN -polulla.
- **F-003 (VARMENNETTU)** Kuukausiraportin pipeline tuottaa kuukausirivejä testidatalla ketjulla: **actual → mapping → mapped snapshot → monthly → adapter → work_phase** (ja sitä kautta `v_target_month_cost_report` saa dataa).  
  **Tulkinta:** ketju on todistettu, ei pelkkä oletus.
- **F-004 (VARMENNETTU)** Ennuste näkyy kuukausiriveillä oikein per `cost_type`, kun `planning_event` = **READY_FOR_FORECAST** ja `forecast_event_lines` on lisätty; **0-arvo = ennustetta ei syötetty** kyseiselle `cost_type`:lle.  
  **Tulkinta:** 0 tarkoittaa “ei syötetty”, ei laskentavirhettä.
- **D-009 (VARMENNETTU)** Kuukausiraportin pipeline todistettu testidatalla: actual → mapping → mapped snapshot → monthly → adapter → work_phase; jokainen askel tuottaa rivejä.  
  **Tulkinta:** koko ketju on toiminnassa, ei yksittäinen view.
- **D-010 (VARMENNETTU)** Forecast-puoli todistettu: `planning_event`=READY_FOR_FORECAST + `forecast_event_lines` → `forecast_value` näkyy kuukausiriveillä per `cost_type`; 0 = ei syötetty tälle `cost_type`:lle.  
  **Tulkinta:** forecast näkyy vain syötetyille cost_typeille.

---

## TOTEUTUSLINJAUKSET
- Phase21: kuukausiadapteri (`v_target_month_cost_report_v1` + `_by_cost_type`) ja `v_report_monthly_work_phase` käyttää adapteria; `v_work_phase_latest_baseline` ei sisällä `project_id` (käytä `wp.project_id`) ja typet castataan `numeric(14,2)`, jotta `CREATE OR REPLACE VIEW` ei kaadu.  
  **Tulkinta:** adapteri on raportoinnin lähde, ja tyyppikastit estävät view-virheet.
- Runbookit: `FRESH_INSTALL_RUNBOOK.md` (ihmiselle) + `FRESH_INSTALL_RUNBOOK.sql` / `_v2` (SQL-only pgAdmin-safe), jossa schema-check REQUIRED ja data-pipeline OPTIONAL (käännettävissä REQUIREDiksi).  
  **Tulkinta:** asennus voidaan ajaa ilman dataa, mutta schema on aina pakollinen.
- Secrets hygiene: valittu malli apufunktio + logging filter (ei print-monkeypatch), moduuli `tools/scripts/db_url_redact.py` ja CI-sentinel-testi ettei salasana vuoda.  
  **Tulkinta:** salaisuudet suojataan keskitetysti, ei ad hoc -printtiä.
- Dev/smoke budget_items: hyväksytty synteettinen builder budget_lines-summista (1 item/littera), idempotentti per `import_batch_id` (`ON CONFLICT DO NOTHING`).  
  **Tulkinta:** smoke-data tuotetaan deterministisesti ilman duplikaatteja.

---

## AVOIN
- Cutover tallennus: `projects.cutover_at` vs `project_cutover_events` (append-only audit).  
  **Tulkinta:** cutoverin auditointi on auki (yksi vs tapahtumat).

---

## viitteet (repo)
- `docker-compose.yml`
- `docs/local-dev-db-windows.md`
- `smoke.ps1`

---

## Mitä muuttui
- Lukittiin onboardingin JSONB-tallennusmalli päätökseksi D-029.
- Lukittiin onboarding + RBAC scope ja kontrollit päätökseksi D-030.

## Miksi
- Tarvitaan yhteinen ja eksplisiittinen linjaus onboardingin datamallista, rooligatingista ja auditista.

## Miten testataan (manuaali)
- Tarkista, että onboarding-linkki on kertakäyttöinen ja submit idempotentti.
- Varmista API:ssa rooligating + tenant-eristys write-endpointeissa.
- Varmista, että audit-eventit syntyvät onboarding- ja roolimuutoksista.

## D-029 (LUKITTU) Onboarding tallennusmalli (JSONB)

Päätös: MVP-onboarding-tiedot tallennetaan JSONB-kenttiin: tenants.company_details jsonb ja projects.project_details jsonb.

Peruste: migrations/0018_tenant_onboarding.sql (company_details, project_details), migrations/0001_init.sql (planning_events.attachments jsonb).

Huom: normalisointi voidaan tehdä myöhemmin, jos raportointi/validointi vaatii.

## D-030 (LUKITTU) Onboarding + RBAC scope ja kontrollit

Päätös: Onboarding + RBAC toteutetaan laajalla scopella, mutta onboarding-data säilytetään JSONB-kentissä MVP:ssä; API on RBAC-gatingin totuus (UI vain näyttää), onboarding-linkit ovat kertakäyttöisiä ja idempotentteja, ja smoke-testit varmistavat tenant-eristyksen, rooligatingin ja audit-eventit.

Peruste: docs/api/security.md (RBAC + tenant isolation + audit), docs/workflows/rbac-matrix.md (roolit), docs/workflows/nappipolut.md (onboarding-polku), migrations/0018_tenant_onboarding.sql (JSONB-kentät).
