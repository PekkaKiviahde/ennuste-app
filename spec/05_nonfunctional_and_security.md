# Ei-toiminnalliset vaatimukset ja tietoturva (MVP)

Tämä dokumentti täydentää toiminnallista speksiä: suorituskyky, tietoturva, varmuuskopiointi ja hyväksymiskriteerit.

## Periaatteet
- **Tenant-eristys**: kaikki domain-data kuuluu tenanttiin (`tenant_id`). MVP:ssä suodatus tehdään sovelluskerroksessa; RLS on v2-kovennus. Katso `docs/adr/ADR-002-tenant-id-everywhere.md`.
- **Append-only**: ennusteet ja perustelut sekä muut kriittiset tapahtumat ovat append-only. Katso `docs/adr/0001-event-sourcing.md` ja `docs/adr/0007-decision-log-policy.md`.
- **Audit trail**: kriittiset toiminnot kirjataan audit-lokiin. Katso `docs/adr/ADR-004-audit-log.md`.
- **RBAC**: roolit ja oikeudet rajaavat kirjoitukset ja näkyvyyden. Katso `docs/adr/ADR-003-rbac-timebounded.md`.

## Suorituskyky (MVP-tavoitteet)
- API: p95 vasteaika alle 300 ms “tyypillisille” UI-kutsuille (yksittäinen projekti, ei massaraportteja).
- Raportit: p95 alle 2 s projektin “current”-näkymille (dashboard, työpaketti-raportti, ennuste-raportti).
- Indeksit: raportoinnin perusindeksit dokumentoidaan ja pidetään linjassa speksin kanssa. Katso `spec/data-model/04_reporting_indexes.md`.

## Tietoturva (MVP)
### Tenant-eristys
- Jokainen API-kutsu validoi session + `tenant_id` ja varmistaa, että `project_id` kuuluu tenanttiin.
- Integraatio- ja smoke-testit varmistavat, ettei toisen tenantin dataa voi lukea tai muokata.

### Salaus
- Liikenne: TLS (HTTPS) kaikille ulkoisille kutsuille.
- Levolla: tietokanta ja liite-storage salattuna (ympäristöriippuvainen toteutus).

### Salasanat/PIN
- Salasanat/PIN: kryptografisesti turvallinen hash (esim. bcrypt/argon2) + politiikka (minimipituus, yritysrajat).

### RLS (v2-kovennus)
- Postgres RLS otetaan käyttöön turvaverkoksi tenant-eristykselle, kun skeema on stabiloitunut (ADR-002).

## Varmuuskopiointi ja palautus
- Automaattinen varmuuskopiointi vähintään päivittäin; säilytys vähintään 30 päivää.
- Palautus testataan säännöllisesti (RTO/RPO kirjataan ympäristön runbookeihin).
- Liitteet (storage) sisältyvät palautukseen: viite + blob-data.

## Hyväksymiskriteerit (NFR-minimi)
- Tenant-eristys: käyttäjä ei saa listata/lukea/muokata toisen tenantin projekteja tai niiden dataa.
- Append-only: ennustetapahtumia ei voi päivittää tai poistaa; korjaus on aina uusi tapahtuma.
- Audit: kriittisistä toiminnoista syntyy audit-rivi (vähintään planning.create ja forecast.create sekä rooli-/session-muutokset).
- RBAC: rooli estää kirjoitukset ilman oikeuksia (403/forbidden).

## Mitä muuttui
- Lisätty ei-toiminnallisten vaatimusten ja tietoturvan minimi-”baseline” speksiin.

## Miksi
- Laatu- ja turvavaatimukset pitää pystyä testaamaan ja toden­tamaan samalla tavalla kuin toiminnalliset vaatimukset.

## Miten testataan (manuaali)
- Suorituskyky: aja 20x perusnäkymien API-kutsut ja tarkista p95 vasteaika.
- Tenant-eristys: yritä lukea toisen tenantin `project_id`:llä (odota 403).
- Append-only: yritä UPDATE/DELETE ennustetauluihin (odota esto).
- Audit: tee planning/forecast kirjaukset ja varmista, että audit-loki kasvaa.
