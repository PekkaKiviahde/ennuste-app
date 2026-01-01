# ADR-003: RBAC + aikarajatut roolit (valid_from/to)

**Status:** Accepted  
**Date:** 2026-01-01

## Context
Tarvitaan joustava oikeusmalli, joka tukee myös määräaikaisia oikeuksia (sijaisuudet, projektihuiput).

## Decision
- Implementoidaan RBAC:
  - Roles (tenant scoped)
  - Permissions (keys)
  - Role assignments membershipille
- Role assignment voi olla aikarajattu `valid_from/to`.

## Consequences
+ Tukee määräaikaisia oikeuksia ilman manuaalista “muista poistaa”
+ Selkeä permission-check -logiikka backendissä
- Lisää hieman monimutkaisuutta authorizationiin (pitää huomioida aikarajat)
