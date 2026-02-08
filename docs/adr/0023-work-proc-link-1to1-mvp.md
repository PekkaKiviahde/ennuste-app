# ADR-0023: Työpaketti-hankintapaketti linkitys 1:1 MVP:ssa

**Status:** Accepted  
**Date:** 2026-02-08

## Context
Mappaysvaiheessa hankintapaketti pitää aina linkittaa työpakettiin, mutta mallissa ei ollut
selkeaa estoa tilanteelle, jossa samalle työpaketille luodaan useita hankintapaketteja.
Tama aiheutti ristiriitaa MVP-tavoitteen kanssa, jossa vastuu halutaan pitaa yksiselitteisena.

## Decision
- TP-HP-suhde lukitaan MVP:ssa muotoon 1:1:
  - yksi hankintapaketti kuuluu yhteen työpakettiin
  - yhdella työpaketilla voi olla enintaan yksi hankintapaketti
- `proc_packages.default_work_package_id` on pakollinen.
- Item-mappayksessa ristiriitainen TP+HP-pari estetaan virheella
  (`WORK_PROC_LINK_MISMATCH`, HTTP 409).
- Jos itemille valitaan vain hankintapaketti, työpaketti taytetaan
  hankintapaketin linkitetysta työpaketista.

## Alternatives considered
1) 1:N TP-HP
- Plussat: joustavampi hankintarakenne.
- Miinukset: MVP:ssa vastuurakenne hajoaa ja UI:ssa kasvaa virhealttius.

2) Ei pakollista linkkia hankintapaketille
- Plussat: minimimuutokset nykyiseen.
- Miinukset: orvot hankintapaketit ja epaselva mappaysketju.

3) Hiljainen autokorjaus ristiriitatilanteessa
- Plussat: vahemman virheilmoituksia kayttajalle.
- Miinukset: kayttajan valinta muuttuu huomaamatta, audit-jaljitettavyys heikkenee.

## Consequences
+ Hankintapaketti on aina sidottu yhteen työpakettiin.
+ Työpaketin taloudellinen omistajuus pysyy yksiselitteisena MVP:ssa.
+ Item-mappays pysyy ehjana, kun ristiriitaiset TP+HP-parit estetaan.
- Vanha client, joka ei laheta `defaultWorkPackageId`:ta, saa 400-virheen.
- Toinen hankintapaketti samalle työpaketille palauttaa 409-virheen.

## Mita muuttui
- DB: lisataan 1:1-rajoite `proc_packages.default_work_package_id`-kenttaan.
- Backend/API: hankintapaketin luonti vaatii `defaultWorkPackageId`-arvon ja estaa toisen
  hankintapaketin samalle työpaketille.
- UI: hankintapaketin luonti vaatii työpaketin valinnan ja nayttaa virheen jos työpaketti on jo linkitetty.

## Miksi
- MVP-vaiheessa tarvitaan selkea ja helposti validoitava vastuurakenne.
- 1:1-linkitys pienentaa virhemahdollisuuksia tuotannon suunnittelussa.
- Ratkaisu noudattaa append-only-periaatetta: historiaa ei poisteta, vain uudet kirjaukset estetaan
  ristiriitaisina.

## Miten testataan (manuaali)
- Yrita luoda hankintapaketti ilman `defaultWorkPackageId` -> odota 400.
- Luo hankintapaketti työpaketille A.
- Yrita luoda toinen hankintapaketti samalle työpaketille A -> odota 409.
- Tee item-mappays pelkalla `procPackageId`:lla -> `workPackageId` tayttyy automaattisesti.
- Tee item-mappays ristiriitaisella TP+HP-parilla -> odota 409 `WORK_PROC_LINK_MISMATCH`.
