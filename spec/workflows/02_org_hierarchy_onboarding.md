# Konserni, yhtiö ja projekti – hierarkia ja onboarding

Alias: S0

## Tavoite
Mallintaa konserni/yhtiö/projekti‑hierarkia ja SaaS‑myyjän onboarding‑virta siten,
että roolit ja workflow‑vastuut ovat selkeät ja auditoitavat.

## Termit
- Konserni: usean yhtiön kokonaisuus (Group)
- Yhtiö: asiakasorganisaatio (Company/Organization)
- Projekti: yhtiön yksittäinen työmaa
- SaaS‑myyjä: sisäinen myyntirooli (ei asiakasrooli)
- Yrityksen pääkäyttäjä: ORG_ADMIN
- Org‑rooli: rooli, joka koskee yhtä yhtiötä (organization scope)
- Projekt‑rooli: rooli, joka koskee yhtä projektia (project scope)
- Kutsulinkki (Invite): yksi yhtiö + yksi sähköposti + yksi rooli, kertakäyttöinen token
- Demoprojekti: automaattisesti luotu projekti onboardingia varten (is_demo=true)

## Päätökset (yhteenveto)
- Konserni‑taso on olemassa ja käytettävissä, mutta valinnainen käyttää (aina ei ole konsernia). (LUKITTU)
- Yhtiön luonnissa luodaan demoprojekti automaattisesti (is_demo=true). (LUKITTU)
- Kutsulinkki on aina tiettyyn sähköpostiin sidottu, kertakäyttöinen ja vanheneva. (LUKITTU)
- Roolit erotellaan scopeihin: org‑roolit ja projekt‑roolit ovat eri asioita; oikeudet eivät periydy automaattisesti scopejen yli.
- Onboardingissa ORG_ADMIN saa demoprojektissa projekt‑roolin `PROJECT_OWNER` automaattisesti.
- Kaikki tilamuutokset kirjataan append‑only audit‑eventteinä (audit trail).
- Suositus: vältä NULL‑konsernia. Jos konsernia ei anneta, järjestelmä luo yhtiölle implisiittisen “oma konserni” ‑Groupin (esim. `is_implicit=true`) ja liittää yhtiön siihen.

## Hierarkia
Konserni
-> Yhtiö
-> Projekti

### Entiteetit ja invarianssit
- Group (konserni) on valinnainen liiketoiminnassa (aina ei ole konsernia).
- Suositus: tietomallissa yhtiö kuuluu aina yhteen Groupiin (joko annettuun tai “oma konserni” ‑Groupiin), jotta vältetään NULL‑konserni.
- Organization (yhtiö) kuuluu yhteen Groupiin.
- Project (projekti) kuuluu yhteen Organizationiin.
- Invite (kutsulinkki) kuuluu yhteen Organizationiin ja on sidottu yhteen sähköpostiin.

### Minimiattribuutit ja uniikkiudet (speksitaso)
Group:
- `group_id` (uuid, PK)
- `name` (text)
- `slug` (text, UNIQUE) tai muu pysyvä tunniste URL:iin
- `is_implicit` (bool, default false)
- `created_at`, `created_by`

Organization:
- `organization_id` (uuid, PK)
- `group_id` (uuid, FK; suositus: NOT NULL ja käytä “oma konserni” ‑Groupia)
- `name` (text)
- `slug` (text, UNIQUE) tai muu pysyvä tunniste URL:iin
- `created_at`, `created_by`

Project:
- `project_id` (uuid, PK)
- `organization_id` (uuid, FK, NOT NULL)
- `name` (text)
- `slug` (text, UNIQUE per organization)
- `is_demo` (bool, default false)
- `archived_at` (timestamptz, nullable)
- `created_at`, `created_by`

### Rooliscope ja periytyminen (turvallinen oletus)
- Org‑roolit (esim. `ORG_ADMIN`) antavat oikeuden hallita yhtiön asetuksia ja roolituksia.
- Projekt‑roolit (esim. `PROJECT_OWNER`) antavat oikeuden toimia yhdessä projektissa.
- Org‑rooli ei automaattisesti anna pääsyä projektin dataan, ellei käyttäjälle ole erikseen annettu projekt‑roolia.
- Poikkeus onboardingissa: järjestelmä antaa `ORG_ADMIN`‑kutsun hyväksyjälle demoprojektiin `PROJECT_OWNER`‑roolin.

## Esimies‑alaissuhteet (workflow‑näkökulma)
- ORG_ADMIN (org‑scope): hallitsee yhtiön roolituksia (org‑ ja projekt‑roolien myöntäminen), kutsuja ja projektien perustamista.
- PROJECT_OWNER (project‑scope): hallitsee PROJECT_MANAGER, GENERAL_FOREMAN, SITE_FOREMAN, PROCUREMENT, EXEC_READONLY.
- PROJECT_MANAGER (manager): hallitsee GENERAL_FOREMAN, SITE_FOREMAN, PROCUREMENT.
- GENERAL_FOREMAN (editor): hallitsee SITE_FOREMAN.
- SITE_FOREMAN (editor): ei alaisia.
- PROCUREMENT / EXEC_READONLY (viewer): ei alaisia.

Workflow‑vastuut:
- Suunnitelma: GENERAL_FOREMAN / SITE_FOREMAN kirjaa, PROJECT_MANAGER hyväksyy.
- Ennuste: PROJECT_MANAGER luo ennustetapahtuman, PROJECT_OWNER lukitsee.

## Onboarding‑virta (SaaS‑myyjä)
Tavoite: virta on idempotentti ja turvallinen (sama pyyntö voidaan toistaa ilman tuplaluontia; kutsun hyväksyntä ei voi tapahtua kahdesti).

### Vaiheet (precondition / postcondition)
1) SaaS‑myyjä luo konsernin (valinnainen) ja yhtiön.
   - Pre: myyjä on sisäinen käyttäjä ja valtuutettu luontiin.
   - Pre: jos konsernia ei anneta, järjestelmä voi luoda “oma konserni” ‑Groupin yhtiölle (suositus).
   - Post: Group ja Organization ovat olemassa ja linkitetty.
   - Idempotenssi: luonti on idempotentti vähintään `slug`‑uniikkiuden kautta; suositus: tue `Idempotency-Key`‑otsaketta sisäisissä create‑kutsuissa.

2) Järjestelmä luo demoprojektin automaattisesti (is_demo=true).
   - Pre: Organization luotu onnistuneesti.
   - Post: Project (demo) olemassa ja kuuluu organizationiin.
   - Post: demoprojektin nimi on “Demo – <Yhtiö>”.
   - Idempotenssi: jos demoprojekti on jo olemassa (esim. retry), järjestelmä ei luo toista demoa.

3) SaaS‑myyjä luo kutsun ORG_ADMINille (email‑sidottu).
   - Pre: Organization olemassa.
   - Pre: email normalisoidaan (case‑insensitive vertailu; tallennetaan kanoniseen muotoon).
   - Post: aktiivinen kutsu (Invite) olemassa kyseiselle emailille ja yhtiölle.
   - Idempotenssi: “resend” luo uuden kutsun ja peruu vanhan (ks. kutsulinkki‑säännöt).

4) ORG_ADMIN hyväksyy kutsun.
   - Pre: kutsu on voimassa (ei vanhentunut, ei peruttu, ei lunastettu).
   - Pre: tokenin email vastaa kutsun emailia (sidonta).
   - Post: käyttäjälle myönnetään yhtiöön org‑rooli `ORG_ADMIN`.
   - Post: käyttäjälle myönnetään demoprojektiin projekt‑rooli `PROJECT_OWNER`.
   - Post: kutsu merkitään lunastetuksi (`redeemed_at`).
   - Idempotenssi: toinen hyväksyntäyritys palauttaa “already redeemed” ilman uusia roolitus‑kirjauksia.

5) ORG_ADMIN luo oikeat projektit ja roolittaa henkilöt.
   - Pre: käyttäjällä on `ORG_ADMIN` kyseisessä yhtiössä.
   - Post: projektit luotu ja roolitukset kirjattu audit‑eventteinä.

### Edge caset
- Vastaanottajalla on jo käyttäjätili samalla emaililla: kutsun hyväksyntä liitetään olemassa olevaan käyttäjään (ei luoda duplikaattia).
- Kutsu vanhenee: hyväksyntä epäonnistuu (410/expired), ja tarvitaan uusi kutsu.
- Kutsu perutaan: hyväksyntä epäonnistuu (403/revoked), ja tarvitaan uusi kutsu.
- Kutsua yritetään käyttää kahdesti: toinen yritys epäonnistuu (409/redeemed).
- Yhtiön luontia kutsutaan kahdesti (retry / integraatio): sama `slug` (ja/tai `Idempotency-Key`) palauttaa saman yhtiön; demoprojekti ei duplikoidu.

## Tietomalli (ehdotus)
### Taulut
1) groups
- group_id (uuid, PK)
- name (text)
- slug (text, UNIQUE)
- is_implicit (bool, default false)
- created_at, created_by

2) organizations
- organization_id (uuid, PK)
- group_id (uuid, FK -> groups)
- name, slug
- created_at, created_by

3) projects
- project_id (uuid, PK)
- organization_id (uuid, FK -> organizations)
- name, slug
- is_demo (bool, default false)
- archived_at (timestamptz, nullable)
- created_at, created_by

4) org_invites
- invite_id (uuid, PK)
- organization_id (uuid, FK -> organizations)
- email (text)
- role_to_grant (text, default ORG_ADMIN)
- token_hash (text)
- created_at, created_by
- expires_at (timestamptz)
- redeemed_at (timestamptz, nullable)
- revoked_at (timestamptz, nullable)

5) project_role_assignments
- project_id, user_id, role_code (existing)
- granted_by, granted_at

6) organization_role_assignments
- organization_id, user_id, role_code (existing)
- granted_by, granted_at

### Indeksit
- groups(name)
- groups(slug) UNIQUE
- organizations(group_id, slug)
- organizations(slug) UNIQUE (jos käytetään globaalisti)
- projects(organization_id, slug) UNIQUE
- org_invites(organization_id, expires_at)
- org_invites(token_hash) UNIQUE
- org_invites(organization_id, email) UNIQUE WHERE (redeemed_at IS NULL AND revoked_at IS NULL)

### Kutsulinkki / Invite‑määrittely
Tietomalli (minimi):
- `invite_id`, `org_id` (`organization_id`), `email`, `role_to_grant`
- `token_hash` (vain hash talteen), `created_at`, `created_by`
- `expires_at`, `redeemed_at`, `revoked_at`

Säännöt:
- Token on kertakäyttöinen: hyväksyntä täyttää `redeemed_at`, ja token ei kelpaa enää sen jälkeen.
- Token ei kelpaa `expires_at` jälkeen.
- Peruutus (`revoked_at`) estää käytön heti.
- Uudelleenlähetys (“resend”) luo uuden kutsun ja peruu vanhan kutsun (asetetaan `revoked_at` vanhalle).
- Email‑sidonta: hyväksynnässä tokenin kutsu määrittää emailin; hyväksyntä on sallittu vain käyttäjälle, jonka email vastaa kutsun emailia.

Turva:
- Tokenia ei tallenneta selkokielisenä (vain `token_hash`).
- Token on satunnainen ja riittävän pitkä (esim. 32+ tavua); hashataan ennen tallennusta.
- Jokaisesta kutsun tilamuutoksesta kirjataan audit‑event (created, revoked, accepted, expired).

### Demoprojekti
Määrittely:
- `is_demo=true` demoprojektille.
- Oletusnimi: “Demo – <Yhtiö>”.
- Kun ORG_ADMIN hyväksyy kutsun, järjestelmä myöntää demoprojektiin `PROJECT_OWNER`‑roolin.

Hallinta:
- Demoprojekti voidaan arkistoida (`archived_at`) ja sen arkistointi kirjataan audit‑eventtinä.
- Suositus (MVP): demoa ei “muun­neta” in‑place oikeaksi projektiksi. ORG_ADMIN luo uuden projektin ja arkistoi demon.

## API (ehdotus)
SaaS‑myyjä (sisäinen):
- POST /api/saas/groups (luo konserni)
- POST /api/saas/organizations (luo yhtiö + demoprojekti)
- POST /api/saas/organizations/:id/invites (kutsulinkki adminille / resend)

Pääkäyttäjä:
- POST /api/invites/accept (kutsulinkin hyväksyntä)
- POST /api/projects (uusi projekti)
- POST /api/projects/:id/archive (arkistoi projekti, myös demo)
- POST /api/admin/roles (roolitus)

## Audit‑tapahtumat (append‑only)
- group.created (vain jos luodaan)
- org.created
- project.created (demo, is_demo=true)
- invite.created
- invite.revoked
- invite.accepted
- invite.expired
- role.granted (org‑scope)
- role.granted (project‑scope)
- project.archived (demo)

---

## Mitä muuttui
- Täsmennettiin konserni/yhtiö/projekti‑hierarkian invarianssit ja minimiattribuutit.
- Eroteltiin org‑roolit ja projekt‑roolit sekä onboarding‑poikkeus demoprojektiin.
- Määriteltiin kutsulinkin tietomalli, säännöt ja turvallisuus (email‑sidonta, kertakäyttö, vanheneminen, resend).
- Määriteltiin demoprojektin hallinta (is_demo, nimeäminen, arkistointi, MVP‑suositus muunnosta).
- Listattiin audit‑eventit tilamuutoksille.
- Lisättiin alias vaiheelle: `S0`.

## Miksi
- Tarvitaan toteutuskelpoinen, idempotentti ja auditoitava onboarding‑prosessi ilman “hiljaisia” periytymissääntöjä.
- Turva vaatii selkeät kutsulinkkisäännöt ja yhdenmukaiset audit‑eventit.

## Miten testataan (manuaali)
- Luo yhtiö ilman konsernia → järjestelmä luo “oma konserni” ja linkitys on oikein.
- Luo yhtiö konsernilla → yhtiö linkittyy annettuun konserniin.
- Luo yhtiö → demoprojekti syntyy aina (`is_demo=true`, nimi “Demo – <Yhtiö>”).
- Luo kutsu ja hyväksy se → ORG_ADMIN myönnetään yhtiöön ja PROJECT_OWNER demoprojektiin.
- Yritä hyväksyä sama kutsu uudelleen → estyy (kertakäyttöisyys), ei uusia roolituksia.
- Odota `expires_at` ohi tai aseta se menneisyyteen → kutsu vanhenee eikä kelpaa.
- Peruu kutsu (`revoked_at`) → kutsu ei kelpaa.
- Resend → uusi kutsu toimii ja vanha kutsu ei enää kelpaa.
