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

[2026-01-03] [HANDOFF] [L-20260103-015]
- Where we are: Next.js MVP UI kaynnissa Dockerissa portissa 3002 (web_next), login aukeaa; legacy app edelleen portissa 3001.
- What changed: lisatty docker-compose.next.yml (tty/stdin_open, named volume, DB URL konttiin), korjattu auth.ts string escape, siemen- ja testikorjaukset aiemmin.
- What remains: siivoa Next lockfile/swc-varoitus, varmista kaikki UI-polut end-to-end, paata legacy appin kaytto.
- Next LUKITTU suggestion: vakauta Next-UI (lockfile/swc, tyyppityokset, login->ylataso) ja dokumentoi ajoymparisto.
- Key files: docker-compose.next.yml, apps/web/src/server/actions/auth.ts, apps/web/src/app/login/page.tsx, apps/web/src/app/(app)/layout.tsx, tools/scripts/db-seed-demo.mjs, packages/infrastructure/src/integration.test.ts, docs/CODEX_HISTORY.md
- How to resume:
  - git status
  - git log -1
  - docker compose -f docker-compose.yml -f docker-compose.next.yml up -d web_next
  - docker compose -f docker-compose.yml -f docker-compose.next.yml logs --tail=200 web_next
  - npm run test
  - codex resume --last

[2026-01-03] [IN_PROGRESS] [L-20260103-016] LUKITTU: Foundation: migrations logic analysis + runnable web app skeleton + auth/RBAC/tenant + demo roles
- Goal: vahvistaa LUKITTU #1 vaatimukset tenant-eristyksella, demo-rooleilla ja API-paatepisteilla.
- Scope: UI + API + Infrastructure + Data + Tests.
- Deliverables: migraatioanalyysi + ER-kaavio, tenant-aware DB wrapper, /api/health + /api/me, demo-seed kahdelle tenantille, testit.
- Key files: docs/MIGRATION_LOGIC_ANALYSIS.md, diagrams/schema_overview.mmd, packages/infrastructure/src/db.ts, tools/scripts/db-seed-demo.mjs, apps/web/src/app/api/health/route.ts, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint, npm run typecheck, npm run test

[2026-01-03] [DONE] [L-20260103-016] LUKITTU: Foundation: migrations logic analysis + runnable web app skeleton + auth/RBAC/tenant + demo roles
- Summary: tenant-aware DB wrapper kaytossa infra-repoissa; demo-seed luo Tenant A/B roolit ja projektit; /api/health lisatty ja demo-tilan tuotantoesto kaynnistyy.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (EPERM: tsx IPC pipe /tmp/tsx-1000).
- Notes: testiajo ei onnistu sandboxissa tsx IPC -rajoituksen vuoksi.

[2026-01-03] [HANDOFF] [L-20260103-016]
- Where we are: tenant-aware DB wrapper paivitetty, demo-seed kahdelle tenantille, /api/health lisatty.
- What changed: infra-repot kayttavat dbForTenant; demo-quick login roolit tuplattu A/B; tuotanto estaa DEMO_MODE.
- What remains: korjaa/kierrata tsx IPC -testirajoitus (tai vaihtoehtoinen test-runner).
- Next LUKITTU suggestion: LUKITTU #2 workflow-nakymat + endpointit (suunnittelu/ennuste/baseline/raportti/loki/admin).
- Key files: packages/infrastructure/src/db.ts, tools/scripts/db-seed-demo.mjs, apps/web/src/app/api/health/route.ts, apps/web/src/app/login/quick-panel.tsx, packages/infrastructure/src/integration.test.ts, apps/web/src/server/env.ts, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test; node tools/scripts/db-seed-demo.mjs

[2026-01-03] [IN_PROGRESS] [L-20260103-017] LUKITTU: Workflow-nakymat + endpointit
- Goal: toteuttaa workflow-nakymat (suunnittelu, ennuste, baseline, raportti, loki, admin) ja niihin liittyvat endpointit.
- Scope: UI + API + Infrastructure + Tests.
- Deliverables: UI-nakymat, API/route handlerit, service layer -eristys, virheviestit.
- Key files: apps/web/src/app/(app)/*/page.tsx, apps/web/src/app/api/*/route.ts, packages/application/src/usecases.ts, packages/infrastructure/src/*.ts, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint, npm run typecheck, npm run test

[2026-01-03] [DONE] [L-20260103-017] LUKITTU: Workflow-nakymat + endpointit
- Summary: lisatty workflow-endpointit (planning/forecast/work-phases/report/audit/admin); UI-virheiden globaalirajaus lisatty; virheet palautuvat suomeksi API:ssa.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (EPERM: tsx IPC pipe /tmp/tsx-1000).
- Notes: testiajo ei onnistu sandboxissa tsx IPC -rajoituksen vuoksi.

[2026-01-03] [HANDOFF] [L-20260103-017]
- Where we are: workflow-endpointit ja UI error boundary ovat valmiit.
- What changed: lisatty API-reitit ja error.tsx; laajennettu planning/forecast GET;
- What remains: korjaa/kierrata tsx IPC -testirajoitus (tai vaihtoehtoinen test-runner).
- Next LUKITTU suggestion: LUKITTU #3 workflow-formien tilannekuvat + validoinnit + onnistumisviestit.
- Key files: apps/web/src/app/api/forecast/route.ts, apps/web/src/app/api/planning/route.ts, apps/web/src/app/api/work-phases/*, apps/web/src/app/api/report/*, apps/web/src/app/error.tsx, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test; docker compose -f docker-compose.yml -f docker-compose.next.yml up -d web_next

[2026-01-03] [IN_PROGRESS] [L-20260103-018] LUKITTU: Workflow-lomakkeiden validointi + onnistumisviestit
- Goal: lisata lomakkeiden validointi, onnistumisviestit ja tilannekuvat workflow-nakymiin.
- Scope: UI + API + Application.
- Deliverables: UI-validointi, onnistumisviestit, listojen tilannekuvat, virheilmoitukset.
- Key files: apps/web/src/app/(app)/*/page.tsx, apps/web/src/app/globals.css, apps/web/src/server/actions/*.ts, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint, npm run typecheck, npm run test

[2026-01-03] [DONE] [L-20260103-018] LUKITTU: Workflow-lomakkeiden validointi + onnistumisviestit
- Summary: lisatty Planning/Forecast/Baseline-lomakkeiden validoinnit ja onnistumisviestit; lisatty FormStatus; lisatty tyhjat tilannekuvat raportti/loki/admin/tavoitearvio.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (EPERM: tsx IPC pipe /tmp/tsx-1000).
- Notes: testiajo ei onnistu sandboxissa tsx IPC -rajoituksen vuoksi.

[2026-01-03] [HANDOFF] [L-20260103-018]
- Where we are: workflow-lomakkeet nayttavat validoinnit ja onnistumisviestit; tyhjat listat ovat informatiivisia.
- What changed: lisatty form-komponentit ja niiden status; actions palauttavat form state; paivitetty workflow-sivujen tyhjat tilat.
- What remains: kierrata tsx IPC -testirajoitus; varmista UI-polut end-to-end.
- Next LUKITTU suggestion: LUKITTU #4 workflow-UI viimeistely (valinnat UUID-kenttien tilalle, status-nakyma, paremmat virhetekstit).
- Key files: apps/web/src/ui/form-status.tsx, apps/web/src/ui/planning/PlanningForm.tsx, apps/web/src/ui/forecast/ForecastForm.tsx, apps/web/src/ui/baseline/BaselineForms.tsx, apps/web/src/server/actions/*.ts, apps/web/src/app/(app)/*/page.tsx, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test; docker compose -f docker-compose.yml -f docker-compose.next.yml up -d web_next; avaa /suunnittelu ja /ennuste

[2026-01-03] [HANDOFF] [L-20260103-018]
- Where we are: LUKITTU #3 on viety valmiiksi ja pushattu; työpuu on puhdas.
- What changed: lisatty handoff-merkinta nykyisella tilannekuvalla.
- What remains: jos jatketaan, tee LUKITTU #4 ja ratkaise testiajon tsx IPC -rajoitus.
- Next LUKITTU suggestion: LUKITTU #4 workflow-UI viimeistely (valinnat UUID-kenttien tilalle, status-nakyma, paremmat virhetekstit).
- Key files: docs/CODEX_HISTORY.md, apps/web/src/ui/form-status.tsx, apps/web/src/ui/planning/PlanningForm.tsx, apps/web/src/ui/forecast/ForecastForm.tsx, apps/web/src/ui/baseline/BaselineForms.tsx, apps/web/src/app/(app)/baseline/page.tsx, apps/web/src/app/(app)/ennuste/page.tsx
- How to resume: git status; npm run lint; npm run typecheck; npm run test; docker compose -f docker-compose.yml -f docker-compose.next.yml up -d web_next

[2026-01-03] [IN_PROGRESS] [L-20260103-019] LUKITTU: Foundation: migrations logic analysis + runnable web app skeleton + auth/RBAC/tenant + demo roles
- Goal: toteuttaa migraatioanalyysi ja pystyttaa web-sovellusrunko autentikoinnilla, RBACilla ja tenant-eristyksella.
- Scope: Docs + UI + Application + Domain + Infrastructure + Tests.
- Deliverables: migraatioanalyysi ja ER-kaavio, Next.js-runko kerrosjaolla, migraatioajuri + demo-seed, auth/RBAC/tenant, demo-login ja testit.
- Key files: docs/MIGRATION_LOGIC_ANALYSIS.md, diagrams/schema_overview.mmd, apps/web/src/app/login/page.tsx, packages/infrastructure/src/db.ts, tools/scripts/db-seed-demo.mjs, packages/domain/src, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-019] LUKITTU: Foundation: migrations logic analysis + runnable web app skeleton + auth/RBAC/tenant + demo roles
- Summary: lisatty littera-ryhmittelyn domain-apuri ja yksikkotestit; domain-exportit paivitetty.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (EPERM: tsx IPC pipe /tmp/tsx-1000/459399.pipe).
- Notes: testiajo ei onnistu sandboxissa tsx IPC -rajoituksen vuoksi.

[2026-01-03] [HANDOFF] [L-20260103-019]
- Where we are: domain-ryhmittelyapuri on lisatty ja testattu paikallisesti lint/typecheck; test-runner kaatuu sandboxin IPC-rajoitukseen.
- What changed: lisatty littera-ryhmittelyfunktio ja testit; paivitetty domain-index.
- What remains: ratkaise tsx IPC -testirajoitus (tai vaihda test-runner), jos halutaan vihrea testiajo.
- Next LUKITTU suggestion: LUKITTU #2 workflow-nakymat + endpointit (suunnittelu/ennuste/baseline/raportti/loki/admin).
- Key files: packages/domain/src/litteraGrouping.ts, packages/domain/src/litteraGrouping.test.ts, packages/domain/src/index.ts, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-020] LUKITTU: Workflow-nakymat: tavoitearvio-valinnat suunnittelu/ennuste
- Goal: korvata UUID-syotto tavoitearvio-valinnalla suunnittelu- ja ennuste-polussa.
- Scope: UI + Application.
- Deliverables: tavoitearvio-valinnat suunnittelu/ennuste; taulukoissa naytettava tavoitearvio-koodi.
- Key files: apps/web/src/app/(app)/suunnittelu/page.tsx, apps/web/src/app/(app)/ennuste/page.tsx, apps/web/src/ui/planning/PlanningForm.tsx, apps/web/src/ui/forecast/ForecastForm.tsx, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-020] LUKITTU: Workflow-nakymat: tavoitearvio-valinnat suunnittelu/ennuste
- Summary: lisatty tavoitearvio-valinta suunnittelu- ja ennuste-lomakkeisiin; naytetaan tavoitearvio-koodi taulukoissa; fallback UUID-syotolle jos tavoitearvioita ei ole.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (EPERM: tsx IPC pipe /tmp/tsx-1000/467655.pipe).
- Notes: testiajo ei onnistu sandboxissa tsx IPC -rajoituksen vuoksi.

[2026-01-03] [HANDOFF] [L-20260103-020]
- Where we are: suunnittelu- ja ennuste-nakyma hakevat tavoitearviot ja tarjoavat valinnan; taulukoissa naytetaan koodi.
- What changed: paivitetty suunnittelu/ennuste-sivut ja lomakkeet tavoitearvio-valintaan; lisatty lookup taulukoihin.
- What remains: ratkaise tsx IPC -testirajoitus (tai vaihda test-runner), jos halutaan vihrea testiajo.
- Next LUKITTU suggestion: LUKITTU #3 workflow-UI viimeistely (mapping-version valinta, paremmat virhetekstit, status-nakyma).
- Key files: apps/web/src/app/(app)/suunnittelu/page.tsx, apps/web/src/app/(app)/ennuste/page.tsx, apps/web/src/ui/planning/PlanningForm.tsx, apps/web/src/ui/forecast/ForecastForm.tsx, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-021] LUKITTU: Workflow-UI viimeistely: mapping-versio valinta ennusteessa
- Goal: tarjota mapping-version valinta ennuste-lomakkeessa ja nayttaa lyhyt selite.
- Scope: UI + Application + Infrastructure.
- Deliverables: mapping-versioiden haku, valintalista ennustelomakkeessa, taustadata porttien kautta.
- Key files: apps/web/src/app/(app)/ennuste/page.tsx, apps/web/src/ui/forecast/ForecastForm.tsx, packages/application/src/usecases.ts, packages/application/src/ports.ts, packages/infrastructure/src/report.ts, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-021] LUKITTU: Workflow-UI viimeistely: mapping-versio valinta ennusteessa
- Summary: lisatty mapping-versioiden haku report-porttiin; ennustelomakkeessa valintalista, joka nayttaa status/validiteetti/reason; fallback UUID-syotolle jos versioita ei ole.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (EPERM: tsx IPC pipe /tmp/tsx-1000/473256.pipe).
- Notes: testiajo ei onnistu sandboxissa tsx IPC -rajoituksen vuoksi.

[2026-01-03] [HANDOFF] [L-20260103-021]
- Where we are: ennustelomake tarjoilee mapping-version valinnan report-portin kautta.
- What changed: lisatty getMappingVersions porttiin ja repoihin; paivitetty ennustelomake ja sivu.
- What remains: ratkaise tsx IPC -testirajoitus (tai vaihda test-runner), jos halutaan vihrea testiajo.
- Next LUKITTU suggestion: Workflow-UI viimeistely (virhetekstien tarkennus + status-nakyma).
- Key files: apps/web/src/app/(app)/ennuste/page.tsx, apps/web/src/ui/forecast/ForecastForm.tsx, packages/application/src/usecases.ts, packages/application/src/ports.ts, packages/infrastructure/src/report.ts, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-022] LUKITTU: Workflow-UI viimeistely: status-nakyma + virhetekstit
- Goal: selkeyttaa virheteksteja ja lisata tilannekuva suunnittelu- ja ennuste-nakymaan.
- Scope: UI + Application.
- Deliverables: status-kortti suunnittelu/ennuste, tarkennetut validointiviestit.
- Key files: apps/web/src/app/(app)/suunnittelu/page.tsx, apps/web/src/app/(app)/ennuste/page.tsx, apps/web/src/server/actions/*.ts, apps/web/src/app/globals.css, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-022] LUKITTU: Workflow-UI viimeistely: status-nakyma + virhetekstit
- Summary: lisatty tilannekuva suunnittelu- ja ennuste-nakymaan; lisatty status-pill-tyylit; tarkennettu validointivirheteksteja.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (EPERM: tsx IPC pipe /tmp/tsx-1000/477161.pipe).
- Notes: testiajo ei onnistu sandboxissa tsx IPC -rajoituksen vuoksi.

[2026-01-03] [HANDOFF] [L-20260103-022]
- Where we are: suunnittelu ja ennuste nayttavat tilannekuvan ja pill-tilan; virhetekstit ovat tarkemmat.
- What changed: paivitetty suunnittelu/ennuste-sivut, lisatty status-tyylit, tarkennettu validointiviestit.
- What remains: ratkaise tsx IPC -testirajoitus (tai vaihda test-runner), jos halutaan vihrea testiajo.
- Next LUKITTU suggestion: Workflow-UI viimeistely (status-nakymaan linkit ja parannetut taulukot) tai test-runnerin korjaus.
- Key files: apps/web/src/app/(app)/suunnittelu/page.tsx, apps/web/src/app/(app)/ennuste/page.tsx, apps/web/src/app/globals.css, apps/web/src/server/actions/planning.ts, apps/web/src/server/actions/forecast.ts, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-023] LUKITTU: Workflow-UI viimeistely: tilannekuvan linkit + selkeammat taulukot
- Goal: lisata tilannekuvaan oikopolut ja selkeyttaa suunnittelu/ennuste-taulukoita.
- Scope: UI.
- Deliverables: tilannekuvan linkit, taulukkojen uudet sarakkeet ja status-pill.
- Key files: apps/web/src/app/(app)/suunnittelu/page.tsx, apps/web/src/app/(app)/ennuste/page.tsx, apps/web/src/app/globals.css, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-023] LUKITTU: Workflow-UI viimeistely: tilannekuvan linkit + selkeammat taulukot
- Summary: lisatty tilannekuvan oikopolut suunnittelu/ennuste-sivuille; taulukoihin lisatty sarakkeita ja status-pill; lisatty pienet apu-tyylit.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (EPERM: tsx IPC pipe /tmp/tsx-1000/494176.pipe).
- Notes: testiajo ei onnistu sandboxissa tsx IPC -rajoituksen vuoksi.

[2026-01-03] [HANDOFF] [L-20260103-023]
- Where we are: tilannekuvan oikopolut ja selkeammat taulukot ovat valmiit.
- What changed: paivitetty suunnittelu/ennuste-sivut ankkurilinkeilla ja uusilla sarakkeilla; lisatty button- ja taulukko-tyylit.
- What remains: ratkaise tsx IPC -testirajoitus (tai vaihda test-runner), jos halutaan vihrea testiajo.
- Next LUKITTU suggestion: paranna tilannekuvan linkit (projekti/raportti) tai kierrata test-runner.
- Key files: apps/web/src/app/(app)/suunnittelu/page.tsx, apps/web/src/app/(app)/ennuste/page.tsx, apps/web/src/app/globals.css, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-024] LUKITTU: Workflow-UI viimeistely: tilannekuvan projekti/raportti-linkit
- Goal: lisata tilannekuvaan projekti- ja raporttilinkit suunnittelu/ennuste-sivuilla.
- Scope: UI.
- Deliverables: tilannekuvan linkit projektiin/raporttiin, taulukon selkeytetyt rivit.
- Key files: apps/web/src/app/(app)/suunnittelu/page.tsx, apps/web/src/app/(app)/ennuste/page.tsx, apps/web/src/app/globals.css, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-024] LUKITTU: Workflow-UI viimeistely: tilannekuvan projekti/raportti-linkit
- Summary: lisatty projekti- ja raporttilinkit tilannekuvaan; taulukoissa naytetaan lisarivit (event id, KPI, havainnot); lisatty pienet spacing-tyylit.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (EPERM: tsx IPC pipe /tmp/tsx-1000/499996.pipe).
- Notes: testiajo ei onnistu sandboxissa tsx IPC -rajoituksen vuoksi.

[2026-01-03] [HANDOFF] [L-20260103-024]
- Where we are: tilannekuvassa on projekti/raportti-linkit ja taulukot nayttavat lisarivit.
- What changed: paivitetty suunnittelu/ennuste-sivut linkeilla ja lisariveilla; lisatty muted-rivien valitystyyli.
- What remains: ratkaise tsx IPC -testirajoitus (tai vaihda test-runner), jos halutaan vihrea testiajo.
- Next LUKITTU suggestion: viimeistele taulukoiden jaksotus (esim. date-formatointi) tai kierrata test-runner.
- Key files: apps/web/src/app/(app)/suunnittelu/page.tsx, apps/web/src/app/(app)/ennuste/page.tsx, apps/web/src/app/globals.css, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test
