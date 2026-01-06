# MVP-tyonkulku

Polku: työpakettisuunnittelu -> ennustetapahtuma -> lukitus (baseline) -> loki -> raportti

## 1) Työpakettisuunnittelu
- Kayttaja avaa tavoitearvio-litteran.
- Jarjestelma nayttaa tavoitteen (BudgetLine) ja toteuman (ActualCostLine mappingin kautta).
- Kayttaja kirjaa työpakettisuunnittelun: summary, observations, risks, decisions.
- Työpakettisuunnittelun status asetetaan READY_FOR_FORECAST.

Hyvaksymissaanto (MVP): ennustetapahtuma sallitaan vain, jos työpakettisuunnittelu on READY_FOR_FORECAST tai LOCKED.
Jarjestelma estaa ennustetapahtuman (API + UI), jos työpakettisuunnittelu puuttuu tai on DRAFT.

## 2) Ennustetapahtuma (append-only)
- Kayttaja kirjaa kustannuslajikohtaiset ennusteet (EnnusteRivi).
- Kayttaja kirjaa perustelut memo-kenttiin.
- Tallenna -> syntyy uusi Ennustetapahtuma ja siihen liittyvat EnnusteRivit.

Hyvaksymissaanto (MVP): tapahtumaa ei muokata, vaan korjaus on aina uusi tapahtuma.

## 3) Lukitus (baseline)
- Lukitus on oma Ennustetapahtuma, jossa is_locked = true ja lock_reason taytetaan.
- Lukitus estaa uusien ennustetapahtumien kirjaamisen, ellei erillista vapautusta ole.

## 4) Loki
- Kaikki ennustetapahtumat ja perustelut jaavat append-only lokiin.
- Loki mahdollistaa "miksi muuttui" -raportoinnin.

## 5) Raportti
- Raportti aggregoi tavoite, toteuma ja ennuste.
- Ryhmittely tukee 0-9 group_code -tasoa.
- Raportti nayttaa uusimman ennustetapahtuman per tavoitearvio-littera.

## Mita muuttui
- Paivitetty terminologia työpakettisuunnitteluun ja baseline-lukitukseen.
- Rajattu MVP-tyonkulku selkeaan ketjuun työpakettisuunnittelusta raporttiin.
- Lukitus maaritelty omana ennustetapahtumana append-only periaatteella.
- Raportoinnin aggregointi sidottu mappingiin ja group_code 0-9.
- Lisatty API + UI -tasoinen esto ennustetapahtumalle ilman READY_FOR_FORECAST/LOCKED työpakettisuunnittelua.

## Miksi
- Työpakettisuunnittelun erottaminen varmistaa, etta ennustaminen on ohjattua ja perusteltua.
- Append-only loki varmistaa audit trailin ja tapahtumahistorian.
- Raportointi tarvitsee yksiselitteisen ketjun tiedon lahteesta tulokseen.

## Miten testataan (manuaali)
- Luo tavoitearvio-littera, työpakettisuunnittelu ja yksi ennustetapahtuma.
- Yrita luoda ennustetapahtuma ilman työpakettisuunnittelua ja varmista estoviesti.
- Tee lukitustapahtuma ja varmista, etta uusia ennustetapahtumia ei voi kirjata.
- Aja raportti ja tarkista group_code 0-9 aggregointi.
