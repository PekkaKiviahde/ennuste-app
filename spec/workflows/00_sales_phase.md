# Vaihe −1: Myynti ja asiakkuuden avaus (SaaS‑myyjä)

## Tavoite
Kuvata myynti + “asiakkuuden avaus” siten, että:
- järjestelmässä on yhtiö (Organization) ja demoprojekti (Project, `is_demo=true`)
- yrityksen pääkäyttäjälle (ORG_ADMIN) voidaan lähettää kutsulinkki
- prosessi on idempotentti ja turvallinen (retry ei luo tuplia)
- kaikki oleelliset tapahtumat näkyvät audit-lokissa (append-only)

## Termit
- Liidi: myynnin alku (järjestelmän ulkopuolinen)
- Sopimus: myyntisopimus asiakkaan kanssa (järjestelmän ulkopuolinen todiste)
- Demo: tuotteen esittely/tutustuminen (suositus: erillinen demo-ympäristö/tenant)
- Asiakkuuden avaus: tekninen provisioning sovellukseen (yhtiö + demoprojekti + kutsu)
- Kutsulinkki (Invite): sähköpostiin sidottu, kertakäyttöinen ja vanheneva token
- Demoprojekti: onboardingia varten luotu projekti (`is_demo=true`)

## Päätökset (yhteenveto)
- Asiakkuuden avaus (järjestelmään) tapahtuu vasta, kun myyntisopimus on tehty.
- Konserni‑taso on olemassa, mutta valinnainen käyttää.
- Jos konsernia ei anneta, järjestelmä voi luoda yhtiölle “oma konserni” ‑Groupin (suositus: vältä NULL‑konsernia).
- Yhtiön luonnissa luodaan demoprojekti automaattisesti.
- Kutsulinkki on aina tiettyyn sähköpostiin sidottu, kertakäyttöinen ja vanheneva.
- Roolit ovat scopekohtaisia:
  - ORG_ADMIN (org‑scope)
  - PROJECT_OWNER (project‑scope demoprojektissa onboardingissa)
- Suositus: pre-sales demo ei luo asiakasyhtiötä/asiakasprojektia, vaan käyttää erillistä demo-ympäristöä (ei asiakasdataa).

## Myynti → asiakkuuden avaus (vaiheittain)

### 1) Myynti (pre-sales, järjestelmän ulkopuolella)
Pre:
- liidi on tunnistettu ja myyjä hoitaa kvalifioinnin
Post:
- tuote on esitelty ja asiakkaalla on demokokemus (tutustuminen)
- hinnoittelu ja tarjous on tehty
- sopimus on allekirjoitettu
- myyjällä on provisioning-minimitiedot: yhtiön nimi, slug, (valinn.) konsernitieto, ORG_ADMINin sähköposti

Myyntivaiheen minimi (checklist):
- Esittely: arvolupaus ja rajaus (MVP)
- Demo: ohjataan demo-ympäristöön (ei asiakasdataa)
- Tarjous: hinnoittelu ja ehdot
- Sopimus: allekirjoitus + aloituspäivä

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
- Lisättiin myyntivaiheen (pre-sales) checklist vaiheeseen −1.
- Täsmennettiin demokäytännön suositus: demo erillään asiakasprovisionoinnista.

## Miksi
- Myynti, demo ja provisioning ovat eri riskiprofiileja (asiakasdata, oikeudet, audit).
- Selkeä raja vähentää “vahingossa luotu asiakas” -tilanteita ja pitää kutsulinkkimallin yksiselitteisenä.

## Miten testataan (manuaali)
- Myynti: toimita demolinkki demo-ympäristöön (ei asiakasyhtiötä) ja varmista, että demo ei luo mitään asiakasdataan.
- Luo yhtiö myyjänä ilman konsernia → yhtiö + demoprojekti syntyy ja kutsu luodaan.
- Aja sama luonti uudelleen samalla slugilla → ei synny toista yhtiötä eikä toista demoprojektia.
- Tee resend samalle emailille → vanha kutsu perutaan ja uusi toimii.
