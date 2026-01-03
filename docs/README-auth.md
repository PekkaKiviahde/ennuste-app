# IAM / Kirjautuminen – tiivistelmä

**Päiväys:** 2026-01-03

Tämä on yhden sivun yhteenveto siitä, miten kirjautuminen on toteutettu ja miksi.

## Mikä on valittu?

- **Keycloak** (itsehostattu) identiteetin- ja pääsynhallintaan (IAM)
- Sovellus käyttää **OIDC (OAuth2)** -kirjautumista
- **RBAC**: roolit tokenissa, autorisointi backendissä

## Miksi tämä valinta?

- Enterprise-kelpoisuus: MFA, policyt, audit-lokit
- Standardit: OIDC/OAuth2 (+ SAML-valmius)
- Ei lisenssimaksua per käyttäjä
- Data ja lokit omassa hallinnassa (GDPR)

## Keskeiset linjaukset

- **Ei multi-tenancyä nyt** (yksi käyttäjäkanta, roolit sovelluksessa)
- **Signup** on käytössä (itsepalvelu) mutta kontrolloitu:
  - email verification
  - rate limit / brute force -esto
- **MFA kompromissina:**
  - pakollinen admin/ylläpidolle heti
  - käyttäjille vaiheittain

## Missä dokumentaatio?

- Päätös (ADR): `docs/adr/ADR-001-iam-keycloak.md`
- Toteutusohje (security): `docs/security/authentication.md`
- Taustaselvitys (tutkielma): `docs/thesis/THESIS-Keycloak-SaaS.md`
