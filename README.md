# Ennuste → sovellus (Repo)

Tämä repo on **siirtopohja**, jolla nykyinen Excel-ennustetyökalu muutetaan hallitusti sovellukseksi.
Excel jää lähdejärjestelmäksi/prototyypiksi, mutta **tavoite on irrottaa datamalli + prosessit** niin,
että logiikka toimii ilman Exceliä.

## Ydinperiaatteet

- **Append-only loki**: ennustus on tapahtumaketju. Kaikki tallennukset säilytetään (audit trail).
- **Työn suunnittelu ennen ennustusta**: työnjohto tekee taloudellisen suunnittelun (ja kirjaukset),
  vasta sen jälkeen varsinainen ennustus kirjataan lukkoon.
- **Tavoitearvio-littera voi poiketa työlitterasta**: ostot voidaan tehdä useilta litteroilta,
  mutta taloudellisessa suunnittelussa ne pitää pystyä yhdistämään ja kohdistamaan (mapping).

## Käyttäjäroolit (minimi)

- **Työnjohtaja**: suunnittelu + kirjaukset + ennusteen syöttö perusteluineen
- **Työpäällikkö / tuotantojohtaja**: tarkastaa, hyväksyy, seuraa ryhmä-/kokonaistasoa

## Käsitteet (sanasto)

- **Littera**: kustannuspaikka / työvaihe (koodi + selite)
- **Työlittera**: littera, jolle työtä oikeasti tehdään
- **Tavoitearvio-littera**: littera, jolla tavoite ja suunnittelu tehdään (voi olla eri kuin työlittera)
- **Kustannuslaji**: Työ / Aine / Alihankinta / Vuokra / Muu
- **Ennustetapahtuma**: yksittäinen tallennus (pvm, käyttäjä, arvot, muistiot, KPI/valmius, liitteet)
- **Suunnitelma**: työnjohdon “miten tämä työ johdetaan” -kirjaukset ennen ennustusta

## Prosessi (MVP)

1. Valitaan **tavoitearvio-littera** (taloudellinen suunnittelu)
2. Luodaan / päivitetään **mapping**: työlitterat ↔ tavoitearvio-littera (yhdistäminen)
3. Työnjohto tekee **suunnitelman** (teksti + huomiot + riskit + päätökset)
4. Ennuste kirjataan **tapahtumana** (kustannuslajit + muistiot + perustelut)
5. Ryhmä-/kokonaistaso päivittyy (raportointi)

## MVP-sovellus (demo)

Nopea demo käyttää Postgresia ja minimikäyttöliittymää (suunnitelma + ennustetapahtuma).

1. Kopioi `.env.example` → `.env` ja varmista `DATABASE_URL`.
2. Aja: `docker compose up -d`
3. Avaa: `http://localhost:3000` (tai suoraan `/setup`, `/mapping`, `/planning`, `/forecast`, `/report`, `/history`)

Käyttöliittymä tarjoaa:
- projektin luonti
- tavoitearvio-litteran luonti
- mapping-versio + mapping-rivit + aktivointi
- suunnitelma (status READY_FOR_FORECAST ennen ennustetta)
- ennustetapahtuma kustannuslajeittain (append-only)
- perusraportti (tavoite/ennuste/toteuma kustannuslajeittain)
- välilehdet + omat reitit yllä mainituille osioille

## Lähteet (nykyinen Excel)

Excel-työkirja ja exportatut VBA-moduulit tallennetaan tänne:
- `excel/` (xlsm ja dokumentoidut versiot)
- `vba/` (exportatut moduulit ja formit)

## Repo-rakenne

- `spec/` – vaatimusmäärittely ja tekninen speksi (tämä on “totuus” sovellukselle)
- `docs/` – arkkitehtuuri, päätökset (ADR), käyttöohjeet
- `tools/` – skriptit (esim. Excelin analyysi, importit, validointi)
- `api/` – (myöhemmin) backend
- `ui/` – (myöhemmin) käyttöliittymä
- `migrations/` – (myöhemmin) tietokantamigraatiot
- `tests/` – (myöhemmin) testit

## Windows local dev DB

Ohjeet host-portille 5433 ja osoitteelle 127.0.0.1 löytyvät: `docs/local-dev-db-windows.md`.

---

## MVP-prototyyppi (local)

Tämä repo sisältää nyt ajettavan MVP-prototyypin (API + UI) yhdessä Docker Compose -komennossa.

### Käynnistys

1. Kopioi ympäristömuuttujat:

```bash
cp .env.example .env
```

2. Käynnistä palvelut:

```bash
docker compose up
```

3. Avaa selain:
   - UI + API: http://localhost:3000
   - pgAdmin: http://localhost:5050

### Troubleshooting: portti 3000

- Jos `docker compose config --services` ei näytä `app`: app-palvelu puuttuu compose-tiedostosta.
- Jos portti 3000 ei näy:
  - Tarkista `docker compose ps`
  - Tarkista `docker compose logs app --tail=200`
- Jos ajat Codespaces/etäkontissa: avaa portti 3000 Ports-näkymästä ja käytä sieltä saatua URL:ia (ei paikallinen `localhost`).
- Jos portti pitää avata ilman kirjautumisohjausta: aseta Ports-näkymästä Visibility → Public.
- Jos `npm ci` epäonnistuu kontissa: aja kerran `cd api && npm ci` työtilassa, jotta `api/node_modules` löytyy volyymista.
- Jos portti 3000 on varattu: aseta `.env`-tiedostoon `APP_PORT=3001` (tai muu vapaa portti).
- Jos vain db + pgadmin käynnistyy:
  - Varmista että `docker-compose.yml` sisältää `app`-palvelun
- Resetointi:
  - `docker compose down -v && docker compose up -d --build`

### Verifikaatio (ohje)

1. `docker compose config --services`
2. `docker compose ps`
3. `curl -s http://localhost:${APP_PORT:-3000}/api/health`

### Kirjautuminen (dev)

Kirjautumisessa valitaan käyttäjä ja annetaan PIN. Seed-data luo oletuskäyttäjät:
- `anna` (Työnjohtaja)
- `paavo` (Työpäällikkö)
- `tuija` (Tuotantojohtaja)
- `admin` (Org Admin)

PIN (dev): `1234`

### Käyttäjäpolut (testattavat)

1. **SETUP → TRACK -polku**
   - Kirjaudu `paavo`.
   - Valitse projekti → avaa työvaihe.
   - Lisää jäsenlitteroita.
   - Lukitse baseline (tavoitearvio-erä).
2. **Viikkopäivitys + KPI**
   - Kirjaudu `anna`.
   - Avaa TRACK-tilassa oleva työvaihe.
   - Lisää viikkopäivitys (valmiusaste + memo).
   - Varmista KPI:t (BAC, EV, AC, AC*, CPI) näkyvät.
3. **Ghost-kulut**
   - Kirjaudu `anna`.
   - Lisää ghost-kulu TRACK-tilassa.
   - Varmista AC* päivittyy raporteissa.
4. **Korjausehdotus**
   - Kirjaudu `anna`.
   - Ehdota korjaus (item_code).
   - Kirjaudu `paavo` → hyväksy (PM).
   - Kirjaudu `tuija` → hyväksy lopullisesti.
5. **Korjausjonon hylkäys**
   - Kirjaudu `paavo` tai `tuija`.
   - Hylkää korjaus jonosta.

### Projektiraportit (UI)

- **Projektikoonti** (BAC/EV/AC/AC*/CPI)
- **Pääryhmätaso** (budget/actual/variance)
- **Viikkotrendi (EV)**
- **Kuukausiraportti (työvaihe)**
- **Top-poikkeamat** (overrun + lowest CPI)
- **Selvitettävät (top)** + overlap-varoitukset

### Raportti-endpointit (Phase 18)

- `/api/projects/:projectId/reports/main-group-current`
- `/api/projects/:projectId/reports/weekly-ev`
- `/api/projects/:projectId/reports/monthly-target-raw`
- `/api/projects/:projectId/reports/monthly-work-phase`
- `/api/projects/:projectId/reports/top-overruns`
- `/api/projects/:projectId/reports/lowest-cpi`
- `/api/projects/:projectId/reports/top-selvitettavat`
- `/api/projects/:projectId/reports/overlap`

### Health checkit

- `GET /api/health`

### Organisaation vaihto

- UI:n organisaatiovalinta kutsuu `POST /api/session/switch-org` ja päivittää tokenin.
- `GET /api/projects` käyttää tokenin `organization_id`:tä. Debug-kysely orgId-paramilla on estetty ilman `ALLOW_CROSS_ORG_QUERY=true`.

---

## MVP-prototyyppi: mitä muuttui

### Mitä muuttui
- Lisättiin Node/Express-API (auth, työvaiheet, raportit, korjauspolku, terminologia).
- Lisättiin yksiruutuinen UI (SETUP/TRACK) sanastopohjaisilla teksteillä.
- Lisättiin Docker Compose -palvelu `app`, automaattinen migraatio + seed.
- Lisättiin MVP seed-data (organisaatio, käyttäjät, projekti, työvaiheet, baseline).
- Lisättiin testiskenaariot `data/samples/`-kansioon.
- Lisättiin projektiraportit (Phase 18) UI:hin ja API:in.
- Lisättiin portti 3000 -troubleshooting- ja verifikaatio-ohjeet.

### Miksi
- Tarvitaan paikallisesti ajettava MVP-prototyyppi, jolla voidaan testata käyttäjäpolkuja ja liiketoimintasääntöjä DB:n näkymien ja funktioiden päällä.
- Varmistetaan, että portti 3000 voidaan ottaa käyttöön ja tarkistaa nopeasti.

### Miten testataan (manuaali)
- `docker compose up`
- Avaa http://localhost:3000
- Suorita yllä kuvatut käyttäjäpolut (SETUP → TRACK, viikkopäivitys, ghost, korjausjono)
- Vaihda “Projekti”-tabiin ja varmista että raporttitaulukot latautuvat

## Seuraavat askeleet (tämän reposi-pohjan jälkeen)

1. Tee **VBA-export** automaattiseksi (makro, joka dumppaa moduulit aina `vba/`-kansioon)
2. Kirjoita `spec/data-model/` alle tietomalli (taulut + kentät + avaimet)
3. Kirjoita `spec/workflows/` alle MVP-työnkulut (suunnittelu → ennustus → raportointi)
4. Aloita “pienin toimiva sovellus”: *litteralista → suunnitelma → ennustetapahtuma → loki*

Päivitetty: 2025-12-16

---

## Smoke test (dev data reset + imports)

Tämä tekee yhdellä ajolla:
- pysäyttää Docker-kontit ja poistaa DB-volyymin (DB tyhjenee)
- käynnistää Postgres 16 + pgAdmin
- ajaa migraatiot 0001–0003
- luo uuden projektin
- seedää litterat budget.csv:stä
- importtaa budjetin (budget_lines)
- kopioi budjetin OccurredOn-kuukaudelle (append-only) jotta raportti osuu kuukauteen
- importtaa JYDA toteumat CSV:stä (**sis. hyväksymätt.**)
- importtaa ennusteen CSV:stä (**Ennustettu kustannus**)
- luo raporttinäkymän: `v_monthly_cost_report_by_cost_type`

### Aja

Repo-juuressa PowerShellissa:

```powershell
powershell -ExecutionPolicy Bypass -File .\smoke.ps1
```

### Ympäristömuuttujat (DB)

Määritä `.env`-tiedostoon kaksi erillistä URL:ia ja käytä oikeaa ympäristön mukaan:

- `DATABASE_URL_HOST = postgresql://codex:codex@127.0.0.1:5433/codex`
  - Käytä Windows/PowerShell-skripteissä (esim. `smoke.ps1`), koska portti 5433 on hostilta.
- `DATABASE_URL_DOCKER = postgresql://codex:codex@db:5432/codex`
  - Käytä konttiverkon sisällä (docker network), kun palvelu puhuu `db`-palvelulle.

### Muutosmuisti

- Mitä muuttui: lisättiin Windows-yhteensopiva leak check -ohje, joka etsii mahdolliset salasanavuodot lokeista.
- Miksi: DSN-redaktointi on kriittinen, ja nopea tarkistus varmistaa ettei salasanoja näy logeissa.
- Miten testataan (manuaali): aja `smoke.ps1`, tallenna loki ja suorita leak check -komento alla.

### Leak check: salasanojen varmistus (valinnainen)

Varmista, ettei lokeissa näy selkokielistä salasanaa (esim. `:<salasana>@` tai `password=`):

```powershell
rg -n ":[^@\\s]+@|password=" .\smoke.log
```

Jos tuloksia ei tule, redaktointi on kunnossa. Päinvastoin, korjaa tulostus käyttämään `redact_database_url()`-apua.

## Mitä muuttui
- Laajennettu MVP-sovellus: mapping-versiot/rivit/aktivointi, perusraportti ja esimerkkidatan automaatio.
- Lisätty RBAC-minimi: Bearer-token + järjestelmärooli + projektikohtaiset roolit.
- Rajattu kirjoitus- ja luku-API:t roolien mukaan sekä UI:n näkyvyys.
- Lisätty Pikatoiminnot-osio nopeaan navigointiin ja roolivalintoihin.
- Päivitetty demo-ohje ja UI-polut vastaamaan MVP-ydintä.
- Lisätty `data/samples/`-skenaariot MVP-testattavuutta varten.

## Miksi
- MVP-ydin pitää saada näkyviin sovelluksena (suunnitelma + mapping + ennuste + raportti).
- Esimerkkidatan napilla saadaan UI-polku toistettavasti yhdellä klikkauksella.
- Roolien ohjaus parantaa käytettävyyttä ja estää väärät toiminnot kevyesti.
- Token-pohjainen tarkistus valmistaa API:n myöhemmälle autentikaatiolle.
- Pikatoiminnot nopeuttavat MVP-polun läpivientiä.

## Miten testataan (manuaali)
- Aja `docker compose up -d` ja varmista, että `http://localhost:3000` avautuu.
- Luo projekti → littera → suunnitelma → ennuste ja tarkista, että historia listautuu.
- Luo mapping-versio → lisää mapping-rivi → aktivoi mapping ja tarkista, että raportti päivittyy.
- Klikkaa “Täytä esimerkkidata” ja varmista, että uusi projekti ilmestyy ja raportti näyttää ennusteen.
- Vaihda järjestelmärooliin `admin` ja projektin rooliin `owner`, ja varmista että kaikki lomakkeet toimivat.
- Vaihda projektin rooliin `viewer` ja varmista, että muokkauslomakkeet ovat poissa käytöstä.
- Vaihda välilehtiä ja varmista, että URL päivittyy (esim. `/report`).
- Paina Alt+1..Alt+6 ja varmista, että välilehdet vaihtuvat.
- Yritä avata `/report` ilman projektia ja varmista, että ohjaus pyytää valitsemaan projektin.
- Klikkaa “Roolit: admin + owner” ja varmista, että roolivalinnat päivittyvät.
- Klikkaa “Luo projekti (avaa lomake)” ja varmista, että Setupin projektilomake fokusoituu.


Docs
⦁	Docs index: docs/README.md
⦁	API docs: docs/api/README.md
⦁	Master workflow: docs/workflows/master.md
⦁	Nappipolut: docs/workflows/nappipolut.md
⦁	Tilakoneet: docs/workflows/state-machines.md
⦁	Toimittajan polku (SDLC): docs/workflows/supplier-sdlc.md
⦁	Traceability: docs/traceability.md
⦁	Business rules: docs/workflows/business-rules.md
⦁	RBAC-matriisi: docs/workflows/rbac-matrix.md
⦁	Sanasto: docs/workflows/glossary.md
⦁	GDPR & compliance: docs/compliance/gdpr.md
⦁	Päätösloki: docs/decisions/decision-log.md
⦁	Open questions: docs/decisions/open-questions.md
⦁	Incident runbook: docs/runbooks/incident.md
⦁	Data-fix runbook: docs/runbooks/data-fix.md
⦁	Release runbook: docs/runbooks/release.md
