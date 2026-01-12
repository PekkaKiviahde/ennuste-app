# HANDOFF: Talo 80 + tavoitearvio → mäppäys (MVP) (siirto “toiseen haaraan”)

Tämä dokumentti tiivistää koko keskustelun päätökset, nykytilan, toteutetut muutokset ja seuraavat askeleet. Tarkoitus: uusi henkilö/haara pystyy jatkamaan ilman, että mitään olennaista jää välistä.

---

## 1) Tavoite (MVP)

Rakentaa SaaS, jossa:

1. **Laskenta** (esim. Estima) tuottaa **tavoitearvioesityksen** (CSV).
2. SaaS **importtaa** tavoitearvion (projektikohtainen koodisto syntyy tuonnista).
3. Importin jälkeen **tuotanto + hankinta** tekee **manuaalisen rivimäppäyksen**:
   - **tavoitearviorivi (item/budget_item)** → **työpaketti** (tuotannon “työn alle jossa kulu tehdään”)
   - **tavoitearviorivi (item/budget_item)** → **hankintapaketti** (sopimus/ostokori; omistaja toimisto tai työmaa)
4. Kaikki tapahtumat ovat **append-only** (audit trail).
5. UI:n pitää olla niin helppo, että käyttäjät eivät palaa Exceliin / ruutupaperiin.

---

## 2) Kriittiset määritelmät (sanasto)

- **Tavoitearvio** = laskennan tuonti (import_batch), jonka sisältöä ei “muokata”.
- **Tavoitearviorivi / budget_item** = mäppäyksen perusyksikkö (item-koodi, esim. 31101010).
- **Littera (Talo 80 -koodi)** = 4-numeroisena merkkijonona (leading zeros säilyy). Regex `^\d{4}$`.
- **Työpaketti** = tuotannon ohjausyksikkö (teknisesti tällä hetkellä `work_phases`).
- **Hankintapaketti** = sopimus/tilauskori (`proc_packages`), omistaja `OFFICE` tai `SITE`.
- **Autofill** = hankintapaketti voi täyttää työpaketin oletuksella (`default_work_package_id`).
- **Koostumusraportti** = työpaketin sisältö item-tasolla (mistä budjetti koostuu).

---

## 3) Lukitut MVP-päätökset (ei enää keskustelua, ellei pakko)

### B1 Leaf/otsikko (tuplalaskennan esto)
- MVP-oletus: **LEAF = rivi jolla on €** (summa > 0 tai kustannuslajeissa arvoa), muuten HEADER.
- Lisävarmistus: “lapsirivi”-heuristiikka (jos rivillä on lapsia, se on HEADER vaikka sillä olisi €).
- UI sallii override HEADER↔LEAF.

### B2 Splitti
- MVP: **ei splittiä**.
  - 1 rivi → max 1 työpaketti + max 1 hankintapaketti.

### B3 Toimitusrivit työpaketissa
- Toimitusrivi voi näkyä **työpaketin koostumuksessa read-only** (harmaana/lukittuna), mutta ei sisälly “työbudjettiin” oletuksena.

### B4 Bidirectional autofill
- **Automaatti vain hankintapaketti → työpaketti** (jos työpaketti tyhjä ja hankintapaketilla default).
- **Ei automaattia työpaketti → hankintapaketti** (vain ehdotus myöhemmin).

### B5 VSS (6700/2500)
- MVP:ssä **ei automaattista koodimuunnosta** (esim. 6700 → 2500).
- VSS-tyyliset järjestelyt tehdään **manuaalisella rivimäppäyksellä**.

---

## 4) Keskeinen domain-ymmärrys (miksi hankintapaketti ≠ työpaketti)

Rakennusalalla:
- **Toimiston hankinta** hoitaa isot toimitukset ja isot aliurakat.
- **Työmaa/tuotanto** hoitaa pienemmät/pirstaleiset hankinnat sekä tuotannon ohjauksen.
- Usein **elementtitoimittaja ≠ asentaja**, joten hankinta pilkkoo toimitus vs asennus eri sopimuksiin, vaikka tuotannon työpaketti voi olla yksi “asennustyö”.

Siksi mäppäys on 2-ulotteinen, mutta UI:n pitää tehdä siitä 1–2 klikkauksen operaatio (bulk + autofill).

---

## 5) Toteutus: append-only item-mäppäys (blokkereiden ratkaisu)

### Ennen (ONGELMA)
`target_estimate_item_mappings` käytti `UNIQUE (budget_item_id)` + `ON CONFLICT DO UPDATE` → historia ylikirjoittui.

### Nyt (KORJATTU)
- `mapping_versions` (DRAFT/ACTIVE) + `mapping_kind` erottaa mappingit
- `row_mappings` (append-only)
- `v_current_item_mappings` (current state, rajaa mapping_kind='ITEM')

**Hyväksyntätesti tehty**:
- sama item sai 2 riviä `row_mappings`-tauluun
- `v_current_item_mappings` näytti vain viimeisimmän
- `mapping_kind`/ACTIVE ei sotkenut

---

## 6) Repo-ohjeistus (AGENTS.md)

- `AGENTS.md` on päivitetty yhdistetyksi versioksi:
  - Codex-työskentelytapa + repo-kartta + komennot
  - Talo 80 + tuonti → manuaalimäppäys -periaate
  - append-only item-mäppäys (mapping_versions+row_mappings+current view)
  - ei automaattisia koodisääntömuunnoksia MVP:ssä
  - kaaviolinkit `diagrams/`-kansioon

---

## 7) Testidata / smoke test (tehty)

- `test_budget.csv` (3 riviä: 4101/4102/6700, ;‑erotin, FI‑numerot)
- Import ajettu dry-run + write.
- Duplikaattisuoja toimi.
- Paketit ja rivimäppäykset tehty ja tarkistettu DB:stä.
- VSS pysyi 6700:na (ei automaatiota).

---

## 8) Visualisoinnit ja kaaviot (repo)

Käytetään repossa polkua:
- **`diagrams/`**
  - `diagrams/architecture.mmd`
  - `diagrams/schema_overview.mmd` (päivitetty append-only item-mäppäykselle)
  - `diagrams/tavoitearvio_mappays_mindmap_3D.pptx`
  - `diagrams/mapping_montage.png`

---

## 9) Riskit / “miinat” (tärkeimmät)

1. **Tuplalaskenta** (otsikkorivit vs leaf-rivit)  
   → ratkaisu: leaf/otsikko-sääntö + UI override.
2. **ACTIVE/mapping_kind sekoittuu**  
   → ratkaisu: uniikki ACTIVE per (project, import_batch, mapping_kind) + view/repo suodattaa.
3. **Liian vaikea UI**  
   → ratkaisu: yksi taulukko, bulk, suodatus “puuttuvat”, progress, autofill.
4. **Toimitus vs asennus**  
   → ratkaisu: hankintapaketit voivat olla useampia, työpaketti yksi; toimitus näkyy read-only koostumuksessa.

---

## 10) Seuraavat askeleet (TODO)

### TODO: Talo 80 + tavoitearvio → mäppäys (MVP)

#### A. Dokumentaatio ja ohjaus Codexille
- [x] A1 Päivitä `AGENTS.md` (repojuuri)
- [x] A2 Codex-testiprompti
- [x] A3 Termit (1 sivu)
- [x] A0 1 sivun MVP-speksi
- [x] A1.1 Päivitä AGENTS (append-only mapping + repo/komennot yhdistelmä)
- [ ] A1.2 AGENTS “Kaaviot”-osion siistiminen (vain jos ei 1:1 listamuodossa)
- [ ] A0.1 Päivitä speksi vastaamaan toteutusta (work_phases/budget_item_id/mapping_kind -nimistö)

#### B. MVP-mäppäyksen periaatteet (päätökset)
- [x] B1 Leaf/otsikko
- [x] B2 Ei splittiä MVP:ssä
- [x] B3 Toimitusrivi näkyy työpaketin koostumuksessa read-only
- [x] B4 Autofill vain hankintapaketti → työpaketti
- [x] B5 VSS ei automaatiota MVP:ssä

#### C. Toteutus: data + UI
- [x] C1 Tietomalli pohjalla
- [x] C1.0 Append-only item-mäppäys (DB + backfill + repo + ADR + hyväksyntätesti)
- [ ] C1.1 **Minimi-API mäppäysruudulle** (listat + bulk-assign + autofill; käyttää current view)
- [ ] C2 UI: yksi näkymä “Tavoitearvion mäppäys” (bulk + suodatus + progress)
- [ ] C3 UI: “Luo hankintapaketti tästä työpaketista”
- [ ] C4 Raportti: työpaketin koostumus item-tasolla
- [ ] C5 Raportti: hankintapaketin budjetti item-tasolla

#### D. Esimerkit ja pilotointi
- [x] D0 Mini-testiaineisto + import + DB-tarkistus
- [ ] D1 Pystyelementit-demodata (toimitus ≠ asennus, useampi rivi)
- [ ] D2 4 MVP-skenaariota sample-dataan
- [ ] D3 1-sivun käyttöohjeet pilotille

#### E. Visualisointi ja ajattelun validointi
- [x] E1 Mindmap + 3D-kaavio + taulut + raportointikerros
- [x] E1.1 Lisää kaaviot repoon (diagrams/) + linkitä AGENTS.md:hen
- [x] E1.2 Päivitä `diagrams/schema_overview.mmd` append-only item-mäppäykseen

---

## 11) Next action (suositus)
Seuraava konkreettinen työ, jotta UI voidaan tehdä:
- **C1.1 Minimi-API** (GET items + current mapping, GET/POST work_phases, GET/POST proc_packages, POST bulk-assign → insert row_mappings + autofill)

Kun API on valmis → C2 UI on suoraviivainen.
