# Vaihe 16 (A): AC, AC*, CPI ja Selvitettävät – migraatio 0006 + testit

Päivitetty: 2025-12-18

## Päätös (A)
KPI/EV/AC/CPI lasketaan **vain** työvaiheille, joilla on lukittu baseline.

## Teidän ankkuri-ID:t (CSV:stä)
- project_id: `111c4f99-ae89-4fcd-8756-e66b6722af50`
- TARGET_ESTIMATE batch: `091abb6e-1f81-4d88-a0e1-7039f173582e`
- Baseline-lukittu työvaihe (smoke test):
  - work_phase_id: `416e7743-e3bb-4ff7-a6d5-ca30559c1a3b`
  - work_phase_version_id: `c9cc3db4-52cc-4588-b8bd-1a6694829d02`
  - work_phase_baseline_id: `e1279207-e4da-434c-a85e-2f5d03671785`
  - BAC: 454.78 €

## 1) Aja migraatio 0006 (pgAdmin)
Aja `migrations/0006_work_phase_actuals_cpi.sql`

Huom: migraatio yrittää tunnistaa automaattisesti JYDA-lähteen ja luo näkymän:
- `v_actual_cost_lines_latest(project_id, littera_id, amount)`

Jos pgAdminin Messages-välilehdellä näkyy NOTICE:
- "Creating v_actual_cost_lines_latest from source: public.v_jyda_snapshot_lines_latest"
…se on hyvä.

## 2) Tarkista että actuals-näkymä toimii
```sql
SELECT COUNT(*) AS actual_lines
FROM v_actual_cost_lines_latest
WHERE project_id='111c4f99-ae89-4fcd-8756-e66b6722af50';
```

Jos count on 0, se voi tarkoittaa:
- JYDA-dataa ei ole tuotu tähän projektiin, tai
- JYDA-taulun/rivin sarakkeet ovat eri nimillä → silloin kerro minulle mikä NOTICE tuli ja/tai näytä `\d` / columns-lista.

## 3) Katso KPI-yhteenveto (vain baseline-lukitut)
```sql
SELECT work_phase_name, bac_total, percent_complete, ev_value, ac_total, ac_star_total, cpi
FROM v_work_phase_summary_v16_kpi
WHERE project_id='111c4f99-ae89-4fcd-8756-e66b6722af50'
ORDER BY work_phase_name;
```

Aluksi percent_complete voi olla NULL → EV ja CPI on NULL (odotettu), koska viikkopäivitystä ei ole.

## 4) Lisää viikkopäivitys (jotta EV & CPI näkyvät)
```sql
INSERT INTO work_phase_weekly_updates (project_id, work_phase_id, week_ending, percent_complete, progress_notes, created_by)
VALUES (
  '111c4f99-ae89-4fcd-8756-e66b6722af50',
  '416e7743-e3bb-4ff7-a6d5-ca30559c1a3b',
  '2025-12-19',
  10,
  'Testi: valmiusaste 10%',
  'Pekka'
);
```

Tämän jälkeen:
```sql
SELECT work_phase_name, bac_total, percent_complete, ev_value, ac_total, ac_star_total, cpi
FROM v_work_phase_summary_v16_kpi
WHERE project_id='111c4f99-ae89-4fcd-8756-e66b6722af50';
```

EV pitäisi olla noin 45.48 € (454.78 * 10%).

## 5) Selvitettävät (toteumat jotka eivät kuulu mihinkään baseline-lukittuun työvaiheeseen)
```sql
SELECT *
FROM v_selvitettavat_actuals_by_littera
WHERE project_id='111c4f99-ae89-4fcd-8756-e66b6722af50'
ORDER BY actual_total DESC
LIMIT 50;
```

## 6) Mitä seuraavaksi (vaihe 17)
Kun AC/CPI toimii, seuraava iso palikka on:
- item-level “oli tavoitearviossa” tarkistus (`budget_items`) myös korjauspolussa
- sekä UI/API toimintojen lukitus (kuka saa tehdä mitä)

