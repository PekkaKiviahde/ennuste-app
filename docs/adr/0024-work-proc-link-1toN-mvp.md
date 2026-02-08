# ADR-0024: Työpaketti-hankintapaketti linkitys 1:N MVP:ssa

**Status:** Accepted  
**Date:** 2026-02-08

## Context
MVP:n mäppäysvaiheessa hankintapaketti pitää aina linkittää työpakettiin, mutta 1:1-malli
(yksi hankintapaketti per työpaketti) osoittautui liian rajoittavaksi. Käytännössä samaan
työpakettiin voi kuulua useita sopimuksia/urakoita, jolloin hankintapaketteja tarvitaan useita
samalle työpaketille.

Samalla halutaan säilyttää write-polun determinismi:
- hankintapaketti kuuluu aina yhteen työpakettiin
- ristiriitainen TP+HP-pari estetään (ei hiljaista autokorjausta)
- item-tason "vain HP valittu" voi edelleen täyttää työpaketin hankintapaketin oletuksesta

Tämä päätös supersedoi ADR-0023 (1:1).

## Decision
- TP-HP-suhde lukitaan MVP:ssa muotoon 1:N:
  - yksi hankintapaketti kuuluu yhteen työpakettiin
  - yhdellä työpaketilla voi olla useita hankintapaketteja
- `proc_packages.default_work_package_id` on pakollinen aina hankintapakettia luodessa.
- Item-mäppäyksessä ristiriitainen TP+HP-pari estetään virheellä
  (`WORK_PROC_LINK_MISMATCH`, HTTP 409).
- Jos itemille valitaan vain hankintapaketti, työpaketti täytetään
  hankintapaketin linkitetystä työpaketista (autofill).
- Ristiin-projekti linkitykset estetään (HP:n oletustyöpaketti ja item-mäppäyksen työpaketti).

## Alternatives considered
1) 1:1 TP-HP (ADR-0023)
- Plussat: yksiselitteinen vastuu ja yksinkertainen UI.
- Miinukset: ei tue useita sopimuksia saman työpaketin alle.

2) Ei pakollista linkkiä hankintapaketille
- Plussat: minimimuutokset nykyiseen.
- Miinukset: orvot hankintapaketit ja epäselvä mäppäysketju.

3) Hiljainen autokorjaus ristiriitatilanteessa
- Plussat: vähemmän virheilmoituksia käyttäjälle.
- Miinukset: käyttäjän valinta muuttuu huomaamatta, audit-jäljitettävyys heikkenee.

## Consequences
+ Hankintapakettien mallinnus vastaa paremmin käytäntöä (useita sopimuksia per työpaketti).
+ Write-polku pysyy ehjänä: hankintapaketti ei voi viitata toisen projektin työpakettiin,
  ja ristiriitainen TP+HP-pari estetään deterministisesti.
- UI:ssa valinnat lisääntyvät (useita HP per TP); riskiä hallitaan selkeillä virheviesteillä
  ja autofill-käytöksellä.

## Mita muuttui
- DB: poistettiin 1:1-uniikkius `proc_packages.default_work_package_id`-kentästä ja
  yhtenäistettiin FK `ON DELETE RESTRICT`-malliin.
- Backend/API: poistettiin 1:1-estot hankintapaketin luonnista; lisättiin UUID- ja
  project-bound-validoinnit kirjoituspolkuun.
- UI: hankintapaketin luonti ei enää estä useaa hankintapakettia samalle työpaketille.

## Miksi
- Hankintapaketointi (urakka/sopimus) ei aina ole 1:1 työpaketteihin; 1:N on käytännössä
  yleisempi ja vähentää tarvetta "keinotekoisille" työpakettijaoille.
- Ristiriitojen estäminen virheellä säilyttää audit trailin ja käyttäjän intention.

## Miten testataan (manuaali)
- Yritä luoda hankintapaketti ilman `defaultWorkPackageId` -> odota 400.
- Luo kaksi hankintapakettia samalle työpaketille A -> odota molemmista 201 (1:N).
- Tee item-mäppäys pelkällä `procPackageId`:lla -> `workPackageId` täyttyy automaattisesti.
- Tee item-mäppäys ristiriitaisella TP+HP-parilla -> odota 409 `WORK_PROC_LINK_MISMATCH`.
- Yritä poistaa työpaketti, johon hankintapaketti viittaa -> poisto estyy (RESTRICT).
