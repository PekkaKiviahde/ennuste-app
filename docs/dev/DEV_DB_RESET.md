# DEV_DB_RESET

## Mitä muuttui
- Lisättiin ohje dev-DB:n nollaamiseen ja baseline-migraation ajamiseen.

## Miksi
- Yksi selkeä tapa nollata kehitystietokanta ja ajaa uusi baseline nopeasti.

## Miten testataan (manuaali)
1) Aja alla oleva reset + baseline -komento omassa dev-ympäristössä.
2) Varmista, että taulut syntyvät eikä SQL virheitä tule.

---

## Dev-DB reset (nopein tapa)

> **Varoitus:** tämä poistaa kaiken datan kyseisestä tietokannasta.

1) Varmista, että `DATABASE_URL` on asetettu (esim. `postgresql://codex:codex@127.0.0.1:5433/codex`).
2) Nollaa skeema ja aja baseline:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/0001_baseline.sql
```

Jos käytät docker-composea, varmista että DB-kontti on käynnissä ennen komentoja.
