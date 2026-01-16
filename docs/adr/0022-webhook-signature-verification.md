# ADR-0022: Billing webhook signature verification

**Status:** Accepted  
**Date:** 2026-01-15

## Context
Speksi vaatii billing-webhookien allekirjoituksen validoinnin ja idempotenssin (replay/duplikaatit), mutta koodissa ei ollut webhook-endpointia eikä verifiointia.
Billing-provider voi olla Stripe, Paddle, Chargebee tai tuntematon.

## Decision
Toteutetaan julkinen webhook-endpoint ja yhteinen käsittelyrunko:
- Endpoint lukee **raw-body**n **raw-byteinä** (`arrayBuffer`/`Buffer`) ennen JSON-parsea.
- Allekirjoitus validoidaan **raw-bytesista ennen JSON-parsea** (tai Chargebeen tapauksessa Basic Auth ennen parsea).
- Idempotenssi: sama `(provider, provider_event_id)` käsitellään vain kerran.
- Auditointi (“hash only”): talletetaan vain **raw_body_sha256** + **payload_redacted** + tilat ja aikaleimat (ei raw-bodyä DB:hen).

## Details

### Endpoint
- Reitti: `POST /api/billing/webhook/:provider`
- `:provider` = `stripe` | `paddle` | `chargebee`
- Tuntematon provider: fail-fast `400` (konfigurointi vaaditaan).

### Idempotenssi ja audit DB:ssä
- Taulu: `billing_webhook_events`
- Uniqueness: `UNIQUE(provider, provider_event_id)`
- Duplicate retry:
  - sama event id → palautetaan `204` ilman uutta prosessointia
  - ei kirjoiteta uutta riviä

### Stripe
- Header: `Stripe-Signature: t=<unix_seconds>,v1=<hex_hmac>`
- Signing string: `<t>.` + `raw_body_bytes`
- HMAC: `HMAC-SHA256(STRIPE_WEBHOOK_SECRET, signing_string)` → hex
- Replay window: `STRIPE_WEBHOOK_TOLERANCE_SECONDS` (oletus 300s)

### Paddle
- Header: `Paddle-Signature: ts=<unix_seconds>,h1=<hex_hmac>`
- Signing string: `<ts>:` + `raw_body_bytes`
- HMAC: `HMAC-SHA256(PADDLE_WEBHOOK_SECRET, signing_string)` → hex
- Replay window: `PADDLE_WEBHOOK_TOLERANCE_SECONDS` (oletus 300s)

### Chargebee
- Verifiointi: HTTP Basic Auth (ei allekirjoitus-headeria)
- Header: `Authorization: Basic base64(username:password)`
- Konfig: `CHARGEBEE_WEBHOOK_USERNAME` + `CHARGEBEE_WEBHOOK_PASSWORD`
- Huom: Basic Auth ei ole payload-allekirjoitus; luotetaan TLS:ään + satunnaiseen salaisuuteen + idempotenssiin.

## Consequences
+ Forgeroidut/vanhentuneet allekirjoitukset hylätään ennen JSON-parsea.
+ Idempotenssi estää tuplaprosessoinnin webhook retry -tilanteissa.
+ DB-audit (hash only + redaktoitu payload) tukee jäljitettävyyttä ilman täyden payloadin talletusta (PII-minimointi).
- Chargebeen Basic Auth ei tarjoa kryptografista payload-todistusta (rajattu turvallisuus).

Mitä muuttui
- Lisättiin `billing_webhook_events`-taulu ja `/api/billing/webhook/:provider` endpoint (raw-body + verify + idempotenssi + audit).
- Määriteltiin provider-kohtaiset verifiointisäännöt (Stripe/Paddle/Chargebee).

Miksi
- Speksin mukainen webhookin allekirjoitusverifiointi ja replay/duplikaattien esto.
- Auditointi vaatii todennettavan “mitä tuli sisään” (hash) ja turvallisen tallenteen (redaktoitu payload).

Miten testataan (manuaali)
- Aja migraatiot: `npm run db:migrate`
- Stripe-esimerkki (valid):
  1) `export STRIPE_WEBHOOK_SECRET='whsec_test_secret'`
  2) `body='{"id":"evt_test_1","type":"checkout.session.completed"}'`
  3) `ts=$(date +%s)`
  4) `sig=$(node -e "const crypto=require('crypto');const s=process.env.STRIPE_WEBHOOK_SECRET;const ts=process.argv[1];const b=process.argv[2];process.stdout.write(crypto.createHmac('sha256',s).update(ts+'.'+b).digest('hex'))" "$ts" "$body")`
  5) `curl -i -X POST "http://localhost:3000/api/billing/webhook/stripe" -H "Stripe-Signature: t=$ts,v1=$sig" -H "content-type: application/json" --data "$body"`
- Stripe-esimerkki (invalid):
  - `curl -i -X POST "http://localhost:3000/api/billing/webhook/stripe" -H "Stripe-Signature: t=1,v1=deadbeef" -H "content-type: application/json" --data "$body"`
