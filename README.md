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

- `DATABASE_URL_HOST = postgresql://codex:codex@localhost:5433/codex`
  - Käytä Windows/PowerShell-skripteissä (esim. `smoke.ps1`), koska portti 5433 on hostilta.
- `DATABASE_URL_DOCKER = postgresql://codex:codex@db:5432/codex`
  - Käytä konttiverkon sisällä (docker network), kun palvelu puhuu `db`-palvelulle.

### Muutosmuisti

- Mitä muuttui: dokumentoitiin `DATABASE_URL_HOST` ja `DATABASE_URL_DOCKER` sekä niiden käyttötarkoitus.
- Miksi: Windowsin `smoke.ps1` tarvitsee host-portin (5433), mutta docker-verkossa käytetään `db:5432`.
- Miten testataan (manuaali): aja `smoke.ps1` PowerShellissa `.env`-tiedoston kanssa ja varmista, että `DATABASE_URL (redacted)` näkyy ilman salasanaa.
