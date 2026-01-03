# ADR-001: Identity & Access Management (IAM) – Keycloak

**Tila:** Accepted  
**Päiväys:** 2026-01-03  
**Omistaja:** Sovellusarkkitehtuuri / Platform

## Päätös

Otamme käyttöön **Keycloak**-ratkaisun (itsehostattu) SaaS-sovelluksen identiteetin- ja pääsynhallintaan (**IAM**).

- **Autentikointi:** **OpenID Connect (OIDC)** / **OAuth 2.0**
- **Mahdollinen enterprise-SSO myöhemmin:** **SAML 2.0** (Keycloak-valmius)
- **Sovelluksen autorisointi:** sovelluksessa toteutettu **RBAC/permission-check** token-claimien perusteella

## Konteksti

Tavoitteena on kaupallinen **B2B SaaS**, jonka odotetaan läpäisevän:
- asiakkaiden tietoturvakyselyt (enterprise-vaatimukset)
- perus-auditoinnin (lokitus, todisteet)
- EU-markkinan ja **GDPR**-lähtöiset käytännöt

Projektin lähtöoletukset (tämän päätöksen pohjaksi):
- **Ei multi-tenancyä nyt** (ei realm-per-tenant). Yksi käyttäjäkanta, roolit sovelluksessa.
- **Tuotanto omassa infrassa** (VM/Docker/Kubernetes).
- **Käyttäjien luonti:** itsepalvelu (**signup**).
- **MFA kompromissina:** pakollinen admin/ylläpitotasoille heti, käyttäjille vaiheittain.

## Päätöksen ajurit

1. **Standardit ja yhteensopivuus**
   - OIDC/OAuth2 on yhteensopiva modernien web- ja API-arkkitehtuurien kanssa.
2. **Enterprise-kelpoisuus**
   - MFA, roolit/ryhmät, policyt, lokitus, integraatiopolut.
3. **Kustannukset ja vendor lock-in**
   - ei per-käyttäjä-lisenssimaksua, kontrolli ja siirrettävyys.
4. **GDPR ja datan sijainti**
   - käyttäjädata ja lokit voidaan pitää omassa hallinnassa (EU-alueen infra).

## Vaihtoehdot

### Vaihtoehto A: Keycloak itsehostattuna (**valittu**)
- Plussat: kustannustehokas skaalautuessa, muokattava, standardit, data hallinnassa
- Miinukset: ylläpito- ja päivitysvastuu

### Vaihtoehto B: Hallinnoitu IAM (Auth0 / Azure AD B2C / AWS Cognito)
- Plussat: nopea käyttöönotto, vähemmän operointia
- Miinukset: kustannus kasvaa käyttäjämäärän mukaan, vendor lock-in, rajoitukset kustomoinnissa

### Vaihtoehto C: Oma kirjautumisjärjestelmä
- Plussat: täydellinen kontrolli (teoriassa)
- Miinukset: korkea toteutus- ja ylläpitokustannus, iso tietoturvariski, audit-vaikeus

## Päätöksen seuraukset

### Hyödyt
- Autentikointi irrotetaan sovelluslogiikasta ja standardoidaan.
- Enterprise-vaatimukset täyttyvät nopeammin (MFA, policyt, lokit).
- Kustannus pysyy hallinnassa skaalautuessa.

### Haitat / riskit
- Keycloak on kriittinen palvelu: jos se on alhaalla, kirjautuminen ei toimi.
- Päivitykset ja konfiguraatio pitää hallita prosessilla (staging → prod).
- Signup tuo väärinkäyttöriskin → vaatii kontrollit (verifiointi, rate limit).

## Arkkitehtuurilinjaus

- Keycloak ajetaan erillisenä palveluna (Docker/K8s/VM) ja käyttää **PostgreSQL**-tietokantaa.
- Keycloak julkaistaan vain **TLS/HTTPS**-yhteyden yli (reverse proxy).
- Sovellus käyttää **OIDC Authorization Code + PKCE** -flow’ta web-käytössä.
- Backend validoi tokenit (iss/aud/signature/exp) ja tekee autorisoinnin.

## Minimivaatimukset (Go-live)

1. **Signup-kontrollit**
   - Email verification pakollinen
   - Rate limiting / brute force -esto
2. **MFA**
   - Pakollinen vähintään admin/ylläpitotasoille
3. **Lokitus**
   - Keycloak: login success/failure + admin actions
   - Sovellus: kriittisten toimintojen audit trail
4. **Varmuuskopiot**
   - PostgreSQL päivittäinen backup + palautustesti
5. **Versionhallinta**
   - Ei `latest` tuotannossa (pinned versiot)

## Jatkokehitys (ei tämän päätöksen laajuudessa)

- Asiakaskohtainen SSO (SAML/OIDC federation)
- SCIM-provisionointi
- Multi-tenancy (tarpeen mukaan)
