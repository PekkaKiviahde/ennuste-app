# AGENTS.md (Codex-ohjeet tälle repolle)

Tämä tiedosto kertoo Codexille (ja ihmisille) miten tässä repossa toimitaan.

## KÄYTTÖ (Codexille)

### Työskentelytapa
- Etene **yksi askel kerrallaan**:
  - yksi komento TAI yksi pieni muutoskokonaisuus.
- Älä tee laajoja muutoksia yhdellä kertaa ilman perustelua.
- Jos muutos koskee DB:tä/migraatioita/infra-kerrosta:
  - lisää PR-tekstiin manuaalitestausohje (komennot + mitä tarkistaa).

### Git
- Luo branch: `codex/<aihe>-YYYYMMDD`
- Tee pienet commitit.
- Commit-viestit: `feat: ...`, `fix: ...`, `chore: ...`

---

## Missio

Muunna Excel-ennustetyökalun toimintalogiikka sovellukseksi siten, että:
- kaikki ennusteet ja perustelut jäävät **append-only lokiin**
- työnjohdon **suunnittelu** on oma vaihe ennen ennustusta
- tavoitearvio tuodaan (laskentaosasto) → sen jälkeen alkaa tuotannon **mäppäys** (työntaloudellinen suunnittelu)
- mäppäyksessä tavoitearvion rivit liitetään:
  - **työpaketteihin** (tuotannon ohjaus; toteutus työmaalla)
  - **hankintapaketteihin** (sopimus/ostokori; omistaja toimisto tai työmaa)
- raportointi aggregoi sekä työlitterat että tavoitearvion litterat (ryhmittely 0–9)

---

## Tärkeät rajoitteet (invariantit)

- ÄLÄ poista historiaa: loki on append-only (audit trail).
- Suunnitelma ennen ennustetta:
  - ennustetta ei luoda ilman suunnitelmaa oikeassa tilassa.
- Excel on lähde/proto:
  - älä oleta, että Excelin kaavat ovat sovelluksen totuus.
  - sovelluksen totuus on `spec/` + toteutuksen säännöt.
- Jos muutat speksiä:
  - päivitä tarvittaessa myös `docs/adr/` (miksi tehtiin näin).

---

## Repon kartta (oleelliset polut)

- `apps/web/` – Next.js UI
- `packages/domain/` – domain-säännöt ja tyypit
- `packages/application/` – usecaset ja sovelluslogiikan portit
- `packages/infrastructure/` – DB/integraatiot ja repo-toteutukset
- `migrations/` – SQL-migraatiot
- `spec/` – speksi (dokumentoidut totuudet, ei “arvausta”)
- `docs/` – dokumentaatio, ADR:t, runbookit
- `tools/scripts/` – db-status, migrate, seed, testityökalut
- `excel/` ja `vba/` – legacy-lähdeaineisto (taustaksi)

---

## Komennot (käytä näitä)

### DB / migraatiot
- Käynnistä DB: `npm run db:start` (tai `docker compose up -d`)
- Migraatiotila: `npm run db:status`
- Aja migraatiot: `npm run db:migrate`
- Demo-seed: `npm run db:seed-demo`

### Dev
- UI-dev: `npm run dev`

### Laatu
- Typecheck: `npm run typecheck`
- Lint: `npm run lint` (tällä hetkellä sama kuin typecheck)
- Testit: `npm run test`
  - Huom: integraatiotestit vaativat `DATABASE_URL` ja `SESSION_SECRET`.

### Build (web)
- `npm --workspace apps/web run build`

---

## Dokumentointipolitiikka

- Juureen ei tehdä uusia `README*.md`-tiedostoja.
- Kaikki uudet ohjeet ja runbookit menevät `docs/`-hakemistoon.
- `docs/README.md` on docs-master.

---

## Domain context (Talo 80 + tavoitearvio → mäppäys)

### Kanoninen ohjedokumentti
- `docs/Talo80_handoff_v2.md`

### Koodisäännöt
- 4-numeroiset koodit (littera/paketit) tallennetaan merkkijonona.
- Leading zeros ei saa kadota (esim. “0310” säilyy).
- MVP:ssä EI tehdä automaattisia “koodisääntömuunnoksia” (esim. VSS 6700→2500).
  Mäppäys on manuaalinen ja järjestelmä voi vain ehdottaa.

### Mäppäyksen perusyksikkö
- Mäppäyksen perusyksikkö on **tavoitearviorivi / budget_item** (item-koodi), ei pelkkä 4-num littera.

### Hankintapaketti vs työpaketti
- Hankintapaketti = sopimus/ostokori (OFFICE tai SITE).
- Työpaketti = tekemisen ohjauskori (work_phase; SITE).

---

## Append-only item-mäppäys (pakollinen)

### Miksi
Historia ei saa ylikirjoittua. Älä käytä `ON CONFLICT DO UPDATE` item-mäppäyksessä.

### Taulut ja näkymä
- `mapping_versions` (DRAFT/ACTIVE) + `mapping_kind` erottaa item vs littera mappingit.
- `row_mappings` on append-only:
  - jokainen assign = uusi rivi.
- `v_current_item_mappings` palauttaa kullekin budget_item_id:lle viimeisimmän rivin ACTIVE item-mäppäysversiosta.

### Säännöt
- Vain yksi ACTIVE per (project_id, import_batch_id, mapping_kind).
- Read-polku käyttää `v_current_item_mappings`.
- Write-polku tekee INSERT `row_mappings` (ei upsert).

### Autofill (B4)
- Kun riville asetetaan hankintapaketti (proc_package_id) ja työpaketti puuttuu,
  täytä work_phase_id `proc_packages.default_work_package_id`:llä jos asetettu.
- Älä tee työpaketti→hankintapaketti automaattia MVP:ssä (vain ehdotus myöhemmin).

---

## Kun teet muutoksia (pakollinen tapa raportoida)

Lisää aina (PR-tekstiin tai docs/runbookiin):
- Mitä muuttui
- Miksi
- Miten testataan (manuaali tai komennot)

Pidä teksti lyhyenä ja suomeksi.
