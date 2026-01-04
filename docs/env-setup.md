# Ympäristömuuttujat ja integraatiotestit (ohje)

Tämä ohje kertoo pakolliset ympäristömuuttujat ja minimiasetukset, jotta
sovellus sekä integraatiotestit toimivat johdonmukaisesti.

## Pakolliset muuttujat

- `DATABASE_URL`  
  Käyttö: tietokantayhteys (API + integraatiotestit).
- `SESSION_SECRET`  
  Käyttö: session allekirjoitus (Next-UI + integraatiotestit).

## Suositellut muuttujat (dev/demo)

- `APP_PORT` / `PORT`  
  Käyttö: palvelun kuunteluportti. Pidä yhdenmukaisena `.env` ja Dockerissa.
- `DEMO_MODE`  
  Käyttö: demo-tilan pikakirjautumiset.
- `NODE_ENV`  
  Käyttö: session cookie `secure`-lippu ja demo-turvarajoite.
- `PIN_SALT`  
  Käyttö: PIN-hashin suola API:ssa.
- `JWT_SECRET`  
  Käyttö: API-auth.

## Valinnaiset muuttujat

- `OPENAI_API_KEY`, `OPENAI_MODEL`  
  Käyttö: AI-kutsut (jos käytössä).
- `DATABASE_URL_DOCKER`, `DATABASE_URL_HOST`  
  Käyttö: vaihtoehtoiset DB-osoitteet API:lle.

## Minimiasetukset (esimerkit)

### Dev (paikallinen)

```
DATABASE_URL=postgresql://codex:codex@127.0.0.1:5433/codex
SESSION_SECRET=change-me-in-dev
APP_PORT=3000
DEMO_MODE=true
NODE_ENV=development
PIN_SALT=dev-salt
JWT_SECRET=change-me-in-dev
```

### CI (integraatiotestit)

```
DATABASE_URL=postgresql://user:pass@host:5432/db
SESSION_SECRET=ci-secret
NODE_ENV=test
```

## Integraatiotestien huomio

Integraatiotestit skippaavat, jos `DATABASE_URL` tai `SESSION_SECRET` puuttuu.
Tämä aiheuttaa DoD-tilan "osittaisen" tilanteen.

Env-check on lisätty testien alkuun: ajo failaa selkeästi, jos pakolliset
muuttujat puuttuvat.

## Docker huomio

`docker-compose.yml` asettaa `DATABASE_URL` app-kontille sisäverkon osoitteena
(`postgresql://codex:codex@db:5432/codex`). Tämä on ok Dockerissa, mutta älä
sekoita sitä paikallisen `.env`-tiedoston osoitteeseen.

## Mitä muuttui

Lisättiin ohjedokumentti ympäristömuuttujista ja integraatiotesteistä.

## Miksi

Integraatiotestit skippaavat ilman pakollisia env-arvoja, joten tarvitaan
yhteinen, selkeä ohje.

## Miten testataan (manuaali)

- Tarkista, että `.env` sisältää `DATABASE_URL` ja `SESSION_SECRET`.
- Aja integraatiotestit (`npm --workspace packages/infrastructure run test`) ja
  varmista, että testit eivät skippaa envien puuttumisen takia.
