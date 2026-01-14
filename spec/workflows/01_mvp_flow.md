# MVP-tyonkulku

Polku: tavoitearvioesityksen import (laskenta) -> tuotannon työvaiheiden taloudellinen suunnittelu (TP+HP) -> baseline-lukitus -> seuranta/ennuste -> loki -> raportti

## 0) Tavoitearvioesityksen import (lähtötieto laskentaosastolta)
- Laskentaosasto tuottaa tavoitearvioesityksen (Excel/CSV export).
- Tavoitearvio importataan projektille (TARGET_ESTIMATE import_batch).
- Importin yhteydessa tehdään **esimäppäys**: jokaiselle 4-num litterakoodille luodaan/vahvistetaan vastinpari `litteras`-masterdatassa (koodi säilyy merkkijonona; leading zerot säilyvät).
- Importti voi tuottaa **ehdotuksia** (oppiva/yrityskohtainen), mutta ne ovat aina “suggestion only”:
  - ei automaattista koodimuunnosta (ei “kovakoodattuja sääntöjä” kuten 6700→2500)
  - ei automaattista mäppäystä työpaketteihin/työvaiheisiin ilman ihmisen hyväksyntää
- Importin jälkeen järjestelmä voi näyttää “selvitettävät” (virheelliset tai puutteelliset rivit) ennen kuin tuotanto aloittaa suunnittelun.

Huom:
- Importti EI tee tuotannon mäppäystä työpaketteihin/työvaiheisiin (se on tuotannon manuaalinen vaihe importin jälkeen).

## 1) Tuotannon työvaiheiden taloudellinen suunnittelu (tavoitearviorivit → työpaketti + hankintapaketti)
- Tuotanto ja hankinta määrittävät “missä kustannus tehdään” liittämällä tavoitearviorivit työpaketteihin ja/tai hankintapaketteihin.
- Perusyksikkö on tavoitearviorivi (item), ei pelkkä 4-num littera.
- Suunnittelu on append-only ja versioidaan (uusi versio = uusi tapahtuma).
- Järjestelmä voi ehdottaa (hakusana, toimittajateksti, aiemmat projektit), mutta ihminen hyväksyy.

### 1.1 Hankintapaketin luonti
- Hankintapaketin luonti ja rivien liittäminen sopimuksille/urakoille (hankinta).
- Oletus (automaattinen esitäyttö / suggestion): kun hankintapaketti luodaan tietylle 4-num litterakoodille, järjestelmä ehdottaa “loput saman litterakoodin riveistä” saman koodin alle työpaketiksi, jotta mikään ei jää ilman kotia.
- Hankintapäälliköllä on oikeus:
  - poistaa “väärin laskettuja” rivejä suunnittelusta (append-only: riviä ei poisteta historiasta, vaan se merkitään ohitetuksi/poissuljetuksi kyseisessä versiossa perustelulla)
  - lisätä rivejä (append-only lisärivi/korjausrivi perustelulla)

#### A) Hankintapaketti: maksuerät (milestones)
- Hankintapaketti (HP) mallinnetaan maksuerälistana (2–10+ erää).
- Kentät per maksuerä:
  - `due_week` (ISO-viikko, esim. `2026-W03`)
  - `amount_eur` tai `amount_pct` (jompikumpi, ei molempia)
  - `label` (selite)

### 1.2 Työpakettisuunnittelu
- Mestari vahvistaa hankintapaketin jälkeen jäljelle jääneet/ehdotetut rivit lopullisiksi työpaketeiksi.
- Mestari kirjaa työpakettisuunnittelun: summary, observations, risks, decisions ja asettaa statuksen READY_FOR_FORECAST.
- Mestarilla on oikeus:
  - poistaa “väärin laskettuja” rivejä suunnittelusta (append-only: riviä ei poisteta historiasta, vaan se merkitään ohitetuksi/poissuljetuksi kyseisessä versiossa perustelulla)
  - lisätä rivejä (append-only lisärivi/korjausrivi perustelulla)

#### B) Työpaketti: 2 aikajanaa
- Työpaketti (TP) mallinnetaan kahdella aikajanalla (ISO-viikot):
  - `work_start_week`, `work_end_week` (työjakso)
  - `cost_start_week`, `cost_end_week` (kustannusjakso)

#### B.1 Kustannusjakson painotus (yksi per TP)
- `cost_bias_pct` (0–100)
  - `0` = painotus alkuun
  - `50` = tasainen
  - `100` = painotus loppuun
- MVP: syöttö on liukuri 0–100 + järjestelmän preview-jakauma (ei kustannuslajeittain).

#### C) UI-periaate (MVP)
- Zoomattava projektiaikajana (ISO-viikot).
- “Venyvä viiva” työjaksolle ja kustannusjaksolle (drag start/end).
- Liukuri + preview-jakauma kustannusjaksolle (`cost_start_week..cost_end_week`) käyttäen `cost_bias_pct`.

## 3) Baseline-lukitus (hyväksyntä)
#### D) Baseline-lukitus
- Baseline syntyy hyväksynnässä ja lukitsee erät/jaksot/painotuksen (HP maksuerät + TP työ- ja kustannusjaksot + `cost_bias_pct`).
- Baseline-lukitus myös lukitsee sen, mitkä tavoitearviorivit kuuluvat mihinkin työpakettiin/hankintapakettiin kyseisessä baseline-versiossa.

Validointi baseline-lukituksessa:
- Hankintapaketti: maksuerien summa on joko
  - `100%` (jos käytössä `amount_pct`) tai
  - sama kuin baseline € (jos käytössä `amount_eur`)
- Viikot: start <= end sekä työjaksolle että kustannusjaksolle, ja viikot ovat ISO-viikkoja.

## 4) Seuranta/ennuste (ennustetapahtumat, append-only)
- Seuranta on viikkotasolla (ISO-viikot).
- Ennuste kirjataan ennustetapahtumina (append-only): korjaus on aina uusi tapahtuma.
- Ennuste voidaan kirjata vain, jos baseline on lukittu.
- Raportointi vertaa toteumaa ja ennustetta baselineen:
  - HP maksuerät antavat “maksu-/laskutuspolun” viikoille
  - TP kustannusjakso + `cost_bias_pct` antaa baseline-jakauman viikoille (UI:n preview-jakauma)

## 5) Loki
- Kaikki ennustetapahtumat ja perustelut jaavat append-only lokiin.
- Loki mahdollistaa "miksi muuttui" -raportoinnin.

## 6) Raportti
- Raportti aggregoi tavoite, toteuma ja ennuste.
- Ryhmittely tukee 0-9 group_code -tasoa.
- Raportti nayttaa uusimman ennustetapahtuman per tavoitearvio-littera.

## Mita muuttui
- Nimetty aloitusvaihe tavoitearvioesityksen importiksi (lähtötieto laskentaosastolta).
- Täsmennetty, että yrityskohtainen oppiva automatiikka on vain ehdotuksia (ei pakotettua koodimuunnosta eikä automaattista mäppäystä).
- Muutettu tuotannon vaihe “työvaiheiden taloudelliseksi suunnitteluksi” ja lisätty alavaiheiksi hankintapaketti (1.1) ja työpakettisuunnittelu (1.2), joissa poisto/lisäys tehdään append-only.
- Lisätty hankintapaketin maksuerät (milestones) sekä työpaketin 2 aikajanaa (työjakso + kustannusjakso) ja kustannusjakson painotus (`cost_bias_pct`) viikkotasolla.
- Lisätty UI-periaate: zoomattava aikajana, “venyvä viiva” jaksoille ja liukuri + preview-jakauma.
- Lisätty baseline-lukitus omaksi vaiheeksi ennen seurantaa/ennustetta ja tarkennettu baseline-validoinnit.
- Täsmennetty, että ennustetapahtuma vaatii lukitun baselinen (baseline on “hyväksytty suunnitelma”).

## Miksi
- Tavoitearvio (laskennan data) on ennustamisen ja baselinen pohja, joten sen pitää olla olemassa ennen tuotannon suunnittelua.
- Tavoitearviotyylit ja yrityskohtaiset käytännöt vaihtelevat, joten MVP:ssä järjestelmä voi vain ehdottaa ja ihminen hyväksyy (audit trail säilyy).
- Mäppäys on tuotannon suunnitteluvaihe, joka määrittää “missä kustannus tehdään” ja mahdollistaa hankintojen linkityksen.
- Maksuerät ja aikajanat tekevät baselinesta aikasidonnaisen, jolloin seuranta/ennuste voidaan tehdä viikkotasolla.
- Työpakettisuunnittelun erottaminen varmistaa, etta ennustaminen on ohjattua ja perusteltua.
- Append-only loki varmistaa audit trailin ja tapahtumahistorian.
- Raportointi tarvitsee yksiselitteisen ketjun tiedon lahteesta tulokseen.

## Miten testataan (manuaali)
- Importoi tavoitearvio projektille ja varmista, että 4-num koodit näkyvät `litteras`-listassa ja budjetti näkyy työpakettisuunnittelussa.
- Tee tuotannon suunnittelu: liitä rivejä työpakettiin ja hankintapakettiin; lisää HP:lle 2+ maksuerää (viikot + %/€) ja aseta TP:lle työ- ja kustannusjaksot sekä `cost_bias_pct`.
- Yritä baseline-lukitusta, kun maksuerien summa ei täsmää (odota validointivirhe).
- Lukitse baseline ja varmista, että ennustetapahtuma estyy ilman lukittua baselinea ja sallitaan vasta lukituksen jälkeen.
- Aja raportti ja tarkista group_code 0-9 aggregointi.
