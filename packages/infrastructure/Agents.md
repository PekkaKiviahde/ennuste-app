# AGENTS.md (packages/infrastructure)

Tämä tiedosto täydentää repo-juuren AGENTS.md:ää infrastruktuuri-kerrokselle.

## Fokus
- DB/integraatiot: repository-toteutukset, transaktiot, migraatiot, yhteydet.
- Toteuttaa application-portit (ei business-sääntöjä tänne).

## Korkean riskin alue
- Kaikki DB-muutokset ja migraatiot ovat riskialue:
  - pidä muutokset pieninä
  - varmista, ettei append-only rikoidu
  - vältä destruktiivisia migraatioita (DROP/DELETE ilman todella hyvää syytä)


## Testit (tälle paketille)
- Aja: `npm --workspace packages/infrastructure run test`
- Huom:
  - testit tarkistavat ympäristön ennen ajoa (env-check).
  - integraatiotestit vaativat DB-yhteyden ja ympäristömuuttujat (esim. `DATABASE_URL`, `SESSION_SECRET`).

## DB-työkalut (root-skriptit joita tämä hyödyntää)
- `npm run db:status`
- `npm run db:migrate`
- `npm run db:seed-demo`

## Käytännöt
- SQL ja skeema: mieluummin lisää uusi sarake/taulu kuin muokkaa historiaa rikkovasti.
- Lokit ja eventit: “append-only” myös teknisesti (INSERT painotteinen malli).
- Virheilmoitukset: selkeä, toimintaohje mukana (mitä puuttuu / miten korjata).
