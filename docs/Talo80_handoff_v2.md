# Talo 80 / Tavoitearvio – handoff (päivitetty)

Päivitetty: 2026-01-23  
Versio: v2.1

Päivitysloki:
- 2026-01-23 (v2.1): Phase21 + snapshot-raportointi, RBAC-roolit (PROJECT_OWNER/AUDITOR), VSS-ohjeen tarkennus, audit-trail-osio.

## Uutta/selkeytynyttä viimeksi
- **Talo 80 -litteralista tulee aina tavoitearvion tuonnista.** Koodisto on käytännössä **projektikohtainen** ja voi poiketa yrityksittäin.
- Koodit ovat **aina 4-numeroisia numeroita** (etunollat mukana, esim. `0310`, `0004`).
- Yleisin käytäntö urakoiden erotteluun on **“viimeinen numero erottaa”**:
  - esim. `4101` = toimitus, `4102` = asennus  
  - rollup/koonti: `4101` ja `4102` → `4100` (group10)
- **Valuosat (VSS)**:
  - Valuosat luokitellaan usein “6-pääryhmän” alle tavoitearviossa (esim. `6700`).
  - Tuotannon käytännössä niitä halutaan seurata **VSS-rakenteissa**, jolloin rivit **voidaan mäpätä `2500`:lle yrityskohtaisesti**.
  - MVP:ssä tämä tehdään **manuaalisesti** (item-tason rivimäppäys), ei automaattisella koodisäännöllä.

## Keskeinen malli (tiivistelmä)
- **Tavoitearvio = lukittu baseline** (ohjausbudjetti) + **muutosbudjetit** (Change Packages).
- Baselinea ei muokata jälkikäteen; muutokset tehdään muutosbudjettina.
- Ennen baseline-lukitusta tehdään **“normalisointi/strukturointi”**, jossa:
  - voidaan mäpätä tarvittavat litterat yrityskohtaisesti (esim. VSS-rivit `6700` → seuranta `2500`)
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

## Phase21 ja snapshot‑raportointi
- **Kuukausiadapteri (periaate):** kuukausiraportointi tuotetaan baseline-snapshotista (lukittu) “adapterin” kautta, joka muuntaa baseline-rivit kuukausikohtaiseen muotoon (esim. `month_key` + Talo80-littera).
- **Snapshot = raportin totuus:** kuukausi-/projektiraportit ovat todennettavia, koska ne lukevat **lukitun baseline-snapshotin BAC**-totuutta (ei live-mappingista tai live-eventeistä).
- **Ei live-dataa:** snapshot-raportointi ei “kellahda” myöhemmistä muutoksista; sama baseline tuottaa aina samat raporttirivit.
- **RBAC (tuonti + mäppäys):**
  - `PROJECT_OWNER`: saa tehdä Talo80-tuonnin, muokata/mäpätä item-rivejä ja lukita baseline-snapshotin raportointia varten.
  - `AUDITOR`: saa lukea tuontierät, mäppäyksen ja snapshot-raportit sekä audit-lokin; ei tee muutoksia eikä lukituksia.

## Audit-trail
- Kaikki Talo80-tuonti ja item-tason mäppäys kirjautuvat **append-only** audit-lokiin (ei UPDATE/DELETE -historiankatoa).
- Varmista audit- ja RBAC-linjaukset ennen tuotantokäyttöä: `docs/api/security.md` ja `docs/RUNBOOK_PHASE19_SAAS_RBAC.md`.
- Terminologian (Phase20) osalta varmista, että baseline/BAC-merkitykset ovat yhtenevät: `docs/RUNBOOK_PHASE20_TERMINOLOGY.md`.

## VSS (6700 / 2500) — linjaus MVP:lle

- MVP:ssä EI tehdä automaattista “koodimäppäystä” tyyliin 6700 → 2500.
- Syy: tavoitearvion rakenne ja yrityskohtaiset tyylit vaihtelevat.
- VSS-rivien kohdistus tehdään tuotannon/hankinnan toimesta MANUAALISELLA rivimäppäyksellä (item-taso):
  - käyttäjä päättää, mitkä tavoitearviorivit kuuluvat mihinkin työpakettiin ja/tai hankintapakettiin.
- Jos yrityskohtaisesti halutaan seurata valuosia VSS-rakenteissa, VSS-rivit voidaan mäpätä työpaketteihin/hankintapaketteihin, joiden “johtotunnus”/seurantatunnus on `2500` (ilman että lähderiviä muutetaan).
- Raportoinnissa työpaketin koostumus voi näyttää, että sama työpaketti sisältää VSS:ään liittyviä rivejä (myös 6700-lähteisiä),
  mutta lähderivejä ei hävitetä eikä siirretä automaattisesti.

## Mitä muuttui
- Lisätty tiedoston alkuun versio + päivityspäivä + päivitysloki.
- Lisätty “Phase21 ja snapshot‑raportointi” (kuukausiadapteri, baseline-snapshot, ei live-dataa) ja RBAC-vastuut (PROJECT_OWNER/AUDITOR).
- Tarkennettu VSS-ohjetta: manuaalinen, yrityskohtainen mäppäys `2500`:lle ilman automaattista koodisääntöä.
- Lisätty audit-trail-osio ja viittaukset audit/RBAC/Phase20-dokumentteihin.

## Miksi
- Phase21-linjaukset (snapshot-raportoinnin todennettavuus ja roolivastuut) pitää olla samassa handoff-liitteessä, jotta Talo80-tuonnin ja mäppäyksen käyttö on yhdenmukaista.

## Miten testataan (manuaali)
- Avaa `docs/Talo80_handoff_v2.md` ja varmista, että alussa on “Päivitetty: 2026-01-23” ja “Versio: v2.1”.
- Tarkista, että VSS-osio korostaa manuaalista mäppäystä (ei automaattisääntöä) ja että snapshot-raportointi viittaa baseline-snapshotiin (ei live-dataan).
