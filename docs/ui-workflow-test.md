# UI-testi: workflowt ja roolikohtainen nakyma

Tama testi kay lapi workflowt (suunnittelu -> ennuste -> lukitus -> loki -> raportti)
ja varmistaa roolikohtaisen UI-nakyvyyden. Mukana SaaS-myyja (SELLER).

## Esivaatimukset

- Demo-data on siemennetty: `DATABASE_URL=... node tools/scripts/db-seed-demo.mjs`
- Web on kaynnissa
- Demo-kayttajien PIN on `1234`

## Roolit ja odotetut oikeudet

- SITE_FOREMAN: `REPORT_READ`, `WORK_PHASE_WEEKLY_UPDATE_CREATE`, `GHOST_ENTRY_CREATE`, `CORRECTION_PROPOSE`
- GENERAL_FOREMAN: `REPORT_READ`, `WORK_PHASE_WEEKLY_UPDATE_APPROVE`, `GHOST_ENTRY_CREATE`, `CORRECTION_PROPOSE`
- PROJECT_MANAGER: `REPORT_READ`, `BASELINE_LOCK`, `CORRECTION_APPROVE_PM`
- PRODUCTION_MANAGER: `REPORT_READ`, `BASELINE_LOCK`, `CORRECTION_APPROVE_FINAL`
- PROCUREMENT (Hankinta): `REPORT_READ`
- EXEC_READONLY: `REPORT_READ`
- ORG_ADMIN: `REPORT_READ`, `MEMBERS_MANAGE`
- SELLER (SaaS-myyja): `SELLER_UI`

## Testattavat sivut (workflowt)

- `/ylataso`
- `/tyonohjaus`
- `/suunnittelu`
- `/ennuste`
- `/loki`
- `/raportti`
- `/tavoitearvio`
- `/baseline`
- `/sales` (vain SELLER)
- `/admin` (vain ORG_ADMIN)

## Automaattinen UI-testiohjelma

Testi kirjautuu jokaisella roolilla, tarkistaa `GET /api/me`-oikeudet,
avaa workflow-sivut ja varmistaa admin-nakyvyyden.

### Ajo

```
BASE_URL=https://refactored-train-x5xggp94wrxx2v7q9-3000.app.github.dev \
ROLE_SUFFIX=a \
PIN=1234 \
node tools/scripts/ui-workflow-test.mjs
```

## Manuaalinen tarkistus (erityishuomio UI-nakyvyys)

1) Kirjaudu sisaan roolilla ja varmista, etta navissa on workflow-sivut:
   Ylataso, Tyonohjaus, Suunnittelu, Ennuste, Loki, Raportti, Tavoitearvio, Baseline.
   (Poikkeus: SELLER ohjataan suoraan /sales-nakymaan.)
2) Avaa `/admin`:
   - ORG_ADMIN: nakyy roolit ja assignoinnit.
   - REPORT_READ-roolit: nakyy ilmoitus "Ei oikeuksia admin-nakymiin."
   - SELLER: ohjautuu `/sales`.
3) Tarkista, etta Baseline-sivun lomakkeet latautuvat (REPORT_READ-rooleilla):
   - Toiminnalliset oikeudet tarkistetaan palvelimessa (voi antaa virheen ilman oikeutta).
4) Varmista, etta raportti- ja dashboard-nakymat latautuvat REPORT_READ-rooleilla.
5) Varmista, etta SELLER-nakyma avautuu vain myyjalle.

## Mita muuttui

Lisatty UI-testiohjelma ja ohje roolien nayttoon sekä workflow-sivujen tarkistukseen.

## Miksi

Tarvitaan yhtenainen testi, joka varmistaa workflowt ja roolikohtaisen
UI-nakyvyyden (erityisesti admin-nakyma ja SaaS-myyja).

## Miten testataan (manuaali)

- Aja `node tools/scripts/ui-workflow-test.mjs` ja varmista OK-tulokset.
- Avaa `/admin` eri rooleilla ja tarkista odotettu viesti.
