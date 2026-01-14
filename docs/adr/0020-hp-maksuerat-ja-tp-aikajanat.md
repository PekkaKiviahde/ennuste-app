# ADR-0020: Hankintapaketin maksuerät + työpaketin 2 aikajanaa + painotus (ISO-viikot)

**Status:** Accepted  
**Date:** 2026-01-14

## Konteksti
Tavoitearvioesityksen importin jälkeen tuotanto tekee työvaiheiden taloudellisen suunnittelun. Jotta baselinea voidaan verrata toteumaan ja ennusteeseen ajassa (viikkotasolla), tarvitsemme:

- hankintapaketeille maksueräpolun (millä viikolla paljonko “pitää maksaa”)
- työpaketeille aikataulun sekä kustannusten ajoittumisen (milloin kustannus “syntyy”)

Samalla MVP:n pitää pysyä yksinkertaisena: painotus ei saa kasvaa kustannuslajikohtaiseksi optimoijaksi.

## Päätös
### A) Hankintapaketti (HP) = maksuerälista
- Hankintapaketti mallinnetaan maksuerälistana (2–10+ erää).
- Maksuerä kentät:
  - `due_week` (ISO-viikko `YYYY-Www`)
  - `amount_eur` tai `amount_pct` (jompikumpi)
  - `label`
- Baseline-lukituksessa validoidaan:
  - jos käytetään prosentteja: summa = 100%
  - jos käytetään euroja: summa = hankintapaketin baseline €

### B) Työpaketti (TP) = 2 aikajanaa
- Työpaketilla on:
  - työjakso: `work_start_week`, `work_end_week`
  - kustannusjakso: `cost_start_week`, `cost_end_week`
- Viikkotaso on ISO-viikko (ei päiviä).

### Painotus: yksi per TP
- Kustannusjakson sisällä käytetään yhtä painotusta per työpaketti:
  - `cost_bias_pct` (0–100), missä 0=alku, 50=tasainen, 100=loppu
- MVP: painotus ei ole kustannuslajeittain (yksi jakauma per TP).
- UI näyttää preview-jakauman viikoille; talteen jää vain parametrit (jaksot + bias).

### D) Baseline-lukitus
- Baseline syntyy hyväksynnässä ja lukitsee:
  - HP maksuerät
  - TP työ- ja kustannusjaksot
  - TP `cost_bias_pct`
- Ennustetapahtuma sallitaan vain lukitun baselinen jälkeen.

## Vaihtoehdot
1) Maksuerät vain euroina ilman prosentteja
- Miinukset: vaikea, jos baseline € elää ennen lukitusta; prosentit helpottavat luonnostelua.

2) Painotus kustannuslajeittain
- Miinukset: liian raskas MVP:hen, lisää ylläpitoa ja virheriskiä.

3) Päivätason aikajana
- Miinukset: tarpeettoman tarkka MVP:hen; viikkotaso riittää ja on yhteensopiva ennusterytmin kanssa.

## Seuraukset
+ Raportointi ja seuranta voidaan aikatauluttaa viikkotasolle.
+ Hankintojen “maksupolku” ja tuotannon “kustannuspolku” ovat erotettavissa.
- Tarvitaan yksi yhteinen ISO-viikkiformaatti ja validointi UI/API:ssa.

## Mitä muuttui
- Lukittiin HP maksuerämalli ja TP 2 aikajanaa + `cost_bias_pct` osaksi baselinea.

## Miksi
- Ilman aikataulutusta baseline on pelkkä summa; viikkotaso mahdollistaa seurannan, ennustamisen ja poikkeamien näkyvyyden.

## Miten testataan (manuaali)
- Luo HP:lle 2+ maksuerää ja yritä lukita baseline väärällä summalla (odota virhe).
- Aseta TP:lle työjakso ja kustannusjakso + bias, ja tarkista että UI preview-jakauma muuttuu liukurin mukana.
- Lukitse baseline ja varmista, että ennustetapahtuma estyy ennen lukitusta ja sallitaan lukituksen jälkeen.
