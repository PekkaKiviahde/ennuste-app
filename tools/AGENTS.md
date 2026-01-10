# AGENTS.md (tools)

Tämä tiedosto täydentää repo-juuren AGENTS.md:ää työkaluskripteille.

## Fokus
- Dev- ja DB-automaatio: skriptit, joita rootin npm-skriptit kutsuvat.
- Tavoite: deterministiset, idempotentit, selkeästi epäonnistuvat skriptit.

## Käytännöt
- Fail fast:
  - jos env puuttuu, tulosta selkeä virhe ja ohje “mitä asettaa”.
- Idempotenssi:
  - `db:status` ei muuta tilaa
  - `db:migrate` ei tee tuplamigraatioita
  - `db:seed-demo` kertoo selkeästi jos ajetaan uudelleen (ja mitä tapahtuu)
- Älä tee interaktiivisia prompt-kyselyitä ilman syytä (CI/dev-automaatio).

## Kun muutat skriptejä
- Päivitä tarvittaessa `docs/`-ohjeistus (runbook / docs/README linkitys).
- Pidä muutokset pieninä ja testaa vähintään:
  - `npm run db:status` TAI `npm run db:migrate` (sen mukaan mihin koskit)
