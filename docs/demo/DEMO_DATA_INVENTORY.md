# Demo- ja testidatan inventaario

## Mitä muuttui

- Päivitettiin `docs/demo/DEMO_DATA_INVENTORY.md` konkreettiseksi inventaarioksi (polut, entrypointit, grep-osumat riveittäin, top-20 isoimmat samplet ja viitteet).

## Miksi

- Canonical-demo (1 kpl) on vaikea rakentaa hallitusti ilman totuudenmukaista listaa: mistä seed tulee, missä demo-credentialit asuvat ja mitkä isot tiedostot ovat oikeasti käytössä.

## Miten testataan (manuaali)

1) Aja haut uudelleen:
   - `git ls-files | grep -Ei "seed|demo|fixture|sample|import-mapping-examples"`
   - `rg -n "password|passwd|secret|demo@|test@|admin@" .` (jos `rg` asennettuna)
   - `git grep -n -I -E "\\b(password|passwd|secret)\\b|demo@|test@|admin@"` (fallback; tässä ympäristössä `rg` ei ollut saatavilla)
2) Top-20 isot samplet:
   - `git -c core.quotepath=false ls-files '*.csv' '*.json' '*.sql' '*.xlsx' | while IFS= read -r f; do printf '%s\\t%s\\n' \"$(stat -c%s \"$f\")\" \"$f\"; done | sort -nr | head -n 20`

---

## 1) Demo/seed/fixture-skriptit ja niiden rooli

### Entrypointit (käytännössä ajettavat komennot)

- reporoot `package.json` → `npm run db:seed-demo` → `node tools/scripts/db-seed-demo.mjs`
- `api/package.json:10` → `npm run db:seed` → `node scripts/seed.js` (legacy/API)
- `api/package.json:9` → `npm run db:setup` → `node scripts/db-setup.js` (migraatiot API:n `migrations/`-kansiosta)

Riippuvuushuomio:
- `tools/scripts/db-seed-demo.mjs` ajetaan reporootista, joten sen Node-riippuvuudet (esim. `pg`) tulevat root `package.json`:sta ja vaativat `npm install` -ajon reporootissa.
- Seed edellyttaa migraatiot: aja ensin `npm run db:migrate`, sitten `npm run db:seed-demo`.

### Canonical demo smoke

- `docs/sql/SMOKE_DEMO_CANONICAL.sql` (read-only): varmistaa että demo sisältää vähintään is_demo-projektin, Talo80-litterat, työpaketti + hankintapaketti, baseline-snapshotin, MT/LT (APPROVED) sekä ACTUALS (unmapped + mapped koonnit).
- `docs/runbooks/DEV_DEMO_SEED.md`: ajopolku (DB -> migraatiot -> seed -> smoke) yhdellä komennolla.

### Lista skripteistä (polku + rooli + mihin dataan koskee)

- `tools/scripts/db-seed-demo.mjs`
  - Rooli: SaaS/UI-demon seed: tenantit, organisaatiot, projektit, käyttäjät, org- ja projekt-roolit + minimibaseline (import_batchit, työpaketti, hankintapaketti, item-mäppäys).
  - Huom: viittaa import-testdataan `project_details.targetEstimateFile` (`tools/scripts/db-seed-demo.mjs:203`, `tools/scripts/db-seed-demo.mjs:217`, `tools/scripts/db-seed-demo.mjs:231`, `tools/scripts/db-seed-demo.mjs:245`, `tools/scripts/db-seed-demo.mjs:259`, `tools/scripts/db-seed-demo.mjs:273`).
  - Runbook-viite: `docs/ui-workflow-test.md:8`, `docs/tools-scripts.md:13`

- `api/scripts/seed.js`
  - Rooli: legacy/API-seed: organisaatiot, käyttäjät, projektit, roolit, litterat, import_batchit, baseline-data, terminologia.
  - Huom: sisältää paljon kovakoodattuja demo-PINejä ja useita demo-projekteja (“Kide …”).
  - Runbook-viite: `docs/PR_DESCRIPTION_TAVOITEARVIO_MAPPAYS.md:13`; historiaviitteet: `docs/CODEX_HISTORY.md:137`

- `db/01-seed-permissions.sql`
  - Rooli: valinnainen seed permission/role-permission -matriisille (RBAC-perusoikeudet).
  - Viite: `docs/02-implementation-brief.md:22`

- `tools/scripts/seed_litteras_from_budget_csv.py`
  - Rooli: apuskripti litteroiden (4-numeroiset merkkijonot) siementämiseen budjetti-CSV:n perusteella.
  - Viite: `docs/tools-scripts.md:50`

- `tools/scripts/ui-workflow-test.mjs`
  - Rooli: UI-smoke: kirjautuu demo-tunnuksilla (suffix `a|b`) ja tarkistaa roolikohtaisia näkymiä.
  - Viite: `docs/tools-scripts.md:25`

- `api/scripts/smoke-api.js`
  - Rooli: legacy-API smoke: kirjautuu ja ajaa peruspolkuja.

- `excel/testdata_generated_kaarna/generate_testdata_from_tavoitearvio.py` ja `generate_testdata_from_tavoitearvio.py`
  - Rooli: generoi `excel/testdata_generated_kaarna/*.csv` -testiaineistoa (encoding, duplikaatit, numeromuodot, rikotut summat, jne.).

---

## 2) Kovakoodatut tunnukset ja salasanat (osumat tiedostoittain + rivitaso)

Pakollinen avainsanahaku: `password`, `passwd`, `secret`, `demo@`, `test@`, `admin@`.
Lisäksi demo-login löydösten vuoksi listataan myös “PIN”-osumia (koska PIN toimii salasanana).

### A) Credential-siivous (DONE tässä vaiheessa)

- `docker-compose.next.yml`
  - `SESSION_SECRET` ja `DATABASE_URL` tulevat ympäristömuuttujista (`${...}`), ei oletusarvoja.

- `docker-compose.yml`
  - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` tulevat ympäristömuuttujista (`${...}`).
  - `JWT_SECRET` tulee ympäristömuuttujasta ilman oletusarvoa.
  - `PGADMIN_DEFAULT_EMAIL` ja `PGADMIN_DEFAULT_PASSWORD` tulevat ympäristömuuttujista (`${...}`).
  - `pgadmin/pgpass` poistettu (ei enää mounttia).

- `docker-compose.agent-api.yml`
  - `AGENT_INTERNAL_TOKEN` tulee ympäristömuuttujasta ilman oletusarvoa.
  - `DATABASE_URL` tulee ympäristömuuttujasta (`${...}`).

- Demo-login / PIN
  - UI ei esitäytä PINiä; ohje kertoo että PIN asetetaan seediä ajettaessa (`DEV_SEED_PIN` tai seed tulostaa "DEMO PIN: ...").
  - `tools/scripts/ui-workflow-test.mjs` ja `api/scripts/smoke-api.js` vaativat PINin envistä (`PIN` tai `DEV_SEED_PIN`) tai argumentista.
  - `tools/scripts/db-seed-demo.mjs` ja `api/scripts/seed.js` käyttävät `DEV_SEED_PIN` tai satunnaista PINiä ja tulostavat PINin konsoliin.

### C) Avainsanaosumat, jotka eivät ole kovakoodattuja arvoja (OK, mutta liittyvät “secret”-käsittelyyn)

- `api/scripts/seed.js:54`
  - `{ username: 'admin', ... email: 'admin@example.com', ... }` (demo-email; ei salasana, mutta `admin@`-osuma)
- `tools/scripts/db-seed-demo.mjs:401`
  - `email: "admin@kide.local",` (demo-email; `admin@`-osuma)
- `apps/web/src/ui/sales/SaasOnboardingForm.tsx:105`
  - `placeholder="admin@kide.local"` (placeholder; `admin@`-osuma)
- `packages/infrastructure/src/billingWebhook.test.ts:32`
  - `customer_email: "test@example.com"` (testidata; `test@`-osuma)
- `apps/api/src/memory/agentMemoryRepo.ts:5`
  - `REDACT_KEYS = [... "secret", "password", ...]` (redaction-lista; ei salasana)
- `docs/adr/0022-webhook-signature-verification.md:45`
  - `Authorization: Basic base64(username:password)` (esimerkkiformaatti; ei salasana)
- `docs/env-setup.md:51`
  - `SESSION_SECRET=ci-secret` (dokuesimerkki; ei tuotantosalaisuus)
- `docs/env-report.md:87`
  - ``SESSION_SECRET` → CI-secret` (dokuesimerkki)
- `api/legacy-authToken.js:172-174` tarkistaa `LEGACY_AUTHTOKEN_SECRET/SESSION_SECRET` puuttumisen (ei kovakoodattua arvoa).
- `apps/web/src/server/session.ts:11-13` vaatii `SESSION_SECRET` env:stä (ei kovakoodattua arvoa).
- `packages/infrastructure/src/billingWebhookVerify.ts:57-58` lukee webhook-secretin env:stä (ei kovakoodattua arvoa).
- `docker-compose.agent-api.yml:42` kirjoittaa `password $$GH_TOKEN` netrc:iin (OK: arvo tulee env:stä, ei kovakoodattu).

### D) Testi-credentialit (kovakoodattuja, mutta testikontekstissa)

- `api/tests/legacy-authToken.test.js:5`
  - `process.env.SESSION_SECRET ||= "test-session-secret";` (testi-secret; ei tuotantoon)
- `api/tests/legacy-authToken.test.js:42`
  - `body: { username: "demo", pin: "0000" },` (testi-credential)

---

## 3) Isot sample-tiedostot ja kokoarviot (top 20) + käytössä/ei käytössä

Kriteeri: suurimmat `*.csv`, `*.json`, `*.sql`, `*.xlsx` (`git ls-files` + `stat -c%s`).
“Käytössä” = viitataan seedissä/runbookissa/CI:ssä tai on osa buildia (lockfile).

| Koko | Tiedosto | Status | Viite (esimerkki) |
| ---: | --- | --- | --- |
| 154,841 B | `excel/testdata_generated_kaarna/text_encoding.csv` | käytössä | `tools/scripts/db-seed-demo.mjs:273`, `docs/testdata/kide-tyomaat.md:46` |
| 115,724 B | `excel/Tavoitearvio Kaarna Päivitetty 17.12.2025.csv` | käytössä (speksi) | `spec/imports/02_budget_import_spec.md:26` |
| 114,943 B | `test_budget.csv` | käytössä | `apps/web/src/app/api/import-staging/budget/from-repo/route.ts:10` |
| 114,943 B | `data/samples/budget.csv` | käytössä | `spec/imports/02_budget_import_spec.md:25`, `tools/scripts/import_budget.py:15` |
| 101,096 B | `package-lock.json` | käytössä (build) | npm lockfile |
| 90,095 B | `excel/Tavoitearvio Kaarna Päivitetty 17.12.2025.xlsx` | ei käytössä (ei viitteitä) | (ei `git grep` osumia) |
| 47,574 B | `excel/testdata_generated_kaarna/duplicates_conflicts.csv` | käytössä | `tools/scripts/db-seed-demo.mjs:259`, `docs/testdata/kide-tyomaat.md:39` |
| 41,969 B | `api/package-lock.json` | käytössä (build) | npm lockfile (API) |
| 40,816 B | `excel/testdata_generated_kaarna/numbers_formats.csv` | käytössä | `tools/scripts/db-seed-demo.mjs:217`, `docs/testdata/kide-tyomaat.md:18` |
| 38,743 B | `excel/testdata_generated_kaarna/bad_codes.csv` | käytössä | `tools/scripts/db-seed-demo.mjs:245`, `docs/testdata/kide-tyomaat.md:32` |
| 38,458 B | `excel/testdata_generated_kaarna/seed_control.csv` | käytössä | `tools/scripts/db-seed-demo.mjs:203`, `docs/testdata/kide-tyomaat.md:11` |
| 36,390 B | `excel/testdata_generated_kaarna/broken_totals.csv` | käytössä | `tools/scripts/db-seed-demo.mjs:231`, `docs/testdata/kide-tyomaat.md:25` |
| 19,943 B | `excel/Jyda-ajo Kaarnatien Kaarna_cutover.csv` | ei käytössä (ei viitteitä) | (ei `git grep` osumia) |
| 16,019 B | `migrations/0042_saas_rbac_phase19.sql` | käytössä | `docs/RUNBOOK_PHASE19_SAAS_RBAC.md:32` |
| 12,173 B | `migrations/0048_change_requests_mt_lt.sql` | käytössä | `docs/runbooks/CHANGE_REQUESTS_MT_LT.md:6` |
| 11,982 B | `excel/Jyda-ajo Kaarnatien Kaarna.csv` | käytössä | `spec/imports/01_jyda_import_spec.md:45`, `tools/scripts/import_jyda_csv.py:12` |
| 9,877 B | `migrations/0001_baseline.sql` | käytössä | `docs/dev/DEV_DB_RESET.md:24` |
| 8,551 B | `migrations/0047_package_baselines.sql` | käytössä | `docs/RUNBOOK_PHASE17_ITEM_CORRECTIONS.md:6` |
| 7,371 B | `docs/sql/SMOKE_E2E_CORE.sql` | käytössä (CI + runbook) | `.github/workflows/db-smoke.yml:64`, `docs/runbooks/db-smoke.md:53` |
| 7,269 B | `spec/migrations/0001_spec_mvp_schema.sql` | käytössä (speksi) | `spec/data-model/03_postgres_tables.md:294` |

Lisähuomio (duplikaatti):
- `data/samples/budget.csv` ja `test_budget.csv` ovat identtiset (sha256 sama; 778 riviä). Viite: `apps/web/src/app/api/import-staging/budget/from-repo/route.ts:14` whitelistaa molemmat.

---

## 4) Ehdotus: canonical seed (1 kpl)

Valinta: `npm run db:seed-demo` (`tools/scripts/db-seed-demo.mjs`).

Lisäksi (kanoninen demo-verifiointi):
- Smoke: `docs/sql/SMOKE_DEMO_CANONICAL.sql` (read-only; varmistaa ydindatan kattavuuden)
- Runbook: `docs/runbooks/DEV_DEMO_SEED.md`

Perustelut (lyhyesti):
- UI-demomoodi ja UI-smoke (`tools/scripts/ui-workflow-test.mjs`) nojaavat suffix-malliin `*.a` ja demo-tenanttiin → tämä seed tuottaa sen.
- Sisältää jo minimibaseline-rakenteet (import_batch, työpaketti, hankintapaketti, item-mäppäys), joilla MVP:n ydinnäkymät ja raportit saadaan näkyviin.
- Legacy-`api/scripts/seed.js` on erillinen seed-polku, joka tuo päällekkäisiä käyttäjiä/projekteja ja kovakoodattuja PINejä.

Roolihavainto (inventaario, ei muutoksia nyt):
- `PROJECT_OWNER` ja `AUDITOR` löytyvät speksistä/dokumenteista ja migraatioista (ei vielä seedissä eksplisiittisesti):
  - `docs/Talo80_handoff_v2.md:43` / `docs/Talo80_handoff_v2.md:44`
  - `docs/runbooks/CHANGE_REQUESTS_MT_LT.md:19` / `docs/runbooks/CHANGE_REQUESTS_MT_LT.md:23`
  - `packages/shared/src/types.ts:5` (tyyppinä `PROJECT_OWNER`)

---

## 5) Ehdotus: poistettavat vanhat demo-seedit (ei poisteta vielä)

- `api/scripts/seed.js` (+ `api/package.json` → `db:seed`)
  - Miksi: päällekkäinen seed-polku; sisältää kovakoodattuja demo-PINejä ja laajan projektilistan.
  - Riskiviitteet: `docs/PR_DESCRIPTION_TAVOITEARVIO_MAPPAYS.md:13` ja `docs/CODEX_HISTORY.md:137` viittaavat tähän ajotapaan.

- `api/scripts/smoke-api.js` (ei seed, mutta sidottu legacy-credentialiin)
  - Miksi: käyttää kovakoodattua oletus-PINiä (`api/scripts/smoke-api.js:23`), ja sitoo smoke-polun legacy-käyttäjiin.

- `test_budget.csv` (duplikaatti)
  - Miksi: identtinen `data/samples/budget.csv`:n kanssa (sha256 sama; 778 riviä).
  - Riskiviite: `apps/web/src/app/api/import-staging/budget/from-repo/route.ts:14` whitelistaa molemmat (vaatii päivityksen ennen poistoa).

---

## 6) Ehdotus: poistettavat/siirrettävät isot tiedostot (ei poisteta vielä)

Ehdotus “minimidemo” vs “import-testdata” -erotteluun:

- Siirrä import-testdata-pakettiin (minimidemon ulkopuolelle):
  - `excel/testdata_generated_kaarna/*.csv` (käytössä seediin sidottuna `project_details.targetEstimateFile`, mutta ei pakollinen minimidemolle)
  - `excel/Jyda-ajo Kaarnatien Kaarna.csv` (JYDA-tuonnin esimerkkiaineisto)
  - `excel/Tavoitearvio Kaarna Päivitetty 17.12.2025.csv` ja `excel/Tavoitearvio Kaarna Päivitetty 17.12.2025.xlsx` (tavoitearvion esimerkkiaineisto; xlsx ei löydy viitteissä)
  - `excel/Jyda-ajo Kaarnatien Kaarna_cutover.csv` (ei viitteitä; todennäköinen jäämä)

- Pidä minimidemossa (Talo80/etunollat + item-taso):
  - `data/samples/04_leading_zero_item.json` (4-numeroiset litterat merkkijonona, etunollat säilyy)
  - `data/samples/05_item_to_work_package.json` (item→työpaketti)
  - `data/samples/06_work_package_proc_package_1to1.json` (työpaketti↔hankintapaketti 1:1)
  - `data/samples/07_report_item_composition.json` (raportin item-koostumus)

---

## 7) Riskit ja rollback (revert commit)

### Riskit (jos myöhemmin poistetaan/siirretään)

- Runbookit ja speksit voivat rikkoontua, jos viitatut polut poistetaan:
  - `docs/ui-workflow-test.md:8` (viittaa `db-seed-demo.mjs`)
  - `docs/PR_DESCRIPTION_TAVOITEARVIO_MAPPAYS.md:13` (viittaa legacy `db:seed`)
  - `spec/imports/01_jyda_import_spec.md:45` (viittaa `excel/Jyda-ajo Kaarnatien Kaarna.csv`)
  - `spec/imports/02_budget_import_spec.md:25` (viittaa `data/samples/budget.csv`)
  - `apps/web` import-staging whitelist viittaa `test_budget.csv` ja `data/samples/budget.csv` (`apps/web/src/app/api/import-staging/budget/from-repo/route.ts:14`)
- Seed-skripti voi rikkoontua, jos `tools/scripts/db-seed-demo.mjs` viittaamat `excel/testdata_generated_kaarna/*.csv` siirretään ilman vastaavaa muutosta.

### Rollback

- Revert: `git revert <commit_sha>` (palauttaa muutoksen turvallisesti ilman historian uudelleenkirjoitusta).
