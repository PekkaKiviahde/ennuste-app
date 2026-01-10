# AGENTS.md (packages/application)

Tämä tiedosto täydentää repo-juuren AGENTS.md:ää application-kerrokselle.

## Fokus
- Usecaset / sovelluslogiikka: “mitä tapahtuu kun käyttäjä tekee X”.
- Orkestroi domain + portit (rajapinnat) infraan.
- Täällä määritellään riippuvuudet *rajapintoina* (esim. repository- ja service-portit).

## Kiellettyä / vältä
- Ei suoraa SQL:ää tai `pg`-käyttöä applicationissa.
- Ei Next/React-koodia.

## Käytännöt
- Yksi usecase = yksi selkeä sisääntulo + ulostulo.
- Validointi:
  1) domain-säännöt (domain)
  2) sovelluksen työnkulku (application)
- Palauta virheet selkeinä koodeina/tyyppeinä, joita UI voi käsitellä.

## Testit (tälle paketille)
- Aja: `npm --workspace packages/application run test`

## Muutospolitiikka
- Pidä API-muutokset varovaisina: mieluummin lisää uusi kenttä kuin riko vanha.
