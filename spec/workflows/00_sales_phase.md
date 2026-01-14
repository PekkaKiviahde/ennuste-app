# Vaihe −1: Myynti ja asiakkuuden avaus (SaaS‑myyjä)

## Tavoite
Kuvata myyntivaiheen jälkeen tehtävä “asiakkuuden avaus” siten, että:
- järjestelmässä on yhtiö (Organization) ja demoprojekti (Project, `is_demo=true`)
- yrityksen pääkäyttäjälle (ORG_ADMIN) voidaan lähettää kutsulinkki
- prosessi on idempotentti ja turvallinen (retry ei luo tuplia)
- kaikki oleelliset tapahtumat näkyvät audit-lokissa (append-only)

## Termit
- Sopimus: myyntisopimus asiakkaan kanssa (järjestelmän ulkopuolinen todiste)
- Asiakkuuden avaus: tekninen provisioning sovellukseen (yhtiö + demoprojekti + kutsu)
- Kutsulinkki (Invite): sähköpostiin sidottu, kertakäyttöinen ja vanheneva token
- Demoprojekti: onboardingia varten luotu projekti (`is_demo=true`)

## Päätökset (yhteenveto)
- Asiakkuuden avaus tapahtuu vasta, kun myyntisopimus on tehty.
- Konserni‑taso on olemassa, mutta valinnainen käyttää.
- Jos konsernia ei anneta, järjestelmä voi luoda yhtiölle “oma konserni” ‑Groupin (suositus: vältä NULL‑konsernia).
- Yhtiön luonnissa luodaan demoprojekti automaattisesti.
- Kutsulinkki on aina tiettyyn sähköpostiin sidottu, kertakäyttöinen ja vanheneva.
- Roolit ovat scopekohtaisia:
  - ORG_ADMIN (org‑scope)
  - PROJECT_OWNER (project‑scope demoprojektissa onboardingissa)

## Myynti → asiakkuuden avaus (vaiheittain)

### 1) Myynti (järjestelmän ulkopuolella)
Pre:
- sopimus on hyväksytty (SaaS‑myyjä)
Post:
- myyjällä on asiakkaan perustiedot: yhtiön nimi, y‑tunnus (jos käytössä), ORG_ADMINin sähköposti

### 2) Asiakkuuden avaus (järjestelmässä)
Toimija: SaaS‑myyjä (sisäinen)

1) (Valinnainen) Luo konserni (Group).
   - Pre: konsernin nimi tiedossa ja myyjällä on oikeus luoda.
   - Post: Group olemassa.
   - Audit: `group.created`

2) Luo yhtiö (Organization) ja demoprojekti (Project).
   - Input minimi: `name`, `slug`, (valinn.) `group_id`
   - Post:
     - Organization olemassa
     - Project (demo) olemassa: `is_demo=true`, nimi “Demo – <Yhtiö>”
   - Idempotenssi:
     - sama `slug` palauttaa olemassa olevan yhtiön (ei tuplaluontia)
     - demoprojekti ei duplikoidu retryssä
   - Audit:
     - `org.created`
     - `project.created` (demo)
     - (tarvittaessa) `group.created` jos luodaan “oma konserni”

3) Luo ORG_ADMIN‑kutsu (Invite) ja toimita kutsulinkki asiakkaalle.
   - Input: `organization_id`, `email`, (valinn.) `role_to_grant` (oletus ORG_ADMIN)
   - Post:
     - kutsu on aktiivinen ja token on saatavilla vain toimitushetkellä
   - Idempotenssi (“resend”):
     - jos samalle (org,email) on aktiivinen kutsu, se perutaan ja luodaan uusi kutsu
   - Audit:
     - `invite.revoked` (jos resend peruu aiemman)
     - `invite.created`

## Kutsulinkin säännöt (turva + idempotenssi)
- Email-sidonta: kutsu kelpaa vain käyttäjälle, jonka email vastaa kutsun emailia.
- Kertakäyttö: ensimmäinen hyväksyntä täyttää `redeemed_at` ja estää uuden hyväksynnän.
- Vanhenee: `expires_at` jälkeen hyväksyntä estetään.
- Peruutus: `revoked_at` estää käytön heti.
- Tokenia ei tallenneta selkokielisenä (vain `token_hash`).

## Audit‑tapahtumat (append‑only)
- `group.created` (jos luodaan)
- `org.created`
- `project.created` (demo)
- `invite.created`
- `invite.revoked` (resend)

## Rajapinnat (nykyinen kutsulinkkimalli)
- `POST /api/saas/groups` (valinnainen)
- `POST /api/saas/organizations` (luo yhtiö + demoprojekti + ensimmäinen kutsu)
- `POST /api/saas/organizations/{organizationId}/invites` (resend / uusi kutsu)
- `POST /api/invites/accept` (ORG_ADMIN hyväksyy kutsun)

---

## Mitä muuttui
- Lisättiin vaihe −1: myynti ja asiakkuuden avaus ennen tuotannon prosesseja.

## Miksi
- Myynti ja tekninen provisioning pitää erottaa, jotta onboarding on idempotentti ja auditoitava.

## Miten testataan (manuaali)
- Luo yhtiö myyjänä ilman konsernia → yhtiö + demoprojekti syntyy ja kutsu luodaan.
- Aja sama luonti uudelleen samalla slugilla → ei synny toista yhtiötä eikä toista demoprojektia.
- Tee resend samalle emailille → vanha kutsu perutaan ja uusi toimii.
