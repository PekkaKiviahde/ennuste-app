# Web-reittien testiohjelma (login-ohjaus)

Tama ohje sisaltaa testiohjelman ajon ja listan kokonaisten sivu-URLien
varmistusta varten.

## Testiohjelma

Testiohjelma tarkistaa kolme asiaa:

1) `/login` palauttaa 200.
2) `/` ohjaa `/ylataso`-polkuun.
3) `/ylataso` ohjaa `/login`-polkuun, jos sessio puuttuu.

### Ajo

```
BASE_URL=https://refactored-train-x5xggp94wrxx2v7q9-3000.app.github.dev \
node tools/scripts/check-web-routes.mjs
```

## Kokonaiset sivu-URLit

- https://refactored-train-x5xggp94wrxx2v7q9-3000.app.github.dev/login
- https://refactored-train-x5xggp94wrxx2v7q9-3000.app.github.dev/ylataso
- https://refactored-train-x5xggp94wrxx2v7q9-3000.app.github.dev/suunnittelu
- https://refactored-train-x5xggp94wrxx2v7q9-3000.app.github.dev/ennuste
- https://refactored-train-x5xggp94wrxx2v7q9-3000.app.github.dev/raportti
- https://refactored-train-x5xggp94wrxx2v7q9-3000.app.github.dev/loki

## Mita muuttui

Lisatty testiohjelma ja ohjeet login-ohjauksen varmistamiseen.

## Miksi

Tarvitaan nopea tapa varmistaa, etta kirjautumista vaativat reitit
ohjaavat oikein login-sivulle.

## Miten testataan (manuaali)

- Aja testiohjelma ylla olevalla komennolla.
- Avaa `/ylataso` ilman sessiota ja varmista, etta se ohjaa `/login`-sivulle.
