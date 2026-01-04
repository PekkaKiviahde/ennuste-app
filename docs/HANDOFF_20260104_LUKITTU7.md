# HANDOFF 2026-01-04 (LUKITTU #7)

## Mista jatkaa
- LUKITTU #7 aloitettu, mutta ei maariteltya fokusta.
- Viimeisin tyokokonaisuus: tavoitearvio-nakyman UI-viimeistelyt (suodatus, mapping-versiot, tiivis taulukko, rivilaskurit).

## Mitka muutokset tehtiin
- Mapping-versiot listattu tavoitearvio-sivulla.
- Tavoitearvio-suodatus (q-parametri) lisatty.
- Mapping-versioille oma suodatus (mv-parametri) lisatty.
- Taulukot tiivistetty (table-compact) ja rivilaskurit lisatty.
- /api/report/planning fallback v_planning_current -nakymaan lisatty (SQLSTATE 42P01).
- Endpointeja ja UI-kavelyja verifioitu kayttajan toimesta.

## Avoimet asiat
- LUKITTU #7 fokus paattamatta (UI-parannukset vs raportoinnin lisaselitteet).
- Mahdolliset lisasuodattimet tai UI-viimeistelyt (esim. yhdistetty suodatus, sivutus).

## Testit
- npm run lint (ok)
- npm run typecheck (ok)
- npm run test (ok)
- Manuaalitestit: /login, /tyonohjaus, /suunnittelu, /ennuste, /loki, /raportti, /tavoitearvio.

## Avainpolut
- apps/web/src/app/(app)/tavoitearvio/page.tsx
- apps/web/src/app/(app)/suunnittelu/page.tsx
- apps/web/src/app/(app)/ennuste/page.tsx
- apps/web/src/app/(app)/tyonohjaus/page.tsx
- apps/web/src/app/(app)/loki/page.tsx
- apps/web/src/app/(app)/raportti/page.tsx
- packages/infrastructure/src/report.ts
- apps/web/src/app/globals.css
- docs/CODEX_HISTORY.md

## Selvitys: miten kayttaja ohjasi promptia
- Vaati portti-muodon (1/2/0) paatoksiin ja tulkinnan muusta vastauksesta 0:ksi.
- Vaati aina suomen kielen ja EN-termi (FI-kaannos) -esitystavan, seka Sanasto-loppuosion.
- Vaati aina taydet URL-osoitteet ohjeissa ("anna myos sanalliset ohjeet tayisine osoitteineen").
- Maarasi automaattisen commitoinnin ilman allekirjoitusta ja automaattisen pushin jokaisen commitin jalkeen.
- Maarasi katkosjatkon kaytannon (SESSION_START/PROGRESS, .codex/state.json) ja append-only historian.
- Vaati db:status-ajon ennen migraatioita ja migraatioiden ajamatta, jos pending=0.
- Vaati UI-kavelyn "Miten testaat" -kohdassa ja komennot erikseen.

## Seuraava ehdotus
- LUKITTU #7: UI-parannukset (esim. suodattimien yhdistaminen, sivutus) tai raportoinnin lisaselitteet.
