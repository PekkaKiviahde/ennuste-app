# Työvaihepaketit (MVP) – migraatio 0005 + smoke test

Päivitetty: 2025-12-18

## Mitä tämä lisää?
Migraatio `0005_work_phases_mvp.sql` lisää:
- work_phases (työvaihe, nimi + status + johtolittera)
- work_phase_versions (koostumusversiot)
- work_phase_members (jäsenet: 4-num littera tai nimike item_code)
- work_phase_baselines + baseline_lines (lukittu BAC, append-only)
- work_phase_weekly_updates (viikkopäivitykset, append-only)
- ghost_cost_entries + ghost_cost_settlements (ghostit, append-only)
- work_phase_change_events + approvals (oppiminen, append-only)
- näkymät: v_work_phase_summary_mvp jne.
- SQL-funktio: work_phase_lock_baseline(...)

## 1) Aja migraatio (pgAdmin)
pgAdmin → ennuste DB → Query Tool → aja:

- `migrations/0005_work_phases_mvp.sql`

## 2) Smoke test – luo työvaihe, versio, jäsenet, baseline ja viikkopäivitys

### 2.1 Luo työvaihe
Vaihda nimi ja created_by halutuksi:

```sql
INSERT INTO work_phases (project_id, name, status, created_by)
VALUES ('111c4f99-ae89-4fcd-8756-e66b6722af50', 'TESTI: Vesikatto', 'DRAFT', 'Pekka')
RETURNING work_phase_id;
```

Kopioi work_phase_id jatkoon.

### 2.2 Luo versio 1
```sql
INSERT INTO work_phase_versions (project_id, work_phase_id, version_no, status, notes, created_by)
VALUES ('111c4f99-ae89-4fcd-8756-e66b6722af50', '<WORK_PHASE_ID>', 1, 'ACTIVE', 'Ensimmäinen koostumus', 'Pekka')
RETURNING work_phase_version_id;
```

### 2.3 Lisää jäsenet (4-num litterat)
Lisää esim. 5600 tai joku muu, joka varmasti löytyy tavoitearviosta (budget_lines).
Tarkista koodit:
```sql
SELECT code, title
FROM litteras
WHERE project_id='111c4f99-ae89-4fcd-8756-e66b6722af50'
ORDER BY code;
```

Lisäys (esim. 5600):
```sql
INSERT INTO work_phase_members (project_id, work_phase_version_id, member_type, littera_id, note, created_by)
SELECT
  '111c4f99-ae89-4fcd-8756-e66b6722af50',
  '<VERSION_ID>',
  'LITTERA',
  l.littera_id,
  'Kuuluu tähän työvaihepakettiin',
  'Pekka'
FROM litteras l
WHERE l.project_id='111c4f99-ae89-4fcd-8756-e66b6722af50'
  AND l.code='5600';
```

Lisää muita koodeja samalla tavalla.

### 2.4 Lukitse baseline (BAC) tavoitearviosta
Käytä teillä olevaa TARGET_ESTIMATE batch-id:tä:
`091abb6e-1f81-4d88-a0e1-7039f173582e`

```sql
SELECT work_phase_lock_baseline(
  '<WORK_PHASE_ID>'::uuid,
  '<VERSION_ID>'::uuid,
  '091abb6e-1f81-4d88-a0e1-7039f173582e'::uuid,
  'Pekka',
  'Baseline lukittu – testi'
) AS baseline_id;
```

Jos saat virheen “missing from TARGET_ESTIMATE”, se tarkoittaa että valitsemasi koodi ei ole budget_linesissä kyseisellä import_batchilla.

### 2.5 Lisää viikkopäivitys + ghost
```sql
INSERT INTO work_phase_weekly_updates (project_id, work_phase_id, week_ending, percent_complete, progress_notes, created_by)
VALUES ('111c4f99-ae89-4fcd-8756-e66b6722af50', '<WORK_PHASE_ID>', '2025-12-19', 10, 'Aloitus ja valmistelut', 'Pekka');
```

Ghost:
```sql
INSERT INTO ghost_cost_entries (project_id, work_phase_id, week_ending, cost_type, amount, description, created_by)
VALUES ('111c4f99-ae89-4fcd-8756-e66b6722af50', '<WORK_PHASE_ID>', '2025-12-19', 'RENTAL', 1500.00, 'Vuokrakoneet viikko 51', 'Pekka');
```

### 2.6 Katso yhteenveto
```sql
SELECT *
FROM v_work_phase_summary_mvp
WHERE project_id='111c4f99-ae89-4fcd-8756-e66b6722af50';
```

Näet BAC, valmiusasteen, EV:n ja ghost_open_totalin.

## 3) Huomio: toteumat (AC) puuttuvat vielä tästä näkymästä
Tämä migraatio ei vielä kytke JYDA-toteumatauluja, koska niiden lopullinen taulurakenne/kolumnit pitää lukita.
Kun kerrot minulle JYDA-toteumataulun nimen ja kentät, lisään:
- AC ja AC* laskennan
- CPI = EV / AC*
