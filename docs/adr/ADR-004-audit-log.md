# ADR-004: Audit-log kriittisille muutoksille

**Status:** Accepted  
**Date:** 2026-01-02

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

## Mitä muuttui
- Lukittiin audit-logi kriittisille muutoksille.
- Määriteltiin audit_log-taulu JSONB-datalla.

## Miksi
- Tarvitaan jäljitettävyys ja tuki virhetilanteiden selvitykseen.
- Compliance-vaatimukset edellyttävät audit-trailia.

## Miten testataan (manuaali)
- Luo ja päivitä company/project ja varmista audit-rivi.
- Tee roolimuutos ja tarkista audit_log-merkintä.
