# Vaihe 17 – Item-pohjainen korjauspolku (SaaS v1, 2-portainen hyväksyntä)

Päivitetty: 2025-12-18

## Mitä tämä vaihe tekee?
Kun huomataan, että **tavoitearviossa ollut** kustannus (item_code) puuttuu työvaiheen sisällöstä, voidaan tehdä korjaus hallitusti:

1) **Ehdotus** (Työnjohto / Vastaava): valitaan `item_code` tavoitearviosta  
2) **Hyväksyntä 1/2**: Työpäällikkö  
3) **Hyväksyntä 2/2 (lopullinen)**: Tuotantojohtaja  
4) Järjestelmä luo:
   - uuden `work_phase_version` (kopio vanhasta + uusi littera jäseneksi)
   - uuden lukitun `work_phase_baseline` samalla TARGET_ESTIMATE batchilla
5) Koska käytetään *latest baseline* -logiikkaa, EV/CPI päivittyy **retroaktiivisesti** (päätös 17.3 = A).

## Miksi tässä v1:ssä lisätään littera eikä item suoraan?
Teidän toteumat (AC) tulevat littera-tasolla (`target_littera_id` + `allocated_amount`).  
Item-tason scope ei olisi rehellinen ilman item-tason toteumaa.  
Siksi v1:ssä item_code toimii **todisteena ja logina**, mutta korjaus lisää **itemin 4-num litteran** työvaiheeseen.

---

## Asennus
1) Kopioi `migrations/0007_work_phase_corrections_phase17.sql` repoosi ja aja pgAdminissa.

Jos ajo onnistuu, DB:hen syntyy:
- taulu `work_phase_corrections`
- näkymä `v_work_phase_corrections_queue`
- funktiot:
  - `work_phase_propose_add_littera_from_item(...)`
  - `work_phase_approve_correction_pm(...)`
  - `work_phase_approve_correction_final(...)`
  - `work_phase_reject_correction(...)`

---

## Smoke test (teidän testiprojektilla)

### Ankkurit (teidän PROBE 1–2 perusteella)
- project_id: `111c4f99-ae89-4fcd-8756-e66b6722af50`
- work_phase_id: `416e7743-e3bb-4ff7-a6d5-ca30559c1a3b` (TESTI – Pintabetonilattiat)
- current_version_id (baseline scope): `c9cc3db4-52cc-4588-b8bd-1a6694829d02`
- target_import_batch_id: `091abb6e-1f81-4d88-a0e1-7039f173582e`
- nykyinen jäsenlittera: 5600

### 1) Ehdota korjaus item_code:lla
Valitse joku item_code, joka ei kuulu 5600-litteraan (sinun PROBE 3 listalta esim. `47002010`).

```sql
SELECT work_phase_propose_add_littera_from_item(
  '416e7743-e3bb-4ff7-a6d5-ca30559c1a3b'::uuid,
  '47002010',
  'Työnjohtaja',
  'Lisätään tavoitearvion rivi työvaiheeseen (Phase17 testi)'
) AS correction_id;
```

### 2) Katso jonosta
```sql
SELECT *
FROM v_work_phase_corrections_queue
WHERE work_phase_id='416e7743-e3bb-4ff7-a6d5-ca30559c1a3b'
ORDER BY proposed_at DESC;
```

### 3) Hyväksy 1/2 (Työpäällikkö)
```sql
SELECT work_phase_approve_correction_pm(
  '<CORRECTION_ID>'::uuid,
  'Työpäällikkö',
  'OK'
);
```

### 4) Hyväksy 2/2 (Tuotantojohtaja) – tämä luo uuden version + baselinen
```sql
SELECT work_phase_approve_correction_final(
  '<CORRECTION_ID>'::uuid,
  'Tuotantojohtaja',
  'OK'
) AS new_baseline_id;
```

### 5) Varmista että baseline vaihtui (retroaktiivinen)
```sql
SELECT *
FROM v_work_phase_latest_baseline
WHERE work_phase_id='416e7743-e3bb-4ff7-a6d5-ca30559c1a3b';
```

### 6) Varmista että uuden baselinen version jäsenissä on uusi littera
```sql
SELECT
  l.code, l.title
FROM v_work_phase_latest_baseline lb
JOIN work_phase_members m
  ON m.work_phase_version_id = lb.work_phase_version_id
 AND m.member_type='LITTERA'
JOIN litteras l
  ON l.project_id = m.project_id
 AND l.littera_id = m.littera_id
WHERE lb.work_phase_id='416e7743-e3bb-4ff7-a6d5-ca30559c1a3b'
ORDER BY l.code;
```

### 7) (Valinnainen) hylkää korjaus
```sql
SELECT work_phase_reject_correction(
  '<CORRECTION_ID>'::uuid,
  'Työpäällikkö',
  'Ei kuulu tähän työvaiheeseen'
);
```

---

## Mitä seuraavaksi (vaihe 18 ja 19)
- Vaihe 18: raportointi (työvaihe/pääryhmä/projekti + viikko+kuukausi trendit)
- Vaihe 19: SaaS-tenantit, käyttäjät, roolit ja oikeudet (multi-org membership) + hyväksyntäpolut UI:ssa
