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

[2026-01-03] [IN_PROGRESS] [L-20260103-025] LUKITTU: Workflow-UI viimeistely: date-formatointi ja ryhmittely
- Goal: muuntaa aikaleimat selkeiksi ja ryhmitella suunnittelu/ennuste-taulukot tavoitearvion mukaan.
- Scope: UI.
- Deliverables: date-formatointi ja ryhmat suunnittelu/ennuste-taulukoissa.
- Key files: apps/web/src/app/(app)/suunnittelu/page.tsx, apps/web/src/app/(app)/ennuste/page.tsx, apps/web/src/app/globals.css, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-025] LUKITTU: Workflow-UI viimeistely: date-formatointi ja ryhmittely
- Summary: lisatty suomenkielinen date-formatointi; taulukot ryhmitelty tavoitearvion mukaan; lisatty ryhmamainen taulukko-tyyli.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (EPERM: tsx IPC pipe /tmp/tsx-1000/503456.pipe).
- Notes: testiajo ei onnistu sandboxissa tsx IPC -rajoituksen vuoksi.

[2026-01-03] [HANDOFF] [L-20260103-025]
- Where we are: suunnittelu ja ennuste nayttavat ryhmitellyt taulukot ja muotoillut aikaleimat.
- What changed: paivitetty taulukkojen renderointi ja lisatty ryhmatyylit; lisatty date-formatointi.
- What remains: ratkaise tsx IPC -testirajoitus (tai vaihda test-runner), jos halutaan vihrea testiajo.
- Next LUKITTU suggestion: test-runnerin IPC-kierto tai taulukkojen suodatus.
- Key files: apps/web/src/app/(app)/suunnittelu/page.tsx, apps/web/src/app/(app)/ennuste/page.tsx, apps/web/src/app/globals.css, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-026] LUKITTU: Test-runnerin IPC-kierto
- Goal: vaihtaa testikomennot ilman tsx IPC -palvelinta, jotta testit ajautuvat sandboxissa.
- Scope: Tooling + Tests.
- Deliverables: paivitetyt testiskriptit workspacessa, onnistuva testiajo (jos mahdollista).
- Key files: packages/domain/package.json, packages/application/package.json, packages/infrastructure/package.json, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-026] LUKITTU: Test-runnerin IPC-kierto
- Summary: vaihdettu testiskriptit node --test --import tsx -muotoon; integraatiotesti skipataan ilman env-avaimia; testit ajautuvat sandboxissa.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: integraatiotesti vaatii DATABASE_URL + SESSION_SECRET, muuten skip.

[2026-01-03] [HANDOFF] [L-20260103-026]
- Where we are: testit ajautuvat ilman tsx IPC -palvelinta.
- What changed: testiskriptit paivitetty; integraatiotesti skipataan ilman env-avaimia.
- What remains: halutessasi konfiguroi DATABASE_URL ja SESSION_SECRET, jotta integraatiotesti ajetaan oikeasti.
- Next LUKITTU suggestion: taulukoiden suodatus tai seuraava toiminnallisuus (UX).
- Key files: packages/domain/package.json, packages/application/package.json, packages/infrastructure/package.json, packages/infrastructure/src/integration.test.ts, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-027] LUKITTU: Taulukoiden suodatus (tavoitearvio/tila)
- Goal: lisata suodatus suunnittelu- ja ennuste-taulukoihin (tavoitearvio, tila/mapping).
- Scope: UI.
- Deliverables: suodatuskentat ja suodatettu taulukko.
- Key files: apps/web/src/app/(app)/suunnittelu/page.tsx, apps/web/src/app/(app)/ennuste/page.tsx, apps/web/src/ui/planning/PlanningTable.tsx, apps/web/src/ui/forecast/ForecastTable.tsx, apps/web/src/app/globals.css, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-027] LUKITTU: Taulukoiden suodatus (tavoitearvio/tila)
- Summary: lisatty suodatuskentat suunnittelu- ja ennuste-taulukoihin; taulukot renderoidaan client-komponenteissa; aikaleimat pidetaan selkeina.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: integraatiotesti vaatii DATABASE_URL + SESSION_SECRET, muuten skip.

[2026-01-03] [HANDOFF] [L-20260103-027]
- Where we are: suodatus toimii tavoitearvion ja tilan/mappingin mukaan.
- What changed: lisatty PlanningTable ja ForecastTable client-komponentit; paivitetty suunnittelu/ennuste-sivut ja suodatin-tyylit.
- What remains: harkitse suodattimien muistamista URL-parametreilla, jos halutaan jaettava linkki.
- Next LUKITTU suggestion: taulukoiden lisasuodatus (aikavalit) tai UX-parannus ennusteeseen.
- Key files: apps/web/src/ui/planning/PlanningTable.tsx, apps/web/src/ui/forecast/ForecastTable.tsx, apps/web/src/app/(app)/suunnittelu/page.tsx, apps/web/src/app/(app)/ennuste/page.tsx, apps/web/src/app/globals.css, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-028] LUKITTU: Taulukoiden lisasuodatus (aikavalit)
- Goal: lisata aikavali-suodatus suunnittelu- ja ennuste-taulukoihin.
- Scope: UI.
- Deliverables: aloitus/lopetus-pvm suodattimet ja suodatettu lista.
- Key files: apps/web/src/ui/planning/PlanningTable.tsx, apps/web/src/ui/forecast/ForecastTable.tsx, apps/web/src/app/globals.css, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-028] LUKITTU: Taulukoiden lisasuodatus (aikavalit)
- Summary: lisatty aloitus/paatos-pvm suodatus suunnittelu- ja ennuste-taulukoihin; tyhjennysnappi lisaa nopean resetoinnin.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: integraatiotesti vaatii DATABASE_URL + SESSION_SECRET, muuten skip.

[2026-01-03] [HANDOFF] [L-20260103-028]
- Where we are: suodatus toimii tavoitearvion, tilan/mappingin ja aikavalin mukaan.
- What changed: paivitetty PlanningTable ja ForecastTable date-suodattimilla; lisatty reset-nappi ja suodatustilan logiikka.
- What remains: halutessasi muista suodattimet URL-parametreissa.
- Next LUKITTU suggestion: suodattimien URL-parametrit tai ennusteen autotaytto.
- Key files: apps/web/src/ui/planning/PlanningTable.tsx, apps/web/src/ui/forecast/ForecastTable.tsx, apps/web/src/app/globals.css, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-029] LUKITTU: Suodattimien URL-parametrit
- Goal: paivittaa suodattimet URL-parametreihin suunnittelu- ja ennuste-taulukoissa.
- Scope: UI.
- Deliverables: URL-parametri-synkkaus suodattimille; jaettava linkki.
- Key files: apps/web/src/ui/planning/PlanningTable.tsx, apps/web/src/ui/forecast/ForecastTable.tsx, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-029] LUKITTU: Suodattimien URL-parametrit
- Summary: suodattimet synkronoituvat URL-parametreihin suunnittelu- ja ennuste-taulukoissa; takaisinnappain paivittaa tilan.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: integraatiotesti vaatii DATABASE_URL + SESSION_SECRET, muuten skip.

[2026-01-03] [HANDOFF] [L-20260103-029]
- Where we are: suodattimet pysyvat URL-parametreissa ja linkki on jaettava.
- What changed: lisatty URL-parametri-synkkaus PlanningTable ja ForecastTable -komponenteissa.
- What remains: halutessasi lisaa oletusparametrit (esim. status=READY_FOR_FORECAST) tai reset-nappi kaikille suodattimille.
- Next LUKITTU suggestion: ennusteen autotaytto tai suodattimien URL-resetointi.
- Key files: apps/web/src/ui/planning/PlanningTable.tsx, apps/web/src/ui/forecast/ForecastTable.tsx, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-030] LUKITTU: Ennusteen autotaytto
- Summary: lisatty ennuste-snapshot-endpointti; ennustelomake autotayttaa viimeisimman ennusteen tiedot.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: integraatiotesti vaatii DATABASE_URL + SESSION_SECRET, muuten skip.

[2026-01-03] [HANDOFF] [L-20260103-030]
- Where we are: ennustelomake hakee viimeisimman ennusteen ja tayttaa kentat valitulle tavoitearviolle.
- What changed: lisatty /api/forecast/snapshot; paivitetty forecast-portit ja lomakkeen autotaytto.
- What remains: halutessasi lisaa manuaalinen "Autotaytto" -nappi tai autoskip, jos kayttaja on jo muokannut kenttia.
- Next LUKITTU suggestion: ennusteen autotayton hienosaatö (manuaalinen nappi) tai suodattimien URL-resetointi.
- Key files: apps/web/src/ui/forecast/ForecastForm.tsx, apps/web/src/app/api/forecast/snapshot/route.ts, packages/application/src/usecases.ts, packages/application/src/ports.ts, packages/infrastructure/src/forecast.ts, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-030] LUKITTU: Ennusteen autotaytto
- Goal: autotayttaa ennustelomake viimeisimmalla ennusteella, kun tavoitearvio valitaan.
- Scope: UI + Application + Infrastructure.
- Deliverables: ennusteen snapshot-endpointti ja lomakkeen autotaytto.
- Key files: apps/web/src/ui/forecast/ForecastForm.tsx, apps/web/src/app/api/forecast/snapshot/route.ts, packages/application/src/usecases.ts, packages/application/src/ports.ts, packages/infrastructure/src/forecast.ts, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-031] LUKITTU: Workflow-sivut ja status-endpointit
- Goal: tehda workflow-nakyma, joka listaa suunnittelu/ennuste/lukitus/loki/raportti -tilanteen.
- Scope: UI + Application + Infrastructure.
- Deliverables: workflow-status API-endpointti ja workflow-hub UI-nakyma.
- Key files: apps/web/src/app/api/workflow/status/route.ts, apps/web/src/app/(app)/tyonohjaus/page.tsx, packages/application/src/usecases.ts, packages/application/src/ports.ts, packages/infrastructure/src/report.ts, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-031] LUKITTU: Workflow-sivut ja status-endpointit
- Summary: lisatty workflow-status use case ja API-endpointti; rakennettu tyonohjaus-nakyma status-korteilla; paivitetty navigointi ja ylataso-linkki; lisatty workflow-status integraatiotesti.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: integraatiotesti vaatii DATABASE_URL + SESSION_SECRET, muuten skip.

[2026-01-03] [HANDOFF] [L-20260103-031]
- Where we are: tyonohjaus-nakyma ja workflow-status API ovat kaytossa.
- What changed: uusi /tyonohjaus-sivu, /api/workflow/status-endpointti, report-portin workflow-status, integraatiotesti.
- What remains: halutessasi nayta tavoitearvio- ja mapping-tiedot workflow-korteilla tai lisaa lukitus-CTA.
- Next LUKITTU suggestion: workflow-polun lisatoiminnot (lukitus-CTA, tavoitearvio-kortti) tai raportin ryhmittely.
- Key files: apps/web/src/app/(app)/tyonohjaus/page.tsx, apps/web/src/app/api/workflow/status/route.ts, packages/application/src/usecases.ts, packages/application/src/ports.ts, packages/infrastructure/src/report.ts, packages/infrastructure/src/integration.test.ts, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-032] LUKITTU: Tyonohjauksen lukitus-CTA ja mapping-nosto
- Goal: lisata tyonohjaukseen lukitus-CTA ja tavoitearvio/mapping -nostot.
- Scope: UI.
- Deliverables: tyonohjaus-nakymaan lukitus-CTA ja tavoitearvio/mapping -kortti.
- Key files: apps/web/src/app/(app)/tyonohjaus/page.tsx, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-032] LUKITTU: Tyonohjauksen lukitus-CTA ja mapping-nosto
- Summary: lisatty tyonohjaukseen CTA seuraavaa vaihetta varten; lisatty tavoitearvio/mapping -kortti ja linkki; tyonohjauksen statuskortit nayttavat rivimaara- ja mapping-tiedot.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: integraatiotesti vaatii DATABASE_URL + SESSION_SECRET, muuten skip.

[2026-01-03] [HANDOFF] [L-20260103-032]
- Where we are: tyonohjaus-nakyma ohjaa seuraavaan vaiheeseen ja nostaa mapping/target summaryn.
- What changed: tyonohjaus-sivulle CTA-logiikka, tavoitearvio- ja mapping-summaryt, linkki tavoitearvioon.
- What remains: halutessasi tee CTA:sta suora lukitus-dialogi tai nosta mappingin puutteet (0-rivit) esiin.
- Next LUKITTU suggestion: tyonohjauksen lukitus-dialogi tai raportin ryhmittely UI:ssa.
- Key files: apps/web/src/app/(app)/tyonohjaus/page.tsx, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-033] LUKITTU: Tyonohjauksen lukitus-dialogi
- Goal: lisata tyonohjaukseen lukitus-dialogi ja lukituksen yhteenveto.
- Scope: UI.
- Deliverables: lukitus-dialogi ja lukituksen yhteenvetokentta tyonohjauksessa.
- Key files: apps/web/src/app/(app)/tyonohjaus/page.tsx, apps/web/src/ui/planning/LockPlanningDialog.tsx, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-033] LUKITTU: Tyonohjauksen lukitus-dialogi
- Summary: lisatty lukitus-dialogi tyonohjaukseen; lisatty lukituksen yhteenvetokentta ja palautestatus; paivitetty tyonohjauksen CTA lukitukseen.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: integraatiotesti vaatii DATABASE_URL + SESSION_SECRET, muuten skip.

[2026-01-03] [HANDOFF] [L-20260103-033]
- Where we are: tyonohjaus tarjoaa lukitus-dialogin, kun suunnitelma on READY_FOR_FORECAST.
- What changed: uusi LockPlanningDialog-komponentti, dialogin tyylit, tyonohjauksen CTA ohjaa dialogiin.
- What remains: halutessasi lisaa lukituksen vahvistusmodalin jälkeen automaattinen paivitys.
- Next LUKITTU suggestion: lukitus-dialogin auto-refresh tai raportin ryhmittely UI:ssa.
- Key files: apps/web/src/app/(app)/tyonohjaus/page.tsx, apps/web/src/ui/planning/LockPlanningDialog.tsx, apps/web/src/app/globals.css, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-034] LUKITTU: Perusta: migraatioanalyysi + ajettava web-runko + auth/RBAC/tenant + demo-roolit
- Goal: varmistaa pohjarakenteet ja health-tarkistus (health check) ennen seuraavia workflow (tyonkulku) -vaiheita.
- Scope: API (rajapinta) + Application (sovelluskerros) + Infrastructure (infrastruktuuri).
- Deliverables: health use case (terveystarkistus-kayttotapaus) ja infra (infrastruktuuri) -toteutus, health endpoint (terveystarkistus-paatepiste) -kytkenta, palvelukerros-paivitys.
- Key files: packages/application/src/ports.ts, packages/application/src/usecases.ts, packages/infrastructure/src/health.ts, apps/web/src/app/api/health/route.ts, apps/web/src/server/services.ts, packages/infrastructure/src/index.ts, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-034] LUKITTU: Perusta: migraatioanalyysi + ajettava web-runko + auth/RBAC/tenant + demo-roolit
- Summary: lisatty health use case (terveystarkistus-kayttotapaus) sovelluskerrokseen; lisatty infra (infrastruktuuri) -health repository (terveystarkistus-repositorio); /api/health kutsuu health-tarkistusta palvelukerroksen kautta.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: health-tarkistus palauttaa virheen, jos DATABASE_URL puuttuu tai yhteys katkeaa.

[2026-01-03] [HANDOFF] [L-20260103-034]
- Where we are: /api/health tarkistaa nyt db-yhteyden health use case (terveystarkistus-kayttotapaus) -ketjulla.
- What changed: lisatty health repository (terveystarkistus-repositorio) infraan ja kytketty AppServicesiin, paivitetty /api/health.
- What remains: LUKITTU #2 workflow-sivut + endpointit.
- Next LUKITTU suggestion: LUKITTU #2: workflow-sivut + endpointit + raportoinnin lisareitit.
- Key files: packages/application/src/usecases.ts, packages/infrastructure/src/health.ts, apps/web/src/app/api/health/route.ts, apps/web/src/server/services.ts, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-035] LUKITTU: Workflow: ennustetapahtuma-esto ilman suunnitelmaa
- Goal: varmistaa, etta ennustetapahtuma estyy ilman READY_FOR_FORECAST tai LOCKED -suunnitelmaa.
- Scope: Application (sovelluskerros) + Infrastructure (infrastruktuuri).
- Deliverables: planning-status (suunnitelman tila) -haku, ennusteen luonti estetaan sovelluskerroksessa, selkea virheilmoitus.
- Key files: packages/application/src/ports.ts, packages/application/src/usecases.ts, packages/infrastructure/src/planning.ts, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-035] LUKITTU: Workflow: ennustetapahtuma-esto ilman suunnitelmaa
- Summary: lisatty suunnitelman tilan haku sovelluskerrokseen; ennustetapahtuma estetaan ilman READY_FOR_FORECAST/LOCKED; virheilmoitus palautetaan API-kutsussa.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: DB-triggeri estaa edelleen ennusteen ilman suunnitelmaa, mutta nyt virheviesti on selkea jo sovelluskerroksessa.

[2026-01-03] [HANDOFF] [L-20260103-035]
- Where we are: ennustetapahtuma vaatii suunnitelman tilan READY_FOR_FORECAST tai LOCKED ennen luontia.
- What changed: lisatty planning-status-haku ja tarkistus createForecastEvent-kayttotapaukseen.
- What remains: halutessasi nayta suunnitelman tila ennuste-UI:ssa ennen tallennusta.
- Next LUKITTU suggestion: LUKITTU #3: ennuste-UI:n suunnitelma-tila + lukituksen esteviesti.
- Key files: packages/application/src/usecases.ts, packages/infrastructure/src/planning.ts, packages/application/src/ports.ts, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-036] LUKITTU: Ennuste-UI: suunnitelman tila + esto
- Goal: nayttaa suunnitelman tila ennuste-UI:ssa ja estaa tallennus ilman READY_FOR_FORECAST/LOCKED.
- Scope: UI (kayttoliittyma) + API (rajapinta) + Application (sovelluskerros).
- Deliverables: planning-status-API, UI-tilaennakko, tallennuksen esto ennen API-kutsua.
- Key files: apps/web/src/ui/forecast/ForecastForm.tsx, apps/web/src/app/api/planning/status/route.ts, packages/application/src/usecases.ts, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-036] LUKITTU: Ennuste-UI: suunnitelman tila + esto
- Summary: lisatty planning-status-API (suunnitelman tila -paatepiste); ennuste-UI nayttaa suunnitelman tilan; tallennus estyy ennen API-kutsua ilman READY_FOR_FORECAST/LOCKED.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: virhetilassa ennuste-UI lukitsee tallennuksen varmuuden vuoksi.

[2026-01-03] [HANDOFF] [L-20260103-036]
- Where we are: ennuste-UI tarkistaa suunnitelman tilan ennen tallennusta.
- What changed: uusi /api/planning/status -reitti ja UI-tilaennakko ennustelomakkeella.
- What remains: halutessasi nayta suunnitelman tila myös tyonohjauksessa ennusteen kortilla.
- Next LUKITTU suggestion: ennusteen tilakortti tyonohjaukseen tai lukituksen selite UI:hin.
- Key files: apps/web/src/ui/forecast/ForecastForm.tsx, apps/web/src/app/api/planning/status/route.ts, packages/application/src/usecases.ts, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-037] LUKITTU: Tyonohjaus: suunnitelman tila ennusteessa + lukituksen selite
- Goal: nayttaa suunnitelman tila ennustekortissa ja lukituksen selite tyonohjauksessa.
- Scope: UI (kayttoliittyma) + Application (sovelluskerros) + Infrastructure (infrastruktuuri).
- Deliverables: workflow-tilaan lisataan lukituksen selite, tyonohjauksen ennustekortti nayttaa suunnitelman tilan, lukitus-kortti nayttaa selitteen.
- Key files: packages/application/src/ports.ts, packages/infrastructure/src/report.ts, apps/web/src/app/(app)/tyonohjaus/page.tsx, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-037] LUKITTU: Tyonohjaus: suunnitelman tila ennusteessa + lukituksen selite
- Summary: lisatty lukituksen selite workflow-tilaan; tyonohjauksen ennustekortti nayttaa suunnitelman tilan; lukitus-kortti nayttaa selitteen.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: lukituksen selite tulee viimeisimmasta suunnitelmatapahtumasta.

[2026-01-03] [HANDOFF] [L-20260103-037]
- Where we are: tyonohjaus nayttaa suunnitelman tilan ja lukituksen selitteen.
- What changed: workflow-tilaan lisatty summary-kentta ja tyonohjaus paivitetty.
- What remains: halutessasi nosta lukituksen selite myos raportin yhteyteen.
- Next LUKITTU suggestion: raportin lukitusyhteenveto tai tyonohjauksen varoitus ilman suunnitelmaa.
- Key files: packages/application/src/ports.ts, packages/infrastructure/src/report.ts, apps/web/src/app/(app)/tyonohjaus/page.tsx, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-038] LUKITTU: Raportti: lukitusyhteenveto + varoitus ilman suunnitelmaa
- Goal: nayttaa raportissa lukituksen selite ja varoittaa, jos suunnitelma puuttuu.
- Scope: UI (kayttoliittyma).
- Deliverables: raportin tilakortti lukituksen selitteella, varoitus ilman suunnitelmaa, tyonohjauksen varoitus ilman suunnitelmaa.
- Key files: apps/web/src/app/(app)/raportti/page.tsx, apps/web/src/app/(app)/tyonohjaus/page.tsx, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-038] LUKITTU: Raportti: lukitusyhteenveto + varoitus ilman suunnitelmaa
- Summary: lisatty raportin tilakortti lukituksen selitteella; raportti varoittaa ilman suunnitelmaa; tyonohjaus nayttaa varoituksen ilman suunnitelmaa.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: raportin lukitusyhteenveto perustuu viimeisimpaan suunnitelmaan.

[2026-01-03] [HANDOFF] [L-20260103-038]
- Where we are: raportti nayttaa lukituksen selitteen ja varoituksen ilman suunnitelmaa.
- What changed: raportti paivitetty workflow-tilalla ja tyonohjaukseen lisatty varoitus.
- What remains: halutessasi nayta lukituksen selite myos lokin yhteydessa.
- Next LUKITTU suggestion: lokin suodatus suunnitelma/ennuste tai raportin lukitusyhteenveto historiasta.
- Key files: apps/web/src/app/(app)/raportti/page.tsx, apps/web/src/app/(app)/tyonohjaus/page.tsx, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-039] LUKITTU: Logout: tilallinen sessio + invalidointi
- Goal: korjata uloskirjautuminen niin, etta sessio mitatoidaan palvelimella.
- Scope: DB (tietokanta) + Infrastructure (infrastruktuuri) + UI (kayttoliittyma).
- Deliverables: sessions-taulu, auth-portin session-toteutus, logout-invalidointi, login-kuittaus.
- Key files: migrations/0025_sessions.sql, packages/infrastructure/src/auth.ts, apps/web/src/server/session.ts, apps/web/src/server/actions/auth.ts, apps/web/src/app/login/page.tsx, docs/adr/0011-stateful-sessions.md, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-039] LUKITTU: Logout: tilallinen sessio + invalidointi
- Summary: lisatty sessions-taulu ja auth-session tallennus; sessio-cookie sisaltaa session_id:n; uloskirjautuminen mitatoi session ja asettaa login-kuittauksen; integraatiotesti paivitetty session-rowilla.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: stateless-cookie poistui, session tarkistetaan DB:sta.

[2026-01-03] [HANDOFF] [L-20260103-039]
- Where we are: uloskirjautuminen mitatoi session palvelimella ja login nayttaa kuittauksen.
- What changed: lisatty sessions-taulu, auth-repositoryn session-toteutus ja session-id-cookie.
- What remains: halutessasi lisaa /api/logout tai session-listaus adminiin.
- Next LUKITTU suggestion: lokin suodatus suunnitelma/ennuste tai session-listaus adminiin.
- Key files: migrations/0025_sessions.sql, packages/infrastructure/src/auth.ts, apps/web/src/server/session.ts, apps/web/src/server/actions/auth.ts, docs/adr/0011-stateful-sessions.md, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-040] LUKITTU: Loki: suodatus suunnitelma/ennuste + selite riville
- Goal: lisata lokiin suodatus ja selite, jotta suunnitelma- ja ennustetapahtumat erottuvat.
- Scope: UI (kayttoliittyma) + Application (sovelluskerros) + Infrastructure (infrastruktuuri).
- Deliverables: lokisuodattimet (suunnitelma/ennuste), selite-sarake lokissa, audit-logi tukee action-filteria.
- Key files: apps/web/src/app/(app)/loki/page.tsx, packages/application/src/usecases.ts, packages/application/src/ports.ts, packages/infrastructure/src/report.ts, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-040] LUKITTU: Loki: suodatus suunnitelma/ennuste + selite riville
- Summary: lisatty lokisuodattimet suunnitelma/ennuste; audit-logi tukee action-filteria; selite nostetaan riville audit-payloadista; planning/forecast audit payloadiin lisatty summary.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: selite naytetaan audit payloadin summary-kentasta.

[2026-01-03] [HANDOFF] [L-20260103-040]
- Where we are: loki tukee suodatusta suunnitelma/ennuste ja selite nousee riville.
- What changed: lisatty loadFilteredAuditLog kayttotapaus, audit-logi suodattaa actionin mukaan, UI nayttaa selitteen.
- What remains: halutessasi lisaa suodatus useammille tapahtumatyypeille (esim. auth, work_phase).
- Next LUKITTU suggestion: LUKITTU: lokin suodatus laajemmille tapahtumille + suodatus parametreilla.
- Key files: apps/web/src/app/(app)/loki/page.tsx, packages/application/src/usecases.ts, packages/infrastructure/src/report.ts, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-041] LUKITTU: Ennuste: validoinnit + raportin KPI-tarkistus
- Goal: vahvistaa ennusteen syotto ja raportin KPI-arvojen esitys.
- Scope: UI (kayttoliittyma) + Application (sovelluskerros).
- Deliverables: ennusteen validoinnit palvelimella, KPI-arvojen muotoilu raportissa, virheilmoitukset suomeksi.
- Key files: apps/web/src/server/actions/forecast.ts, apps/web/src/ui/forecast/ForecastForm.tsx, apps/web/src/app/(app)/raportti/page.tsx, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-041] LUKITTU: Ennuste: validoinnit + raportin KPI-tarkistus
- Summary: lisatty palvelinpuolen validoinnit ennusteen syottoon; KPI ja numerot muotoillaan raportissa; KPI-arvo ei naytaudu, jos data puuttuu.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: ennusteen negatiiviset arvot ja valmiusprosenttien ylitykset estetaan.

[2026-01-03] [HANDOFF] [L-20260103-041]
- Where we are: ennusteen validoinnit ja raportin KPI-esitys ovat tiukemmat.
- What changed: lisatty ennusteen valmiusprosentti- ja arvorajaukset, KPI muotoilu ja varoitus logiikka raporttiin.
- What remains: halutessasi lisaa raportin KPI-summat tai graafinen nosto.
- Next LUKITTU suggestion: LUKITTU: raportin KPI-yhteenveto + ennusteen syoton testikierros.
- Key files: apps/web/src/server/actions/forecast.ts, apps/web/src/app/(app)/raportti/page.tsx, apps/web/src/ui/forecast/ForecastForm.tsx, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-042] LUKITTU: Raportti: KPI-yhteenveto + visuaalinen nosto
- Goal: lisata raporttiin KPI-yhteenveto ja visuaalinen nosto projektitasolle.
- Scope: UI (kayttoliittyma) + Application (sovelluskerros).
- Deliverables: KPI-yhteenvetokortti, muotoillut luvut ja selitteet raporttiin.
- Key files: apps/web/src/app/(app)/raportti/page.tsx, packages/application/src/usecases.ts, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-042] LUKITTU: Raportti: KPI-yhteenveto + visuaalinen nosto
- Summary: lisatty KPI-sparkline ja poikkeamavarit raporttiin; projektitason KPI-yhteenveto laajennettu.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: KPI-graafi skaalautuu suurimman projektitason luvun mukaan.

[2026-01-03] [HANDOFF] [L-20260103-042]
- Where we are: raportti nayttaa KPI-sparkline-graafin ja poikkeamavarit.
- What changed: lisatty KPI-sparkline ja poikkeamavari, laajennettu KPI-yhteenvetokortti.
- What remains: halutessasi lisaa tooltipit tai tarkemmat trendit.
- Next LUKITTU suggestion: LUKITTU: KPI-graafin tooltipit + poikkeamien selitteet.
- Key files: apps/web/src/app/(app)/raportti/page.tsx, apps/web/src/app/globals.css, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-043] LUKITTU: Raportti: KPI-tooltipit + poikkeamien selitteet
- Goal: lisata KPI-graafiin tooltipit ja poikkeamien selitteet raporttiin.
- Scope: UI (kayttoliittyma).
- Deliverables: tooltipit KPI-palkkeihin, poikkeaman selite tekstina KPI-korttiin.
- Key files: apps/web/src/app/(app)/raportti/page.tsx, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-043] LUKITTU: Raportti: KPI-tooltipit + poikkeamien selitteet
- Summary: lisatty tooltipit KPI-palkkeihin; poikkeamalle lisatty selite; tekstit suomeksi.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: tooltipit toteutettu title-atribuutilla.

[2026-01-03] [HANDOFF] [L-20260103-043]
- Where we are: raportti nayttaa KPI-tooltipit ja poikkeamien selitteet.
- What changed: lisatty title-tooltipit KPI-sparklineen ja poikkeaman selite.
- What remains: halutessasi tee omat tooltipit tai lisatiedot (esim. EV/AC* selite).
- Next LUKITTU suggestion: LUKITTU: omat tooltipit + KPI-selitekortit.
- Key files: apps/web/src/app/(app)/raportti/page.tsx, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-044] LUKITTU: Ennuste + loki + raportti (laaja testikierros)
- Goal: laajentaa ennusteen syoton tukea, lisata lokiin suodatusryhmat ja selitteet seka vahvistaa KPI-selitteet raportissa.
- Scope: UI (kayttoliittyma) + Application (sovelluskerros).
- Deliverables: ennusteen syoton ohjaus ja validoinnit, lokin laajat suodattimet, KPI-selitekortti raporttiin.
- Key files: apps/web/src/app/(app)/ennuste/page.tsx, apps/web/src/app/(app)/loki/page.tsx, apps/web/src/app/(app)/raportti/page.tsx, apps/web/src/ui/forecast/ForecastForm.tsx, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-044] LUKITTU: Ennuste + loki + raportti (laaja testikierros)
- Summary: lisatty lokin suodatusryhmat auth- ja tyovaihetapahtumille; lisatty ennusteen syoton ohjaus; lisatty KPI-selitekortti raporttiin; KPI-graafi saa tooltipit.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: KPI-selitteissa huomioidaan EV/AC*-poikkeama.

[2026-01-03] [HANDOFF] [L-20260103-044]
- Where we are: loki tukee useampaa suodatusryhmaa ja raportti selittaa KPI-mittarit.
- What changed: lokiin lisatty auth- ja tyovaihesuodattimet, ennustelomake ohjaa syottoa, raporttiin lisatty KPI-selitteet.
- What remains: halutessasi laajenna lokin suodattimia muille action-tyypeille ja lisaa ennusteen testiskenaariot dataan.
- Next LUKITTU suggestion: LUKITTU: ennusteen testiskenaariot + lokin suodatus lisatapahtumille.
- Key files: apps/web/src/app/(app)/loki/page.tsx, apps/web/src/ui/forecast/ForecastForm.tsx, apps/web/src/app/(app)/raportti/page.tsx, apps/web/src/app/globals.css, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [IN_PROGRESS] [L-20260103-045] LUKITTU: Handoff-yhteenveto keskustelusta
- Goal: tallentaa keskustelun handoff-yhteenveto repossa jatkon helpottamiseksi.
- Scope: Docs (dokumentaatio) + Process (prosessi).
- Deliverables: handoff-dokumentti ja CODEx-historia paivitys.
- Key files: docs/HANDOFF_20260103.md, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-045] LUKITTU: Handoff-yhteenveto keskustelusta
- Summary: lisatty handoff-yhteenveto tiedostoon; kirjattu historiaan.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: handoff kokoaa valmiit kokonaisuudet ja avoimet tehtavat.

[2026-01-03] [HANDOFF] [L-20260103-045]
- Where we are: handoff tallennettu erilliseen tiedostoon.
- What changed: lisatty docs/HANDOFF_20260103.md ja historia paivitetty.
- What remains: paivita handoff uuteen paivaan seuraavan session yhteydessa.
- Next LUKITTU suggestion: LUKITTU: ennusteen testiskenaariot dataan + lokin suodatus lisatapahtumille.
- Key files: docs/HANDOFF_20260103.md, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-03] [DONE] [L-20260103-042] LUKITTU: Raportti: KPI-yhteenveto + visuaalinen nosto
- Summary: lisatty KPI-yhteenvetokortti raporttiin; projektitason luvut muotoillaan; lukittujen ja viikkopaivitettyjen tyovaiheiden laskuri lisatty.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: KPI-yhteenveto perustuu v_report_project_current -nakymaan.

[2026-01-03] [HANDOFF] [L-20260103-042]
- Where we are: raportti nayttaa projektitason KPI-yhteenvetokortin.
- What changed: lisatty loadDashboard-kutsu ja KPI-yhteenveto UI:hin.
- What remains: halutessasi lisaa KPI-graafit tai poikkeamavari UI:hin.
- Next LUKITTU suggestion: LUKITTU: KPI-graafit + poikkeamavarit raporttiin.
- Key files: apps/web/src/app/(app)/raportti/page.tsx, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-04] [IN_PROGRESS] [L-20260104-046] LUKITTU: NPSS/cutover verifiointi tulosdokumentti
- Goal: dokumentoida NPSS/cutover-verifioinnin tulokset demo-projektille.
- Scope: Docs (dokumentaatio) + DB (tietokanta) + Tests (testit).
- Deliverables: docs/NPSS_CUTOVER_VERIFICATION_2026-01-04.md ja paivitetty docs/CODEX_HISTORY.md.
- Key files: docs/NPSS_CUTOVER_VERIFICATION_2026-01-04.md, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-04] [DONE] [L-20260104-046] LUKITTU: NPSS/cutover verifiointi tulosdokumentti
- Summary: verifiointitulokset dokumentoitu; SQL-ajo kuvattu; COST-only vs NPSS opening -summat kirjattu.
- Tests: npm run lint (pending); npm run typecheck (pending); npm run test (pending).
- Notes: COST-only 5662555.33, NPSS opening 5635055.33, kuukausiketjussa 0 NPSS-rivia.

[2026-01-04] [HANDOFF] [L-20260104-046]
- Where we are: NPSS/cutover-verifiointi dokumentoitu Demo projekti A:lle.
- What changed: lisatty docs/NPSS_CUTOVER_VERIFICATION_2026-01-04.md ja paivitetty docs/CODEX_HISTORY.md.
- What remains: vahvista haluttu raportointinakyma ja mahdollinen ADR-tarkennus.
- Next LUKITTU suggestion: LUKITTU: raporttinakyma ja selitteet NPSS/cutover-erottelulle.
- Key files: docs/NPSS_CUTOVER_VERIFICATION_2026-01-04.md, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-04] [DONE] [L-20260104-046] LUKITTU: NPSS/cutover verifiointi tulosdokumentti (test update)
- Summary: testit ajettu ja onnistui.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: paivitys aiemman DONE-merkinnan testitilaan.

[2026-01-04] [IN_PROGRESS] [L-20260104-047] LUKITTU: Handoff NPSS/cutover verifioinnista
- Goal: tuottaa handoff-dokumentti ja kytkea se historiaan.
- Scope: Docs (dokumentaatio) + Tests (testit).
- Deliverables: docs/HANDOFF_20260104.md ja paivitetty docs/CODEX_HISTORY.md.
- Key files: docs/HANDOFF_20260104.md, docs/CODEX_HISTORY.md
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-04] [DONE] [L-20260104-047] LUKITTU: Handoff NPSS/cutover verifioinnista
- Summary: handoff lisatty; historia paivitetty.
- Tests: npm run lint (pending); npm run typecheck (pending); npm run test (pending).
- Notes: seuraava fokus raporttinakyma ja cutover-audit.

[2026-01-04] [HANDOFF] [L-20260104-047]
- Where we are: NPSS/cutover-verifioinnin tulokset dokumentoitu, handoff kirjoitettu.
- What changed: lisatty docs/HANDOFF_20260104.md ja paivitetty docs/CODEX_HISTORY.md.
- What remains: raporttinakyman selitteet ja cutover-audit paatos.
- Next LUKITTU suggestion: LUKITTU: raporttinakyma ja selitteet NPSS/cutover-erottelulle.
- Key files: docs/HANDOFF_20260104.md, docs/NPSS_CUTOVER_VERIFICATION_2026-01-04.md, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-04] [SESSION_START] main e7ba9c7
- Active LUKITTU: L-20260104-048
- History tail: viimeisin HANDOFF L-20260104-047 (NPSS/cutover-verifiointi handoff)
- Repo: clean, no ahead/behind
- DB status: unknown
- Next action: kartoita HENKI-MVP LUKITTU #1 deliverable-tila ja käynnista migraatioanalyysi + runko

[2026-01-04] [PROGRESS] [L-20260104-048] Session start + state
- What I did: luotu .codex/state.json; lisatty SESSION_START; tarkistettu git-tila ja historia.
- Key files: .codex/state.json, docs/CODEX_HISTORY.md
- Tests run: ei ajettu (ei pyyntoa)
- Next: kartoita HENKI-MVP LUKITTU #1 deliverable-tila ja tee suunnitelma

[2026-01-04] [PROGRESS] [L-20260104-048] db:status-skripti lisatty
- What I did: lisasin tools/scripts/db-status.mjs; lisasin npm-skriptin db:status; paivitin .codex/state.json.
- Key files: tools/scripts/db-status.mjs, package.json, .codex/state.json, docs/CODEX_HISTORY.md
- Tests run: ei ajettu (DB-yhteys puuttuu)
- Next: aja npm run db:status ja tarkista .env.example + tenant-isolation testit

[2026-01-04] [PROGRESS] [L-20260104-048] APP_PORT-linjaus pidetaan ennallaan
- What I did: kirjattu paatos pitaa APP_PORT=3001 ennallaan koska 3000-URL toimii.
- Key files: .codex/state.json, docs/CODEX_HISTORY.md
- Tests run: npm run db:status (ok)
- Next: tarkista .env.example + tenant-isolation testit ja jatka LUKITTU #1 auditointia

[2026-01-04] [PROGRESS] [L-20260104-048] Health ja me -auditointi tehty
- What I did: tarkistettu /api/health ja /api/me virheilmoitukset ja suomenkielisyys; ei muutoksia.
- Key files: apps/web/src/app/api/health/route.ts, apps/web/src/app/api/me/route.ts, docs/CODEX_HISTORY.md
- Tests run: ei ajettu
- Next: jatka audit-loki- ja raportointireitteihin tai tee puutteiden koonti

[2026-01-04] [PROGRESS] [L-20260104-048] Audit-loki ja raportointireitit tarkistettu
- What I did: tarkistettu /api/audit ja /api/report/* virheilmoitukset + permissionit; ei muutoksia.
- Key files: apps/web/src/app/api/audit/route.ts, apps/web/src/app/api/report/forecast/route.ts, apps/web/src/app/api/report/planning/route.ts, apps/web/src/app/api/report/target-estimate/route.ts, apps/web/src/app/api/report/mapping-lines/route.ts, apps/web/src/app/api/report/work-phases/route.ts, docs/CODEX_HISTORY.md
- Tests run: ei ajettu
- Next: koosta LUKITTU #1 puutelista ja tarvittavat muutokset

[2026-01-04] [PROGRESS] [L-20260104-048] LUKITTU #1 puutelista koottu
- What I did: koottu LUKITTU #1 deliverable-tila; tunnistettu puutteet ja valmiit kohdat.
- Key files: docs/CODEX_HISTORY.md
- Tests run: ei ajettu
- Next: paata tarvittavat korjaukset tai siirry LUKITTU #2 suunnitteluun

[2026-01-04] [DONE] [L-20260104-048] LUKITTU: Perusta: migraatioanalyysi + ajettava web-runko + auth/RBAC/tenant + demo-roolit + katkosjatko
- Summary: db:status lisatty ja ajettu; auth/RBAC/tenant + demo-login auditoitu; health/me + audit/report reitit varmistettu; katkosjatko paivitetty.
- Tests: npm run db:status (ok); npm run lint (pending); npm run typecheck (pending); npm run test (pending).
- Notes: APP_PORT pidetaan 3001 (.env), vaikka 3000-URL toimii reitityksella; pending-migraatioita 0.

[2026-01-04] [HANDOFF] [L-20260104-048]
- Where we are: LUKITTU #1 valmis; pohja kasassa ja auditit tehty.
- What changed: db:status-skripti ja auditointimerkinnat lisatty; katkosjatko paivitetty.
- What remains: suoritettavat lint/typecheck/test jos halutaan DoD valmiiksi.
- Next LUKITTU suggestion: LUKITTU: workflow-sivut + endpointit (suunnitelma -> ennustetapahtuma -> lukitus -> loki -> raportti).
- Key files: tools/scripts/db-status.mjs, docs/CODEX_HISTORY.md, apps/web/src/app/(app)/suunnittelu/page.tsx, apps/web/src/app/(app)/ennuste/page.tsx, apps/web/src/app/(app)/tyonohjaus/page.tsx
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-04] [IN_PROGRESS] [L-20260104-049] LUKITTU: Workflow-sivut + endpointit
- Goal: tarkentaa MVP-tyonohjausvirran sivut ja endpointit (suunnitelma -> ennustetapahtuma -> lukitus -> loki -> raportti).
- Scope: UI + API + Docs.
- Deliverables: suunnittelukartoitus ja puutteiden paikkaus.
- Key files: apps/web/src/app/(app)/suunnittelu/page.tsx, apps/web/src/app/(app)/ennuste/page.tsx, apps/web/src/app/(app)/tyonohjaus/page.tsx, apps/web/src/app/(app)/loki/page.tsx, apps/web/src/app/(app)/raportti/page.tsx
- Tests (planned): npm run lint; npm run typecheck; npm run test

[2026-01-04] [PROGRESS] [L-20260104-049] LUKITTU #2 aloitettu
- What I did: suljettu LUKITTU #1 DONE + HANDOFF; avattu LUKITTU #2 IN_PROGRESS; paivitetty .codex/state.json.
- Key files: docs/CODEX_HISTORY.md, .codex/state.json
- Tests run: ei ajettu
- Next: laadi workflow-sivut + endpointit kartoitus ja toteutusjarjestys

[2026-01-04] [PROGRESS] [L-20260104-049] /api/report/planning fallback lisatty
- What I did: lisasin fallbackin v_planning_current -nakymaan, jos v_report_planning_current puuttuu (SQLSTATE 42P01).
- Key files: packages/infrastructure/src/report.ts, docs/CODEX_HISTORY.md
- Tests run: ei ajettu
- Next: testaa /api/report/planning uudelleen ja varmista 502 korjattu

[2026-01-04] [PROGRESS] [L-20260104-049] /api/report/planning verifioitu
- What I did: kayttaja vahvisti /api/report/planning palauttaa 200 + JSON-rivit kirjautuneena; 502 poistui.
- Key files: docs/CODEX_HISTORY.md
- Tests run: manuaali UI-kavely (login + /api/report/planning)
- Next: paata lint/typecheck/test ajosta tai jatka seuraaviin LUKITTU #2 tehtaviin

[2026-01-04] [PROGRESS] [L-20260104-049] Endpointit verifioitu (2-9)
- What I did: kayttaja vahvisti /api/me 401 + suomenkielinen virhe; /api/health ok; /api/report/planning/forecast/target-estimate/mapping-lines/work-phases ok; /api/audit palautti tapahtumat.
- Key files: docs/CODEX_HISTORY.md
- Tests run: manuaali UI-kavely (login + API-kutsut)
- Next: paata lint/typecheck/test ajosta tai jatka workflow-kartoitusta

[2026-01-04] [PROGRESS] [L-20260104-049] UI-kavely vahvistettu (tyonohjauspolku)
- What I did: kirjattu kayttajan manuaalinen UI-kavely (login, tyonohjaus, suunnittelu, ennuste, loki, raportti) onnistuneeksi.
- Key files: docs/CODEX_HISTORY.md
- Tests run: manuaali UI-kavely (https://refactored-train-x5xggp94wrxx2v7q9-3000.app.github.dev/login -> /tyonohjaus -> /suunnittelu -> /ennuste -> /loki -> /raportti)
- Next: paata LUKITTU #2 sulkeminen (DONE + HANDOFF) tai jatkotoimet

[2026-01-04] [PROGRESS] [L-20260104-049] UI-kavely vahvistettu (step 5)
- What I did: kayttaja vahvisti uuden suunnitelman (1450 Ponttaus) + ennusteen (1100 Runko) luomisen, lokimerkinnat ja KPI-raportin nakymisen.
- Key files: docs/CODEX_HISTORY.md
- Tests run: manuaali UI-kavely (https://refactored-train-x5xggp94wrxx2v7q9-3000.app.github.dev/login -> /tyonohjaus -> /suunnittelu -> /ennuste -> /loki -> /raportti)
- Next: paata LUKITTU #2 sulkeminen (DONE + HANDOFF) tai jatkotoimet

[2026-01-04] [DONE] [L-20260104-049] LUKITTU: Workflow-sivut + endpointit
- Summary: workflow-polku UI/endpointit kartoitettu ja verifioitu; /api/report/planning korjattu fallbackilla; UI-kavelyt vahvistettu.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: /api/me 401 + suomenkielinen virhe ok; /api/report/* palauttaa dataa kirjautuneena.

[2026-01-04] [HANDOFF] [L-20260104-049]
- Where we are: workflow-sivut ja endpointit vahvistettu; LUKITTU #2 valmis.
- What changed: report-planning fallback lisatty; UI/endpoint-verifioinnit kirjattu.
- What remains: mahdolliset lisaparannukset (esim. mapping-versions endpointin UI-avaus).
- Next LUKITTU suggestion: LUKITTU: seuraavat workflow-sivut/endpointit tai lisaparannukset raportointiin.
- Key files: packages/infrastructure/src/report.ts, apps/web/src/app/(app)/tyonohjaus/page.tsx, apps/web/src/app/(app)/suunnittelu/page.tsx, apps/web/src/app/(app)/ennuste/page.tsx, apps/web/src/app/(app)/loki/page.tsx, apps/web/src/app/(app)/raportti/page.tsx, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-04] [PROGRESS] [L-20260104-050] LUKITTU #3 aloitus
- What I did: suljettu LUKITTU #2 DONE + HANDOFF; alustettu uusi LUKITTU #3.
- Key files: docs/CODEX_HISTORY.md, .codex/state.json
- Tests run: ei ajettu
- Next: maarita LUKITTU #3 tavoite ja deliverablet

[2026-01-04] [PROGRESS] [L-20260104-050] Mapping-versiot UI lisatty
- What I did: lisasin mapping-versioiden listauksen tavoitearvio-sivulle (status, voimassaolo, peruste, hyvaksynta, luotu).
- Key files: apps/web/src/app/(app)/tavoitearvio/page.tsx, docs/CODEX_HISTORY.md
- Tests run: ei ajettu
- Next: paata LUKITTU #3 sulkeminen tai jatkotoimet

[2026-01-04] [PROGRESS] [L-20260104-050] Mapping-versiot UI verifioitu
- What I did: kayttaja vahvisti /login, /tyonohjaus, /suunnittelu, /ennuste, /loki, /raportti toimivat; mapping-versiot nakyvat tavoitearviossa.
- Key files: docs/CODEX_HISTORY.md
- Tests run: manuaali UI-kavely (https://refactored-train-x5xggp94wrxx2v7q9-3000.app.github.dev/login -> /tyonohjaus -> /suunnittelu -> /ennuste -> /loki -> /raportti)
- Next: paata LUKITTU #3 sulkeminen (DONE + HANDOFF)

[2026-01-04] [DONE] [L-20260104-050] LUKITTU: Mapping-versiot UI
- Summary: mapping-versiot lisatty tavoitearvio-sivulle; UI-kavelyt vahvistettu.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: mapping-versiot nakyvat tavoitearviossa.

[2026-01-04] [HANDOFF] [L-20260104-050]
- Where we are: mapping-versiot UI valmis; LUKITTU #3 suljettu.
- What changed: tavoitearvio-sivulle lisatty mapping-versiot taulukko; verifiointi kirjattu.
- What remains: mahdolliset UI-parannukset (esim. suodatus/sivutus).
- Next LUKITTU suggestion: LUKITTU: UI-parannukset tai raportoinnin lisaselitteet.
- Key files: apps/web/src/app/(app)/tavoitearvio/page.tsx, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-04] [PROGRESS] [L-20260104-051] LUKITTU #4 aloitus
- What I did: suljettu LUKITTU #3 DONE + HANDOFF; alustettu uusi LUKITTU #4.
- Key files: docs/CODEX_HISTORY.md, .codex/state.json
- Tests run: ei ajettu
- Next: maarita LUKITTU #4 tavoite ja deliverablet

[2026-01-04] [PROGRESS] [L-20260104-051] Tavoitearvio-suodatus lisatty
- What I did: lisasin suodatuskentat tavoitearvio-, mapping- ja mapping-versiot taulukoihin query-parametrilla q.
- Key files: apps/web/src/app/(app)/tavoitearvio/page.tsx, docs/CODEX_HISTORY.md
- Tests run: ei ajettu
- Next: verifioi suodatus UI:ssa ja paata LUKITTU #4 sulkeminen

[2026-01-04] [PROGRESS] [L-20260104-051] Tavoitearvio-suodatus verifioitu
- What I did: kayttaja vahvisti suodatus (q=1100) ja nollaus toimivat tavoitearvio-sivulla.
- Key files: docs/CODEX_HISTORY.md
- Tests run: manuaali UI-kavely (https://refactored-train-x5xggp94wrxx2v7q9-3000.app.github.dev/login -> /tavoitearvio)
- Next: paata LUKITTU #4 sulkeminen (DONE + HANDOFF)

[2026-01-04] [DONE] [L-20260104-051] LUKITTU: Tavoitearvio-suodatus
- Summary: lisatty suodatus tavoitearvio-sivulle; suodatus ja nollaus verifioitu.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: q=1100 suodattaa Runko-rivit.

[2026-01-04] [HANDOFF] [L-20260104-051]
- Where we are: tavoitearvio-suodatus valmis; LUKITTU #4 suljettu.
- What changed: tavoitearvio-sivulle lisatty suodatus; verifiointi kirjattu.
- What remains: mahdolliset lisasuodattimet (mapping-versiot erillinen haku).
- Next LUKITTU suggestion: LUKITTU: lisasuodattimet tai UI-viimeistelyt.
- Key files: apps/web/src/app/(app)/tavoitearvio/page.tsx, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-04] [PROGRESS] [L-20260104-052] LUKITTU #5 aloitus
- What I did: suljettu LUKITTU #4 DONE + HANDOFF; alustettu uusi LUKITTU #5.
- Key files: docs/CODEX_HISTORY.md, .codex/state.json
- Tests run: ei ajettu
- Next: maarita LUKITTU #5 tavoite ja deliverablet

[2026-01-04] [PROGRESS] [L-20260104-052] Mapping-versioille oma suodatus
- What I did: lisasin mapping-versioille oman mv-hakukentan tavoitearvio-sivulle.
- Key files: apps/web/src/app/(app)/tavoitearvio/page.tsx, docs/CODEX_HISTORY.md
- Tests run: ei ajettu
- Next: verifioi mapping-versioiden suodatus UI:ssa ja paata LUKITTU #5 sulkeminen

[2026-01-04] [PROGRESS] [L-20260104-052] Mapping-versioiden suodatus verifioitu
- What I did: kayttaja vahvisti mv-suodatus toimii (demo mapping/ACTIVE); nollaus palauttaa; tavoitearvio-taulukko pysyy ennallaan.
- Key files: docs/CODEX_HISTORY.md
- Tests run: manuaali UI-kavely (https://refactored-train-x5xggp94wrxx2v7q9-3000.app.github.dev/login -> /tavoitearvio)
- Next: sulje LUKITTU #5 (DONE + HANDOFF)

[2026-01-04] [DONE] [L-20260104-052] LUKITTU: Mapping-versiot suodatus
- Summary: lisatty mv-suodatus mapping-versioille; suodatus ja nollaus verifioitu.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: mv-haku ei vaikuta tavoitearvio-taulukkoon.

[2026-01-04] [HANDOFF] [L-20260104-052]
- Where we are: mapping-versioiden suodatus valmis; LUKITTU #5 suljettu.
- What changed: mapping-versioille oma hakukentta; verifiointi kirjattu.
- What remains: mahdolliset lisaparannukset (esim. suodattimien yhdistaminen).
- Next LUKITTU suggestion: LUKITTU: UI-viimeistelyt tai raportoinnin lisaselitteet.
- Key files: apps/web/src/app/(app)/tavoitearvio/page.tsx, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-04] [PROGRESS] [L-20260104-053] LUKITTU #6 aloitus
- What I did: suljettu LUKITTU #5 DONE + HANDOFF; alustettu uusi LUKITTU #6.
- Key files: docs/CODEX_HISTORY.md, .codex/state.json
- Tests run: ei ajettu
- Next: maarita LUKITTU #6 tavoite ja deliverablet

[2026-01-04] [PROGRESS] [L-20260104-053] Tavoitearvio-taulukoiden tiivistys + rivilaskurit
- What I did: lisasin table-compact-tyylin ja rivilaskurit tavoitearvio-, mapping- ja mapping-versiot taulukoihin.
- Key files: apps/web/src/app/(app)/tavoitearvio/page.tsx, apps/web/src/app/globals.css, docs/CODEX_HISTORY.md
- Tests run: ei ajettu
- Next: verifioi UI-nakyma ja paata LUKITTU #6 sulkeminen

[2026-01-04] [PROGRESS] [L-20260104-053] Tavoitearvio-tiiviys verifioitu
- What I did: kayttaja vahvisti rivilaskurit (417/3/1) ja taulukoiden tiiviin rivikorkeuden.
- Key files: docs/CODEX_HISTORY.md
- Tests run: manuaali UI-kavely (https://refactored-train-x5xggp94wrxx2v7q9-3000.app.github.dev/login -> /tavoitearvio)
- Next: sulje LUKITTU #6 (DONE + HANDOFF)

[2026-01-04] [DONE] [L-20260104-053] LUKITTU: UI-viimeistelyt (tavoitearvio)
- Summary: lisatty table-compact + rivilaskurit; UI verifioitu.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: rivilaskurit 417/3/1 ja tiiviit rivit vahvistettu.

[2026-01-04] [HANDOFF] [L-20260104-053]
- Where we are: tavoitearvio UI-viimeistelyt valmiit; LUKITTU #6 suljettu.
- What changed: table-compact-tyyli + rivilaskurit lisatty; verifiointi kirjattu.
- What remains: mahdolliset muut UI-viimeistelyt.
- Next LUKITTU suggestion: LUKITTU: seuraavat UI-parannukset tai raportoinnin lisaselitteet.
- Key files: apps/web/src/app/(app)/tavoitearvio/page.tsx, apps/web/src/app/globals.css, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-04] [PROGRESS] [L-20260104-054] LUKITTU #7 aloitus
- What I did: suljettu LUKITTU #6 DONE + HANDOFF; alustettu uusi LUKITTU #7.
- Key files: docs/CODEX_HISTORY.md, .codex/state.json
- Tests run: ei ajettu
- Next: maarita LUKITTU #7 tavoite ja deliverablet

[2026-01-04] [DONE] [L-20260104-054] LUKITTU: Handoff + prompt-ohjaus
- Summary: handoff-dokumentti kirjoitettu; koottu selvitys kayttajan prompt-ohjauksista.
- Tests: npm run lint (ok); npm run typecheck (ok); npm run test (ok).
- Notes: LUKITTU #7 fokus paattamatta.

[2026-01-04] [HANDOFF] [L-20260104-054]
- Where we are: handoff valmis; LUKITTU #7 odottaa fokusta.
- What changed: lisatty docs/HANDOFF_20260104_LUKITTU7.md ja historia paivitetty.
- What remains: paata LUKITTU #7 fokus.
- Next LUKITTU suggestion: LUKITTU: UI-parannukset tai raportoinnin lisaselitteet.
- Key files: docs/HANDOFF_20260104_LUKITTU7.md, docs/CODEX_HISTORY.md
- How to resume: npm run lint; npm run typecheck; npm run test

[2026-01-04] [PROGRESS] [L-20260104-055] LUKITTU #8 aloitus
- What I did: suljettu LUKITTU #7 handoffilla; alustettu uusi LUKITTU #8.
- Key files: docs/CODEX_HISTORY.md, .codex/state.json
- Tests run: ei ajettu
- Next: maarita LUKITTU #8 tavoite ja deliverablet

[2026-01-04] [SESSION_START] main 950ba6e
- Active LUKITTU: L-20260104-055
- History tail: [PROGRESS] [L-20260104-055] LUKITTU #8 aloitus
- Repo: dirty, ahead 0/behind 0
- DB status: pending 0 (applied 27)
- Next action: aja migraatiot/seed ja UI-workflow-testi SELLER-roolille

[2026-01-04] [PROGRESS] [L-20260104-055] UI-workflow-testi (SELLER)
- What I did: ajoin 0010_migraation ja demo-seedauksen; ajoin UI-workflow-testin (fail); korjasin set-cookie parsimisen; ajoin testin uudelleen (fail /sales 500).
- Key files: tools/scripts/ui-workflow-test.mjs, tools/scripts/db-seed-demo.mjs, migrations/0010_add_seller_role.sql, docs/CODEX_HISTORY.md
- Tests run: DATABASE_URL=... node tools/scripts/db-migrate.mjs; DATABASE_URL=... node tools/scripts/db-seed-demo.mjs; BASE_URL=... node tools/scripts/ui-workflow-test.mjs (fail: /sales 500)
- Next: selvita miksi /api/login ja /sales palauttavat 500 Codespaces-ymparistossa; aja UI-testi uudelleen

[2026-01-04] [PROGRESS] [L-20260104-055] UI-workflow-testi korjattu
- What I did: korjasin /sales-sivun import-polun; ajoin UI-workflow-testin onnistuneesti kaikille rooleille.
- Key files: apps/web/src/app/sales/page.tsx, tools/scripts/ui-workflow-test.mjs, docs/CODEX_HISTORY.md
- Tests run: BASE_URL=... ROLE_SUFFIX=a PIN=1234 node tools/scripts/ui-workflow-test.mjs (ok)
- Next: commitoi muutokset ja paivita state.json

[2026-01-04] [SESSION_START] main 2fedbca
- Active LUKITTU: L-20260104-055
- History tail: [PROGRESS] [L-20260104-055] UI-workflow-testi korjattu
- Repo: clean, ahead 0/behind 0
- DB status: unknown
- Next action: tarkista LUKITTU #1 deliverablet ja paata seuraavat tyot

[2026-01-04] [PROGRESS] [L-20260104-055] Repo-hygienia: uudet tiedostot seurantaan
- What I did: lisasin .vscode-asetukset, testidata-csv:t ja zip-paketin seurantaan kayttajan pyynnosta.
- Key files: .vscode/settings.json, excel/testdata_generated_kaarna/bad_codes.csv, excel/testdata_generated_kaarna/broken_totals.csv, excel/testdata_generated_kaarna/duplicates_conflicts.csv, excel/testdata_generated_kaarna/numbers_formats.csv, excel/testdata_generated_kaarna/seed_control.csv, excel/testdata_generated_kaarna/text_encoding.csv, generate_testdata_from_tavoitearvio.py, testdata_generated_kaarna.zip, docs/CODEX_HISTORY.md
- Tests run: ei ajettu
- Next: tarkista LUKITTU #1 deliverablet ja paata seuraavat tyot

[2026-01-04] [PROGRESS] [L-20260104-055] DB-status yritetty
- What I did: ajoin npm run db:status, mutta DATABASE_URL puuttui.
- Key files: tools/scripts/db-status.mjs, docs/CODEX_HISTORY.md
- Tests run: npm run db:status (fail: DATABASE_URL puuttuu)
- Next: pyyda DATABASE_URL tai paata ohitetaanko DB-status

[2026-01-04] [PROGRESS] [L-20260104-055] DB-status ok + seed-muutos hyvaksytty
- What I did: ajoin db:status onnistuneesti (.env DATABASE_URL); jatkan db-seed-demo.mjs laajennuksen kanssa.
- Key files: tools/scripts/db-status.mjs, tools/scripts/db-seed-demo.mjs, docs/CODEX_HISTORY.md
- Tests run: DATABASE_URL=postgresql://codex:codex@127.0.0.1:5433/codex npm run db:status (ok)
- Next: paata LUKITTU #1 jatko ja arvioi tarvittavat muutokset

[2026-01-04] [SESSION_START] main 73bf8c9
- Active LUKITTU: L-20260104-055
- History tail: [PROGRESS] [L-20260104-055] DB-status ok + seed-muutos hyvaksytty
- Repo: dirty, ahead 0/behind 0
- DB status: unknown
- Next action: kirjaa LUKITTU #1 deliverablet ja aloita migraatioanalyysi

[2026-01-04] [PROGRESS] [L-20260104-055] Session-start + tila paivitetty
- What I did: kirjattu SESSION_START ja paivitetty .codex/state.json jatkoa varten.
- Key files: docs/CODEX_HISTORY.md, .codex/state.json
- Tests run: ei ajettu
- Next: tarkenna LUKITTU #1 deliverablet ja aloita migraatioanalyysi

[2026-01-04] [PROGRESS] [L-20260104-055] Migraatioanalyysi paivitetty (0025-0027)
- What I did: lisasin migraatioanalyysiin sessions-, import staging- ja konserni-onboarding -muutokset.
- Key files: docs/MIGRATION_LOGIC_ANALYSIS.md, docs/CODEX_HISTORY.md
- Tests run: ei ajettu
- Next: tarkenna LUKITTU #1 deliverablet (web-runko + auth/RBAC/tenant + demo-roolit)

[2026-01-04] [PROGRESS] [L-20260104-055] LUKITTU #1 tilannekuva kirjattu
- What I did: lisasin LUKITTU #1 deliverable-status -dokumentin.
- Key files: docs/LUKITTU1_STATUS.md, docs/CODEX_HISTORY.md
- Tests run: ei ajettu
- Next: paata seuraava LUKITTU #1 korjaus tai varmennus (db:status / UI-kavely)

[2026-01-04] [PROGRESS] [L-20260104-055] DB-status ok
- What I did: ajoin db:status .env DATABASE_URL:lla.
- Key files: tools/scripts/db-status.mjs, docs/CODEX_HISTORY.md
- Tests run: DATABASE_URL=postgresql://codex:codex@127.0.0.1:5433/codex npm run db:status (ok, pending 0)
- Next: suorita UI-kavely ja valmistele LUKITTU #1 sulku

[2026-01-04] [PROGRESS] [L-20260104-055] UI-kavely-aukko kirjattu
- What I did: paivitin LUKITTU #1 tilannekuvaan UI-kavelyn puutteen ja katselmoin kirjautumisen muutokset.
- Key files: docs/LUKITTU1_STATUS.md, apps/web/src/app/login/login-form.tsx, apps/web/src/server/actions/auth.ts
- Tests run: ei ajettu
- Next: sulje LUKITTU #1 ilman UI-kavelya (kayttajan pyynto)

[2026-01-04] [DONE] [L-20260104-055] LUKITTU #1: migraatioanalyysi + web-runko + auth/RBAC/tenant + demo-roolit
- Summary: migraatioanalyysi paivitetty (0025-0027); LUKITTU #1 status-dokki lisatty; db:status vahvistettu.
- Tests: DATABASE_URL=postgresql://codex:codex@127.0.0.1:5433/codex npm run db:status (ok, pending 0); UI-kavely (ei suoritettu, NEXT_REDIRECT).
- Notes: kirjautumisen demo- ja virheloki-parannukset lisatty (kayttajan muutos); UI-kavely jaa auki.

[2026-01-04] [HANDOFF] [L-20260104-055]
- Where we are: LUKITTU #1 suljettu ilman UI-kavelya; db:status ok; kirjautumisen demo/virheloki-muutokset mukana.
- What changed: migraatioanalyysi paivitetty; LUKITTU #1 status-dokki lisatty; login UI + auth error log laajennettu (kayttajan muutos).
- What remains: selvita NEXT_REDIRECT kirjautumisessa ja tee UI-kavely (login -> roolireititys -> raportit).
- Next LUKITTU suggestion: LUKITTU: kirjautumisen NEXT_REDIRECT-juurisyyn korjaus + UI-kavely.
- Key files: docs/MIGRATION_LOGIC_ANALYSIS.md, docs/LUKITTU1_STATUS.md, apps/web/src/app/login/login-form.tsx, apps/web/src/server/actions/auth.ts
- How to resume: npm run db:status; yrita kirjautumista demo-tunnuksilla (PIN 1234)

[2026-01-04] [SESSION_START] main 2f27f0f
- Active LUKITTU: L-20260104-056
- History tail: [HANDOFF] [L-20260104-055]
- Repo: dirty, ahead 0/behind 0
- DB status: pending 0 (applied 28)
- Next action: selvita NEXT_REDIRECT kirjautumisessa ja tee UI-kavely

[2026-01-04] [PROGRESS] [L-20260104-056] LUKITTU aloitus
- What I did: aloitettu NEXT_REDIRECT-selvityksen LUKITTU ja paivitetty tila.
- Key files: docs/CODEX_HISTORY.md, .codex/state.json
- Tests run: ei ajettu
- Next: kerää virheloki (selain + server) ja toista kirjautuminen

[2026-01-04] [PROGRESS] [L-20260104-056] UI-kavely onnistui
- What I did: kirjattu kayttajan vahvistus onnistuneesta UI-kavelysta.
- Key files: docs/CODEX_HISTORY.md
- Tests run: UI-kavely (ok, login + roolireititys)
- Next: sulje LUKITTU #2

[2026-01-04] [DONE] [L-20260104-056] LUKITTU: NEXT_REDIRECT tarkistus + UI-kavely
- Summary: UI-kavely vahvistettu; NEXT_REDIRECT ei toistunut kayttajan mukaan.
- Tests: UI-kavely (ok, login + roolireititys).
- Notes: ei kerattyja logeja, koska ongelma ei toistunut.

[2026-01-04] [HANDOFF] [L-20260104-056]
- Where we are: LUKITTU #2 suljettu; kirjautuminen toimii kayttajan mukaan.
- What changed: ei koodimuutoksia; paivitetty historia ja tila.
- What remains: jos NEXT_REDIRECT palaa, kerää logit (selain + server).
- Next LUKITTU suggestion: LUKITTU: vahvista kirjautumisen polut ja dokumentoi, jos virhe uusii.
- Key files: docs/CODEX_HISTORY.md
- How to resume: yrita kirjautumista demo-tunnuksilla (PIN 1234)

[2026-01-04] [SESSION_START] main 506d692
- Active LUKITTU: L-20260104-057
- History tail: [HANDOFF] [L-20260104-056]
- Repo: dirty, ahead 0/behind 0
- DB status: unknown
- Next action: vahvista kirjautumisen polut ja kokoa logien keruuohje

[2026-01-04] [PROGRESS] [L-20260104-057] LUKITTU aloitus
- What I did: aloitettu kirjautumisen polkujen vahvistuksen LUKITTU ja paivitetty tila.
- Key files: docs/CODEX_HISTORY.md, .codex/state.json
- Tests run: ei ajettu
- Next: maarita kirjautumisen polkujen tarkistuslista ja logien keruuohje

[2026-01-04] [PROGRESS] [L-20260104-057] Kirjautumisen tarkistuslista dokumentoitu
- What I did: lisasin kirjautumisen polkujen tarkistuslistan ja logien keruuohjeen.
- Key files: docs/LOGIN_FLOW_CHECKLIST.md, docs/CODEX_HISTORY.md
- Tests run: ei ajettu
- Next: sulje LUKITTU #3 tai paata jatkosta

[2026-01-04] [DONE] [L-20260104-057] LUKITTU: kirjautumisen polut + logiohje
- Summary: kirjautumisen polkujen tarkistuslista ja logien keruuohje dokumentoitu.
- Tests: ei ajettu.
- Notes: odottaa manuaalista UI-kavelya check-listan mukaan.

[2026-01-04] [HANDOFF] [L-20260104-057]
- Where we are: LUKITTU #3 suljettu; uusi ohje docs-hakemistossa.
- What changed: lisatty kirjautumisen polkujen tarkistuslista + logiohje.
- What remains: aja UI-kavely check-listan mukaan ja kirjaa tulos tarvittaessa.
- Next LUKITTU suggestion: LUKITTU: UI-kavely + tulosten dokumentointi.
- Key files: docs/LOGIN_FLOW_CHECKLIST.md, docs/CODEX_HISTORY.md
- How to resume: avaa docs/LOGIN_FLOW_CHECKLIST.md ja seuraa askeleet

[2026-01-04] [SESSION_START] main 267e8d9
- Active LUKITTU: L-20260104-058
- History tail: [HANDOFF] [L-20260104-057]
- Repo: dirty, ahead 0/behind 0
- DB status: unknown
- Next action: kirjaa UI-kavelyn tulokset check-listan pohjalta

[2026-01-04] [PROGRESS] [L-20260104-058] LUKITTU aloitus
- What I did: aloitettu UI-kavelyn tulosten dokumentoinnin LUKITTU ja paivitetty tila.
- Key files: docs/CODEX_HISTORY.md, .codex/state.json
- Tests run: ei ajettu
- Next: vahvista UI-kavelyn tulos ja kirjaa se dokumenttiin

[2026-01-04] [PROGRESS] [L-20260104-058] UI-kavely kirjattu
- What I did: kirjattu UI-kavelyn tulos (login + roolireititys + raportti).
- Key files: docs/CODEX_HISTORY.md
- Tests run: UI-kavely (ok, login + roolireititys + raportti)
- Next: sulje LUKITTU #4

[2026-01-04] [DONE] [L-20260104-058] LUKITTU: UI-kavelyn tulokset
- Summary: UI-kavely dokumentoitu check-listan mukaisesti.
- Tests: UI-kavely (ok, login + roolireititys + raportti).
- Notes: ei lisamuutoksia.

[2026-01-04] [HANDOFF] [L-20260104-058]
- Where we are: LUKITTU #4 suljettu; UI-kavelyn tulokset kirjattu historiaan.
- What changed: paivitetty docs/CODEX_HISTORY.md.
- What remains: ei avoimia tehtavia, seuraa tarvittaessa NEXT_REDIRECTin paluuta.
- Next LUKITTU suggestion: LUKITTU: seuraa kirjautumisen regressioita ja paivita ohjeet tarvittaessa.
- Key files: docs/CODEX_HISTORY.md
- How to resume: seuraa docs/LOGIN_FLOW_CHECKLIST.md ohjetta

[2026-01-04] [SESSION_START] main 3aeb793
- Active LUKITTU: L-20260104-059
- History tail: [HANDOFF] [L-20260104-058]
- Repo: dirty, ahead 0/behind 0
- DB status: unknown
- Next action: maarita regressioseurannan tarkistuslista ja kirjaustapa

[2026-01-04] [PROGRESS] [L-20260104-059] LUKITTU aloitus
- What I did: aloitettu regressioseurannan LUKITTU ja paivitetty tila.
- Key files: docs/CODEX_HISTORY.md, .codex/state.json
- Tests run: ei ajettu
- Next: luo regressioseurannan tarkistuslista (login-polut + logit)

[2026-01-04] [PROGRESS] [L-20260104-059] Regressioseurannan tarkistuslista dokumentoitu
- What I did: lisasin regressioseurannan tarkistuslistan ja logien keruuohjeen.
- Key files: docs/LOGIN_REGRESSION_CHECKLIST.md, docs/CODEX_HISTORY.md
- Tests run: ei ajettu
- Next: sulje LUKITTU #5 tai paata jatkosta

[2026-01-04] [DONE] [L-20260104-059] LUKITTU: regressioseurannan ohje
- Summary: regressioseurannan tarkistuslista ja logien keruuohje dokumentoitu.
- Tests: ei ajettu.
- Notes: UI-kavely tehdään tarpeen mukaan, jos regressio ilmenee.

[2026-01-04] [HANDOFF] [L-20260104-059]
- Where we are: LUKITTU #5 suljettu; regressioseurannan ohje docs-hakemistossa.
- What changed: lisatty regressioseurannan tarkistuslista + logiohje.
- What remains: aja UI-kavely check-listan mukaan vain jos regressio havaitaan.
- Next LUKITTU suggestion: LUKITTU: seuraa kirjautumisen regressioita ja paivita ohjeita tarvittaessa.
- Key files: docs/LOGIN_REGRESSION_CHECKLIST.md, docs/CODEX_HISTORY.md
- How to resume: avaa docs/LOGIN_REGRESSION_CHECKLIST.md ja seuraa askeleet

[2026-01-04] [SESSION_START] main 0ec3fa6
- Active LUKITTU: L-20260104-060
- History tail: [HANDOFF] [L-20260104-059]
- Repo: dirty, ahead 0/behind 0
- DB status: unknown
- Next action: toista regressioseurannan UI-kavely tarvittaessa ja kirjaa tulos

[2026-01-04] [PROGRESS] [L-20260104-060] LUKITTU aloitus
- What I did: aloitettu regressioseurannan toiston LUKITTU ja paivitetty tila.
- Key files: docs/CODEX_HISTORY.md, .codex/state.json
- Tests run: ei ajettu
- Next: vahvista UI-kavelyn tulos tai kirjaa, ettei regressiota havaittu

[2026-01-04] [PROGRESS] [L-20260104-060] UI-kavely ok
- What I did: kirjattu UI-kavelyn tulos (login + roolireititys + raportti).
- Key files: docs/CODEX_HISTORY.md
- Tests run: UI-kavely (ok, login + roolireititys + raportti)
- Next: sulje LUKITTU #6

[2026-01-04] [DONE] [L-20260104-060] LUKITTU: regressioseurannan toisto
- Summary: UI-kavely ok; regressiota ei havaittu.
- Tests: UI-kavely (ok, login + roolireititys + raportti).
- Notes: ei lisamuutoksia.

[2026-01-04] [HANDOFF] [L-20260104-060]
- Where we are: LUKITTU #6 suljettu; regressiota ei havaittu.
- What changed: paivitetty docs/CODEX_HISTORY.md.
- What remains: seuraa regressioita tarvittaessa; kerää logit jos ongelma palaa.
- Next LUKITTU suggestion: LUKITTU: seuraa kirjautumisen regressioita ja paivita ohjeita tarvittaessa.
- Key files: docs/CODEX_HISTORY.md
- How to resume: seuraa docs/LOGIN_REGRESSION_CHECKLIST.md ohjetta

[2026-01-04] [SESSION_START] main 3f1fd79
- Active LUKITTU: L-20260104-061
- History tail: [HANDOFF] [L-20260104-060]
- Repo: dirty, ahead 0/behind 0
- DB status: unknown
- Next action: seuraa regressioita ja kirjaa havainto tarvittaessa

[2026-01-04] [PROGRESS] [L-20260104-061] LUKITTU aloitus
- What I did: aloitettu regressioseurannan uusi sykli ja paivitetty tila.
- Key files: docs/CODEX_HISTORY.md, .codex/state.json
- Tests run: ei ajettu
- Next: kirjaa, havaittiinko regressio (kylla/ei)

[2026-01-04] [PROGRESS] [L-20260104-061] Regressiohavainto kirjattu
- What I did: kirjattu havainto, ettei regressiota havaittu.
- Key files: docs/CODEX_HISTORY.md
- Tests run: UI-kavely (ok, login + roolireititys + raportti)
- Next: sulje LUKITTU #7

[2026-01-04] [DONE] [L-20260104-061] LUKITTU: regressioseurannan sykli
- Summary: regressiota ei havaittu.
- Tests: UI-kavely (ok, login + roolireititys + raportti).
- Notes: ei lisamuutoksia.

[2026-01-04] [HANDOFF] [L-20260104-061]
- Where we are: LUKITTU #7 suljettu; regressiota ei havaittu.
- What changed: paivitetty docs/CODEX_HISTORY.md.
- What remains: seuraa regressioita tarvittaessa; kerää logit jos ongelma palaa.
- Next LUKITTU suggestion: LUKITTU: seuraa kirjautumisen regressioita ja paivita ohjeita tarvittaessa.
- Key files: docs/CODEX_HISTORY.md
- How to resume: seuraa docs/LOGIN_REGRESSION_CHECKLIST.md ohjetta
