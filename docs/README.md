# Tuotannonhallinta SaaS – Dokumentaatio (MVP)

Tämä tiedosto on **yhdistetty master‑README**, joka korvaa aiemmat erilliset
README‑tiedostot (IAM, DB, import, hotfix, docs‑index).

Tavoite: yksi totuuslähde dokumentaatiolle.

---

## Lukujärjestys (Start here)

1. docs/01-architecture-brief.md  
2. docs/02-implementation-brief.md  
3. docs/03-api-min-spec.md  
4. docs/04-rbac.md  
5. docs/05-tenant-isolation.md  
6. docs/06-migration-jsonb-to-normalized.md  

---

## 🔐 Authentication & IAM

- IAM: Keycloak (itsehostattu)
- Protokolla: OIDC (OAuth2)
- Autorisointi: RBAC (roolit tokenissa)
- MFA: pakollinen admin/ylläpidolle, käyttäjille vaiheittain

Dokumentit:
- docs/adr/ADR-001-iam-keycloak.md
- docs/security/authentication.md
- docs/thesis/THESIS-Keycloak-SaaS.md

---

## 🗄️ Database (MVP)

Migraatiot:
- migrations/0001_init.sql
- migrations/0002_views.sql

Invariantsäännöt:
1. Suunnitelma ennen ennustetta  
2. Mapping vain DRAFT‑tilassa  
3. Append‑only (ei UPDATE/DELETE)

---

## 🔄 JYDA import

- spec/imports/01_jyda_import_spec.md
- migrations/0003_jyda_snapshot_views.sql

---

## 🛠️ Hotfixit

Hotfix‑ohjeet ovat runbookeja:
- docs/runbooks/incident.md
- docs/runbooks/data-fix.md
- docs/runbooks/release.md

---

## 🧭 UI (ainoastaan Next)

- Ainoa aktiivisesti kehitettava UI on Next-sovellus `apps/web/`.
- Express-palvelin on API-only (ei UI:ta).

---

## 📚 Docs‑kartta

- workflows/
- runbooks/
- api/
- sql/
- adr/
- decisions/
- compliance/
- tools-scripts.md
- ui-workflow-test.md

---

## ✅ CI‑minimi (integraatiotestit)

Pakolliset ympäristömuuttujat, jotta integraatiotestit eivät skippaa:

- `DATABASE_URL`
- `SESSION_SECRET`
- `NODE_ENV=test` (suositus)

Lisätiedot: `docs/env-setup.md`.

---

## Dokumentaatiokäytäntö

- Tämä on ainoa master‑README dokumentaatiolle
- Uusia README‑tiedostoja ei luoda juureen
- Kaikki uudet ohjeet menevät docs/‑hakemistoon
- PR-kuvaukset ja testiohjeet: `docs/PR_DESCRIPTION_TAVOITEARVIO_MAPPAYS.md`

---

## Tavoitearvion mappays (MVP)

Mita muuttui
- Lisatty tavoitearviorivien mappausnakyma item-tasolla tyopaketteihin ja hankintapaketteihin.
- Lisatty hankintapaketit ja item-tason mappauksen taulut seka API-tuki.

Miksi
- Tuotannon mappaus tehdään item-tasolla ennen ennustusta.
- Hankintapakettien liittaminen tarvitaan 1:1 MVP-prosessiin.

Miten testataan (manuaali)
- Avaa `Tavoitearvion mappays` ja varmista, etta LEAF-rivit listautuvat oletuksena.
- Valitse useita riveja ja assignaa tyopaketti sekä hankintapaketti; varmista status-sarakkeen paivitys.
- Aseta hankintapaketti riville ilman tyopakettia ja tarkista, etta oletus-tyopaketti tayttyy jos asetettu.
