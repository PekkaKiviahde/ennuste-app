# Windows-local dev DB (Docker + Postgres)

## Perusasetukset

- Docker julkaisee Postgresin host-porttiin **5433** (containerin portti pysyy 5432).
- Käytä Windows-hostilla osoitetta **127.0.0.1:5433** (ei localhost).
- Oletus-URL:
  - `postgresql://codex:codex@127.0.0.1:5433/codex`

## .env-esimerkki

```env
DATABASE_URL=postgresql://codex:codex@127.0.0.1:5433/codex
```

## Mitä muuttui

- Windows-ohje käyttää host-porttia 5433 ja osoitetta 127.0.0.1.

## Miksi

- Vältetään Windows/Docker-ympäristön porttikonfliktit ja standardoidaan yhteysosoite.

## Miten testataan (manuaali)

1. Aja `docker compose up -d` ja varmista, että portti 5433 on käytössä.
2. Aja `./smoke.ps1` ilman .env-tiedostoa ja varmista, että DB-yhteys muodostuu.
