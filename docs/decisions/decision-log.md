# Decision log – Ennustus (MVP)

Päivitetty: 2025-12-30

Tämä dokumentti kokoaa keskusteluissa tehdyt päätökset yhteen paikkaan.
Tarkoitus: että “miksi ja mitä päätettiin” ei jää vain chat-historiaan.

---

## 2025-12-30 – Tuotteen nimi ja rytmi
- Tuotteen nimi: **Ennustus**
- Viikkorytmi: päivitetään **ghost + % valmius + memo**
- Kuukausirytmi: tehdään **manuaalinen kuukausiennuste** kuun vaihteessa

---

## 2025-12-30 – Month close ja lukitus
- Kuukausi lukitaan, kun raportit on lähetetty (Month close).
- Ennen lähettämistä saa muuttaa myös valmiuksia/ghosteja.
- Lähetyksen jälkeen korjaus:
  - **Tuotantojohtaja** tekee korjauspyynnön
  - **Yksikön johtaja** hyväksyy
  - Korjaus saa koskea ennustetta + valmiuksia + ghost + memo
- Jokaisesta lähetyksestä jää **arkistoitu report package** (todiste).

---

## 2025-12-30 – Hallinnollinen polku ja roolit
- Superadmin näkee kaikki yritykset.
- Yritysadmin näkee oman yrityksen ja hallitsee asetukset.
- Myyjällä on omat näkymät: sopimus → stub → onboarding-linkki.
- Integraatiot/mäppäykset ovat pääosin kiinteät, mutta admin voi tarkistaa/korjata.

---

## 2025-12-30 – Toimittajan SDLC
- Pakollinen **Staging**.
- Testit: unit → integration(DB+migrations+views) → e2e(UI).
- Staging→Prod julkaisu vaatii hyväksyjän (go/no-go).
- Tuotantoon aina: DB backup + migrations + verify.

---

## 2025-12-30 – Incident ja Data-fix
- Incident-tiketti ulkoisessa järjestelmässä.
- Appissa in-app häiriöbanneri (status-sivu ei MVP:ssä).
- Hotfix-kaista sallittu, mutta portit säilyy.
- Data-korjaukset tuotannossa vain versionoiduilla skripteillä (ei manuaali-DB-edit).

---

## 2025-12-30 – GDPR/compliance
- Asiakas = rekisterinpitäjä, me = käsittelijä (DPA oletus).
- Data EU/ETA-alueella.
- Importit eivät sisällä henkilötietoa.
- Käyttäjän poisto = anonymisointi, audit säilyy pseudonymisoituna.

---

## 2025-12-31 – MVP-työnkulkujen siirto
- MVP-polku: projekti -> budjetti -> JYDA -> mapping -> tyopaketin taloudellinen suunnittelu -> ennustetapahtuma -> raportti.
- Viikkopaivitys (ghost + % + memo) on oma polku.
- M1_READY_TO_SEND mukana month close -polussa ja korjaus vaatii hyväksynnän.
- Terminologia/i18n UI-muokkaus mukana.
- Roolit teknisina + alias-mappaus; acting role sallitaan.
- Importeissa joustava sarakemappaus.
- Laskenta: AC/EV/CPI/SPI + EAC/BAC jos specissä.
- Exportit: PDF + Excel (ei PPT MVP:ssa).
- Append-only pakotetaan kaikkiin kirjoittaviin tapahtumiin.

## Mitä muuttui
- Lisätty päätökset MVP-työnkulkujen siirrosta ja integraatiopolusta.

## Miksi
- Tarvitaan yhteinen totuus integraatiotestaukseen ja toteutukseen.

## Miten testataan (manuaali)
- Aja MVP-polku end-to-end ja tarkista audit-loki sekä lukitukset.
