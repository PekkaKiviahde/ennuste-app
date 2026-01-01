# ADR-002: Tenant-eristys tenant_id:llä kaikessa domain-datassa

**Status:** Accepted  
**Date:** 2026-01-01

## Context
Multi-tenant SaaS:ssa suurin riski on datavuoto tenanttien välillä.

## Decision
- Jokaisessa domain-taulussa on `tenant_id`.
- Kaikki queryt suodatetaan `tenant_id`:llä sovelluskerroksessa (MVP).
- v2:ssa otetaan PostgreSQL RLS käyttöön turvaverkoksi.

## Consequences
+ Selkeä ja suoraviivainen eristys
+ RLS voidaan ottaa käyttöön myöhemmin pienemmällä refaktorilla
- Kehittäjäkurinalaisuus vaaditaan MVP:ssä (testit ovat pakolliset)
