# Viikkopäivitys, ghost-kustannukset ja täsmäytys (MVP)

## 1. Miksi tämä on pakollinen osa
Kirjanpito/JYDA näkyy usein viiveellä (laskut kuukausittain, palkat jälkikäteen).
Siksi ennustekierroksessa ei voi nojata pelkkään toteumaan.

Ghost-kustannus on työmaan tapa kirjata:
- mitä on tehty/aiheutunut
- mitä ei vielä näy laskuilla/järjestelmässä
- jotta AC* on ajantasaisempi

## 2. Viikkopäivitys (rytmitys)
Kirjataan vähintään kerran viikossa / ennustekierroksen yhteydessä.

Viikkopäivityksen sisältö työvaiheelle:
- viikko (esim. viikko päättyy perjantai)
- tekninen valmiusaste % (0–100)
- lyhyt tilannekuva: mitä tehtiin / mitä tehdään seuraavaksi
- riskit ja poikkeamat
- ghost-kirjaukset (uudet tai tarkennukset)

## 3. Ghost-kustannus: mitä kirjataan
Kirjataan vain sellaiset kustannukset, joissa toteuma tulee viiveellä tai epätarkkana:
- vuokrakoneet ja laitteet (kuukausilasku)
- vuokramiehet (tuntikertymä, lasku myöhemmin)
- aliurakan etenemä (jos lasku jälkikäteen)
- hankinnat/sopimukset (jos halutaan sitoumuksia; MVP voi jättää pois)

Ghost kirjataan:
- työvaiheelle (work_phase_id)
- kustannuslajille (LABOR/MATERIAL/SUBCONTRACT/RENTAL/OTHER)
- summana €
- selitteellä (mihin liittyy)
- viikkoleimalla (mille viikolle kuuluu)
- vastuuhenkilöllä (audit)

## 4. Ghostin tilat (MVP)
- **OPEN**: kirjattu, ei vielä “kiinni” laskuissa
- **SETTLED**: täsmäytetty ja suljettu (kokonaan tai osittain)

MVP: sallitaan manuaalinen “settle” ennustekierroksessa.

## 5. Ennustekierroksen täsmäytys (kuukausi / valittu päivä)
Ennustekierroksessa:
1) Haetaan uusin JYDA-snapshot (toteumat) työvaiheen jäsenkoodeilta
2) Lasketaan delta edelliseen kierrokseen (mitä uutta toteumaa tuli)
3) Katsotaan OPEN-ghostit
4) Työnjohto päättää:
   - mikä osa ghostista on nyt toteutunut (lasku tuli) → SETTLED
   - mikä jäi vielä avoimeksi → OPEN

Tulos:
- AC = JYDA toteuma
- ghost_open = ghostien summa
- AC* = AC + ghost_open

## 6. Miksi tämä tukee oppimista
Kun lasku tulee myöhemmin:
- nähdään, oliko ghost arvio realistinen
- erotus voidaan kirjata “täsmäytyspoikkeamana” (oppimista)

MVP: erotus näkyy raportissa “ghost vs toteuma”.

## 7. MVP-valmis määritelmä
- työvaiheelle voidaan kirjata viikkopäivitys
- ghost voidaan kirjata ja nähdä avoimena
- ennustekierroksessa voidaan sulkea ghostia
- AC* ja CPI päivittyvät
