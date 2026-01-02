# Vaihe 18 – Raportointi (SaaS v1)

Päivitetty: 2025-12-18

## Mitä tämä vaihe lisää?
Tämä migraatio luo raportointiin “valmiit näkymät” (views), joista UI ja raportit voivat lukea.
Lisäksi raporttipaketit voidaan tallentaa snapshot-tauluihin, joista PDF/CSV generoidaan pyynnöstä.

Raportit kattavat:
- Työvaihe (KPI nykytilanne)
- Pääryhmä (1xxx, 2xxx, …) sekä työvaihekohtaisesti että projektitasolla
- Projektikoonti (usean työvaiheen summa)
- Viikkotrendi (EV viikoittain valmiusasteen perusteella)
- Kuukausiraportointi (perustuu teidän `v_target_month_cost_report` -näkymään)
- Top-poikkeamat (overrun, matalin CPI)
- Selvitettävät (unmapped toteumat / “ei kuulu mihinkään”)

## Asennus
1) Kopioi `migrations/0008_reporting_phase18.sql` repoosi `migrations/`-kansioon.
2) Aja pgAdminissa (Query Tool).

Migraatio on idempotentti: `CREATE OR REPLACE VIEW` yliajaa vain näkymät.

## Tärkeä periaate
Projektin ennuste/raportointi = usean työvaiheen koonti.
Näkymät laskevat projektin summat baseline-lukituista työvaiheista.

## Snapshot-on-demand (MVP)
Raporttipaketin “totuus” on snapshot-tauluissa (append-only), ja tiedosto (PDF/CSV) generoidaan näistä pyynnöstä.
Tämä pitää audit-ketjun ehjänä ja estää tiedostovaraston riippuvuuden MVP:ssä.

Snapshot sisältää raporttinäkymät:
- v_report_work_phase_current
- v_report_project_current
- v_report_project_main_group_current
- v_report_project_weekly_ev
- v_report_monthly_work_phase
- v_report_monthly_target_cost_raw (jos month-sarake löytyy)
- v_report_top_overruns_work_phases
- v_report_lowest_cpi_work_phases
- v_report_top_selvitettavat_littera

## Smoke test (teidän projektilla)
Käytä project_id:tä:
`111c4f99-ae89-4fcd-8756-e66b6722af50`

### 1) Työvaihe KPI
```sql
SELECT *
FROM v_report_work_phase_current
WHERE project_id='111c4f99-ae89-4fcd-8756-e66b6722af50'
ORDER BY work_phase_name;
```

### 2) Projektikoonti
```sql
SELECT *
FROM v_report_project_current
WHERE project_id='111c4f99-ae89-4fcd-8756-e66b6722af50';
```

### 3) Pääryhmä (projektitaso)
```sql
SELECT *
FROM v_report_project_main_group_current
WHERE project_id='111c4f99-ae89-4fcd-8756-e66b6722af50'
ORDER BY main_group_code;
```

### 4) Viikkotrendi (EV)
```sql
SELECT *
FROM v_report_project_weekly_ev
WHERE project_id='111c4f99-ae89-4fcd-8756-e66b6722af50'
ORDER BY week_ending;
```

### 5) Kuukausiraportti (raw + työvaihemapattu)
```sql
SELECT * FROM v_report_monthly_target_cost_raw
WHERE project_id='111c4f99-ae89-4fcd-8756-e66b6722af50'
LIMIT 10;

SELECT * FROM v_report_monthly_work_phase
WHERE project_id='111c4f99-ae89-4fcd-8756-e66b6722af50'
ORDER BY month_key, work_phase_name;
```

### 5b) Snapshot-rivit (raporttipaketti)
```sql
SELECT package_id, row_type, row_data
FROM report_package_snapshots
WHERE project_id='111c4f99-ae89-4fcd-8756-e66b6722af50'
ORDER BY created_at DESC
LIMIT 20;
```

Jos `v_report_monthly_work_phase` on tyhjä, syy on lähes aina se, että `v_target_month_cost_report`-näkymässä
ei ollut tunnistettavaa month/littera-saraketta. Tällöin kerro minulle `\d+ v_target_month_cost_report` tai sen sarakenimet,
niin teen tarkan mappauksen.

### 6) Top-poikkeamat
```sql
SELECT * FROM v_report_top_overruns_work_phases
WHERE project_id='111c4f99-ae89-4fcd-8756-e66b6722af50';

SELECT * FROM v_report_lowest_cpi_work_phases
WHERE project_id='111c4f99-ae89-4fcd-8756-e66b6722af50';
```

### 7) Selvitettävät
```sql
SELECT * FROM v_report_top_selvitettavat_littera
WHERE project_id='111c4f99-ae89-4fcd-8756-e66b6722af50';
```

## Diagnostiikka (tärkeä käytännössä)
Jos sama littera kuuluu kahteen baseline-lukittuun työvaiheeseen, summat voivat tuplalaskentua.
Tarkista tämä näkymä:
```sql
SELECT * FROM v_report_overlap_litteras
WHERE project_id='111c4f99-ae89-4fcd-8756-e66b6722af50';
```

## Seuraava vaihe
Vaihe 19: SaaS-tenantit, käyttäjät, roolit ja oikeudet (multi-org membership) + hyväksyntäpolut.

## Mitä muuttui
- Lisätty muutososiot dokumentin loppuun.

## Miksi
- Dokumentaatiokäytäntö: muutokset kirjataan näkyvästi.

## Miten testataan (manuaali)
- Avaa dokumentti ja varmista, että osiot ovat mukana.
