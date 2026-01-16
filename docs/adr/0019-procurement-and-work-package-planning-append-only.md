# ADR-0019: Tuotannon taloudellisen suunnittelun jako (hankintapaketti → työpaketti) ja append-only “poisto/lisäys”

**Status:** Accepted  
**Date:** 2026-01-14

## Konteksti
Tavoitearvioesityksen importin jälkeen tuotanto tekee työvaiheiden taloudellisen suunnittelun: tavoitearviorivit pitää liittää työpaketteihin (missä kustannus tehdään) ja usein myös hankintapaketteihin (urakka/sopimus). Käytännössä hankinta ja tuotanto tarvitsevat eri näkymän ja oikeudet:

- Hankinta: muodostaa hankintapaketit ja liittää sopimusrivejä.
- Mestari/työnjohto: viimeistelee työpaketit ja varmistaa, että ennustaminen voidaan aloittaa.

Samalla pitää säilyttää audit trail: “poisto” ja “lisäys” eivät saa tuhota historiaa.

## Päätös
- Tuotannon työvaiheiden taloudellinen suunnittelu jaetaan kahteen alavaiheeseen:
  - **1.1 Hankintapaketin luonti** (hankinta)
  - **1.2 Työpakettisuunnittelu** (mestari)
- Järjestelmä voi tehdä automaattista **esitäyttöä** saman 4-num litterakoodin sisällä:
  - kun hankintapaketti luodaan tietylle litterakoodille, järjestelmä voi ehdottaa “loput saman litterakoodin rivit” saman koodin alle työpaketiksi
  - tämä on convenience (ei yrityskohtaista koodimuunnosta eikä ristiinkartoitusta eri koodeihin)
- “Poisto” ja “lisäys” toteutetaan append-only-periaatteella:
  - rivejä ei fyysisesti poisteta historiasta
  - poisto = merkitse rivi ohitetuksi/poissuljetuksi kyseisessä suunnittelun versiossa perustelulla
  - lisäys = uusi lisärivi/korjausrivi perustelulla

## Vaihtoehdot
1) Yksi ainoa “mäppäysvaihe” ilman alavaiheita ja roolijakoa
- Miinukset: käyttöliittymästä tulee sekava ja oikeudet vaikeutuvat.

2) Fyysinen poisto ja “editointi” master-riveihin
- Miinukset: rikkoo append-only-audit trailin ja vaikeuttaa “miksi muuttui” -raportointia.

## Seuraukset
+ Hankinta ja tuotanto saavat selkeät vastuut ja oikeudet.
+ Audit trail säilyy, myös virheiden korjaus on jäljitettävä.
- Tarvitaan selkeä “excluded/override” -malli (status + perustelu) riveille suunnittelun versioissa.

## Mitä muuttui
- Päätettiin workflow-tasolla jakaa tuotannon suunnittelu hankintapaketti- ja työpakettialavaiheisiin.
- Päätettiin, että poisto/lisäys on append-only (ei fyysistä poistoa).

## Miksi
- Vähentää virheitä ja tekee vastuista selkeät.
- Append-only on repon ydinvaatimus ja audit trailin edellytys.

## Miten testataan (manuaali)
- Luo hankintapaketti ja varmista, että järjestelmä esitäyttää saman litterakoodin “loput rivit” työpakettiehdotukseksi (käyttäjä voi muuttaa).
- Merkitse rivi poissuljetuksi ja varmista, että historia säilyy (näkyy lokissa) mutta rivi ei vaikuta “current”-näkymään kyseisessä versiossa.
- Lisää korjausrivi ja varmista, että se näkyy uutena tapahtumana ja vaikuttaa current-tilaan.
