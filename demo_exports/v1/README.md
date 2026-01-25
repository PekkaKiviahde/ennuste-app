## demo_exports/v1 – kanoninen demo-export

Tämä hakemisto sisältää idempotentin demo-datan, jota onboarding käyttää demoprojektin täyttöön.

### Tiedostot
- `data.json`: yksi koontitiedosto, jossa on
  - `litteras`: 4-numeroiset koodit ja selitteet (Talo80, leading zerot säilyvät)
  - `workPackages`: työpaketit (code, name)
  - `procPackages`: hankintapaketit (code, name, defaultWorkPackageCode)
  - `budgetLines`: tavoitearvion rivit per kustannuslaji (`costs` kentässä LABOR/MATERIAL/SUBCONTRACT/RENTAL/OTHER)
  - `targetEstimateItems`: item-tason rivit (itemCode, litteraCode, kuvaus, qty, unit, sumEur, breakdown)
  - `itemMappings`: item → työpaketti/hankintapaketti
  - `mappingLines`: littera→työ-littera -säännöt (allocation_rule/value, ACTIVE)
  - `actuals`: toteumarivit (dimensions_json sisältää littera_code)
  - `actualsMappingRules`: toteumien sääntömäppäys work/proc -paketteihin
  - `planningEvents` ja `forecastEvents`: minimi näkyvyys raporteille

### Käyttö
- Onboarding (org-luonti) lukee `data.json` ja tekee importit idempotentisti.
- Sama dataset voidaan ajaa uudelleen: file_hash + projektin demo_seed_key estävät duplikaatit.
