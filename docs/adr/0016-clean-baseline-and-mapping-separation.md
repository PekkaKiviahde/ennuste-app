# ADR 0016: Puhdas baseline ja mäppäysten erottelu

## Context
Kehitys on varhaisessa MVP-vaiheessa ja testidataa syntyy nopeasti. Nykyinen migraatioketju on kasvanut, ja sekä item-mäppäys että toteumien käsittely sekoittuvat käsitteellisesti. Lisäksi tietokannan nimistöä halutaan tarkentaa (work_packages/proc_packages), ja importin virheiden jäljittävyys edellyttää raw-rivien talletusta.

## Decision
- Sallitaan hard reset varhaisen kehitysvaiheen aikana: testidata voidaan poistaa tarvittaessa.
- Migraatiot squashataan ja tehdään uusi baseline-migraatio `0001_baseline.sql`.
- Baseline-migraatioon ei tehdä legacy-yhteensopivuusviewejä vanhoille nimille.
- Domain-nimistö DB:ssä yhtenäistetään: käytetään `work_packages` ja `proc_packages` (ei `work_phases`).
- Item-mäppäys on omissa append-only-tauluissa: `item_mapping_versions` ja `item_row_mappings`.
- Toteumat (ennustepäivän toteuma) tuodaan mukaan nyt ja niille tehdään oma mapping, erillään item-mäppäyksestä ja ilman mapping_versions/mapping_lines -sekoitusta.
- Import-runko on yhteinen: `import_batches(kind=TARGET_ESTIMATE|ACTUALS)` + `import_raw_rows` (append-only).
- Importista talletetaan myös raw-rivit virheiden jäljitystä varten.

## Consequences
- Kehityksessä voidaan tarvittaessa nollata kanta nopeasti, mutta tuotannossa hard reset ei ole sallittu.
- Migraatiohistoria yksinkertaistuu ja baseline on selkeä lähtöpiste.
- Nimistö selkiytyy ja vastaa domain-termejä (työpaketti vs. hankintapaketti/proc).
- Item-mäppäyksen audit trail pysyy selkeänä, eikä se sekoitu toteumalogiikkaan.
- Toteumien mapping voidaan kehittää itsenäisesti.
- Import-virheiden debuggaus helpottuu raw-rivien ansiosta.

## Alternatives
- Jatketaan nykyisellä migraatioketjulla: hidas ja vaikea ylläpitää.
- Yhdistetään item-mäppäys ja toteumat samaan mapping_versions-logiikkaan: yksinkertaisempi nyt, mutta vaikeuttaa auditointia ja laajennuksia.
- Ei tallenneta raw-rivejä: kevyempi tallennus, mutta virhejäljitys heikkenee.

## Mitä muuttui
- Päätettiin hard reset -mahdollisuus varhaiseen kehitysvaiheeseen.
- Päätettiin squashata migraatiot ja luoda uusi baseline.
- Päätettiin, ettei baselinen yhteyteen tehdä legacy-viewejä vanhoille nimille.
- Päätettiin selkiyttää DB-nimistö ja erottaa item-mäppäys sekä toteumat omiin tauluihinsa.
- Päätettiin yhteinen import-runko sekä importin raw-rivien talletus.

## Miksi
- MVP-vaiheessa nopeus ja selkeys ovat tärkeämpiä kuin täydellinen migraatiohistoria.
- Erottelu vähentää sekaannusta ja pitää audit trailin puhtaana.
- Raw-rivit parantavat virheiden jäljitettävyyttä.

## Miten testataan (manuaali)
- Tarkista, että uudet taulut nimet näkyvät skeemassa (work_packages, proc_packages, item_mapping_versions, item_row_mappings).
- Aja import ja varmista, että raw-rivit tallentuvat.
- Tee yksi item-mäppäys ja yksi toteuma-mäppäys ja varmista, etteivät ne käytä samoja tauluja.
