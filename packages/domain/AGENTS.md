# AGENTS.md (packages/domain)

Tämä tiedosto täydentää repo-juuren AGENTS.md:ää domain-kerrokselle.

## Fokus
- Puhdas domain: käsitteet, invariantit, validoinnit, arvotyypit.
- Ei I/O: ei tietokantaa, ei HTTP:tä, ei Next.js:ää.

## Invariantit (muistilista)
- Append-only loki: ei historian “korjaamista poistamalla”.
- Suunnitelma ennen ennustetta: ennustetapahtuma ei synny ilman suunnitelmaa oikeassa tilassa.
- Mapping erottaa työlitterat ja tavoitearvio-litterat.

## Käytännöt
- Pidä domain-riippuvuudet minimissä (mieluiten nolla).
- Tee pienet, selkeät funktiot: yhden säännön validointi kerrallaan.
- Nimeä asiat domain-termeillä (suomeksi).

## Testit (tälle paketille)
- Aja: `npm --workspace packages/domain run test`
- Kirjoita testit `src/**/*.test.ts` ja käytä “given/when/then” -tyyliä.

## Kun muutos koskee speksiä
- Jos domain-sääntö muuttuu, päivitä `spec/` ja tarvittaessa ADR.
