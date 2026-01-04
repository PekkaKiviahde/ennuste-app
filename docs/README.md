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

## 📚 Docs‑kartta

- workflows/
- runbooks/
- api/
- sql/
- adr/
- decisions/
- compliance/
- tools-scripts.md

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
