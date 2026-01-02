# ADR-001: Hybridi data-malli (normalisoitu + JSONB)

**Status:** Accepted  
**Date:** 2026-01-02

## Context
MVP-vaiheessa domain-kenttien tarkka rakenne muuttuu usein. Täydellinen normalisointi heti hidastaa toimitusta ja lisää migraatioita.

## Decision
- Normalisoidaan heti ydinkentät ja suhteet (tenant, FK:t, name/status, created_at).
- Sijoitetaan muuttuvat/epävarmat kentät JSONB-kenttiin:
  - `companies.company_details`
  - `projects.project_details`
- Sitoudutaan hallittuun polkuun JSONB → normalisoitu (`docs/06-migration-jsonb-to-normalized.md`).

## Consequences
+ Nopea MVP ja joustava datamalli
+ Vähentää alkuvaiheen migraatiokuormaa
- Raportointi/suodatus voi olla monimutkaisempaa JSONB:llä
- Vaatii kurinalaisen polun normalisointiin v2:ssa

## Mitä muuttui
- Lukittiin hybridi datamalli (normalisoitu + JSONB) MVP:hen.
- Määriteltiin hallittu polku JSONB:stä kohti normalisoitua mallia.
- Täsmennetty normalisointipolun dokumenttiviite.

## Miksi
- MVP vaatii joustavuutta ilman jatkuvia migraatioita.
- Selkeä polku vähentää teknistä velkaa v2:ssa.
- Viitteen pitää osoittaa oikeaan dokumenttiin.

## Miten testataan (manuaali)
- Varmista, että `companies` ja `projects` käyttävät JSONB-kenttiä speksin mukaisesti.
- Tarkista, että normalisointipolku on kuvattu `docs/06-migration-jsonb-to-normalized.md`-dokumentissa.
