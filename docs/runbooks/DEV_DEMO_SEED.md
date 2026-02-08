# DEV_DEMO_SEED (kanoninen demo + smoke)

Tavoite: kehittäjä todentaa yhdellä komennolla, että kanoninen demo sisältää vähintään:
- demo-projekti (`is_demo`)
- Talo80-litterat (4-numeroiset)
- työpaketti + hankintapaketti
- baseline-snapshot (työpaketin latest baseline + baseline_lines)
- MT ja LT (APPROVED) raporttinäkymässä
- ACTUALS latest batch + vähintään 1 unmapped sekä vähintään 1 mapped koonti

## Esivaatimukset

- `npm install` ajettuna reporootissa
- Docker (Postgres)
- `psql` (PostgreSQL client)
- `DATABASE_URL` asetettuna samaan terminaaliin

## 1) Käynnistä Postgres (Docker)

```bash
docker ps --format '{{.Names}}\t{{.Ports}}' | grep -E '^codex_pg' || \
docker run -d --name codex_pg \
  -e POSTGRES_USER=codex \
  -e POSTGRES_PASSWORD=codex \
  -e POSTGRES_DB=codex \
  -p 5433:5432 \
  postgres:15
```

## 2) Exporttaa DATABASE_URL tähän terminaaliin

```bash
export DATABASE_URL="postgres://codex:codex@127.0.0.1:5433/codex"
psql "$DATABASE_URL" -c "select 'db ok' as ok;"
```

## 3) Aja migraatiot (psql)

```bash
for f in $(ls migrations/*.sql | sort); do
  echo "Running $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

Jos migraatio pysahtyy virheeseen:
- `Migraatio 0055 estetty: samaan tyopakettiin on linkitetty useita hankintapaketteja ...`

kayta puhdasta dev-tietokantaa:

```bash
docker exec -i codex_saas_db psql -U codex -d postgres -c "CREATE DATABASE codex_demo_quicklogin;"
export DATABASE_URL="postgres://codex:codex@127.0.0.1:5433/codex_demo_quicklogin"
for f in $(ls migrations/*.sql | sort); do
  echo "Running $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

Huom:
- Jos `CREATE DATABASE` palauttaa "already exists", jatka seuraavaan komentoon.

## 4) Aja seed: kanoninen demo

Voit asettaa PINin etukäteen:
```bash
export DEV_SEED_PIN="4321"
```

```bash
npm run db:seed-demo
```

Jos `DEV_SEED_PIN` puuttuu, seed tulostaa konsoliin:
- `DEMO PIN: <pin>`

## 5) Aja canonical smoke (SQL, read-only)

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/sql/SMOKE_DEMO_CANONICAL.sql
```

## Troubleshooting

- `No demo project found` -> seed puuttuu -> aja `npm run db:seed-demo`
- `MT/LT missing` -> demo-seed ei vielä luo/approve MT/LT -> korjataan seuraavassa vaiheessa
- `No ACTUALS` -> demo-seed ei vielä luo ACTUALS/actuals_lines -> korjataan seuraavassa vaiheessa
- `No unmapped/mapped` -> demo-seed ei vielä luo unmapped/mapped -koonteja tai raporttinäkymiä -> korjataan seuraavassa vaiheessa
