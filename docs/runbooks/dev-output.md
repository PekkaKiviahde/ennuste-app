# Runbook: dev-näkymä ei avaudu

## Tarkoitus
Varmista, että MVP:n UI + API näkyy kehitysvaiheessa ja löydä yleisin syy, jos näkymä ei avaudu.

## Oletuspolku (Docker Compose)

1. Kopioi ympäristömuuttujat:

```bash
cp .env.example .env
```

2. Käynnistä palvelut:

```bash
docker compose up -d
```

3. Varmista palvelut:

```bash
docker compose ps
```

4. Testaa health:

```bash
curl -s http://localhost:${APP_PORT:-3000}/api/health
```

## Uusi keskustelu: pakollinen portti- ja yhteystarkistus

Kun Codex aloittaa uuden keskustelun ja tekee **ensimmäisen tehtävän**, suorita
aina alla oleva nopea tarkistus ennen varsinaista työtehtävää.
Lupia ei tarvitse kysellä erikseen, koska ne on annettu ohjeissa.

1. Tarkista, että palvelut ovat ylhäällä:

```bash
docker compose ps
```

2. Testaa API health:

```bash
curl -s http://localhost:${APP_PORT:-3000}/api/health
```

3. Jos käytät Docker‑UI:ta (`web_next`), varmista portti:

```bash
docker compose -f docker-compose.yml -f docker-compose.next.yml ps
```

4. Etäympäristössä avaa portti 3000 Ports‑näkymästä ja käytä sieltä annettua URL:ia.

## Jos etäympäristö (Codespaces/Container)

- Avaa portti 3000 Ports-näkymästä ja käytä sieltä annettua URL:ia.
- Älä käytä paikallista `localhost`-osoitetta, jos selain on eri koneella kuin kontti.

## Jos app ei käynnisty

1. Tarkista lokit:

```bash
docker compose logs app --tail=200
```

2. Jos `npm ci` kaatuu verkon vuoksi:

```bash
cd api && npm ci
```

3. Käynnistä uudelleen:

```bash
docker compose up -d --build
```

## Pikalista (todennäköiset syyt)

- Portti ei ole forwardoitu (etäympäristössä).
- `npm ci` ei onnistunut ja app ei käynnistynyt.
- Portti 3000 on varattu → vaihda `APP_PORT`.

## Mitä muuttui

- Lisätty ohje: uuden keskustelun ensimmäinen tehtävä sisältää aina portti‑ ja yhteystarkistuksen.

## Miksi

- Vältetään tilanne, jossa UI/API ei ole auki ja tehtävä jää kiinni portteihin.

## Miten testataan (manuaali)

- Avaa uusi keskustelu, aja tarkistuskomennot, ja varmista että:
  - `docker compose ps` näyttää palvelut ylhäällä.
  - `/api/health` palauttaa vastauksen.
  - Ports‑URL toimii etäympäristössä.
