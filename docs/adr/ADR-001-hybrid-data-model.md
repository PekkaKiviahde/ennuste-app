# ADR-001: Hybridi data-malli (normalisoitu + JSONB)

**Status:** Accepted  
**Date:** 2026-01-01

## Context
MVP-vaiheessa domain-kenttien tarkka rakenne muuttuu usein. Täydellinen normalisointi heti hidastaa toimitusta ja lisää migraatioita.

## Decision
- Normalisoidaan heti ydinkentät ja suhteet (tenant, FK:t, name/status, created_at).
- Sijoitetaan muuttuvat/epävarmat kentät JSONB-kenttiin:
  - `companies.company_details`
  - `projects.project_details`
- Sitoudutaan hallittuun polkuun JSONB → normalisoitu (docs/06).

## Consequences
+ Nopea MVP ja joustava datamalli
+ Vähentää alkuvaiheen migraatiokuormaa
- Raportointi/suodatus voi olla monimutkaisempaa JSONB:llä
- Vaatii kurinalaisen polun normalisointiin v2:ssa
