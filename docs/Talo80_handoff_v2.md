# Talo 80 / Tavoitearvio – handoff (päivitetty)

## Uutta/selkeytynyttä viimeksi
- **Talo 80 -litteralista tulee aina tavoitearvion tuonnista.** Koodisto on käytännössä **projektikohtainen** ja voi poiketa yrityksittäin.
- Koodit ovat **aina 4-numeroisia numeroita** (etunollat mukana, esim. `0310`, `0004`).
- Yleisin käytäntö urakoiden erotteluun on **“viimeinen numero erottaa”**:
  - esim. `4101` = toimitus, `4102` = asennus  
  - rollup/koonti: `4101` ja `4102` → `4100` (group10)
- **Valuosat (VSS)**:
  - Valuosat luokitellaan usein “6-pääryhmän” alle tavoitearviossa (esim. `6700`).
  - Tuotannon käytännössä ne halutaan seurata **VSS-rakenteissa**, eli **mäpätään `2500`:lle**.
  - Jos tavoitearviossa valuosat ovat jo `2500`:lla, ei tehdä mitään.

## Keskeinen malli (tiivistelmä)
- **Tavoitearvio = lukittu baseline** (ohjausbudjetti) + **muutosbudjetit** (Change Packages).
- Baselinea ei muokata jälkikäteen; muutokset tehdään muutosbudjettina.
- Ennen baseline-lukitusta tehdään **“normalisointi/strukturointi”**, jossa:
  - mäpätään tarvittavat litterat (esim. `6700` → `2500` valuosat)
  - tarvittaessa splitataan litteroita alakoodeiksi (esim. `4100` → `4101` + `4102`), mutta kokonais€ ei muutu.

## Toteuma / ennuste / raportointi
- Toteumat kirjataan aina litteralle (`CHAR(4)`).
- Raportointi voidaan tehdä:
  - litteratasolla
  - group10/group100 koonneilla
  - työpaketeilla (mestarityyli: manuaalinen kartta)
  - hankintapaketeilla (sopimuspaketit)

## Erityisen tärkeä toteutusdetalji
- **Litterakoodi tallennetaan aina tekstinä** (ei int), jotta etunollat säilyvät.


## VSS (6700 / 2500) — linjaus MVP:lle

- MVP:ssä EI tehdä automaattista “koodimäppäystä” tyyliin 6700 → 2500.
- Syy: tavoitearvion rakenne ja yrityskohtaiset tyylit vaihtelevat.
- VSS-rivien kohdistus tehdään tuotannon/hankinnan toimesta MANUAALISELLA rivimäppäyksellä (item-taso):
  - käyttäjä päättää, mitkä tavoitearviorivit kuuluvat mihinkin työpakettiin ja/tai hankintapakettiin.
- Raportoinnissa työpaketin koostumus voi näyttää, että sama työpaketti sisältää VSS:ään liittyviä rivejä (myös 6700-lähteisiä),
  mutta lähderivejä ei hävitetä eikä siirretä automaattisesti.
