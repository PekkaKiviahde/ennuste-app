# Security (OpenAI-kaytto)

Tama dokumentti lukitsee OpenAI-kayton MVP:ssa: kulukatto, sallittujen mallien
whitelist ja server-only-kaytannot. Frontend ei koskaan kutsu OpenAI:ta suoraan.

## 1) Kuukausikatto OpenAI-hallintapaneelissa

Tavoite: varmistaa, ettei kuukausikulut ylita 25 EUR.

1) Avaa OpenAI Platform: `https://platform.openai.com/`
2) Valitse organisaatio (ylapalkin organisaatiovalitsin).
3) Mene kohtaan: **Settings -> Billing -> Usage limits**
4) Aseta:
   - **Hard limit**: `25` (EUR)
   - (Valinnainen) **Soft limit**: `20` (EUR) ja ilmoitukset paalle
5) Tallenna muutokset.

Huom: hard limit estaa uudet pyynnot, kun raja tulee tayteen. Soft limit
lahettaa ilmoituksen ennen rajaa.

## 1b) Dev vs prod -avaimet ja katot

Dev ja prod kayttavat eri API-avaimia. Avaimia ei saa sekoittaa.

- Dev-avain: `OPENAI_API_KEY` (.env, paikallinen kehitys)
  - Kulusisalto: hard limit 25 EUR (soft limit 20 EUR, valinnainen)
- Prod-avain: `OPENAI_API_KEY_PROD` (platform/secrets, ei .env)
  - Kulusisalto: hard limit 100 EUR (soft limit 80 EUR, valinnainen)

Tuotantoavain luodaan erikseen OpenAI Platformissa:
1) Avaa `https://platform.openai.com/`
2) Valitse oikea organisaatio ja projekti.
3) Mene kohtaan: **Project settings -> API keys**
4) Luo uusi avain, nimea se selkeasti (esim. `prod-backend`).
5) Tallenna avain platform/secrets -ratkaisuun (ei .env, ei git).

Prod-katto asetetaan OpenAI Platformissa projektikohtaisesti:
1) Valitse projekti.
2) Mene kohtaan: **Settings -> Billing -> Usage limits**
3) Aseta hard limit 100 EUR (soft limit 80 EUR, valinnainen).

## 2) Malli-whitelist (keskitetty util-funktio)

Sallitut mallit:
- `gpt-4.1-mini`
- `gpt-4.1`

Kaikki muut mallit ovat kiellettyja. Tarkistus on keskitetty:
`apps/api/src/lib/openai/models.ts`

Whitelisti tarkistetaan aina ennen OpenAI-kutsua, ja virhe heitetaan heti,
jos malli ei ole sallittu.

## 3) Minimi TypeScript-esimerkki (Responses API + whitelist)

```ts
import OpenAI from "openai";
import { assertAllowedOpenAIModel } from "./openai/models";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getStatusResponse() {
  const model = "gpt-4.1-mini";
  assertAllowedOpenAIModel(model);

  const response = await client.responses.create({
    model,
    input: "Anna lyhyt projektin tilanne suomeksi.",
  });

  return response.output_text;
}
```

## 4) Riskit ja torjunta

1) Kuluvuoto (budjetti ylittyy)
   - Torjunta: OpenAI-hallintapaneelin hard limit + soft limit -ilmoitukset.

2) Vaaran malli (kallis tai ei-hyvaksytty malli)
   - Torjunta: keskitetty whitelist + virhe heti, ei ohituksia.

3) Avaimen vuoto (OPENAI_API_KEY)
   - Torjunta: avain vain palvelimella (.env), ei frontendissa, ei gitissa.
     Server-only-moduulit ja API-reitit toimivat backendissa.

## 5) MVP-kaytanto

- Frontend ei koskaan kutsu OpenAI:ta suoraan.
- Kaikki OpenAI-kutsut kulkevat server-only-koodin kautta.
- Mallit lukitaan whitelistiin ja kustannuskatto asetetaan hallintapaneelissa.
- Dev/prod-avaimet ovat erilliset ja varmennetaan kaynnistyksessa.

## 6) API-avainten rotaatio (dev + prod)

Tavoite: avain voidaan vaihtaa ilman katkosta, vuototilanne hoituu < 1 min.
Aina korkeintaan 2 aktiivista avainta. Rotaatioperiodi 90 paivaa tai vuoto.

### Checklist (uusi -> vaihto -> poisto)

1) Luo uusi avain OpenAI Platformissa (org/projekti oikein).
2) Lisaa uusi avain secrets-jakoon (dev .env, prod secrets).
3) Ota uusi avain kayttoon ilman katkosta:
   - paivita backendin env (rolling deploy / hot reload)
4) Vahvista, etta pyyntoja menee uudella avaimella.
5) Poista vanha avain OpenAI Platformista.
6) Varmista, etta aktiivisia avaimia on enintaan 1 (tai 2 vain siirtymassa).

### Katkoton vaihto (rollover)

- Dev: paivita `.env` (OPENAI_API_KEY) ja kaynnista prosessi uudelleen.
- Prod: paivita secrets (OPENAI_API_KEY_PROD) ja tee rolling restart.
- Varmista: uusi instanssi kaynnistyy uudella avaimella ennen vanhan poistamista.

### Vuototilanne (T0 - T+1min)

T0: Havaitse vuoto.
T+0-30s:
- Luo uusi avain OpenAI Platformissa.
- Paivita secrets (dev/prod) ja tee rolling restart.
T+30-60s:
- Poista vanha avain OpenAI Platformista.
- Varmista, etta liikenne kulkee uudella avaimella.

### Yleisimmat virheet ja torjunta

- Vaaran avain ymparistossa: erilliset muuttujat (OPENAI_API_KEY vs OPENAI_API_KEY_PROD) + kaynnistysvarmistus.
- Vanha avain unohtuu: poista vanha avain heti onnistuneen vaihdon jalkeen.
- Avain sekoittuu projekteihin: nimea avaimet selkeasti (dev/prod).
- Yli kaksi aktiivista avainta: rotaatio suoritetaan lyhyena siirtymana.

## 7) OpenAI-kutsujen kevyt observability

MVP-tasolla lokitus riittaa. Lokitus on backendissa:
`apps/api/src/lib/openai/logging.ts`.
Lokit ovat JSON-muotoisia, eivat sisalla PII:ta
eivatka promptin sisaltoa.

Logitetaan:
- kutsujen maara (lokirivi per kutsu)
- malli
- token-arvio (jos saatavilla)
- onnistuminen/epaonnistuminen

Esimerkkiloki (backend):
```
{"event":"openai_usage","env":"production","source":"projectCoach","model":"gpt-4.1-mini","tokens_estimate":null,"ok":true,"ts":"2025-01-01T00:00:00.000Z"}
```

Dev/prod-erottelu:
- production: `console.log` (keraytyy prod-logeihin)
- development: `console.info`

Halytyslogiikka (yksinkertainen):
- Halyta, jos viimeisen 5 min aikana `openai_usage`-rivien maara ylittaa
  normaalitason (esim. > 3x baseline) tai jos per minuutti > N (esim. 30).

Miten tama taydentaa kulukatot:
- Kulukatto pysayttaa laskutuksen, mutta lokit antavat varhaisen varoituksen
  poikkeavasta kaytosta ennen kuin raja tayttyy.

## 8) Runbook (dev)

### Env-esimerkit

apps/api/.env:
```
OPENAI_API_KEY=sk-dev-...
NODE_ENV=development
APP_PORT=3001
```

apps/web/.env.local:
```
API_BASE_URL=http://localhost:3001
```

Huom: OPENAI_API_KEY_PROD ei saa olla devissa.

### Smoke checks

Grep (web ei saa viitata OpenAI SDK:hon tai avaimiin):
```
find apps/web -path "*/node_modules/*" -o -path "*/.next/*" -o -type f -print | xargs grep -n "from \"openai\""
find apps/web -path "*/node_modules/*" -o -path "*/.next/*" -o -type f -print | xargs grep -n "OPENAI_API_KEY\\|OPENAI_API_KEY_PROD"
```

Curl:
```
curl "http://localhost:3000/api/project-coach"
curl "http://localhost:3000/api/project-coach?ai=1&q=hei"
```

### CI guards

- Root-skripti: `npm run ci:guards`
- Guard estaa OpenAI SDK:n tai OPENAI_* viitteet apps/webissa.

## Mita muuttui

- Lisattiin OpenAI-kayton turvadokumentaatio (kulukatto + whitelist + riskit).
- Lisattiin API-avainten rotaatiokaytanto ja vuototilanneohje.
- Lisattiin kevyt OpenAI-observability (lokitus + halytysohje).
- Siirrettiin OpenAI-integraation koodi backendin `apps/api`-polkuihin.

## Miksi

- MVP tarvitsee selkean, auditoitavan tavan estaa kustannus- ja malliriskit.

## Miten testataan (manuaali)

- Tarkista OpenAI-hallintapaneelista hard/soft limit -asetukset.
- Tarkista, etta OpenAI-kutsut kayttavat vain sallittuja malleja.
- Harjoittele rotaatio devissa: vaihda OPENAI_API_KEY, rolling restart, poista vanha avain.
- Varmista, etta OpenAI-kutsut kirjoittavat `openai_usage`-lokeja.
- Kutsu `/api/project-coach` webin kautta ja varmista, etta backend palauttaa vastauksen.
