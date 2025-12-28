# MASTER – SaaS v1 päätösloki

Päivitetty: 2025-12-28  
Tämä dokumentti on “yksi totuus” -päätösloki: tänne kirjataan vain lukitut päätökset, varmennukset (gate/known-good) ja avoimet päätökset.

---

## lukittu
- Työmaata ei ennusteta suoraan: työmaan ennuste = työpakettien koonti.
- KPI/EV/CPI vain baseline-lukituille työpaketeille (policy A).
- Tavoitearviossa olleet mutta puuttuvat rivit saa lisätä työpakettiin hyväksynnällä.
- Tavoitearviossa EI olleita rivejä ei lisätä baselineen.
- “Selvitettävät” = unmapped actuals.
- Terminologia UI: terminology_get_dictionary (org+locale), ei kovakoodattuja tekstejä.

- Windows local dev (Docker+Postgres): host-portti lukitaan 5433 (compose: `5433:5432`).
- Windows local dev: yhteysosoite käyttää aina IPv4:ää `127.0.0.1` (ei `localhost`), DSN: `postgresql://codex:codex@127.0.0.1:5433/codex`.
- smoke.ps1: asettaa `DATABASE_URL`-fallbackin Windows-polulle jos `.env` ei aseta URL:ia, ja tulostaa redacted `DATABASE_URL` ajon alussa.
- smoke.ps1: välittää DSN:n Python-skripteille aina eksplisiittisesti `--database-url $env:DATABASE_URL` (ei luoteta env-scopen periytymiseen).
- psql `\d ...` avaa pagerin (END) — poistu `q` tai aja `-P pager=off` (ei virhe, vain dev-UX).

---

## varmennettu
> “VARMENNETTU” = gate/known-good: tämän on todistettavasti toiminut, ja siihen voidaan nojata (UI/API/backlog).  
> Tarkat ajokomennot ja rivimäärät kuuluvat runbookiin.

- **F-001 (VARMENNETTU)** Windows-local smoke on toistettava, kun käytetään DSN:ää `127.0.0.1:5433` ja `smoke.ps1`-ajossa DSN välitetään eksplisiittisesti (ei `localhost`-oletuksia; käytä `127.0.0.1:5433`).
- **F-002 (VARMENNETTU)** Mapping-vaihe toimii: `v_actuals_latest_snapshot_mapped` tuottaa rivejä, kun **ACTIVE `mapping_version`** on olemassa.
- **F-003 (VARMENNETTU)** Kuukausiraportin pipeline tuottaa kuukausirivejä testidatalla ketjulla: **actual → mapping → mapped snapshot → monthly → adapter → work_phase** (ja sitä kautta `v_target_month_cost_report` saa dataa).
- **F-004 (VARMENNETTU)** Ennuste näkyy kuukausiriveillä oikein per `cost_type`, kun `planning_event` = **READY_FOR_FORECAST** ja `forecast_event_lines` on lisätty; **0-arvo = ennustetta ei syötetty** kyseiselle `cost_type`:lle.

---

## avoinna
- (täytetään kun tulee uusia päätöksiä)

---

## viitteet (repo)
- `docker-compose.yml`
- `docs/local-dev-db-windows.md`
- `smoke.ps1`
