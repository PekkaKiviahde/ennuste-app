# ADR-0015: Tavoitearviorivien append-only mäppäysversiot

**Status:** Accepted  
**Date:** 2026-01-11

## Context
Item-tason mäppäys (tavoitearviorivi → työpaketti/hankintapaketti) tarvitsee
jäljitettävyyden. Nykyinen malli päivitti rivejä, mikä rikkoo audit trailin.
Tarvitaan versiointi ja append-only-loki, jotta peräkkäiset valinnat säilyvät.

## Decision
Otetaan käyttöön append-only-malli:
- `mapping_versions` (mapping_kind = 'ITEM') kuvaa aktiivisen mäppäysversion
  per projekti ja viimeisin import_batch.
- `row_mappings` sisältää kaikki riviin tehdyt mäppäyskirjaukset.
- `v_current_item_mappings` näyttää viimeisimmän rivikohtaisen valinnan.

## Alternatives considered
1) Päivitä `target_estimate_item_mappings` in-place
- Plussat: yksinkertainen.
- Miinukset: rikkoo audit trailin.

2) Erillinen snapshot-taulu per muutos
- Plussat: nopea luku.
- Miinukset: raskas ja monimutkainen MVP:hen.

## Consequences
+ Jokainen mäppäys jää lokiin ja on auditoitavissa.
+ Viimeisin valinta on helposti luettavissa näkymästä.
- Lisää yksi versio- ja rivitaulu sekä backfill-migraatio.

## Mita muuttui
- Mäppäys siirrettiin append-only `row_mappings`-tauluun ja `mapping_versions`-versiointiin.

## Miksi
- Audit trail säilyy ja peräkkäiset assignit voidaan todentaa.

## Miten testataan (manuaali)
- Tee peräkkäiset assignit samalle itemille ja varmista, että `row_mappings`
  kasvaa kahdella rivillä ja `v_current_item_mappings` näyttää viimeisimmän.
