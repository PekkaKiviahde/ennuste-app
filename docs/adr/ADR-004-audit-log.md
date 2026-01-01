# ADR-004: Audit-log kriittisille muutoksille

**Status:** Accepted  
**Date:** 2026-01-01

## Context
Tuotannossa tarvitaan jäljitettävyys: kuka muutti mitä ja milloin (tuki, virhetilanteet, compliance).

## Decision
- Tallennetaan audit-log vähintään:
  - company/project create/update/delete
  - rooli- ja oikeusmuutokset
- Audit tallennetaan `audit_log`-tauluun JSONB-datalla.

## Consequences
+ Parempi ylläpidettävyys ja luottamus dataan
+ Helpottaa debuggausta ja asiakastukea
- Lisää kirjoitusoperaatioita (mutta kustannus on yleensä pieni MVP:ssä)
