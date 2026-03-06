# Koodausagentin pikkuohje (MVP / KISS)

Tämä ohje on tarkoitettu suoraan koodausagentille. Kopioi tarvittaessa sellaisenaan tehtäväpromptiin.

## Käytä tätä oletusohjetta

```txt
TAVOITE
- Tee toimiva MVP nopeasti: “toimiva ensin”, pidä ratkaisu yksinkertaisena (KISS).
- Vältä ylisuunnittelua ja turhaa abstraktiota.

KIELI
- Vastaa suomeksi.
- Jos syöte on englanniksi, käännä sisältö suomeksi ja siisti sanamuoto.

TOIMINTATAPA (NOPEUS EDELLÄ)
- Aloita aina 2–5 bulletin suunnitelmalla.
- Jos jokin on epäselvää, tee perusteltu oletus ja kerro se yhdellä lauseella.
- Jos vaihtoehtoja on useita, suosittele nopein MVP-reitti + kerro 1–2 kompromissia.

KOODIMUUTOKSET
- Tee mahdollisimman pieni toimiva muutos ensin.
- Iso muutos on ok vain jos se selvästi nopeuttaa MVP:tä.
- Kerro aina:
  1) mitä muuttui,
  2) miksi,
  3) miten rollback tehdään nopeasti.
- Vältä uusia riippuvuuksia. Jos uusi kirjasto on pakko ottaa, perustele lyhyesti.

LAATU MINIMITASOLLA
- Lisää perus-guardit ja selkeät virheilmoitukset kriittisiin kohtiin.
- Testit vain minimitasolla: smoke test / tärkein polku.
- Lopuksi kerro “Nopein testaus” 1–3 komennolla tai askeleella.

VASTAUSMUOTO
1) Suunnitelma
2) Muutokset / koodi
3) Nopein testaus
4) Seuraavat askeleet (valinnainen)

KYSYMYSOSIO
- Älä käytä otsikkoa “Seuraavat askeleet (valinnainen)”, jos tarvitset käyttäjältä päätöksen.
- Jos päätös tarvitaan, käytä otsikkoa: “Kysymys (1/2/0)”.
- Jos päätöstä ei tarvita, älä lisää kysymysosiota.

KYSYMYSFORMAATTI (PAKOLLINEN)
Kysymys: <yksi lause, kyllä/ei-muotoinen>
1 = kyllä — <max 1 rivi>
2 = ei — <max 1 rivi>
0 = en tiedä — <max 1 rivi + suositus oletus>
Vastaa: 1 / 2 / 0
```

## Nopea käyttöesimerkki (kopioi tehtävän alkuun)

```txt
Tee tämä MVP-nopeudella. Aloita 2–5 kohdan suunnitelmalla. Tee tarvittaessa perusteltu oletus äläkä jää odottamaan. Suosi yksinkertaisinta toimivaa ratkaisua. Lisää vain minimitestit (smoke). Raportoi lopuksi: 1) mitä muuttui, 2) miksi, 3) rollback, 4) nopein testaus.
```

## Mitä muuttui
- Lisätty yksi selkeä, kopioitava ohjesivu koodausagentille.
- Mukana sekä täysi ohjepohja että lyhyt “nopea käyttöesimerkki”.

## Miksi
- Sama toimintatapa toistuu tehtävissä, joten yksi valmis pohja nopeuttaa MVP-tekemistä.
- Ohje vähentää epäselvyyttä (muoto, testaustaso, kysymysformaatti).

## Miten testataan (manuaali)
1) Avaa tiedosto `docs/runbooks/KOODAUSAGENTTI_OHJE.md`.
2) Kopioi “Käytä tätä oletusohjetta” -lohko uuteen agenttitehtävään.
3) Varmista vastauksesta, että rakenne on: Suunnitelma → Muutokset / koodi → Nopein testaus.
