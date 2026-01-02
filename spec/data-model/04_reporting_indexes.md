# Raportoinnin indeksisuositukset (MVP)

## Tavoite
Raportoinnin oletuskyselyt tarvitsevat tehokkaan polun: uusin ennuste per tavoitearvio-littera, toteumat ajanjaksolle ja mappingin kohdistus. Tama dokumentti listaa suositusindeksit.

## Suositusindeksit

1) Uusin ennustetapahtuma per tavoitearvio-littera
```sql
CREATE INDEX ix_forecast_event_target_time ON forecast_event (target_littera_id, event_time DESC);
```

2) Mapping-versio voimassaolopaivalla
```sql
CREATE INDEX ix_mapping_version_project_validity ON mapping_version (project_id, valid_from, valid_to);
```

3) Toteumat projekti + ajanjakso (+ kustannuslaji)
```sql
CREATE INDEX ix_actual_project_period_cost ON actual_cost_line (project_id, period, cost_type);
```

4) Budjetti projekti + target + kustannuslaji
```sql
CREATE INDEX ix_budget_project_target_cost ON budget_line (project_id, target_littera_id, cost_type);
```

5) Mapping-rivi kohdistuksessa (tyolittera + cost_type)
```sql
CREATE INDEX ix_mapping_line_work_cost ON mapping_line (work_littera_id, cost_type);
```

## Huomioita
- Indeksit ovat suosituksia raportointiin; todellinen tarve varmistetaan EXPLAIN-ajoilla.
- Jos kustannuslaji ei ole mukana kyselyssa, cost_type-sarakkeen indeksi ei aina auta.
- Aikavali-rajauksissa period-sarakkeen tyyppi vaikuttaa (DATE vs. kuukausi). PIDa paivamaarat yhdenmukaisina.

## Mita muuttui
- Lisatty raportoinnin indeksisuositukset MVP-kyselypoluille.

## Miksi
- Raportointi vaatii nopean polun mappingin ja tapahtumien yhdistamisessa.

## Miten testataan (manuaali)
- Aja EXPLAIN analyysi raporttikyselyille ja varmista indeksien kaytto.
