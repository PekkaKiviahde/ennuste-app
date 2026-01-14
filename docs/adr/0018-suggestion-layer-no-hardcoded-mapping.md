# ADR-0018: Ehdotuskerros importin jälkeen (ei kovakoodattua mäppäysautomaatiota)

**Status:** Accepted  
**Date:** 2026-01-14

## Konteksti
Tavoitearvion importin jälkeen tuotannolla alkaa mäppäys (työntaloudellinen suunnittelu), jossa tavoitearviorivit liitetään työpaketteihin ja tarvittaessa hankintapaketteihin. Yrityskohtaiset käytännöt ja tavoitearvion tyyli vaihtelevat, joten “kovakoodattu” sääntöautomaatiokerros (esim. 6700→2500) on riskialtis ja rikkoo helposti audit trailin.

Samalla on hyödyllistä tukea käyttäjää ehdotuksilla (oppiminen aiemmista projekteista, tekstihaut, konfiguroitava koonti/roll-up), kunhan ihminen hyväksyy.

## Päätös
- Importin yhteydessä tehtävä **esimäppäys** on deterministinen ja pakollinen:
  - jokaiselle 4-num litterakoodille luodaan/vahvistetaan `litteras`-vastinpari
  - koodi säilyy merkkijonona ja leading zerot säilyvät
- Järjestelmä saa tuottaa **ehdotuksia** (oppiva/yrityskohtainen), mutta:
  - se ei tee automaattisia koodimuunnoksia
  - se ei tee automaattista item-/tavoitearviorivi-mäppäystä työpaketteihin ilman ihmisen hyväksyntää
- Kaikki hyväksynnät ja poikkeukset kirjataan tapahtumina (append-only) audit trailin säilyttämiseksi.

## Vaihtoehdot
1) Kovakoodatut yrityssäännöt MVP:hen
- Miinukset: väärät oletukset, vaikea ylläpito, audit trail heikkenee, vaatii jatkuvaa säätöä yrityskohtaisesti.

2) Ei ehdotuksia ollenkaan
- Miinukset: manuaalityö kasvaa, oppiminen aiemmista projekteista jää hyödyntämättä.

## Seuraukset
+ Prosessi pysyy hallittavana: ihminen päättää, järjestelmä ehdottaa.
+ Audit trail säilyy: “miksi” voidaan raportoida.
- Ehdotuskerros vaatii erillisen konfiguroitavan tietolähteen (taulu/dictionary) jos roll-up/koonti otetaan käyttöön.

## Mitä muuttui
- Täsmennettiin speksiin, että esimäppäys on pakollinen ja ehdotukset ovat “suggestion only”.

## Miksi
- Yrityskohtaiset tavoitearvio- ja tuotantokäytännöt vaihtelevat, joten automaattisäännöt eivät ole luotettavia MVP:ssä.
- Ehdotukset antavat nopeutta ilman, että järjestelmä ottaa päätösvaltaa.

## Miten testataan (manuaali)
- Importoi tavoitearvio ja varmista, että `litteras` sisältää kaikki 4-num koodit (leading zerot mukana).
- Varmista, ettei importti muuta koodeja automaattisesti (esim. 6700 ei muutu 2500:ksi).
- Tee ehdotus hyväksyntä käyttäjän toimesta ja varmista, että päätös ja perustelu näkyvät tapahtumalokissa/auditissa.
