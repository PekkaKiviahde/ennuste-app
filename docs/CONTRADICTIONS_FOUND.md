# CONTRADICTIONS_FOUND

## Havaitut ristiriidat (docs vs migraatiot)
1) **RBAC-malli**
- Docs: `docs/04-rbac.md` viittaa `db/00-schema.sql`:iin (tenants + memberships + role_assignments valid_from/to).
- Migraatiot: `0009_saas_rbac_phase19.sql` kayttaa `organizations` + `users` + `organization_role_assignments`/`project_role_assignments` ilman `valid_from/to`.
- Ristiriita: eri taulut, eri aikarajauksen malli.

2) **Tenant-malli**
- Docs: `docs/05-tenant-isolation.md` olettaa `tenant_id` jokaisessa domain-taulussa.
- Migraatiot: `0018_tenant_onboarding.sql` lisaa `projects.tenant_id`, mutta muut domain-taulut ovat vain `project_id`-tasolla; `0009` taas kayttaa `organization_id`.
- Ristiriita: tenant/organization-kaksijako ja `tenant_id`-kenttien puute muissa tauluissa.

3) **Auth / IAM**
- Docs/ADR: `docs/security/authentication.md` ja `docs/adr/ADR-001-iam-keycloak.md` ohjaavat Keycloak/OIDC-malliin.
- Migraatiot: `0009_saas_rbac_phase19.sql` luo `users`-taulun ja `0017_add_user_pin_hash.sql` lisaa PIN-hashin (dev-auth).
- Ristiriita: ulkoinen IdP vs sovelluksen oma user-store.

4) **Ennusteen lukitus**
- Spec: `spec/workflows/01_mvp_flow.md` kuvaa lukituksen omana ennustetapahtumana (is_locked + lock_reason).
- Migraatiot: `forecast_events`-taulussa ei ole `is_locked`/`lock_reason`-kenttia.
- Ristiriita: lukitusmalli speksissa ei nay skeemassa.

## Ehdotettu ratkaisu (suunta)
- Valitse yksi kanoninen tenant- ja RBAC-malli (organizations vs tenants + memberships) ja paivita docs/ADR vastaamaan.
- Paata, toteutetaanko MVP:ssa Keycloak vai paikallinen dev-auth (pin_hash). Jos Keycloak, lisaa ulkoisen identiteetin mappaus; jos dev-auth, kirjaa poikkeus ADR:iin.
- Paata ennusteen lukitusmalli: lisaa skeemaan kenttat tai paivita speksi vastaamaan nykyista tapahtumamallia.

## Mita muuttui
- Lisatty ristiriitalista ja ehdotettu ratkaisu docs vs migraatiot -tulkintojen pohjalta.

## Miksi
- Ristiriidat estavat yhtenaisen MVP-toteutuksen ilman tietoista valintaa.

## Miten testataan (manuaali)
- Avaa `docs/CONTRADICTIONS_FOUND.md` ja varmista, etta jokainen ristiriita viittaa dokumenttiin ja migraatioon.
