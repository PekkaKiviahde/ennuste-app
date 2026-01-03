# Tutkielma: Keycloak kaupallisen B2B SaaS -sovelluksen kirjautumisratkaisuna

**Päiväys:** 2026-01-03  
**Kohdeyleisö:** sovellusarkkitehti, pääkehittäjä, tietoturva, tuotanto/ops

---

## 1. Johdanto

Kaupallisessa B2B SaaS -tuotteessa kirjautuminen ei ole vain “login-formi”, vaan osa:
- tietoturvan peruslinjaa (tilikaappaukset, phishing, sessionhallinta)
- asiakkaiden luottamusta (audit, lokit, MFA-vaatimukset)
- tuotantokelpoisuutta (käyttäjähallinta, varmistukset, häiriönhallinta)

Keycloak on identiteetin- ja pääsynhallinnan (IAM) järjestelmä, jolla voidaan toteuttaa nämä vaatimukset standardipohjaisesti.

Tässä tutkielmassa käsitellään:
- mitä standardeja Keycloak tukee ja mitä se tarkoittaa käytännössä
- miten Keycloak sopii kaupalliseen käyttöön (lisenssi, kustannukset)
- miten ratkaisu rakennetaan SaaS-arkkitehtuuriin (frontend, backend, gateway, mikropalvelut)
- tärkeimmät tietoturvapäätökset (MFA, signup, auditointi)
- vertailu yleisiin vaihtoehtoihin (Auth0, Cognito, Firebase Auth)
- suositus: milloin Keycloak on oikea valinta ja mihin varautua

---

## 2. Peruskäsitteet ja standardit

### 2.1 OAuth 2.0 (valtuutus)
OAuth 2.0 on kehys, jolla asiakas (sovellus) saa käyttöoikeuden resurssiin tokenin avulla.

SaaS-kontekstissa:
- backend API tarkistaa access tokenin
- token kertoo “kenestä on kyse” ja “mihin on oikeus”

### 2.2 OpenID Connect (OIDC) (kirjautuminen)
OIDC rakentuu OAuth2:n päälle ja lisää identiteetin (ID token, userinfo).

Käytännössä OIDC on moderni tapa toteuttaa:
- “Kirjaudu sisään”
- “Pidä istunto voimassa”
- “Tunnista käyttäjä luotettavasti”

### 2.3 SAML 2.0 (enterprise SSO)
SAML on yleinen erityisesti vanhemmissa enterprise-ympäristöissä.
Keycloak-valmius on tärkeä, jos asiakas haluaa SSO:n omasta IdP:stä.

### 2.4 RBAC ja claimit
Keycloak voi liittää roolit/ryhmät token-claimeihin.
Sovelluksen backend tekee autorisoinnin näiden perusteella.

### 2.5 “Standardit” käytännössä
Kun asiakas kysyy “mihin standardeihin kirjautuminen perustuu”, yleensä tarkoitetaan:
- käytettyä protokollaa (OIDC/OAuth2/SAML)
- toteutustapaa (Authorization Code + PKCE)
- turvakäytäntöjä (MFA, brute force -esto, session timeout)
- auditointia ja todisteita (lokit, varmistukset, prosessit)

---

## 3. Lisenssi ja kaupallinen käyttö

Keycloakia voi käyttää kaupallisessa tuotteessa, kun:
- lisenssiehdot sallivat käytön (tyypillisesti Apache 2.0 -malli)
- ylläpidetään tarvittavat lisenssi- ja tekijänoikeusmerkinnät, jos ohjelmistoa jaetaan eteenpäin

**Käytännön SaaS-tilanne:**
- jos Keycloak ajetaan palveluna (ei jaeta asiakkaalle asennuspakettina), lisenssi on yleensä suoraviivainen
- kustannus muodostuu infrastruktuurista ja ylläpitotyöstä (ei “per käyttäjä” -maksua)

---

## 4. GDPR ja tietosuoja

### 4.1 Miksi IAM liittyy GDPR:ään?
IAM käsittelee henkilötietoja (esim. nimi, sähköposti, kirjautumistapahtumat).
Siksi täytyy huomioida:
- minimointi (kerää vain tarpeellinen)
- läpinäkyvyys (mihin tietoja käytetään)
- säilytysajat (lokeille ja käyttäjädatalla)
- oikeus tietojen poistoon ja oikaisuun

### 4.2 Mitä Keycloak auttaa tekemään?
Keycloak helpottaa mm.:
- keskitettyä käyttäjähallintaa (tiedot yhdessä paikassa)
- lokitusta kirjautumisista ja ylläpitotoiminnoista
- käyttäjän hallintasivua (profiilin muokkaus, salasanan vaihto)

### 4.3 Mitä sinun pitää tehdä itse?
Tyypillisesti sinun vastuulla on:
- määritellä säilytysajat ja poistoprosessit (retention)
- tuottaa tietosuojaseloste ja käsittelysopimukset (DPA) tarpeen mukaan
- varmistaa, että lokitus ei kerää liikaa (esim. ei turhaa arkaluontoista dataa)

---

## 5. Keycloakin rooli SaaS-arkkitehtuurissa

### 5.1 Korkean tason malli
1) Käyttäjä ohjataan kirjautumaan Keycloakissa  
2) Keycloak tunnistaa käyttäjän (salasana, MFA, ulkoinen IdP)  
3) Sovellus saa tokenin (OIDC)  
4) Backend validoi tokenin ja päättää oikeudet

### 5.2 Yleiset integraatiomallit

#### A) Monoliitti / perinteinen web (server-side)
- Backend hoitaa OIDC code exchange -vaiheen
- Istunto voidaan pitää HttpOnly-cookieilla
- Tokenit eivät asu selaimessa pitkään

**Plussa:** pienempi XSS-riski tokenien osalta

#### B) SPA (React/Vue/Angular) + API
- OIDC Authorization Code + PKCE
- Tokenit selaimessa (mieluiten memory, ei localStorage)
- Backend validoi JWT:n jokaisessa pyynnössä

**Plussa:** hyvä dev-kokemus ja skaalautuvuus  
**Miinus:** vaatii huolellisen XSS-hygienian

#### C) Gateway/BFF-malli
- SPA puhuu BFF:lle cookie-sessiolla
- BFF puhuu Keycloakiin ja API:hin tokenilla

**Plussa:** tokenien käsittely voidaan keskittää

---

## 6. Turvallisuusnäkökulmat

### 6.1 MFA (monivaiheinen tunnistus)
B2B-asiakkaat odottavat MFA:ta vähintään ylläpidolle.

Suositus “0 mutta…” -malliin:
- MFA pakollinen admin/ylläpitotasoille heti
- käyttäjille vaiheittain:
  - opt-in ensin
  - pakollinen valituille toiminnoille (step-up)
  - myöhemmin pakolliseksi tietyille organisaatioille

### 6.2 Signup (itsepalvelu) ja väärinkäyttö
Signup tuo aina riskin:
- bottien rekisteröinnit
- credential stuffing
- resurssien kuormitus

Minimikontrollit:
- email verification
- rate limiting + brute force -esto
- salasana-politiikka

Lisäkontrollit:
- CAPTCHA
- domain allowlist (B2B)
- admin approval

### 6.3 Sessionhallinta ja token-politiikat
- lyhyt access token
- hallittu refresh token (rotaatio, revoke)
- session idle + max -aikarajat
- selkeä logout (myös token revoke)

### 6.4 Auditointi
Enterprise-ympäristössä “tiedetään kuka teki mitä”.
Tämä on yhtä tärkeää kuin “tiedetään kuka kirjautui”.

- Keycloak: login success/fail + admin actions
- Sovellus: kriittiset tapahtumat (muutokset, poistot, laskutus)

---

## 7. Operointi ja ylläpito (mitä usein aliarvioidaan)

### 7.1 Päivitykset
Keycloak on komponentti, jota päivitetään.
Tarvitset:
- staging-ympäristön
- pinned versiot (ei latest)
- rollback-suunnitelman

### 7.2 Varmuuskopiot ja palautus
Koska käyttäjädata ja asetukset ovat kriittisiä:
- PostgreSQL daily backup
- realm export säännöllisesti
- palautusharjoitus ennen tuotantoa

### 7.3 Saatavuus
Jos Keycloak on alhaalla, kirjautuminen ei toimi.
Perusratkaisu:
- useampi instanssi + kuormantasaus
- monitorointi (health checks, metriikat)
- hälytykset login error spikeistä

---

## 8. Vertailu vaihtoehtoihin (tiivis)

| Ratkaisu | Vahvuus | Heikkous | Milloin sopii |
|---|---|---|---|
| Keycloak (itsehostattu) | Täysi kontrolli, ei lisenssimaksua, standardit | ylläpitovastuu | kun halutaan kontrolli + enterprise |
| Auth0 (SaaS) | nopea käyttöönotto, paljon valmiita ominaisuuksia | kustannus kasvaa, lock-in | kun halutaan ostaa ylläpito pois |
| AWS Cognito | hyvä AWS-integraatio, hinnoittelu usein ok | kustomointi/UX rajoitetumpaa | kun ollaan vahvasti AWS:ssä |
| Firebase Auth | todella nopea startti | enterprise-ominaisuudet rajalliset | kun tehdään MVP/B2C |

---

## 9. Suositus: milloin Keycloak on oikea valinta?

Keycloak kannattaa valita, kun:
- halutaan **enterprise-kelpoinen** IAM ilman käyttäjäkohtaista lisenssimaksua
- halutaan pitää data/lokit omassa hallinnassa (GDPR, asiakasvaatimukset)
- hyväksytään ylläpitovastuu ja pystytään tekemään päivitysprosessi

Keycloak ei ole paras valinta, jos:
- tiimillä ei ole mitään kapasiteettia operointiin
- halutaan ostaa IAM kokonaan palveluna (ja budjetti kestää)

---

## 10. Liite: Repo-dokumentit

- Päätös (ADR): `docs/adr/ADR-001-iam-keycloak.md`
- Toteutusohje: `docs/security/authentication.md`
- Yhteenveto: `docs/README-auth.md`

---

## 11. Lähdeluettelo (täydennä tarpeen mukaan)

Tähän kannattaa lisätä repo-ympäristössä linkit esimerkiksi:
- Keycloak Documentation
- OpenID Connect Core
- OAuth 2.0 RFC:t
- OWASP ASVS / Top 10
- NIST Digital Identity Guidelines (tarvittaessa)
