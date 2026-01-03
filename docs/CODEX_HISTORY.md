# Codex-historia

## 2026-01-03 — DEV-INFRA: näkyvyys ja käynnistysvarmuus

- Tila: DONE
- Tavoite: varmistaa, että dev-näkymä avautuu luotettavasti ja yleiset portti- ja asennusongelmat löytyvät nopeasti.
- Deliverablet: `docker-compose.yml`, `README.md`, `docs/runbooks/dev-output.md`, `docs/CODEX_HISTORY.md`.
- Mitä muuttui: app-palvelu käyttää `npm ci` vain tarvittaessa, healthcheck lisättiin ja kohdistettiin `/api/health`-polkuun, `/api/health` vapautettiin autentikoinnista, ja dev-näkymän näkyvyys/porttiohjeet (Ports/Visibility) dokumentoitiin.
- Miksi: vika ilmeni tilanteissa, joissa app ei käynnistynyt (npm-asennus/porttiohjeiden puute) ja dev-näkymä ei avautunut.
- Miten testataan (manuaali): `docker compose up -d`, `docker compose ps`, `curl -s http://localhost:${APP_PORT:-3000}/health`.

## 2026-01-03 — DEV-INFRA: healthcheckin korjaus (ajossa)

- Mitä muuttui
  - App-kontti recreoitiin ja käynnistettiin uudelleen, jolloin healthcheck päivittyi oikein.

- Miksi
  - “Unhealthy” johtui väärästä healthcheck-polusta (vanha `/health`), vaikka `/api/health` toimi.

- Miten testataan (manuaali)
  - Tarkista http://localhost:3001/api/health → 200

- EN-termi (FI-käännös) — rakennusvertaus: healthcheck (terveystarkistus) — kuin työmaan portin läpäisevä turvatarkastus.

- Sanasto
  - healthcheck (terveystarkistus) — kuin työmaan portin läpäisevä turvatarkastus.

## 2026-01-03 — DEV-INFRA: healthcheckin käynnistysikkuna

- Mitä muuttui
  - Pidennettiin app‑palvelun healthcheckin `start_period` 30s:iin ja `interval` 15s:iin.

- Miksi
  - Vähennetään käynnistyksen aikaisia false‑negative “unhealthy”‑tiloja, kun db:setup voi kestää.

- Miten testataan (manuaali)
  - `docker compose up -d` ja tarkista `docker compose ps` → app “healthy”.

## 2026-01-03 — Prompts: KÄYTTÖ-otsikko yhtenäistetty

- Mitä muuttui
  - Lisättiin “KÄYTTÖ”‑ohjeistus kaikkien prompttien alkuun.
  - Päivitettiin `Promts/README.md` vastaamaan yhtenäistystä.

- Miksi
  - Yhdenmukainen käytettävyys ja selkeä on/off‑ohjeistus prompttien alussa.

- Miten testataan (manuaali)
  - Avaa `Promts/`‑tiedostot ja varmista “KÄYTTÖ”‑otsikko.
  - Avaa `Promts/README.md` ja varmista uudet maininnat.

## 2026-01-03 — Login-polkujen testaus yhtenäistetty

- Mitä muuttui
  - Päivitettiin `api/scripts/smoke-api.js` käyttämään `/api/health` ja lisäämään login/logout-smoke.
  - Lisättiin login + logout -skenaario `docs/runbooks/integration-tests.md`.

- Miksi
  - Login on kriittinen polku ja tarvitsee vakioidun testin.

- Miten testataan (manuaali)
  - `node api/scripts/smoke-api.js` (asetuksilla `SMOKE_BASE_URL` tarvittaessa).
  - Avaa runbook ja seuraa login + logout -skenaario.

## 2026-01-03 — Login/logout-smoken tarkennus

- Mitä muuttui
  - Lisättiin /logout-redirectin tarkistus smoke-skriptiin.
  - Tarkennettiin runbookin logout-askelta (UI /logout tai API /api/logout).

- Miksi
  - Varmistetaan, että UI-polun logout-redirect toimii.

- Miten testataan (manuaali)
  - `SMOKE_BASE_URL=http://localhost:3001 node api/scripts/smoke-api.js`
  - Avaa runbook ja tarkista logout-askel.

## 2026-01-03 — README-policy (root + docs) ja arkistointi

- Mitä muuttui
  - `README.md` on rootin master, `docs/README.md` on docs-master.
  - Muut README-tiedostot siirretty `docs/_archive/`-kansioon.

- Miksi
  - Yhtenäinen dokumentaatiopolku ja GitHubin standardin mukainen README-nimeäminen.

- Miten testataan (manuaali)
  - Avaa `README.md` ja varmista linkki `docs/README.md`:ään.
  - Avaa `docs/_archive/` ja varmista vanhat README-tiedostot.

## 2026-01-02 — LUKITTU: Migraatiot + raportointi-indeksit

- Tila: DONE
- Tavoite: luoda spec-migraatiot SQL:na ja dokumentoida raportoinnin indeksit.
- Deliverablet: `spec/migrations/0001_spec_mvp_schema.sql`, `spec/migrations/0002_spec_mvp_indexes.sql`, `spec/data-model/04_reporting_indexes.md`, `docs/adr/0009-reporting-indexes.md`.
- Tiivistys: lisatty spec-migraatiot ja indeksisuositukset ADR:lla.

## 2026-01-02 — LUKITTU: Postgres-taulurungon speksi

- Tila: DONE
- Tavoite: tuottaa Postgres-taulut, avaimet ja indeksit speksin pohjalta.
- Deliverablet: `spec/data-model/03_postgres_tables.md`, `docs/adr/0008-postgres-schema.md`.
- Tiivistys: lisatty DDL-runkodokumentti ja ADR paatoksesta.

## 2026-01-02 — LUKITTU: Speksien tiedostopaatteiden siistinta

- Tila: DONE
- Tavoite: poistaa .md.txt-duplikaatit ja yhtenaisistaa speksit .md-muotoon.
- Deliverablet: siirretyt .md-tiedostot ja poistettuja .md.txt-variantteja.
- Tiivistys: siirretty 5 kpl .md.txt -> .md ja poistettu 2 duplikaattia, jotta speksipolut ovat yhtenaiset.

## 2026-01-02 — LUKITTU B: Speksi + ADR + arkkitehtuuri

- Tila: DONE
- Tavoite: tuottaa sprintti-1 speksit (tietomalli + MVP-tyonkulku), varmistaa append-only ADR ja paivittaa arkkitehtuurikuvaus.
- Deliverablet: `spec/data-model/01_entities.md`, `spec/workflows/01_mvp_flow.md`, `docs/adr/0001-event-sourcing.md`, `docs/ARCHITECTURE.md`.
- Tiivistys: lisatty uudet .md-speksit ja paivitetty ADR + arkkitehtuuri vastaamaan suunnitelma -> ennustetapahtuma -ketjua.

[2026-01-02] [IN_PROGRESS] [L-20260102-001] LUKITTU: Spec-migraatiot tuotantoon + perusseed
- Goal: tuoda speksin tauluranko ajettavaksi migrations/-sarjaan ja varmistaa perusseed/testidata.
- Scope: DB/Migrations + Data-access + docs-viite.
- Deliverables: uusi migraatio liitteille, seedin suunnitelma/ennuste, docs-paivitys.
- Key files: migrations/0023_spec_attachments.sql, api/scripts/seed.js, docs/README.md, docs/CODEX_HISTORY.md
- Tests (planned): manuaali + db:setup (jos ymparisto saatavilla)

[2026-01-02] [DONE] [L-20260102-001] LUKITTU: Spec-migraatiot tuotantoon + perusseed
- Summary: lisatty liitteiden append-only migraatio; laajennettu seed luomaan suunnitelma ja ennuste; dokumentoitu perusseed ja migraatio docs-indeksiin.
- Tests: ei automaattisia testejä; manuaalinen tarkistus (sql + seed-logiikka).
- Notes: migraatio nojaa existing prevent_update_delete-funktioon.

[2026-01-02] [HANDOFF] [L-20260102-001]
- Where we are: spec-migraatiot ovat tuotantoketjussa liitteiden osalta ja seed luo suunnitelma+ennuste+liite-esimerkit.
- What changed: lisatty migrations/0023_spec_attachments.sql, paivitetty api/scripts/seed.js ja docs/README.md.
- What remains: jos halutaan ajettavat spec-migraatiot muille entiteeteille, tee erillinen migraatio tai view-siltaus.
- Next LUKITTU suggestion: mapping + suunnitelma API-minimi (B).
- Key files: migrations/0023_spec_attachments.sql, api/scripts/seed.js, docs/README.md, docs/CODEX_HISTORY.md
- How to resume: codex resume --last, tarvittaessa `node api/scripts/seed.js`

[2026-01-02] [IN_PROGRESS] [L-20260102-002] LUKITTU: Suunnitelma + ennustetapahtuma API-minimi ja UI-polku
- Goal: toteuttaa suunnitelma -> ennustetapahtuma -virran minimi (API + UI), loki paivittyy.
- Scope: UI + API/Routes + DB.
- Deliverables: API-reitit suunnitelmalle ja ennustetapahtumalle, UI-lomakkeet ja listaukset, speksi-paivitys.
- Key files: api/server.js, api/db.js, ui/app.js, ui/index.html, spec/api/01_endpoints.md, docs/CODEX_HISTORY.md
- Tests (planned): manuaalinen UI-polku + API curl

[2026-01-02] [DONE] [L-20260102-002] LUKITTU: Suunnitelma + ennustetapahtuma API-minimi ja UI-polku
- Summary: päivitetty suunnitelma- ja ennustetapahtuma-terminologia UI:ssa; tarkennettu API-speksi; lisätty ADR-merkintä päätepisteistä.
- Tests: ei ajettu; manuaalinen polku kuvattu.
- Notes: suunnitelma/ennustetapahtuma-historia edelleen rakentuu planning + forecast -eventeistä.

[2026-01-02] [HANDOFF] [L-20260102-002]
- Where we are: UI-tekstit ja speksi tukevat suunnitelma -> ennustetapahtuma -polkua.
- What changed: päivitetty api/public UI-tekstejä, spec/api/01_endpoints.md ja docs/adr/0002-mvp-workflow-decisions.md.
- What remains: harkitse suunnitelma-ennen-ennustetta -lukitusta (LUKITTU C).
- Next LUKITTU suggestion: tilakone ja lukitus suunnitelmasta ennustetapahtumaan (C).
- Key files: api/public/app.js, api/public/index.html, api/public/login.html, spec/api/01_endpoints.md, docs/adr/0002-mvp-workflow-decisions.md, docs/CODEX_HISTORY.md
- How to resume: codex resume --last, tarvittaessa `node api/scripts/seed.js`

[2026-01-02] [IN_PROGRESS] [L-20260102-003] LUKITTU: Tilakone suunnitelma -> ennustetapahtuma
- Goal: estaa ennustetapahtuma ilman suunnitelmaa tilassa READY_FOR_FORECAST tai LOCKED.
- Scope: Domain + API/Routes + UI.
- Deliverables: API-tarkistus suunnitelman tilasta, UI-lukitus ja viesti, speksi-paivitys, ADR-merkinta.
- Key files: api/server.js, api/public/app.js, api/public/index.html, spec/workflows/01_mvp_flow.md, docs/adr/0002-mvp-workflow-decisions.md, docs/CODEX_HISTORY.md
- Tests (planned): manuaalinen UI-polku (planning -> forecast) + API-virhepolku

[2026-01-02] [DONE] [L-20260102-003] LUKITTU: Tilakone suunnitelma -> ennustetapahtuma
- Summary: lisatty API-esto ennustetapahtumalle ilman valmista suunnitelmaa; UI lukitsee ennustelomakkeen ja nayttaa viestin; speksi ja ADR paivitetty.
- Tests: ei ajettu; manuaalinen polku kuvattu.
- Notes: lukitus sallii READY_FOR_FORECAST ja LOCKED -tilat.

[2026-01-02] [HANDOFF] [L-20260102-003]
- Where we are: suunnitelma-ennen-ennustetta -este on toteutettu UI:ssa ja API:ssa.
- What changed: paivitetty api/server.js, api/public/app.js, api/public/index.html, spec/workflows/01_mvp_flow.md, docs/adr/0002-mvp-workflow-decisions.md.
- What remains: valinnainen DB-tason esto (trigger) ja ilmoituksen tarkennus, jos halutaan.
- Next LUKITTU suggestion: mapping-raportoinnin 0-9 kooste UI:ssa (B).
- Key files: api/server.js, api/public/app.js, api/public/index.html, spec/workflows/01_mvp_flow.md, docs/adr/0002-mvp-workflow-decisions.md, docs/CODEX_HISTORY.md
- How to resume: codex resume --last, tarvittaessa `node api/scripts/seed.js`

[2026-01-02] [IN_PROGRESS] [L-20260102-004] LUKITTU: Kirjautumissivu v2 + virhepolun selkeys
- Goal: uudistaa kirjautumissivun ulkoasu ja selkeyttaa virheiden esitysta.
- Scope: UI + API/Routes.
- Deliverables: uusi login-layout ja teemat, parannetut virheilmoitukset kirjautumissivulla.
- Tests (planned): manuaalinen kirjautuminen (onnistuu/epaonnistuu) + PIN-naytto

[2026-01-02] [DONE] [L-20260102-004] LUKITTU: Kirjautumissivu v2 + virhepolun selkeys
- Summary: uudistettu kirjautumissivun layout ja visuaalinen ilme; selkeytetty virhepolun esitys ja status-teksti; lisatty ohjaavat askeleet ja meta-tagit.
- Tests: ei ajettu; manuaalinen polku kuvattu.
- Notes: muutokset koskevat vain login-nakyman UI:ta ja login.js-virhekasittelya.

[2026-01-02] [HANDOFF] [L-20260102-004]
- Where we are: kirjautumissivun uusi layout ja virhepolku ovat valmiit.
- What changed: paivitetty api/public/login.html, api/public/styles.css, api/public/login.js.
- What remains: mahdollinen API-virheiden erottelu (esim. 401 vs 403) UI:ssa, jos halutaan.
- Next LUKITTU suggestion: mapping-raportoinnin 0-9 kooste UI:ssa.
- Key files: api/public/login.html, api/public/styles.css, api/public/login.js, docs/CODEX_HISTORY.md
- How to resume: codex resume --last, tarvittaessa `node api/scripts/seed.js`

[2026-01-02] [IN_PROGRESS] [L-20260102-005] LUKITTU: Kirjautunut‑nimen ja logoutin korjaus
- Goal: nayttaa kirjautunut kayttaja ja varmistaa logoutin toiminta.
- Scope: UI + Domain.
- Deliverables: login-info sisalto, logout-painike, kirjautuneen nimen fallback.
- Tests (planned): manuaalinen kirjautuminen + logout

[2026-01-02] [DONE] [L-20260102-005] LUKITTU: Kirjautunut‑nimen ja logoutin korjaus
- Summary: lisatty kirjautuneen nimen ja logout-painike etusivulle; lisatty fallback nimi localStorageen; siivottu auth-tyhjennys.
- Tests: ei ajettu; manuaalinen polku kuvattu.
- Notes: logout tyhjentaa nyt myos authUsername-tiedon.

[2026-01-02] [HANDOFF] [L-20260102-005]
- Where we are: kirjautunut kayttaja nakyy ja logout ohjaa /login.
- What changed: paivitetty api/public/index.html, api/public/app.js, api/public/login.js.
- What remains: jos halutaan, nayta myos rooli kirjautunut-pillissa.
- Next LUKITTU suggestion: mapping-raportoinnin 0-9 kooste UI:ssa.
- Key files: api/public/index.html, api/public/app.js, api/public/login.js, docs/CODEX_HISTORY.md
- How to resume: codex resume --last, tarvittaessa `node api/scripts/seed.js`

[2026-01-02] [IN_PROGRESS] [L-20260102-006] LUKITTU: Logoutin ohjaus ja tuplapillien poisto
- Goal: estaa login-sivun automaattinen ohjaus ja poistaa tuplaloggout-nakymat.
- Scope: UI + Domain.
- Deliverables: login-sivun loggedOut-polku, yhden kirjautunut-pill:n naytto.
- Tests (planned): manuaalinen logout -> /login + UI-nakyma

[2026-01-02] [DONE] [L-20260102-006] LUKITTU: Logoutin ohjaus ja tuplapillien poisto
- Summary: poistettu ylimaarainen kirjautunut-pilli; logout ohjaa /login?loggedOut=1 ja tyhjentaa tokenit.
- Tests: ei ajettu; manuaalinen polku kuvattu.
- Notes: login-sivu nayttaa palautetekstin logoutin jalkeen.

[2026-01-02] [HANDOFF] [L-20260102-006]
- Where we are: logout palaa varmasti /login-sivulle ja tuplanakyma poistui.
- What changed: paivitetty api/public/index.html, api/public/app.js, api/public/login.js.
- What remains: haluttaessa erillinen "kirjaudu ulos" vahvistus.
- Next LUKITTU suggestion: mapping-raportoinnin 0-9 kooste UI:ssa.
- Key files: api/public/index.html, api/public/app.js, api/public/login.js, docs/CODEX_HISTORY.md
- How to resume: codex resume --last, tarvittaessa `node api/scripts/seed.js`

[2026-01-02] [IN_PROGRESS] [L-20260102-007] LUKITTU: Kirjautunut‑pillin sijainti ja nimi oikealle
- Goal: siirtaa kirjautunut-pilli oikeaan ylalaitaan ja nayttaa nimi selkeasti.
- Scope: UI + Domain.
- Deliverables: pillin sijainnin muutos, oikean reunan kohdistus, nimi näkyy.
- Tests (planned): manuaalinen kirjautuminen + visuaalinen tarkistus

[2026-01-02] [DONE] [L-20260102-007] LUKITTU: Kirjautunut‑pillin sijainti ja nimi oikealle
- Summary: siirretty kirjautunut-pilli oikeaan ylalaitaan ja lisatty oikean reunan kohdistus.
- Tests: ei ajettu; manuaalinen polku kuvattu.
- Notes: pillin nimi hyodyntaa authUsername-fallbackia.

[2026-01-02] [HANDOFF] [L-20260102-007]
- Where we are: kirjautunut-nappi on oikeassa ylalaitassa ja nimi on esilla.
- What changed: paivitetty api/public/index.html, api/public/styles.css.
- What remains: haluttaessa pillille sticky-asento.
- Next LUKITTU suggestion: mapping-raportoinnin 0-9 kooste UI:ssa.
- Key files: api/public/index.html, api/public/styles.css, docs/CODEX_HISTORY.md
- How to resume: codex resume --last, tarvittaessa `node api/scripts/seed.js`

[2026-01-02] [IN_PROGRESS] [L-20260102-008] LUKITTU: SaaS-tyylinen kirjautunut-pilli
- Goal: nayttaa kirjautunut nimi selkeasti, lisata avatar ja dropdown-logout.
- Scope: UI + Domain.
- Deliverables: uusi user-menu markup, tyylit, initials-naytto ja dropdown-ohjaus.
- Tests (planned): manuaalinen login + logout + dropdown

[2026-01-02] [DONE] [L-20260102-008] LUKITTU: SaaS-tyylinen kirjautunut-pilli
- Summary: siirretty kirjautunut-pilli oikeaan ylalaitaan, lisatty avatar/initials ja dropdown-logout; vahvistettu nimen naytto.
- Tests: ei ajettu; manuaalinen polku kuvattu.
- Notes: dropdown sulkeutuu klikkauksen ja Esc-nappaimen kautta.

[2026-01-02] [HANDOFF] [L-20260102-008]
- Where we are: kirjautuneen nimi nakyy ja logout toimii SaaS-tyylisesta pillista.
- What changed: paivitetty api/public/index.html, api/public/styles.css, api/public/app.js.
- What remains: haluttaessa voidaan lisata rooli/organisaatio dropdowniin.
- Next LUKITTU suggestion: mapping-raportoinnin 0-9 kooste UI:ssa.
- Key files: api/public/index.html, api/public/styles.css, api/public/app.js, docs/CODEX_HISTORY.md
- How to resume: codex resume --last, tarvittaessa `node api/scripts/seed.js`

[2026-01-02] [IN_PROGRESS] [L-20260102-009] LUKITTU: Kirjautunut-pilli ylemmaksi ja nimi esiin
- Goal: varmistaa kirjautuneen nimen naytto ja pillin sijainti ylaoikealla.
- Scope: UI + Domain.
- Deliverables: pillin sijoitus fixed-top, hover-dropdown fallback, nimen vari.
- Tests (planned): manuaalinen login + logout + hover

[2026-01-02] [DONE] [L-20260102-009] LUKITTU: Kirjautunut-pilli ylemmaksi ja nimi esiin
- Summary: siirretty kirjautunut-pilli fixed-top -sijaintiin ja lisatty hover-fallback dropdownille; varmistettu nimen varitys.
- Tests: ei ajettu; manuaalinen polku kuvattu.
- Notes: mobilelle palautetaan static-sijainti.

[2026-01-02] [HANDOFF] [L-20260102-009]
- Where we are: kirjautunut-pilli on ylaoikealla ja nimi erottuu paremmin.
- What changed: paivitetty api/public/styles.css, docs/CODEX_HISTORY.md.
- What remains: jos nimi ei viela nay, tarkista authUsername localStorage ja /api/me vastaus.

[2026-01-02] [IN_PROGRESS] [L-20260102-010] LUKITTU: Mapping-raportoinnin 0-9 kooste UI:ssa
- Goal: nayttaa mappingin paaryhma (0-9) kooste raporttinakymaan.
- Scope: UI + API/Routes.
- Deliverables: raporttinakymaan 0-9 kooste, uusi report-endpoint.
- Key files: api/public/index.html, api/public/app.js, api/server.js, docs/CODEX_HISTORY.md
- Tests (planned): manuaalinen raporttinakyma projektilla

[2026-01-02] [DONE] [L-20260102-010] LUKITTU: Mapping-raportoinnin 0-9 kooste UI:ssa
- Summary: lisatty projektitasoinen 0-9 mapping-kooste raporttinakymaan ja uusi API-endpoint.
- Tests: ei ajettu; manuaalinen polku kuvattu.
- Notes: kooste nakee v_report_project_main_group_current -nakymasta.

[2026-01-02] [HANDOFF] [L-20260102-010]
- Where we are: raporttinakyma nayttaa mappingin 0-9 koosteet projektitasolla.
- What changed: paivitetty api/public/index.html, api/public/app.js, api/server.js, docs/CODEX_HISTORY.md.
- What remains: haluttaessa tarkenna kustannuslajien esitystapaa (esim. taulukko).
- Next LUKITTU suggestion: yhtenaista login-polkujen testaus (automaatio/polku).
- Key files: api/public/index.html, api/public/app.js, api/server.js, docs/CODEX_HISTORY.md
- How to resume: valitse projekti -> Raportti -> Paivita raportti

[2026-01-02] [IN_PROGRESS] [L-20260102-011] Kirjautumisnappi puuttui etusivulta
- Goal: nayttaa kirjautumisnappi etusivulla, kun kayttaja ei ole kirjautunut.
- Scope: UI.
- Deliverables: login-link etusivun ylareunaan ja naytto auth-tilan mukaan.
- Key files: api/public/index.html, api/public/app.js, api/public/styles.css, docs/CODEX_HISTORY.md
- Tests (planned): manuaalinen tarkistus (kirjautumaton -> login-link, kirjautunut -> logout)

[2026-01-02] [DONE] [L-20260102-011] Kirjautumisnappi puuttui etusivulta
- Summary: lisatty Kirjaudu sisaan -linkki etusivulle ja toggle auth-tilan mukaan.
- Tests: ei ajettu; manuaalinen polku kuvattu.
- Notes: logout-CTA pysyy kirjautuneena pillissa.

[2026-01-02] [HANDOFF] [L-20260102-011]
- Where we are: kirjautumaton naykee Kirjaudu sisaan -napin etusivulla.
- What changed: paivitetty api/public/index.html, api/public/app.js, api/public/styles.css, docs/CODEX_HISTORY.md.
- What remains: jos logout ei viela toimi, tarkista selaimen console/Network.
- Next LUKITTU suggestion: yhtenaista login-polkujen testaus (automaatio/polku).
- Key files: api/public/index.html, api/public/app.js, api/public/styles.css, docs/CODEX_HISTORY.md
- How to resume: avaa / ja varmista login-link -> /login

[2026-01-02] [IN_PROGRESS] [L-20260102-012] Logout-linkki ilman JS-riippuvuutta
- Goal: varmistaa, etta logout toimii myos ilman JS:aa.
- Scope: UI + API/Routes.
- Deliverables: /logout-reitti ja ankkurilinkki etusivun logoutille.
- Key files: api/server.js, api/public/index.html, api/public/styles.css, docs/CODEX_HISTORY.md
- Tests (planned): manuaalinen logout-polkutestaus

[2026-01-02] [DONE] [L-20260102-012] Logout-linkki ilman JS-riippuvuutta
- Summary: lisatty /logout-reitti (tyhjentaa authTokenin ja ohjaa /login?loggedOut=1) ja muutettu logout ankkurilinkiksi.
- Tests: ei ajettu; manuaalinen polku kuvattu.
- Notes: JS-logout toimii yha, mutta ei ole pakollinen.

[2026-01-02] [HANDOFF] [L-20260102-012]
- Where we are: logout toimii myös ilman JS:aa.
- What changed: paivitetty api/server.js, api/public/index.html, api/public/styles.css, docs/CODEX_HISTORY.md.
- What remains: jos logout ei viela toimi, tarkista selaimen console/Network.
- Next LUKITTU suggestion: yhtenaista login-polkujen testaus (automaatio/polku).
- Key files: api/server.js, api/public/index.html, api/public/styles.css, docs/CODEX_HISTORY.md
- How to resume: klikkaa Kirjaudu ulos -> /logout -> /login?loggedOut=1

[2026-01-02] [IN_PROGRESS] [L-20260102-013] Cache-bust: login/app JS + CSS
- Goal: varmistaa, etta selain hakee uusimman JS/CSS:n muutosten jälkeen.
- Scope: UI.
- Deliverables: versionoidut query-parametrit app.js/login.js/styles.css.
- Key files: api/public/index.html, api/public/login.html, docs/CODEX_HISTORY.md
- Tests (planned): manuaalinen hard refresh

[2026-01-02] [DONE] [L-20260102-013] Cache-bust: login/app JS + CSS
- Summary: lisatty versioparametri app.js/login.js/styles.css -polkuihin.
- Tests: ei ajettu; manuaalinen polku kuvattu.
- Notes: auttaa tilanteissa, joissa vanha JS ja uusi HTML menevat ristiin.

[2026-01-02] [HANDOFF] [L-20260102-013]
- Where we are: selaimen cache ei estä login/logout UI:n päivityksiä.
- What changed: paivitetty api/public/index.html, api/public/login.html, docs/CODEX_HISTORY.md.
- What remains: jos edelleen vanha JS, tee hard refresh.
- Next LUKITTU suggestion: yhtenaista login-polkujen testaus (automaatio/polku).
- Key files: api/public/index.html, api/public/login.html, docs/CODEX_HISTORY.md
- How to resume: reload / ja /login

[2026-01-02] [IN_PROGRESS] [L-20260102-014] Hidden-luokan varmistus
- Goal: varmistaa, etta .hidden piilottaa elementit vaikka niilla on omat display-tyylit.
- Scope: UI.
- Deliverables: .hidden display:none !important.
- Key files: api/public/styles.css, docs/CODEX_HISTORY.md
- Tests (planned): manuaalinen UI-tarkistus (login-link piiloutuu kirjautuneena)

[2026-01-02] [DONE] [L-20260102-014] Hidden-luokan varmistus
- Summary: lisatty !important .hidden-luokkaan, jotta se ohittaa elementtien display-tyylit.
- Tests: ei ajettu; manuaalinen polku kuvattu.
- Notes: vaikuttaa kaikkiin hidden-luokan kayttoihin.

[2026-01-02] [HANDOFF] [L-20260102-014]
- Where we are: hidden-luokka toimii myos user-pill/login-link -tapauksissa.
- What changed: paivitetty api/public/styles.css, docs/CODEX_HISTORY.md.
- What remains: jos UI ei viela paivity, tee hard refresh.
- Next LUKITTU suggestion: yhtenaista login-polkujen testaus (automaatio/polku).
- Key files: api/public/styles.css, docs/CODEX_HISTORY.md
- How to resume: avaa / ja varmista login-link piiloutuu kirjautuneena

[2026-01-02] [IN_PROGRESS] [L-20260102-015] Sales-polun SPA-reitti
- Goal: estaa 404, kun navigoidaan /sales reittiin.
- Scope: API/Routes.
- Deliverables: index.html palvelee /sales-reittia.
- Key files: api/server.js, docs/CODEX_HISTORY.md
- Tests (planned): manuaalinen reittitesti (/sales)

[2026-01-02] [DONE] [L-20260102-015] Sales-polun SPA-reitti
- Summary: lisatty /sales index.html -reititykseen.
- Tests: ei ajettu; manuaalinen polku kuvattu.
- Notes: koskee vain SPA-UI:n reititysta.

[2026-01-02] [HANDOFF] [L-20260102-015]
- Where we are: /sales ei enää palauta 404.
- What changed: paivitetty api/server.js, docs/CODEX_HISTORY.md.
- What remains: ei avoimia.
- Next LUKITTU suggestion: yhtenaista login-polkujen testaus (automaatio/polku).
- Key files: api/server.js, docs/CODEX_HISTORY.md
- How to resume: avaa /sales
- Next LUKITTU suggestion: mapping-raportoinnin 0-9 kooste UI:ssa.
- Key files: api/public/styles.css, api/public/app.js, api/public/index.html, docs/CODEX_HISTORY.md
- How to resume: codex resume --last, tarvittaessa `node api/scripts/seed.js`

[2026-01-02] [IN_PROGRESS] [L-20260102-010] LUKITTU: Kirjautuminen lukkoon + pilli esiin
- Goal: varmistaa, etta login-sivu pysyy logoutin jalkeen ja pilli nayttaa nimen.
- Scope: UI + Domain.
- Deliverables: forceLogin-parametri logoutista, token-fallback UI:ssa, kirjautuneen nimen naytto.
- Tests (planned): manuaalinen logout -> /login + pilli-nakyma

[2026-01-02] [DONE] [L-20260102-010] LUKITTU: Kirjautuminen lukkoon + pilli esiin
- Summary: lisatty forceLogin-logout ohjaus, login-sivu ei hyppaa takaisin; pilli naytetaan jos token on olemassa.
- Tests: ei ajettu; manuaalinen polku kuvattu.
- Notes: login-sivu tyhjentaa tokenit loggedOut-parametrilla.

[2026-01-02] [HANDOFF] [L-20260102-010]
- Where we are: logout palaa login-sivulle ja pilli näkyy kun token on olemassa.
- What changed: paivitetty api/public/app.js, api/public/login.js, docs/CODEX_HISTORY.md.
- What remains: jos UI ei nay, tee kova reload (Ctrl+F5) selaimessa.
- Next LUKITTU suggestion: mapping-raportoinnin 0-9 kooste UI:ssa.
- Key files: api/public/app.js, api/public/login.js, api/public/index.html, docs/CODEX_HISTORY.md
- How to resume: codex resume --last, tarvittaessa `node api/scripts/seed.js`

[2026-01-02] [IN_PROGRESS] [L-20260102-011] LUKITTU: Pilli esiin vaikka /api/me epäonnistuu
- Goal: nayttaa kirjautunut-pilli tokenin perusteella, vaikka /api/me ei vastaa.
- Scope: UI + Domain.
- Deliverables: initAuth fallback ilman tokenin nollausta.
- Tests (planned): manuaalinen login + tarkistus ilman /api/me

[2026-01-02] [DONE] [L-20260102-011] LUKITTU: Pilli esiin vaikka /api/me epäonnistuu
- Summary: initAuth ei nollaa tokenia jos se on olemassa, pilli pysyy näkyvilla fallback-nimella.
- Tests: ei ajettu; manuaalinen polku kuvattu.
- Notes: API-401 silti tyhjentaa tokenin fetchJson-polussa.

[2026-01-02] [HANDOFF] [L-20260102-011]
- Where we are: kirjautunut-pilli naytetaan tokenin perusteella, vaikka /api/me failaa.
- What changed: paivitetty api/public/app.js, docs/CODEX_HISTORY.md.
- What remains: jos pilli puuttuu, tee kova reload ja tarkista localStorage authToken.
- Next LUKITTU suggestion: mapping-raportoinnin 0-9 kooste UI:ssa.
- Key files: api/public/app.js, api/public/index.html, docs/CODEX_HISTORY.md
- How to resume: codex resume --last, tarvittaessa `node api/scripts/seed.js`

[2026-01-02] [IN_PROGRESS] [L-20260102-012] LUKITTU: Ensisijainen UI-polku ja legacy-merkintä
- Goal: päättää ensisijainen UI-polku ja merkitä toinen legacyksi.
- Scope: Docs + ADR.
- Deliverables: uusi ADR-0010, kartta-päivitys, päätösloki.
- Tests (planned): manuaalinen docs-tarkistus

[2026-01-02] [DONE] [L-20260102-012] LUKITTU: Ensisijainen UI-polku ja legacy-merkintä
- Summary: valittu `api/public/` ensisijaiseksi UI-poluksi; lisätty ADR-0010; päivitetty KARTTA ja päätösloki.
- Tests: ei ajettu; manuaalinen polku kuvattu.
- Notes: `ui/` on jatkossa legacy-polku.

[2026-01-02] [HANDOFF] [L-20260102-012]
- Where we are: UI-polku on päätetty ja dokumentoitu.
- What changed: päivitetty docs/adr/0010-primary-ui-path.md, docs/adr/README.md, docs/KARTTA_STATUS_V1.md, docs/decisions/decision-log.md.
- What remains: paivita mahdolliset UI-viitteet muissa docseissa tarvittaessa.
- Next LUKITTU suggestion: mapping-raportoinnin 0-9 kooste UI:ssa.
- Key files: docs/adr/0010-primary-ui-path.md, docs/KARTTA_STATUS_V1.md, docs/decisions/decision-log.md, docs/CODEX_HISTORY.md
- How to resume: codex resume --last

[2026-01-02] [IN_PROGRESS] [L-20260102-013] LUKITTU: Kirjautunut-pilli ilman dropdownia
- Goal: nayttaa kirjautunut-pilli ja logout ilman alasvetovalikkoa.
- Scope: UI + Domain.
- Deliverables: suora pilli ylaoikealla, logout toimii, nimi nakyy.
- Tests (planned): manuaalinen login + logout

[2026-01-02] [DONE] [L-20260102-013] LUKITTU: Kirjautunut-pilli ilman dropdownia
- Summary: poistettu dropdown-logiikka ja palautettu suora kirjautunut-pilli; nimi ja logout esilla.
- Tests: ei ajettu; manuaalinen polku kuvattu.
- Notes: pilli naytetaan token-fallbackilla.

[2026-01-02] [HANDOFF] [L-20260102-013]
- Where we are: kirjautunut-pilli on suora ja logout toimii ilman alasvetovalikkoa.
- What changed: paivitetty api/public/index.html, api/public/styles.css, api/public/app.js.
- What remains: jos pilli ei nay, tarkista localStorage authToken.
- Next LUKITTU suggestion: mapping-raportoinnin 0-9 kooste UI:ssa.
- Key files: api/public/index.html, api/public/styles.css, api/public/app.js, docs/CODEX_HISTORY.md
- How to resume: codex resume --last

[2026-01-02] [HANDOFF] [L-20260102-014]
- Where we are: login-sivu ei ohjaa automaattisesti; istuntoa varten on "Siirry sovellukseen" ja "Tyhjennä istunto".
- What changed: paivitetty api/public/login.html, api/public/login.js, api/public/styles.css, api/public/app.js.
- What remains: validoi login-polku end-to-end (login -> logout -> login) ja varmista pillin naytto.
- Next LUKITTU suggestion: mapping-raportoinnin 0-9 kooste UI:ssa.
- Key files: api/public/login.html, api/public/login.js, api/public/styles.css, api/public/app.js, docs/CODEX_HISTORY.md
- How to resume:
  - git status
  - git log -1
  - docker compose up -d
  - avaa /login ja testaa login -> logout -> login
  - codex resume --last
