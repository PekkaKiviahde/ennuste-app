# Budget import v2 (Talo80 aggregated)

Päivitetty: 2025-12-17

Tässä versiossa luetaan tavoitearvion €-sarakkeet suoraan:
- Työ € -> LABOR
- Aine € -> MATERIAL
- Alih € -> SUBCONTRACT
- Vmiehet € -> RENTAL
- Muu € -> OTHER

Total (Summa) = näiden summa, sitä ei tuoda erikseen.

## Käyttö (dry-run)
```bat
python tools\scripts\import_budget.py --file "excel\Tavoitearvio Kaarna Päivitetty 17.12.2025.xlsx" --project-id 111c4f99-ae89-4fcd-8756-e66b6722af50 --dry-run
```

## Probe (jos haluat varmistaa headerit)
```bat
python tools\scripts\import_budget.py --file "excel\Tavoitearvio Kaarna Päivitetty 17.12.2025.xlsx" --project-id 111c4f99-ae89-4fcd-8756-e66b6722af50 --probe
```

## Mitä muuttui
- Lisätty muutososiot dokumentin loppuun.

## Miksi
- Dokumentaatiokäytäntö: muutokset kirjataan näkyvästi.

## Miten testataan (manuaali)
- Avaa dokumentti ja varmista, että osiot ovat mukana.
