# MVP-speksi: Tavoitearvio → mäppäys (hankintapaketti + työpaketti)

## 1. Tausta
Laskenta tuo tavoitearvioesityksen riveinä (import). Tämän jälkeen tuotanto ja hankinta tekevät manuaalisen “mäppäyksen”, jossa import-rivit liitetään:
- työpaketteihin (työmaan tekemisen ja vastuun kori)
- hankintapaketteihin (sopimus/toimitus/ostokori; omistaja toimisto tai työmaa)

MVP:ssä mäppäys ei perustu automaattisiin koodisääntöihin. Järjestelmä voi vain ehdottaa.

## 2. Käsitteet (lyhyesti)
- tavoitearviorivi = importin item/tuontirivi (esim. 31101010), mäppäyksen perusyksikkö
- hankintapaketti = sopimus/tilauskori (OFFICE tai SITE)
- työpaketti = tuotannon ohjausyksikkö (SITE)
- littera = 4-numero Talo 80 (merkkijono, leading zeros säilyy)

## 3. Data/entiteetit (minimi)

### 3.1 Import-rivit
`target_estimate_rows`
- `id` (uuid/int)
- `import_batch_id`
- `item_code` (VARCHAR, vain numerot; pituus vaihtelee)
- `littera_code` (CHAR(4) / VARCHAR(4), regex `^\d{4}$`)
- `description` (text)
- `qty` (numeric, nullable)
- `unit` (text, nullable)
- `sum_eur` (numeric, nullable)  -- rivin summa
- `cost_breakdown_json` (jsonb, nullable) -- työ/aine/alih/muu (jos tuonnissa)
- `row_type` (enum: `HEADER` | `LEAF`)  -- voidaan laskea tuonnissa, ja käyttäjä voi tarvittaessa korjata
- `created_at`

**Leaf-sääntö (väliaikainen MVP):**
- `LEAF` jos `sum_eur` on > 0 (tai kustannuslajeissa on arvoa)
- muuten `HEADER`
- UI:ssa sallitaan manuaalinen override (HEADER↔LEAF), koska eri yrityksillä eri formaatit

### 3.2 Työpaketit (työmaa)
`work_packages`
- `id`
- `project_id`
- `code` (CHAR(4) / VARCHAR(4), regex `^\d{4}$`)  -- työpakettikoodi (yrityskohtainen)
- `name`
- `owner_type` = `SITE` (vakio)
- `responsible_user_id` (nullable)
- `status` (DRAFT/ACTIVE/CLOSED)
- `created_at`

### 3.3 Hankintapaketit (toimisto tai työmaa)
`proc_packages`
- `id`
- `project_id`
- `code` (CHAR(4) / VARCHAR(4), regex `^\d{4}$`)  -- hankintapakettikoodi (yrityskohtainen)
- `name`
- `owner_type` (enum: `OFFICE` | `SITE`)
- `vendor_name` (nullable)
- `contract_ref` (nullable)
- `default_work_package_id` (nullable)  -- autofill “turvalliseen suuntaan”
- `status` (DRAFT/ACTIVE/CLOSED)
- `created_at`

### 3.4 Mäppäys (append-only / versionoitu)
MVP:ssä pidetään yksinkertaisena versiona, jotta audit säilyy.

`mapping_versions`
- `id`
- `project_id`
- `import_batch_id`
- `mapping_kind` (FORECAST/ITEM)
- `status` (DRAFT/ACTIVE)
- `created_by`
- `created_at`
- `activated_at` (nullable)

`row_mappings` (append-only)
- `id`
- `mapping_version_id`
- `budget_item_id`
- `work_phase_id` (nullable)
- `proc_package_id` (nullable)
- `created_at`
- `created_by`

`v_current_item_mappings` (read-view)
- palauttaa per `budget_item_id` viimeisimmän rivin
- huomioi vain `mapping_kind = 'ITEM'` ja `status = 'ACTIVE'`

**Read/Write**
- Write: aina `INSERT` `row_mappings`-tauluun (ei upsertia)
- Read: `v_current_item_mappings` (current state)

**MVP-rajoite:**
- 1 rivi → max 1 työpaketti + max 1 hankintapaketti (ei splittiä)
- sama `budget_item_id` voi saada useita rivejä (audit), uusin on “current”
- rivi voi olla:
  - vain työpaketissa
  - vain hankintapaketissa
  - molemmissa (tyypillisesti asennusrivit)

## 4. Käyttöliittymä (1 ruutu)

### 4.1 Näkymä: “Tavoitearvion mäppäys”
Taulukko riveistä (LEAF oletuksena):
- item_code, selite, määrä/yks, sum_eur
- valinta: työpaketti (dropdown + “Luo uusi”)
- valinta: hankintapaketti (dropdown + “Luo uusi”)
- status-badges: “Työpaketti puuttuu”, “Hankintapaketti puuttuu”, “OK”

Työkalut:
- haku (koodi/teksti)
- suodattimet:
  - vain LEAF
  - puuttuu työpaketti
  - puuttuu hankintapaketti
  - owner_type = OFFICE/SITE (hankintapaketeille)
- bulk-valinta + “Assign työpaketti” + “Assign hankintapaketti”
- progress:
  - “LEAF-riveistä mäpätty työpakettiin: X % (€)”
  - “LEAF-riveistä mäpätty hankintapakettiin: Y % (€)”

### 4.2 Pikatoiminnot
- “Luo hankintapaketti tästä työpaketista”:
  - luo `proc_package` owner_type = SITE
  - asettaa sen `default_work_package_id` = tämä työpaketti
  - (ei automaattisesti siirrä rivejä, mutta käyttäjä voi bulk-assign)

## 5. Validoinnit (MVP)

### 5.1 Koodit
- `littera_code`, `work_packages.code`, `proc_packages.code` = `^\d{4}$` ja tallennetaan merkkijonona
- item_code = vain numerot (pituus vaihtelee), tallennetaan merkkijonona

### 5.2 Leaf/otsikko
- Mäppäys sallitaan oletuksena vain `LEAF`-riveille.
- Jos käyttäjä haluaa mäpätä otsikkorivin, hänen pitää ensin muuttaa se `LEAF`-tyypiksi (explicit override).
- Tavoite: ei tuplalaskentaa.

### 5.3 Pakollisuus
- MVP: ei pakoteta “molemmat aina”.
- Mutta jokaisella LEAF-rivillä pitää olla vähintään toinen:
  - work_package_id tai proc_package_id
- Lisäksi näytetään progress, jotta puuttuvat löytyvät.

## 6. Autofill-logiikka (turvallinen suunta)

### 6.1 Hankintapaketti → työpaketti (AUTOMAATTI)
Kun käyttäjä asettaa riville `proc_package_id`:
- jos työpaketti puuttuu ja `proc_package.default_work_package_id` on asetettu
  → aseta riville `work_package_id = default_work_package_id`

### 6.2 Työpaketti → hankintapaketti (EI automaattia)
Kun käyttäjä asettaa työpaketin:
- älä aseta hankintapakettia automaattisesti
- koska yksi työpaketti voi sisältää useita hankintoja
- UI voi näyttää ehdotuksen (myöhemmin), mutta MVP:ssä ei pakko.

## 7. Hyväksymiskriteerit (done =)
- Yksi ruutu, jossa voi bulk-mäpätä LEAF-rivit työpaketteihin ja hankintapaketteihin.
- Hankintapaketti-valinta täyttää työpaketin automaattisesti, jos default_work_package on asetettu.
- Leaf/otsikko-suoja estää tuplalaskennan (otsikkorivejä ei voi mäpätä vahingossa).
- Raportti/näkymä pystyy näyttämään työpaketin “koostumuksen” item-riveinä (tulee tehtävässä C4).
