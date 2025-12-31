# MVP Workflow Checklist – Ennustus

Päivitetty: 2025-12-31

Tama checklist varmistaa, etta MVP-polku ja integraatiot toimivat
ennen laajempaa toteutusta.

---

## 1) Projekti + roolit
- Projekti luotu
- Roolit maaritetty
- Acting role toimii ja auditoituu

## 2) Budjetti-import (CSV/Excel)
- Sarakemappaus ok
- import_batch syntyy
- budget_lines sisaltaa kustannuslajit (Tyo/Aine/Alih/Vmiehet/Muu)

## 3) JYDA-import (CSV)
- Sarakemappaus ok
- actual_cost_lines snapshot-rivit syntyy
- v_actuals_latest_snapshot palauttaa viimeisimman

## 4) Mapping
- Mapping-versio + rivit luotu
- ACTIVE-versio voimassa
- Unmapped-lista pienenee

## 5) Tyopaketin taloudellinen suunnittelu
- Suunnitelma tallentuu
- READY_FOR_FORECAST vaaditaan ennen ennustetta

## 6) Ennustetapahtuma
- Append-only (uusi event, ei paivityksia)
- Kustannuslajit tallentuvat

## 7) Viikkopaivitys (ghost + % + memo)
- Append-only
- Kuukausi-lukitus estaa muokkaukset

## 8) Month close + korjauspolku
- M0 -> M1 -> M2 lukitus toimii
- Korjaus: TJ pyynto -> Yksikon johto hyvaksyy -> uusi versio
- Report package arkistoitu

## 9) Raportointi & export
- Raportti nayttaa budjetti/toteuma/ennuste
- Export PDF/Excel

## 10) Terminologia/i18n
- UI-muokkaus toimii
- Raporteissa naytetaan termit

---

## Mita muuttui
+- Lisatty MVP-integraatiotestauksen checklist.
+
+## Miksi
+- Yhtenaistaa integraatiotestauksen ja go/no-go -pisteen.
+
+## Miten testataan (manuaali)
+- Aja kohdat 1-10 jarjestyksessa ja merkitse valmis.
