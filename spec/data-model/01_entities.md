# Entiteetit (MVP)

## Periaatteet
- Kaikki ennusteet ja perustelut kirjataan append-only lokiin.
- Suunnittelu on oma vaihe ennen ennustetapahtumaa.
- Tyo- ja tavoitearvio-littera erotetaan mappingilla.
- Raportointi aggregoi ryhmittain (group_code 0-9).

## 1) Littera
Yksi taulu palvelee seka tyolitteraa etta tavoitearvio-litteraa. Rooli tulee mappingista ja kontekstista.

Kentat:
- littera_id (UUID, PK)
- code (string, esim. "2200")
- title (string)
- group_code (int 0-9, = LEFT(code, 1))
- is_active (bool)
- created_at, created_by

## 2) Mapping (tyolittera -> tavoitearvio-littera)
Mapping on ajallinen, koska kohdistus voi muuttua.

LitteraMapping:
- mapping_id (UUID, PK)
- project_id (UUID, FK)
- target_littera_id (FK -> Littera) (tavoitearvio-littera)
- work_littera_id (FK -> Littera) (tyolittera)
- allocation_rule (enum: FULL, PERCENT, AMOUNT)
- allocation_value (decimal)
- valid_from (date)
- valid_to (date, nullable)
- created_at, created_by

## 3) Suunnitelma
Suunnitelma kirjataan ennen ennustetapahtumia ja lukitaan ennen ennustamista.

Suunnitelma:
- plan_id (UUID, PK)
- project_id (UUID, FK)
- target_littera_id (FK -> Littera)
- status (enum: DRAFT, READY_FOR_FORECAST, LOCKED)
- summary (text)
- observations (text)
- risks (text)
- decisions (text)
- created_at, created_by
- updated_at, updated_by

## 4) Ennustetapahtuma (append-only)

Ennustetapahtuma:
- event_id (UUID, PK)
- project_id (UUID, FK)
- target_littera_id (FK -> Littera)
- event_time (datetime)
- created_by
- source (enum: UI, IMPORT, MIGRATION)
- comment (text)
- technical_progress (decimal 0-1, optional)
- financial_progress (decimal 0-1, optional)
- kpi_value (decimal, optional)
- is_locked (bool)
- lock_reason (text, optional)

EnnusteRivi (kustannuslajit):
- line_id (UUID, PK)
- event_id (FK -> Ennustetapahtuma)
- cost_type (enum: LABOR, MATERIAL, SUBCONTRACT, RENTAL, OTHER)
- forecast_value (money/decimal)
- memo_general (text)
- memo_procurement (text)
- memo_calculation (text)

## 5) Liitteet
Liitteet liitetaan joko suunnitelmaan tai ennustetapahtumaan.

Liite:
- attachment_id (UUID, PK)
- owner_type (enum: PLAN, FORECAST_EVENT)
- owner_id (UUID)
- filename
- storage_ref (polku / blob-id)
- created_at, created_by

## 6) Tavoite ja toteuma (lahdedata)

BudgetLine (tavoitearvio):
- budget_id (UUID, PK)
- project_id (UUID)
- target_littera_id (FK -> Littera)
- cost_type (enum)
- budget_value (money/decimal)
- source (enum: IMPORT, MANUAL, CALCULATION)
- valid_from, valid_to
- created_at, created_by

ActualCostLine (toteuma):
- actual_id (UUID, PK)
- project_id (UUID)
- work_littera_id (FK -> Littera)
- cost_type (enum)
- actual_value (money/decimal)
- period (YYYY-MM tai date range)
- source (JYDA, ERP, ...)
- import_batch_id
- created_at

## 7) Nykytila ja raportointi
- Ennusteen nykytila muodostetaan viimeisimmasta ennustetapahtumasta per target_littera.
- Toteuma yhdistetaan mappingin kautta tavoitearvio-litteroille.
- Raportti aggregoi group_code 0-9.

## 8) Konserni ja yhtiö
Konserni on oma entiteetti. Yhtio kuuluu konserniin (valinnainen).

Konserni:
- group_id (UUID, PK)
- name (string)
- created_at, created_by

Yhtio:
- organization_id (UUID, PK)
- group_id (UUID, FK -> Konserni)
- name (string)
- slug (string, uniikki)
- created_at, created_by

## 9) Kutsulinkki (yrityksen paakayttaja)
Kutsulinkki on append-only ja vanhenee.

OrgInvite:
- invite_id (UUID, PK)
- organization_id (UUID, FK)
- email (string)
- role_code (string, oletus ORG_ADMIN)
- token_hash (string)
- expires_at (datetime)
- accepted_at (datetime)
- created_at, created_by

## Mita muuttui
- Lisatty konserni, yhtio ja kutsulinkki entiteetteina.
- Paivitetty entiteettiluettelo vastaamaan onboarding-virtaa.

## Miksi
- Tarvitaan selkea perusta API- ja DB-toteutukselle.
- Suunnittelu ja ennustetapahtuma ovat erillisia liiketoimintavaiheita.
- Raportointi vaatii mappingin ja ryhmittelyn.
- Konsernirakenne ja kutsuvirta vaativat omat entiteetit.

## Miten testataan (manuaali)
- Luo tavoitearvio-littera, suunnitelma ja yksi ennustetapahtuma.
- Tee mapping kolmesta tyolitterasta yhteen tavoitearvio-litteraan ja tarkista aggregointi 0-9.
- Lisaa liite suunnitelmaan ja varmista, etta owner_type/owner_id linkittyy oikein.
- Luo konserni, yhtio ja kutsu, varmista viitteet ja vanheneminen.
