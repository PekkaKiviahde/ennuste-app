# Postgres-tietokanta (MVP)

Päivitetty: 2025-12-16

## Mitä tämä tekee?

Tämä paketti tekee Postgres-skeeman, joka tukee:

- **append-only loki** (ennusteet ja suunnitelmat tapahtumina)
- **mapping** työlittera → tavoitearvio-littera (versionoitu, ajallinen, audit)
- **budjetti** (tavoite) ja **toteuma** (import) tauluissa
- näkymät (views) “nykytila”-raportointiin

## Tiedostot

- `migrations/0001_init.sql` – taulut, tyypit, triggerit (append-only, plan-before-forecast, draft-only mapping edit)
- `migrations/0002_views.sql` – näkymät ja helper-funktiot (mapping, current forecast, coverage, raportointi)

## Käyttö (paikallinen Postgres)

1) Luo tyhjä tietokanta
2) Aja järjestyksessä:
   - 0001_init.sql
   - 0002_views.sql

## 3 tärkeää sääntöä

1) **Suunnitelma ennen ennustetta**
   - DB estää forecast_eventin insertin jos viimeisin planning_event ei ole READY_FOR_FORECAST tai LOCKED.

2) **Mapping-rivejä saa muokata vain DRAFT-versiossa**
   - ACTIVE/RETIRED mapping on käytännössä immutable.

3) **Append-only**
   - Toteumat, ennusteet ja suunnitelmat ovat tapahtumia (UPDATE/DELETE estetään).

## Missä Excel näkyy tässä?

- Excelin “MuistioArkisto” ≈ `forecast_events` + `forecast_event_lines` (+ row memos/panel snapshot)
- Excelin “Jyda-ajo” ≈ import -> `actual_cost_lines`
- Excelin “Tavo_Ennuste” tavoitepuoli ≈ `budget_lines`
- Excelissä puuttuva osa (mutta teillä tarpeena) = `mapping_versions` + `mapping_lines` + coverage


## Mitä muuttui
- Lisätty muutososiot dokumentin loppuun.

## Miksi
- Dokumentaatiokäytäntö: muutokset kirjataan näkyvästi.

## Miten testataan (manuaali)
- Avaa dokumentti ja varmista, että osiot ovat mukana.
