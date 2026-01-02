# ADR-003: RBAC + aikarajatut roolit (valid_from/to)

**Status:** Accepted  
**Date:** 2026-01-02

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

## Mitä muuttui
- Lukittiin RBAC-malli ja aikarajatut roolit (valid_from/to).
- Rajattiin roolien rakenne tenant-tasolle.

## Miksi
- Tarvitaan hallittu tapa myöntää määräaikaisia oikeuksia.
- Backendin authorization pysyy johdonmukaisena.

## Miten testataan (manuaali)
- Testaa roolikäytös ennen ja jälkeen valid_from/to -aikojen.
- Varmista, että permission-check estää vanhentuneet roolit.
