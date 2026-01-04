# NPSS/cutover verifiointi 2026-01-04

## Tausta
Tama dokumentti kokoaa NPSS/cutover-verifioinnin tulokset Demo projekti A:lle (project_id: 71d07275-1f3d-424b-97e7-1efbfd9fe8fe).
Verifiointi ajettiin SQL-skriptilla `docs/sql/VERIFY_NPSS_CUTOVER.sql`.

## Ajo
- Ympaeristo: local dev (DATABASE_URL redacted)
- SQL: `docs/sql/VERIFY_NPSS_CUTOVER.sql`
- Ajankohta: 2026-01-04

## Tulokset
- amount_kind ja cost_type_origin -tyypit loytyvat.
- actual_cost_lines-taulussa sarakkeet amount_kind ja cost_type_origin ovat olemassa.
- NPSS-opening-nakymat loytyvat: v_actual_cost_lines_effective, v_actual_cost_lines_cost_only, v_actual_cost_lines_npss_opening, v_npss_opening_snapshot_raw, v_npss_opening_snapshot_mapped, v_npss_opening_snapshot_totals.
- Kuukausiraportin ketju ei sisalla NPSS_UNCLASSIFIED/UNCLASSIFIED-riveja (npss_rows_in_monthly_chain = 0).
- COST-only total = 5,662,555.33
- NPSS opening total = 5,635,055.33

## Mita muuttui
- Lisattiin verifiointitulokset dokumentiksi.
- Tallennettiin erottelun summat COST-only vs NPSS opening.

## Miksi
- Tarvitaan auditoitava todiste, etta NPSS/cutover-opening erotellaan COST-only-ketjusta raportoinnissa.

## Miten testataan (manuaali)
1) Avaa pgAdmin ja aja `docs/sql/VERIFY_NPSS_CUTOVER.sql`.
2) Varmista, etta npss_rows_in_monthly_chain = 0.
3) Vertaile COST-only ja NPSS opening -summat odotuksiin.
