# PLG: Trial + entitlement + projektin elinkaari

Alias: S1

## Tavoite
Määritellä SMB/PLG-segmentin:
- trial (aikarajattu, ei korttia) ja trialin rajat
- org-tason entitlement (subscription_status) ja read-only gate
- projektin elinkaari (ACTIVE/STANDBY/ARCHIVED) ja STANDBY gate
- past_due → grace → read_only + projektit STANDBY
- projektin reaktivointi kynnysrahalla (checkout → webhook → ACTIVE), idempotentisti ja auditoitavasti

## Lukitut päätökset (ÄLÄ MUUTA)
- Segmentti: SMB / PLG.
- Trial: aikarajattu, ei korttia.
- Trialin jälkeen: read-only (data näkyy, write estetään).
- Trialin rajat: 1 org + 1 projekti + max 3 käyttäjää + 1 tavoitearvio-importti.
- Laskutus on ulkoinen master, mutta SaaS päättää käyttöoikeuden (entitlement) statuksen perusteella.
- Projektin seisonta: STANDBY ei kuluta aktiivisia rajoja.
- Reaktivointi: kertamaksu per projekti per aktivointi (checkout → webhook → ACTIVE).
- past_due: grace (7–14 pv) → sitten org read-only + projektit STANDBY.

## Termit
- Billing-provider: ulkoinen laskutusjärjestelmä (master laskutuksesta).
- Entitlement: sovelluksen oma päätös käyttöoikeudesta (gating).
- Read-only (org): data näkyy, mutta kaikki domain-write estetään.
- STANDBY (projekti): projekti “seisoo”; ei kuluta aktiivista projektirajaa; projektin domain-write estetään.
- Reaktivointi: kertamaksullinen toimenpide, joka muuttaa projektin ACTIVE-tilaan (maksun webhook vahvistaa).
- Grace: past_due-tilan armonaika ennen read_only-tilaa.
- Commerce-endpoint: poikkeus gateen, joka saa luoda checkout/portaali-session vaikka org olisi read_only (koska se ei muuta domain-dataa).

---

## A) Org entitlement -tilat ja gate

### Kentät (speksitaso)
- `subscription_status`: `trialing | active | past_due | read_only | canceled`
- `grace_until`: timestamptz, nullable
- (suositus speksitaso) `trial_ends_at`: timestamptz, nullable (helpottaa UI:ta ja ajastuksia)
- (suositus speksitaso) billing-viitteet: `billing_customer_id`, `billing_subscription_id`, `plan_code`

### Tilojen semantiikka
- `trialing`: trial käynnissä; write sallittu trial-rajojen puitteissa.
- `active`: maksettu/aktiivinen; write sallittu (rajojen puitteissa).
- `past_due`: laskutus ilmoittaa viiveestä; write sallittu `grace_until` asti.
- `read_only`: write estetty kaikilta domain-write endpointeilta (katso poikkeukset).
- `canceled`: tilaus päättynyt; org on read-only ja uudet domain-write-toiminnot estetään.

### Gate (org read_only)
- Kun `subscription_status=read_only` (tai `canceled`), kaikki domain-write-endpointit palauttavat `402` (suositus) tai `403`
  + yhtenäinen virhekoodi: `ENTITLEMENT_READ_ONLY`.
- Gate koskee sekä org-tason että projektitason domain-write-toimintoja:
  - projektin luonti
  - roolitukset
  - importit
  - suunnittelun uudet versiot
  - baseline
  - ennustetapahtumat ja viikkokirjaukset
- Entitlement-tilan päivitys tapahtuu billing-providerin integraatiossa (webhook consumer / taustaprosessi), ei asiakasrajapinnan kautta.

### Poikkeukset (commerce-endpointit)
Read-only EI saa estää asiakkaan maksamista tai tilauksen aktivointia. Seuraavat ovat sallittuja myös read-only-tilassa:
- “Avaa laskutusportaali” (portaali-session luonti billing-providerille)
- “Upgrade / aktivoi tilaus” (checkout-session luonti)
- (valinnainen) “Export data” (ei muuta domain-dataa)

> Huom: nämä endpointit eivät muuta domain-dataa, vaan luovat vain linkin/checkoutin billing-providerille.

### Trial-rajojen enforcement (MVP)
Kun `subscription_status=trialing`:
- Projektit: max 1 projekti (ACTIVE trialin aikana)
- Käyttäjät: max 3 aktiivista käyttäjää orgissa
- Importit: max 1 tavoitearvio-importti (TARGET_ESTIMATE / import_batch)

Suositus (kitkan vähennys, ei muuta lukittua päätöstä):
- Lasketaan “max 1 import” PUBLISHED-batcheista.
- DRAFT-uusinta sallitaan, jotta importin virheet voidaan korjata kokeilussa.

Trialin päättyessä:
- Org: `subscription_status=read_only`, `grace_until=NULL`, reason `trial_ended` (audit-eventissä)
- Projekti(t): `project_status=STANDBY`, `project_status_reason=trial_ended`

---

## B) Projektin tila ja gate

### Kentät (speksitaso)
- `project_status`: `ACTIVE | STANDBY | ARCHIVED`
- `project_status_reason`: `user_requested | past_due | canceled | trial_ended`

### Tilojen semantiikka
- `ACTIVE`: projekti on käytössä ja kuluttaa “aktiivisten projektien” rajaa.
- `STANDBY`: projekti seisoo (ei kuluta aktiivirajaa); data on luettavissa; write estetty.
- `ARCHIVED`: projekti on pysyvästi arkistoitu (MVP: ei palautusta ilman admin-toimea); write estetty.

### Gate (projektin STANDBY/ARCHIVED)
- Kun `project_status != ACTIVE`, kaikki projektin write-toiminnot estetään (yhtenäinen virhekoodi suositus: `PROJECT_NOT_ACTIVE`).
- STANDBY ei estä reaktivoinnin checkoutin luontia, koska se ei muuta projektin domain-tilaa ilman maksun webhookia.

---

## C) “Aktiivisten projektien” laskentasääntö
`active_project_count = COUNT(projects WHERE project_status = ACTIVE)`.

(Suositus) Plan/limit hook:
- `max_active_projects` (planin raja) tarkistetaan, kun projekti aktivoidaan (STANDBY → ACTIVE) tai luodaan uusi projekti.

---

## D) Reaktivointi kynnysrahalla (workflow)

### Tavoite
Mahdollistaa STANDBY-projektin aktivointi kertamaksulla siten, että:
- billing-provider luo checkoutin
- webhook `paid` aktivoi projektin
- kaikki on idempotenttia ja auditoinnissa näkyvää

### Preconditions
- Projekti: `project_status=STANDBY`
- Org: `subscription_status=active` (suositus; muuten reaktivointi ei hyödytä, koska write on estetty)
- Plan: `active_project_count < max_active_projects` (jos plan-limit on käytössä)

### Vaiheet
1) Käyttäjä pyytää reaktivointia projektille.
   - SaaS luo “reactivation checkout” -pyynnön billing-provideriin.
   - SaaS tallettaa oman reactivation-intentin (append-only audit + viite billing checkout ID:hen).
   - Idempotenssi: sama `(project_id, activation_round)` tai `Idempotency-Key` palauttaa olemassa olevan checkoutin, jos maksua ei ole vielä vahvistettu.

2) Billing-provider lähettää webhookin (paid).
   - SaaS validoi webhookin allekirjoituksen ja tarkistaa checkoutin/projectin viitteen.
   - SaaS vaihtaa projektin tilaan `ACTIVE` ja kirjaa audit-eventit.
   - Idempotenssi: sama webhook-event-id käsitellään vain kerran; uusintatoisto ei luo uutta aktivointiauditia eikä muuta tilaa uudelleen.

### Audit (minimi)
- `billing.webhook.received` (raw metadata, redaktoituna)
- `project.reactivation.checkout_created`
- `project.reactivation.paid` (tai `billing.payment.applied`)
- `project.status.changed` (STANDBY → ACTIVE, reason `user_requested`)

---

## E) past_due grace -workflow

### Vaiheet
1) Billing-provider ilmoittaa orgin tilaksi `past_due`.
   - SaaS asettaa `subscription_status=past_due`.
   - SaaS asettaa `grace_until = now() + 7..14 päivää` (konfiguroitava arvo).
   - Write on sallittu grace-ajan loppuun asti.

2) Grace vanhenee (`now() > grace_until`).
   - Toteutus: ajastettu job + idempotentti päivitys (ei pelkän webhookin varassa).
   - SaaS asettaa orgin `subscription_status=read_only` ja tyhjentää `grace_until`.
   - SaaS asettaa kaikki orgin projektit `project_status=STANDBY`, `project_status_reason=past_due`.
   - Audit: muutokset kirjataan append-only.

3) Billing-provider ilmoittaa maksun / paluun tilaan `active`.
   - SaaS asettaa orgin `subscription_status=active`, `grace_until=NULL`.
   - Projektit EIVÄT automaattisesti herää; STANDBY-projektit vaativat reaktivoinnin checkoutin kautta.

> Suositus (konversio/kitka): myöhemmin voidaan päättää poikkeus, jossa `project_status_reason=past_due` palautuu automaattisesti ACTIVEksi maksun jälkeen.
> Tämä on päätös, ei MVP-pakko.

### Canceled
Kun billing-provider ilmoittaa `canceled`:
- SaaS asettaa `subscription_status=canceled`.
- SaaS asettaa projektit `project_status=STANDBY`, `project_status_reason=canceled` (tai ARCHIVED, jos myöhemmin päätetään arkistointipolku).

---

## F) Audit-eventit (append-only) + manuaalitestit

### Eventit (ehdotusnimet)
- `org.entitlement.changed` (sis. subscription_status, grace_until)
- `org.entitlement.grace_set`
- `org.entitlement.grace_expired`
- `org.entitlement.read_only_enabled` (reason: trial_ended / past_due / canceled)
- `project.status.changed` (sis. status + reason)
- `project.reactivation.checkout_created`
- `project.reactivation.webhook_ignored_duplicate`
- `billing.webhook.received`
- `billing.webhook.verified`
- `billing.webhook.rejected` (signature/validation failed)
- (suositus) `trial.limit_reached` (raja + arvo)

### Miten testataan (manuaali) (8–12)
1) Aloita trial (ei korttia) → org `trialing`, 1 projekti `ACTIVE`.
2) Trial: yritä luoda 2. projekti → estyy (trial-raja 1 projekti).
3) Trial: lisää 4. käyttäjä → estyy (max 3 käyttäjää).
4) Trial: tee 2. tavoitearvio-importti → estyy (max 1 import; suositus: raja PUBLISHED-batcheihin).
5) Trial päättyy → org `read_only` ja projekti `STANDBY` (reason `trial_ended`); luku toimii, write estyy.
6) Org `read_only`: yritä tehdä mikä tahansa write (esim. import/mäppäys/ennustetapahtuma) → estyy `ENTITLEMENT_READ_ONLY`.
7) Org `read_only`: luo checkout/portaali-session → sallittu (commerce-poikkeus).
8) Org `past_due`: aseta `grace_until` tulevaisuuteen → domain-write toimii grace-ajan sisällä.
9) Grace vanhenee (ajastettu job) → org `read_only` + projektit `STANDBY` (reason `past_due`).
10) Maksetaan ja org palautuu `active` → org domain-write toimii, projektit pysyvät `STANDBY`.
11) Luo reaktivoinnin checkout STANDBY-projektille → checkout-id palautuu; retry samalla idempotency-keyllä palauttaa saman checkoutin.
12) Webhook `paid` → projekti `ACTIVE`; webhook retry ei luo tuplaa (idempotenssi). Active project count laskee vain ACTIVE-projektit.

---

## Mitä muuttui
- Lisättiin read-only-gateen commerce-poikkeukset (upgrade/portaali), jotta maksaminen ei esty.
- Lisättiin suositus-kenttiä (`trial_ends_at`, billing-viitteet) UI:ta ja integraatiota varten.
- Lisättiin reaktivoinnille precondition: org active + plan-limit hook.
- Lisättiin past_due-gracen toteutus: ajastettu job (ei pelkkä webhook).
- Lisättiin suositus: “1 import” rajataan PUBLISHED-batcheihin (DRAFT-uusinta sallitaan).

## Miksi
- Read-only ei saa katkaista maksupolkua.
- Webhookit eivät yksin riitä grace-expiryyn (tarvitaan ajastus).
- Reaktivointi ilman org activea ei hyödytä (write estyy silti).
- Trialin importti tarvitsee vähintään yhden korjauskierroksen, muuten kokeilu kuolee virheeseen.

## Miten testataan (manuaali)
- Suorita kohdan F testit 1–12 testidatalla (yksi org + 1–2 projektia) ja varmista,
  että gate estää domain-write-toiminnot, commerce-poikkeukset toimivat, ja audit-eventit syntyvät append-only.
