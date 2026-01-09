# Sanasto: tavoitearvio → mäppäys (MVP)

Tämä sanasto määrittää termit, joita käytetään sovelluksessa, spekseissä ja UI:ssa.

## Tavoitearvio (Target estimate)
Laskentaosaston tuottama kustannusesitys (esim. Estima), joka importataan sovellukseen.
Tavoitearvio sisältää rivejä (item), joilla on selite, määrä/yksikkö ja € (kustannuslajeittain tai summana).

## Tavoitearviorivi (Item / import-rivi)
Tavoitearvion yksittäinen rivi, joka on mäppäyksen perusyksikkö MVP:ssä.
Rivi tunnistetaan item-koodilla (esim. 31101010) tai muulla importin rivitunnisteella.
Huom: 4-numeroiset Talo 80 -litterat eivät riitä yksinään, koska sama littera voi sisältää useita eri rivejä.

## Littera (Talo 80 -koodi)
4-numeroinen koodi, joka kuvaa luokittelua (pääryhmä 0–9) ja alaryhmiä.
Koodi käsitellään aina merkkijonona (leading zeros säilyy), regex `^\d{4}$`.

## Otsikkorivi vs leaf-rivi
- Otsikkorivi: ryhmittelyrivi tai yhteenveto, jota ei mäpätä (ei saa aiheuttaa tuplalaskentaa).
- Leaf-rivi: varsinainen kustannusrivi, joka mäpätään (sisältää € tai on alin taso).

## Työpaketti (Work package)
Tuotannon ohjausyksikkö: “minkä työn alle kustannus tehdään”.
Työpaketti on työmaan vastuukori (esim. asennusporukka, sijainti, vaihe).
Työpaketti ei ole sama asia kuin sopimus tai toimittaja (vaikka ne voivat liittyä).

## Hankintapaketti (Procurement package)
Sopimus/tilauskori, johon tavoitearviorivit liitetään hankintaa varten.
Hankintapaketti voi olla toimiston hankinnan tekemä (isot toimitukset/aliurakat) tai työmaan tekemä (pirstaleiset hankinnat).
Hankintapaketti voi sisältää toimittajan, sopimusnumeron ja budjetin.

## Mäppäys (Mapping)
MVP:ssä mäppäys on manuaalinen vaihe importin jälkeen:
- tavoitearviorivi → työpaketti (ensisijainen tuotannon ohjaukseen)
- tavoitearviorivi → hankintapaketti (hankinnan/sopimusten ohjaukseen)
Sama rivi voi saada molemmat linkit tai vain toisen (riippuen luonteesta ja roolista).

## Autofill (hankintapaketti → työpaketti)
Hankintapakettiin voidaan asettaa `default_work_package`.
Kun rivi liitetään hankintapakettiin ja työpaketti puuttuu, työpaketti täytetään automaattisesti oletuksella.
Työpaketti → hankintapaketti on MVP:ssä vain ehdotus (ei automaatti), koska yksi työpaketti voi sisältää useita hankintoja.

## Koostumusraportti (Composition)
Raportti, joka näyttää työpaketin sisällön item-tasolla: mistä tavoitearvioriveistä työpaketin budjetti muodostuu.
Tämä on tärkeä auditoinnissa ja käyttäjän luottamuksessa (ei “musta laatikko”).
