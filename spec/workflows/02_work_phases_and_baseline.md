# Työvaihepaketti ja baseline (MVP-prosessi)

## 0. Esivaatimukset
- Projekti on olemassa.
- Laskennan tavoitearvio on importattu projektille (TARGET_ESTIMATE / `import_batch`).
- Importin esimäppäys on onnistunut: jokaiselle 4-num litterakoodille löytyy vastinpari `litteras`-masterdatassa (koodi säilyy merkkijonona; leading zerot säilyvät).

## 1. Tavoite
Tässä määritellään prosessi, jolla:
- muodostetaan työvaihe (looginen paketti) tuotannon + hankinnan toimesta
- lukitaan työvaiheen taloudellinen suunnitelma (“baseline”)
- lasketaan valmistusarvo (EV) ja KPI/CPI
- varmistetaan audit trail ja oppiminen

## 2. Käsitteet (lyhyesti)
- **Työvaihe (Work Phase)**: looginen kokonaisuus (esim. "Vesikatto", "Perustus", "Pintabetonilattiat").
- **Johtolittera (lead littera)**: työvaiheen “johtokoodi”, jota käytetään käytännön ostamiseen/johtamiseen (usein se koodi missä eniten €).
- **Työvaiheen koostumus**: lista Talo80-litteroista ja/tai nimiketason koodeista (A–D sarakkeiden logiikka), jotka kuuluvat työvaiheeseen.
- **Baseline**: työvaiheen lukittu taloudellinen suunnitelma (ei sama kuin ennuste). Baseline muodostaa EV-laskennan pohjan.
- **Ennustekierros**: kuukausittainen/valittu rytmi, jossa täsmäytetään toteuma + ghost + valmiusaste ja kirjataan muutosmuistio.
- **Ghost-kustannus**: tehty/aiheutunut kustannus, joka ei vielä näy laskuissa/järjestelmässä (tai näkyy myöhässä).
- **Tavoitearvio**: tuotu DB:hen `TARGET_ESTIMATE` import_batchilla, sekä 4-num taso (`budget_lines`) että nimiketaso (`budget_items`).

## 3. Roolit (MVP)
- **Työnjohto**: tekee työvaiheen suunnittelun, viikkopäivityksen ja ghost-kirjaukset.
- **Hankinta**: osallistuu työvaihepaketin koostamiseen (mitä ostetaan ja miltä koodeilta).
- **Tuotantojohtaja**: lukitsee baseline (tai hyväksyy lukituksen), hyväksyy korjaukset.
- **Talous / kontrolli** (optionaalinen MVP): tarkistaa raportit ja täsmäytyksen.

> MVP: riittää että tuotantojohtaja voi lukita ja hyväksyä muutokset, työnjohto kirjaa viikkoaineiston.

## 4. Työvaiheen elinkaari (tilat)
Työvaihe:  
- **DRAFT** (luonnos) → **ACTIVE** (käytössä) → **CLOSED** (valmis)  
Baseline:  
- **NONE** (ei vielä) → **LOCKED** (lukittu)  
Koostumusversio (työvaiheen sisältö):  
- **DRAFT** → **ACTIVE** → **RETIRED**

## 5. Työvaiheen perustaminen (DRAFT)
Pakolliset kentät:
- työvaiheen nimi (ihmisille)
- johtolittera (lead littera) **tai** ehdotus siitä
- vastuuhenkilö (työnjohto / päävastuu)
- (valinn.) selite ja rajaus

Johtolittera-ehdotus (oletus):
- valitaan se 4-num Talo80-koodi, jossa on eniten tavoitearvion euroja työvaiheen sisältöön valituista koodeista.

## 6. Työvaiheen koostaminen (tuotanto + hankinta)
Työvaiheeseen liitetään “jäsenet” kahdella tasolla:

### 6.1 4-num taso (Talo80-litterat)
- jäsen = littera (esim. 4700, 5110, 5600)
- tarkoitus: toteumien ja budjettien koonti nopeasti

### 6.2 Nimiketaso (tarkka koodi)
- jäsen = item_code (Excel C-sarake), esim. 56001013
- tarkoitus: oppiminen ja tarkka “oliko tavoitearviossa” -todennus

> MVP-suositus:
> - työvaiheen koonti tehdään 4-num tasolla
> - nimiketaso on käytössä korjauksissa ja oppimisessa (ei pakko valita kaikkea nimiketasolla)

## 7. Baseline muodostaminen (taloudellinen suunnittelu)
Baseline koostuu:
- tavoitearvion budjettisummaa (budget_lines) työvaiheen koodeille kustannuslajeittain (LABOR/MATERIAL/SUBCONTRACT/RENTAL/OTHER)
- + työvaiheen suunnittelun sisällöstä (muistiinpanot: miten tehdään, riskit, osto/oma työ, aikatauluperiaate)

Baseline-lukitus luo “totuuden” EV-laskentaa varten:
- **BAC** (Budget at Completion) = baseline-budjetti €
- Baseline linkitetään **TARGET_ESTIMATE import_batch_id:hen** (millä tavoitearvioversiolla baseline on tehty)

## 8. Baseline lukitus (LOCKED)
Lukituksen yhteydessä tallennetaan (audit trail):
- kuka lukitsi, milloin
- työvaiheen koostumusversio (mihin koodeihin se perustui)
- mikä tavoitearvion `import_batch_id` oli pohjana
- baseline-summat (BAC) kustannuslajeittain ja yhteensä
- perusteluteksti (lyhyt)

Validoinnit ennen lukitusta:
- työvaiheessa vähintään 1 jäsen (4-num tai nimike)
- johtolittera kuuluu työvaiheen 4-num jäseniin (jos käytössä)
- tavoitearvio löytyy (TARGET_ESTIMATE batch olemassa)

## 9. EV ja KPI/CPI (raportointiperiaate)
- **Tekninen valmiusaste %** kirjataan viikkopäivityksessä (0–100).
- **EV (Valmistusarvo)** = BAC × valmiusaste%
- **AC (Toteuma)** = JYDA/kirjanpidon toteuma työvaiheen jäsenkoodeilta
- **AC\*** = AC + avoimet ghost-kustannukset
- **CPI/KPI** = EV / AC\*

Huomio:
- jos työvaihe ei ole aloitettu → valmiusaste 0 → EV=0.
- jos valmiusaste ei ole luotettava → KPI ei ole luotettava → siksi valmiusasteen kirjaus on pakollinen.

## 10. “Oli tavoitearviossa” -sääntö baselineen
Baselineen saa tehdä retroaktiivisia korjauksia vain jos lisättävä asia:
- löytyy samasta TARGET_ESTIMATE import_batchista
  - 4-num taso: löytyy `budget_lines`
  - nimiketaso: löytyy `budget_items`

Jos ei löydy:
- sitä ei saa siirtää baselineen
- se kirjataan “poikkeamaksi / oppimiseen” (ks. muutosspeksi)

## 11. MVP-valmis määritelmä
MVP on “prosessi kunnossa”, kun:
- työvaihe voidaan luoda ja nimetä
- siihen voidaan liittää 4-num koodeja
- baseline voidaan lukita (ja se linkittyy import_batchiin)
- viikkopäivitys voi kirjata valmiusasteen ja ghostit
- raportti näyttää EV, AC, ghost-open, CPI
- korjauspolku erottaa “oli tavoitearviossa” vs “ei ollut”

## Mitä muuttui
- Lisätty esivaatimukseksi tavoitearvion import + esimäppäys (koodi → litteras) ennen työvaiheiden ja baselinen muodostamista.

## Miksi
- Työvaiheen budjetti, johtolittera-ehdotus ja baseline-linkitys nojaavat tavoitearvion import-batchiin, joten importin pitää olla ensin tehty ja koodit tunnistettu master-dataksi.

## Miten testataan (manuaali)
- Luo projekti, importoi tavoitearvio ja varmista että 4-num koodit löytyvät `litteras`-listasta (sis. leading zeros).
- Luo työvaihe DRAFTina ja varmista, että johtolittera-ehdotus voidaan tehdä tavoitearvion euroista.
