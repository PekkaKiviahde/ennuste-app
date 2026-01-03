# Integration tests (MVP) – Ennustus

Päivitetty: 2026-01-03

Tama runbook kuvaa integraatiotestaus-skenaariot, joilla varmistetaan
MVP-tyonkulkujen yhtenevyys (UI + API + DB).

---

## 1) MVP-polku (end-to-end)

1. Luo projekti + roolit (RBAC + acting role)
2. Importoi budjetti (CSV/Excel, sarakemappaus)
3. Importoi JYDA-snapshot (sarakemappaus)
4. Luo mapping-versio + rivit
5. Tee tyopaketin taloudellinen suunnittelu (READY_FOR_FORECAST)
6. Kirjaa ennustetapahtuma (append-only)
7. Aja raportti (tavoite/toteuma/ennuste)

Odotus:
- Kaikki importit luovat import_batchin
- Ennuste on luettavissa raportista
- Audit-lokit olemassa

## 2) Viikkopaivitys (ghost + % + memo)

1. Valitse tyopaketti
2. Syota % valmius + ghost + memo
3. Varmista, etta rivit ovat append-only

Odotus:
- Viikkopaivitys ei muokkaa vanhaa riviä
- Nakyma paivittyy

## 3) Month close + korjauspolku

1. Aseta kuukausi M0 -> M1_READY_TO_SEND
2. Laheta raportit -> M2_SENT_LOCKED
3. Tuotantojohtaja tekee korjauspyynnon
4. Yksikon johto hyvaksyy -> M4_CORRECTED_LOCKED

Odotus:
- Lukitukset estavat muokkauksen
- Korjaus luo uuden version (append-only)
- Report package arkistoitu

## 4) RBAC + acting role

1. Kirjaudu viewer-roolilla -> kirjoitus estyy
2. Acting role (manager) -> lukitus/korjaus sallitaan
3. Audit-logi kirjaa roolikorotuksen

Odotus:
- RBAC estaa kielletut toiminnot
- Acting role toimii maaratyn ajan

## 5) Import-validointi

1. Aja budjetti-import virheellisella sarakkeella
2. Aja JYDA-import virheellisella koodilla

Odotus:
- Import keskeytyy ja raportoi virheet
- Ei kirjoita osittaisia riveja

---

## Mitä muuttui
- Päivitetty päivämäärä 2026-01-03.
- Lisatty login + logout -skenaario (peruspolku).

## Miksi
- Päivämäärä pidetään linjassa päivitysten kanssa.
- Login-polku on kriittinen asiakaspolku ja tarvitsee vakioskenaarion.

## Miten testataan (manuaali)
- Varmista, että päivämäärä on 2026-01-03.
- Aja login-skenaario ja muut skenaariot ja varmista odotetut tulokset.
## 0) Login + logout (peruspolku)

1. Avaa /login ja varmista että sivu vastaa (200).
2. Kirjaudu sisään (anna / 1234).
3. Varmista /api/me palauttaa käyttäjän.
4. Kirjaudu ulos (/logout tai /api/logout).
5. Varmista, että /login näyttää loggedOut-tilan ja kirjautuminen toimii uudelleen.

Odotus:
- Login ja logout toimivat ilman automaattista uudelleenohjausta.
- /api/logout palauttaa 204.
