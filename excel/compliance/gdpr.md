# GDPR & Compliance-päätökset – Ennustus (MVP)

Päivitetty: 2025-12-30

Tämä dokumentti kokoaa **päätökset ja oletukset**, joilla varmistetaan että Ennustus-MVP toimii “yleisen B2B SaaS -tyylin” mukaisesti ja tukee GDPR-vaatimuksia.

> Tämä ei ole juridinen neuvonta. Tavoite on tehdä **tuotteen toteutuksesta yksiselitteinen** (mitä dataa käsitellään, missä, kuka näkee, mitä säilytetään ja miten poistetaan).

---

## 1) Roolit GDPR-näkökulmasta (Controller / Processor)

### Päätös: Asiakas = rekisterinpitäjä, Ennustus-toimittaja = käsittelijä
- **Asiakasyritys (tenant)** on rekisterinpitäjä (controller) omien käyttäjiensä ja projektidatansa osalta.
- Me olemme **käsittelijä (processor)** ja toimimme asiakkaan ohjeiden mukaan.

### Päätös: DPA oletuksena kaikille tennanteille
- **DPA (Data Processing Agreement)** on “pakettiin kuuluva” oletus kaikille asiakkaille.
- DPA:ssa kuvataan: käsittelyn tarkoitus, tietotyypit, alikäsittelijät, säilytys/purge, turvatoimet ja ilmoitusvelvollisuudet.

---

## 2) Data residency ja siirrot (EU/ETA)

### Päätös: henkilötieto + varmuuskopiot EU/ETA-alueella
- Henkilötietoa (esim. käyttäjätilit, vastaanottajien sähköpostit) sekä varmuuskopioita **ei siirretä EU/ETA-alueen ulkopuolelle** MVP:ssä.

### Jos myöhemmin tarvitaan siirtoja EU/ETA-alueen ulkopuolelle (tuleva)
- Tällöin vaaditaan vähintään:
  - DPA:n päivitys + alikäsittelijälistaus
  - siirtoperusteet (esim. SCC) + riskinarviointi
  - asiakasviestintä ja dokumentointi

---

## 3) Mitä henkilötietoa Ennustus käsittelee (MVP)

### 3.1 Käyttäjätilit (henkilötietoa)
- Nimi / näyttönimi (display name)
- Työsähköposti (login + ilmoitukset)
- Rooli(t) ja oikeudet (RBAC)
- (Mahdollisesti) organisaatio-/yksikkökytkennät

> Huom: vaikka sähköposti olisi “työsähköposti”, se on silti henkilötietoa.

### 3.2 Projektidata (ei henkilötietoa tarkoituksella)
Päätös: Excel/JYDA-aineistoista tuodaan vain **ei-henkilöön liitettävää** dataa, kuten:
- kustannukset, litterat, item_code:t
- päivämäärät/ajanjaksot
- budjetti- ja toteumaluvut

### 3.3 Raporttien vastaanottajat (henkilötietoa)
- Yksikön johtajan ja talousjohtajan sähköpostit (sekä muut vastaanottajat) ovat henkilötietoa.
- Vastaanottajat ovat osa projektin hallinnollisia asetuksia.

---

## 4) Privacy by design – minimointi ja “append-only”-periaate

### Päätös: henkilötieto EI kuulu append-only tapahtumariveihin
Koska järjestelmässä on paljon versionointia/audit-jälkeä (“append-only”), MVP:ssä noudatetaan:
- tapahtumiin ja versioihin tallennetaan vain **actor_user_id** (tai vastaava tekninen tunniste)
- henkilön nimi/sähköposti haetaan erikseen `users`-taulusta UI-esitystä varten

**Tavoite:** kun käyttäjä anonymisoidaan, audit jää käyttökelpoiseksi ilman henkilötietoa.

### Päätös: importeissa ei henkilötietoa
- Import-validointi tai ohjeistus varmistaa, ettei Excel/JYDA tuo nimiä, henkilötunnuksia tms.

---

## 5) Käyttäjän elinkaari ja poistaminen (Right to erasure)

### Päätös: poistaminen = anonymisointi + audit säilyy
Kun käyttäjä poistetaan:
- käyttäjätilin **henkilöivät kentät** anonymisoidaan (esim. nimi → “Poistettu käyttäjä”, email → null/placeholder/hashed)
- käyttäjän **id** säilyy, jotta audit-jälki ja hyväksyntäketjut pysyvät todennettavina
- UI:ssa näytetään “Poistettu käyttäjä”

### Toteutusohje (suositus)
- `users.deleted_at` (timestamp)
- `users.display_name = "Poistettu käyttäjä"`
- `users.email = null` (tai erillinen `email_hash`, jos tarvitaan deduplikointiin)
- käyttäjä ei voi kirjautua sisään, eikä saa ilmoituksia

---

## 6) Säilytysajat (Retention) – “yleinen B2B SaaS -oletus”

### Päätös: projektidata säilyy, kunnes asiakas poistaa / sopimus päättyy
- Projekti voidaan **arkistoida** (read-only), mutta dataa ei poisteta automaattisesti “projektin päättyessä”.

### Päätös: sopimuksen päättyessä purge-ikkuna (konfiguroitava)
- MVP-oletus: **30–90 päivää** purge-ikkuna (default voidaan määrittää sopimuksessa).
- Purge sisältää: tenantin/projektien data + käyttäjätilit + raporttiarkisto, ellei lakisääteinen velvoite edellytä säilytystä.

### Päätös: operatiivisten lokien oletussäilytys 12 kk
- Access/operatiiviset lokit: **12 kuukautta** (oletus).
- Audit-jälki (versiohistoria) säilyy projektidatan mukana, mutta **pseudonymisoituna** (ei nimiä).

### Huomio talous-/laskutusaineistosta (jos myöhemmin lisätään)
- Jos järjestelmä alkaa säilyttää laskuja/virallista kirjanpitoaineistoa, säilytysaika voi olla pidempi (maakohtainen).
- MVP:ssä tämä on **out of scope**, ellei erikseen päätetä.

---

## 7) Käyttöoikeudet ja näkyvyys (RBAC)

### Päätös: vähimmän oikeuden periaate
- Superadmin näkee kaikki yritykset (multi-tenant).
- Yritysadmin näkee vain oman yrityksen.
- Tuotannon roolit (PM, tuotantojohtaja, käyttäjät) näkevät vain oman yrityksen/projektin datan.

> RBAC-yhteenveto: `docs/workflows/rbac-matrix.md`

---

## 8) Sähköpostit ja tietosuojaminimointi

### Päätös: raporttisähköposteissa vain tarpeellinen
- Sähköposti sisältää:
  - linkin raporttiin / raporttipaketin
  - kuukauden ja projektin tunnistetiedot
- Ei lähetetä turhaan henkilötietoja (esim. ei listata käyttäjiä).

---

## 9) Tietoturva (MVP-minimi)

Päätökset/oletukset MVP-tasolla:
- TLS (HTTPS) kaikessa liikenteessä
- RBAC ja audit-jälki
- varmuuskopiot (EU/ETA) + palautusprosessi
- incident-runbook käytössä, jos häiriö koskee asiakasdataa

> Incident-prosessi: `docs/runbooks/incident.md`

---

## 10) Rekisteröidyn oikeudet ja pyyntöjen käsittely

Koska asiakas on rekisterinpitäjä:
- ensisijainen DSAR-kanava on asiakkaan omat prosessit
- Ennustus tukee tarvittaessa:
  - käyttäjätietojen export (tenant scope)
  - anonymisointi / poisto (kuten kohdassa 5)
  - loki-/audit-otteen tuottaminen pseudonymisoituna

---

## 11) Checklist (mitä pitää olla “done” ennen tuotantoa)

- [ ] DPA-malli valmiina + allekirjoituspolku
- [ ] Alikäsittelijälista dokumentoitu (jos käytössä)
- [ ] EU/ETA-hostauksen ja backupien sijainti dokumentoitu
- [ ] “Poista käyttäjä” = anonymisointi toteutettu
- [ ] Retention/purge-ikkuna sovittu (default + sopimusmuunnokset)
- [ ] RBAC testattu (yritysadmin ei näe muita tennantteja)
- [ ] Incident-runbook käytössä (SEV + banneri)
