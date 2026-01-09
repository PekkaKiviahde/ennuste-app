# PR-kuvaus: Tavoitearvion mappays (MVP)

Mita muuttui
- Lisatty item-tason mappausnakyma tyopaketeille ja hankintapaketeille.
- Lisatty hankintapaketit ja item-mappauksen taulut seka API-endpointit.
- Seed laajennettu: sample-rivit, tyopaketit, hankintapaketti ja valmiit mappaukset.

Miksi
- Tuotannon mappaus tehdään item-tasolla ennen ennustusta.
- Hankintapaketin 1:1-linkitys tarvitaan MVP-prosessiin.

Miten testataan (manuaali)
- Aja migraatiot ja seed: `docker compose run --rm app sh -c "cd api && npm run db:setup && npm run db:seed"`.
- Kaynnista app: `APP_PORT=3001 docker compose up -d app`.
- Avaa `http://localhost:3001/tavoitearvio/mappaus` ja varmista:
  - LEAF-rivit ovat oletuksena listalla.
  - Pystyelementit/Sahkotyot/Valuosat ovat valinnoissa.
  - Hankintapaketti (Sahkourakka) on valmiiksi mapattuna sahkoriville.
  - Status-sarake paivittyy, bulk-assign toimii.
