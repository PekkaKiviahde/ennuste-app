# MVP-tyonkulku

Polku: tavoitearvioesityksen import (laskenta) -> tuotannon työvaiheiden taloudellinen suunnittelu -> ennustetapahtuma -> lukitus (baseline) -> loki -> raportti

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
- Mäppäys on append-only ja versioidaan (uusi versio = uusi tapahtuma), ja ennustaminen edellyttää että **aktiivinen mäppäysversio** on olemassa.
- Järjestelmä voi ehdottaa (hakusana, toimittajateksti, aiemmat projektit), mutta ihminen hyväksyy.

### 1.1 Hankintapaketin luonti
- Hankintapaketin luonti ja rivien liittäminen sopimuksille/urakoille (hankinta).
- Oletus (automaattinen esitäyttö / suggestion): kun hankintapaketti luodaan tietylle 4-num litterakoodille, järjestelmä ehdottaa “loput saman litterakoodin riveistä” saman koodin alle työpaketiksi, jotta mikään ei jää ilman kotia.
- Hankintapäälliköllä on oikeus:
  - poistaa “väärin laskettuja” rivejä suunnittelusta (append-only: riviä ei poisteta historiasta, vaan se merkitään ohitetuksi/poissuljetuksi kyseisessä versiossa perustelulla)
  - lisätä rivejä (append-only lisärivi/korjausrivi perustelulla)

### 1.2 Työpakettisuunnittelu
- Mestari vahvistaa hankintapaketin jälkeen jäljelle jääneet/ehdotetut rivit lopullisiksi työpaketeiksi.
- Mestari kirjaa työpakettisuunnittelun: summary, observations, risks, decisions ja asettaa statuksen READY_FOR_FORECAST.
- Mestarilla on oikeus:
  - poistaa “väärin laskettuja” rivejä suunnittelusta (append-only: riviä ei poisteta historiasta, vaan se merkitään ohitetuksi/poissuljetuksi kyseisessä versiossa perustelulla)
  - lisätä rivejä (append-only lisärivi/korjausrivi perustelulla)

Hyvaksymissaanto (MVP): ennustetapahtuma sallitaan vain, jos:
- työpakettisuunnittelun status on READY_FOR_FORECAST tai LOCKED, ja
- projektille on olemassa aktiivinen mäppäysversio.
Jarjestelma estaa ennustetapahtuman (API + UI), jos työpakettisuunnittelu puuttuu tai on DRAFT.

## 3) Ennustetapahtuma (append-only)
- Kayttaja kirjaa kustannuslajikohtaiset ennusteet (EnnusteRivi).
- Kayttaja kirjaa perustelut memo-kenttiin.
- Tallenna -> syntyy uusi Ennustetapahtuma ja siihen liittyvat EnnusteRivit.

Hyvaksymissaanto (MVP): tapahtumaa ei muokata, vaan korjaus on aina uusi tapahtuma.

## 4) Lukitus (baseline)
- Lukitus on oma Ennustetapahtuma, jossa is_locked = true ja lock_reason taytetaan.
- Lukitus estaa uusien ennustetapahtumien kirjaamisen, ellei erillista vapautusta ole.

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
- Paivitetty terminologia työpakettisuunnitteluun ja baseline-lukitukseen.
- Rajattu MVP-tyonkulku selkeaan ketjuun työpakettisuunnittelusta raporttiin.
- Lukitus maaritelty omana ennustetapahtumana append-only periaatteella.
- Raportoinnin aggregointi sidottu mappingiin ja group_code 0-9.
- Lisatty API + UI -tasoinen esto ennustetapahtumalle ilman READY_FOR_FORECAST/LOCKED työpakettisuunnittelua.

## Miksi
- Tavoitearvio (laskennan data) on ennustamisen ja baselinen pohja, joten sen pitää olla olemassa ennen tuotannon suunnittelua.
- Tavoitearviotyylit ja yrityskohtaiset käytännöt vaihtelevat, joten MVP:ssä järjestelmä voi vain ehdottaa ja ihminen hyväksyy (audit trail säilyy).
- Mäppäys on tuotannon suunnitteluvaihe, joka määrittää “missä kustannus tehdään” ja mahdollistaa hankintojen linkityksen.
- Työpakettisuunnittelun erottaminen varmistaa, etta ennustaminen on ohjattua ja perusteltua.
- Append-only loki varmistaa audit trailin ja tapahtumahistorian.
- Raportointi tarvitsee yksiselitteisen ketjun tiedon lahteesta tulokseen.

## Miten testataan (manuaali)
- Importoi tavoitearvio projektille ja varmista, että 4-num koodit näkyvät `litteras`-listassa ja budjetti näkyy työpakettisuunnittelussa.
- Tee tuotannon mäppäys: liitä vähintään yksi tavoitearviorivi työpakettiin ja (halutessa) hankintapakettiin, ja aktivoi mäppäysversio.
- Luo tavoitearvio-littera, työpakettisuunnittelu ja yksi ennustetapahtuma.
- Yrita luoda ennustetapahtuma ilman työpakettisuunnittelua ja varmista estoviesti.
- Yrita luoda ennustetapahtuma ilman aktiivista mäppäystä ja varmista estoviesti.
- Tee lukitustapahtuma ja varmista, etta uusia ennustetapahtumia ei voi kirjata.
- Aja raportti ja tarkista group_code 0-9 aggregointi.
