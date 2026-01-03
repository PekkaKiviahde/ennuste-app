# Authentication & Authorization – Keycloak

**Dokumentin tarkoitus:**  
Tämä dokumentti on toteutusohje ja yhteinen sopimus siitä, miten kirjautuminen ja käyttöoikeudet tehdään Keycloakilla.

**Kohde:** B2B SaaS (enterprise-kelpoinen)  
**Päiväys:** 2026-01-03

---

## 1. Termit

- **IdP (Identity Provider):** Keycloak, joka tunnistaa käyttäjän.
- **OIDC:** OpenID Connect (kirjautuminen + käyttäjän identiteetti).
- **OAuth2:** valtuutuskehys (access/refresh tokenit).
- **JWT:** allekirjoitettu token (yleinen access token -muoto).
- **RBAC:** roolipohjainen käyttöoikeusmalli.

---

## 2. Vaatimukset

### 2.1 Turvataso (minimi)
- TLS/HTTPS pakollinen
- Brute force -esto ja rate limit
- MFA pakollinen admin/ylläpitotasoille
- Tapahtumalokit ja audit trail
- Varmuuskopiointi ja palautus testattu

### 2.2 Käyttökokemus (minimi)
- “Kirjaudu sisään” ohjaa Keycloak-loginiin (teemoitus mahdollista)
- “Unohditko salasanan” toimii (Keycloak email)
- Selkeä virheilmoituspolitiikka (ei vuoda tietoa)

---

## 3. Protokollat ja flow’t

### 3.1 Suositus web-käyttöön
- **OIDC Authorization Code + PKCE**

**Perustelu:** turvallinen selaimessa, ei vaadi salasanojen käsittelyä sovelluksessa.

### 3.2 Service-to-service (tarvittaessa)
- **Client Credentials** (erillinen service client)
- Älä käytä käyttäjän refresh tokenia mikropalvelujen välillä.

---

## 4. Token-politiikat

Suositusarvot (tarkennetaan ympäristön mukaan):
- Access token: **5–15 min**
- Refresh token: hallitusti (rotaatio, revoke)
- Session idle timeout: esim. **30–60 min**
- Session max: esim. **8–12 h**

**Huom:** Tokenin elinaika = kompromissi turvallisuuden ja käyttökokemuksen välillä.

---

## 5. Tokenien validointi backendissä (pakollinen)

Backendissä on aina:
- allekirjoituksen tarkistus (JWKS)
- `iss` (issuer) tarkistus
- `aud` (audience) tarkistus
- `exp` (expiry) ja pieni clock skew
- roolien/claimien tulkinta autorisointiin

**Älä koskaan luota pelkkään frontendiin.**

---

## 6. Roolit ja autorisointi

### 6.1 Minimiroolit
- `admin`
- `manager`
- `user`

### 6.2 Periaate
- Keycloak liittää roolit tokeniin.
- Sovellus tekee autorisoinnin:
  - middleware/guard tarkistaa roolit
  - jokainen suojattu endpoint varmistaa oikeuden

### 6.3 Käytännön suositus
- Pidä Keycloakissa “karkeat roolit”
- Sovelluksessa “permissionit” (esim. `PROJECT_DELETE`) jos tarve kasvaa

---

## 7. Signup (itsepalvelu) turvallisesti

Koska signup on päällä, seuraavat ovat minimivaatimus:

- Email verification **pakollinen**
- Rate limit `signup` ja `login` reiteille (reverse proxy / API gateway)
- Keycloak brute force detection **päälle**
- Password policy (pituus, estolistat)

**Lisävarmistukset (jos abusea):**
- CAPTCHA / bot-suojaus
- Domain allowlist tietyille B2B-asiakkaille
- Admin approval -kytkin (myöhemmin)

---

## 8. MFA-politiikka (“0 mutta…”)

### 8.1 Heti (Go-live)
- MFA pakollinen:
  - Keycloak admin console käyttäjille
  - sovelluksen `admin`-roolille
- Tavallisille käyttäjille:
  - MFA opt-in + näkyvä kehotus (UI)

### 8.2 Seuraava vaihe
- “Step-up MFA” tietyissä toiminnoissa (esim. laskutus, käyttäjähallinta)
- Organisaatiokohtainen vaatimus (“pakollinen kaikille”)

---

## 9. Keycloak Admin Consolen kovennus

- Admin console vain VPN/IP allowlistin kautta (jos mahdollista)
- Erota ylläpitäjät käyttäjistä (omat admin-tilit)
- MFA pakollinen ylläpidolle
- Vähimmäisoikeudet (least privilege)

---

## 10. Auditointi ja lokitus

### 10.1 Keycloak
- login success/failure
- admin actions

### 10.2 Sovellus
- kriittiset tapahtumat:
  - käyttäjien ja roolien muutokset
  - laskutuksen ja maksujen hallinta
  - datan poisto / export

**Audit-lokiin:** kuka, mitä, milloin, mistä (IP), ja tulos.

---

## 11. Varmuuskopiointi ja palautus

### 11.1 Varmuuskopiot
- PostgreSQL: päivittäin (retentio 14–30 pv)
- Realm export: säännöllisesti (esim. viikoittain + muutosten jälkeen)

### 11.2 Palautusharjoitus
- vähintään 1 palautustesti dokumentoituna ennen tuotantoa

---

## 12. Definition of Done (DoD)

- [ ] Backend validoi tokenit (iss/aud/signature/exp)
- [ ] Autorisointi kaikissa suojatuissa endpointeissa
- [ ] Signup: email verify + rate limit
- [ ] MFA pakollinen admin/ylläpitotasoille
- [ ] Lokit: login fail/success + admin actions + sovelluksen audit
- [ ] Backup & restore testattu
