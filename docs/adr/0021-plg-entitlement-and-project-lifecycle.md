# ADR-0021: PLG-entitlement ja projektin elinkaari (trial, read-only, STANDBY, reaktivointi)

**Status:** Accepted  
**Date:** 2026-01-15

## Konteksti
SMB/PLG-segmentissä tuotteen käyttöönotto tapahtuu self-servicenä ja trialin kautta.
Laskutus on ulkoinen master, mutta sovelluksen on pystyttävä tekemään deterministinen päätös:
mitä saa lukea ja mitä saa kirjoittaa (entitlement-gate), sekä miten projektit “seisotetaan” ja reaktivoidaan.

Lisäksi past_due-tilanteessa tarvitaan armonaika (grace), jonka jälkeen käyttö siirtyy read-only-tilaan
ja projektit asetetaan STANDBY-tilaan.

## Päätös
1) Org entitlement -malli
- Otetaan käyttöön `subscription_status`: `trialing | active | past_due | read_only | canceled`.
- Otetaan käyttöön `grace_until` (nullable), jota käytetään `past_due`-gracen hallintaan.
- (Suositus) Otetaan käyttöön `trial_ends_at` (nullable) UI:ta ja ajastuksia varten.
- (Suositus) Otetaan käyttöön billing-viitteet: `billing_customer_id`, `billing_subscription_id`, `plan_code`.
- Gate: `subscription_status=read_only` (tai `canceled`) estää kaikki domain-write-endpointit.
- Trial on aikarajattu eikä vaadi korttia.
- Trialin rajat: 1 org + 1 projekti + max 3 käyttäjää + 1 tavoitearvio-importti.
- Trialin jälkeen org siirtyy `read_only`-tilaan (data näkyy, write estetään).

Poikkeus: commerce-endpointit
- Read-only EI estä maksupolkua: checkout/portaali-session luonti on sallittu myös read-only-tilassa (koska se ei muuta domain-dataa).

2) Projektin elinkaari
- Otetaan käyttöön `project_status`: `ACTIVE | STANDBY | ARCHIVED`.
- Otetaan käyttöön `project_status_reason`: `user_requested | past_due | canceled | trial_ended`.
- Gate: `project_status != ACTIVE` estää projektin write-toiminnot.
- “Aktiivisten projektien” laskenta: vain `project_status=ACTIVE` projektit lasketaan (STANDBY ei kuluta rajoja).

3) Reaktivointi kynnysrahalla
- STANDBY-projektin aktivointi tehdään kertamaksulla per projekti per aktivointi.
- Virta: SaaS luo checkoutin billing-provideriin → webhook `paid` → projekti `ACTIVE`.
- Idempotenssi: checkoutin luonti ja webhookin käsittely ovat idempotentteja.
- Audit: kaikki tilamuutokset ja webhookit kirjataan append-only audit-eventteinä.

4) past_due grace
- Kun billing-provider ilmoittaa `past_due`, SaaS asettaa `subscription_status=past_due` ja `grace_until`.
- Grace-expiryn jälkeen SaaS asettaa orgin `read_only`-tilaan ja asettaa kaikki projektit `STANDBY`-tilaan (`reason=past_due`).
- Kun laskutus palautuu `active`-tilaan, org palaa `active`-tilaan, mutta projektit eivät automaattisesti herää (reaktivointi vaaditaan).
 - Grace-expiry toteutetaan ajastetulla jobilla (ei pelkän webhookin varassa), jotta muutos tapahtuu deterministisesti.

## Vaihtoehdot (ei valittu)
- “Billing master myös gatingille”: hylättiin, koska sovellus tarvitsee oman, auditointikelpoisen päätöksen käyttöoikeuksista.
- “Automaattinen projektien herääminen maksun jälkeen”: hylättiin, koska reaktivointi halutaan projektikohtaiseksi (kynnysraha + hallittu aktivointi).
- “Pelkkä org read-only ilman projektin STANDBY-tilaa”: hylättiin, koska aktiivisten projektien laskenta ja seisonta pitää mallintaa eksplisiittisesti.

## Seuraukset
- API:iin tulee yhtenäiset gate-säännöt org- ja projektitasolle (read-only ja STANDBY).
- Taustaprosessi tarvitaan grace-expiryn toteuttamiseen (scheduler/cron).
- Webhook-käsittely vaatii idempotenssin (event-id dedup) ja auditoinnin.
- Maksupolku pitää pitää auki read-only-tilassa (commerce-poikkeus).

## Mitä muuttui
- Päätettiin PLG-entitlement-tilat, project_status-tilat, grace-malli ja reaktivointivirta.
- Lisättiin commerce-poikkeus read-only-gateen sekä suosituskentät (trial_ends_at ja billing-viitteet).

## Miksi
- Tarvitaan yksiselitteinen, testattava ja auditoitava käyttölukitus (read-only) sekä projektien seisonta (STANDBY).
- Ulkoinen laskutus voi muuttua, mutta sovelluksen entitlement-gate on sovelluksen vastuulla.

## Miten testataan (manuaali)
- Simuloi trial → trial_ended → read-only ja varmista write-estot.
- Simuloi past_due + grace → grace expired → read-only + projektit STANDBY.
- Simuloi maksu (paid) → org active, mutta projekti pysyy STANDBY ilman reaktivointia.
- Simuloi reaktivoinnin checkout + webhook retry → projekti aktivoituu kerran ja audit ei duplikoidu.
