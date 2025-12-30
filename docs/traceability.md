# Traceability – päätös → dokumentti → UI/tila → toteutus

Päivitetty: 2025-12-30

Tämän dokumentin tarkoitus on varmistaa, että **päätökset eivät jää vain keskusteluun**, vaan ne ovat:
- löydettävissä dokumenteista
- kytkettynä **UI-nappeihin**, **tiloihin** ja **rooleihin**
- toteutettavissa koodissa (ja testattavissa)

> Käytä tätä checklistinä PR:issä: kun muutat työnkulkua, päivitä samalla päätös + vaikutus.

---

## 1) Nopea indeksi (mistä mikäkin löytyy)

- Master workflow: `docs/workflows/master.md`
- Nappipolut (UI): `docs/workflows/nappipolut.md`
- Tilakoneet (status): `docs/workflows/state-machines.md`
- Business rules: `docs/workflows/business-rules.md`
- RBAC-matriisi: `docs/workflows/rbac-matrix.md`
- Sanasto: `docs/workflows/glossary.md`
- GDPR: `docs/compliance/gdpr.md`
- Päätösloki: `docs/decisions/decision-log.md`
- Avoimet kysymykset: `docs/decisions/open-questions.md`
- Incident-runbook: `docs/runbooks/incident.md`
- Data-fix-runbook: `docs/runbooks/data-fix.md`
- Release-runbook: `docs/runbooks/release.md`
- Toimittajan SDLC: `docs/workflows/supplier-sdlc.md`

---

## 2) Traceability-taulukko (MVP)

Legend:
- **UI** = nappi/ruutu
- **State** = statuskoodi (C/P/W/M/I)
- **Enforcement** = missä pakotetaan (UI / API / DB / runbook)
- **Tests/Runbook** = missä varmistetaan (testit/runbook)

| Päätös / sääntö | Lähde (doc) | UI / state | Enforcement (suositus) | Tests / Runbook |
|---|---|---|---|---|
| Tuotteen nimi on **Ennustus** | `docs/decisions/decision-log.md` | Kaikki UI-otsikot | UI-tekstit + repo naming | — |
| Viikko: päivitetään **% valmius + ghost + memo** | `docs/workflows/business-rules.md`, `docs/workflows/nappipolut.md` | TRACK: **[Uusi viikkopäivitys]**, **[Lisää ghost]** | UI+API estää muokkaukset lukitussa kuussa | E2E: weekly update |
| Kuu: **manuaalinen kuukausiennuste** kuun vaihteessa | `business-rules.md`, `nappipolut.md` | M0: **[Syötä kuukausiennuste]** | API validointi (kuukausi + projekti) | E2E: monthly forecast |
| Baseline on edellytys seurannalle (“suunnitelma ennen ennustetta”) | `business-rules.md`, `state-machines.md` | W0→W2 (SETUP→TRACK) | DB/Backend gate: vain TRACK kuuluu KPI:hin | Integration: views/queries |
| Baseline-lukitus vaatii **PM 1/2 + TJ 2/2** | `state-machines.md`, `rbac-matrix.md` | **[Pyydä baseline-lukitus]**, **[Hyväksy 1/2]**, **[Hyväksy 2/2]** | API: approval states + RBAC | E2E: approvals |
| Month close: **[Lähetä raportit]** lukitsee kuukauden | `business-rules.md`, `state-machines.md` | M2 `SENT_LOCKED` | DB/Backend: lock flag + write-block | E2E: send+lock |
| Ennen lähetystä saa muuttaa myös %/ghost/memo | `business-rules.md` | M0 `OPEN_DRAFT` | UI sallii; API sallii vain M0 | E2E: edit before send |
| Lähetyksen jälkeen korjaus: TJ pyytää → yksikön johtaja hyväksyy | `business-rules.md`, `rbac-matrix.md`, `state-machines.md` | M3 `CORRECTION_PENDING` | API: correction workflow + RBAC | E2E: correction after lock |
| Korjaus voi koskea myös %/ghost/memo (ei vain ennuste) | `business-rules.md`, `decision-log.md` | Korjauslomake | API: allowed_fields list | Unit: validation |
| Jokaisesta raporttilähetyksestä jää **report package** arkistoon | `business-rules.md` | M2 transition | Backend: immutable artifact + metadata | Integration: archive table |
| Raportit lähetetään sähköpostilla (yksikön johtaja + talousjohtaja) | `nappipolut.md`, `rbac-matrix.md` | **[Lähetä raportit]** | Backend email job + audit | Incident: email failures |
| Selvitettävät (unmapped actuals) näkyy inboxina | `nappipolut.md`, `business-rules.md` | TRACK: **[Selvitettävät]** | Backend query + UI list | Integration: mapping logic |
| Integraatiot pääosin kiinteät, admin voi tarkistaa/korjata mäppäyksiä | `decision-log.md`, `nappipolut.md` | Admin: **[Tarkista/korjaa mäppäykset]** | UI+API: limited edit + audit | Integration: mapping tests |
| Multi-tenant: superadmin kaikki yritykset; yritysadmin vain oma | `rbac-matrix.md` | Admin views | DB row-level filters / tenant_id | Security tests |
| Incident-tiketit ulkoisessa järjestelmässä; appissa banneri | `docs/runbooks/incident.md` | Banner | Runbook + superadmin tool | Runbook |
| Ei status-sivua MVP:ssä, vain banneri | `incident.md` | Banner | Product decision | — |
| Hotfix-kaista sallittu, mutta portit säilyy | `incident.md`, `release.md` | Hotfix deploy | Release pipeline gates | Runbook |
| Data-fix vain versionoiduilla skripteillä (ei manual DB edit) | `data-fix.md` | — | Prosessi + oikeudet | Runbook |
| SDLC: staging pakollinen | `supplier-sdlc.md`, `release.md` | Deploy flow | CI/CD gate | Release runbook |
| SDLC: testitasot unit→integration(DB)→e2e(UI) | `supplier-sdlc.md`, `release.md` | Pipeline | CI enforcement | CI |
| Prod deploy: aina DB backup + migrations + verify gate | `release.md` | Deploy | Pipeline scripts | Release runbook |
| GDPR: asiakas controller, me processor; DPA oletus | `docs/compliance/gdpr.md` | Onboarding / contracts | Sopimus + docs | Compliance checklist |
| GDPR: EU/ETA data + backup | `gdpr.md` | Infra | Infra policy + vendor choices | Compliance checklist |
| GDPR: importit eivät sisällä henkilötietoa | `gdpr.md` | Import | Validation / guidance | Tests |
| GDPR: käyttäjän poisto = anonymisointi; audit säilyy pseudonymisoituna | `gdpr.md` | Admin: user lifecycle | Backend anonymize job | Unit/integration |

---

## 3) “Do not break” -invariantit (testattavat)

Nämä kannattaa toteuttaa sekä **verify-skripteillä** että **integraatiotesteillä**:

1) **Tenant-eristys**: data ei vuoda tenanttien välillä  
2) **Lock**: `M2_SENT_LOCKED` kuukauden data ei muutu ilman korjauspolkua  
3) **Report package immutability**: lähetetty paketti säilyy muuttumattomana  
4) **Audit ilman henkilötietoa**: tapahtumissa vain `user_id`, ei nimi/email  
5) **Release gate**: verify fail → prod deploy estyy

---

## 4) Päivitysohje

Kun muutat työnkulkua:
1) Päivitä sääntö/tilat `docs/workflows/*`
2) Päivitä roolivaikutus `docs/workflows/rbac-matrix.md`
3) Päivitä päätös `docs/decisions/decision-log.md` (tai lisää open question)
4) Päivitä runbookit (incident/data-fix/release) jos operointi muuttuu
5) Päivitä tämä traceability-taulukko (uusi rivi tai muutos)

