# RBAC-matriisi – Ennustus (MVP)

Päivitetty: 2025-12-30

Tämä dokumentti kokoaa roolit ja oikeudet “yhdelle sivulle”, jotta:
- UI-nappien näkyvyys on yksiselitteinen
- hyväksynnät ja lukitukset ovat selkeitä
- superadmin/yritysadmin -rajat eivät mene sekaisin

> Taustat: master + nappipolut + tilakoneet  
> - `docs/workflows/master.md`  
> - `docs/workflows/nappipolut.md`  
> - `docs/workflows/state-machines.md`

---

## 1) Roolit

### Asiakasroolit (tenant-scope)
- **Yritysadmin**: hallinnolliset asetukset, käyttäjät, raporttivastaanottajat, hyväksyntäketjut
- **PM (projektipäällikkö)**: baseline-hyväksyntä 1/2
- **Tuotantojohtaja**: baseline-hyväksyntä 2/2 + lukon jälkeiset korjauspyynnöt
- **Tuotannon käyttäjä**: viikkopäivitys (%/memo) + ghostit + selvitettävät
- **Yksikön johtaja**: hyväksyy lukon jälkeiset kuukausikorjaukset
- **Talousjohtaja**: vastaanottaa kuukausiraportit (read-only)

### Toimittajan sisäiset roolit
- **Myyjä (Seller)**: sopimus → stub + onboarding-linkki
- **Superadmin**: näkee kaikki yritykset, tuki/override, banneri
- **Support/On-call**: incident triage (ulkoinen tiketti)
- **Release approver**: staging→prod go/no-go (nimetty)

---

## 1.1 Alias-mappaus (tyomaa-roolit -> tekniset roolit)

Tyoaikaiset roolit mapataan teknisiin rooleihin, jotta SaaS-oikeudet pysyvat selkeina.

| Tyomaa rooli | Tekninen rooli (oletus) | Huomio |
|---|---|---|
| Tyonjohtaja | Tuotannon käyttäjä | Kirjaa viikko/ghost/toteumat |
| Vastaavamestari | PM | Valvoo työpaketteja ja lukituksia |
| Tyopäällikkö | PM / Tuotantojohtaja | Voi toimia tuotantojohtajana |
| Tuotantojohtaja | Tuotantojohtaja | Hyvaksyy lukitukset/korjaukset |
| Tyomaainsinoori | Tuotannon käyttäjä | Valmistelee dataa |
| Hankintapaallikko | Katselija | Raporttien luku |
| Yksikon johto | Talousjohtaja / katselija | Hyvaksyy korjaukset |

### Acting role (tilapainen roolinkorotus)
- MVP:ssa sallitaan tilapainen roolinkorotus (acting role).
- Acting role ei muuta perusroolia, vaan antaa oikeudet maaritellyksi ajaksi.
- Jokainen acting-role kirjaus auditoidaan.

---

## 2) Oikeudet (yhteenveto)

Legend:
- ✅ = sallittu
- 🔒 = sallittu vain tietyssä tilassa (esim. ei lukitussa kuussa)
- 👀 = vain katselu
- — = ei käytössä

### 2.1 Hallinnollinen (Company/Project)
| Toiminto | Myyjä | Superadmin | Yritysadmin | PM | TJ | Yksikön johtaja | Talousjohtaja |
|---|---:|---:|---:|---:|---:|---:|---:|
| Luo yritys+projekti (stub) | ✅ | ✅ | — | — | — | — | — |
| Lähetä onboarding-linkki | ✅ | ✅ | — | — | — | — | — |
| Muokkaa yrityksen/projektin tietoja | — | ✅ | ✅ | — | — | — | — |
| Hallitse käyttäjiä ja rooleja | — | ✅ | ✅ | — | — | — | — |
| Aseta raporttivastaanottajat | — | ✅ | ✅ | — | — | — | — |
| Aseta hyväksyntäketjut | — | ✅ | ✅ | — | — | — | — |
| Tarkista/korjaa mäppäykset | — | ✅ | ✅ | — | — | — | — |
| Arkistoi projekti | — | ✅ | ✅ | — | — | — | — |

### 2.2 Työpaketit (SETUP/TRACK)
| Toiminto | Yritysadmin | PM | TJ | Tuotannon käyttäjä |
|---|---:|---:|---:|---:|
| Luo työpaketti | 🔒 | 🔒 | 🔒 | ✅ |
| Muokkaa koostumusta (litterat/itemit) | 🔒 | 🔒 | 🔒 | ✅ *(SETUP)* |
| Pyydä baseline-lukitus | 🔒 | 🔒 | 🔒 | ✅ *(SETUP)* |
| Hyväksy baseline 1/2 | — | ✅ | — | — |
| Hyväksy baseline 2/2 | — | — | ✅ | — |
| Viikkopäivitys (% + memo) | 🔒 | 🔒 | 🔒 | ✅ *(TRACK, avoin kuukausi)* |
| Lisää ghost (€) | 🔒 | 🔒 | 🔒 | ✅ *(TRACK, avoin kuukausi)* |
| Selvitettävät (unmapped) käsittely | 🔒 | 🔒 | 🔒 | ✅ |

### 2.3 Kuukausi (Month close)
| Toiminto | Yritysadmin | PM | TJ | Tuotannon käyttäjä | Yksikön johtaja | Talousjohtaja |
|---|---:|---:|---:|---:|---:|---:|
| Muokkaa kuukausiennustetta | 🔒 | 🔒 | 🔒 | ✅ *(M0_OPEN)* | — | — |
| Muokkaa %/ghost/memo ennen lähetystä | 🔒 | 🔒 | 🔒 | ✅ *(M0_OPEN)* | — | — |
| Esikatsele raportit | 🔒 | 🔒 | 🔒 | ✅ | 👀 | 👀 |
| Lähetä raportit (lukitse kuukausi) | ✅ | — | ✅ | — | — | — |
| Tee korjauspyyntö lukon jälkeen | — | — | ✅ | — | — | — |
| Hyväksy/hylkää korjaus | — | — | — | — | ✅ | — |
| Vastaanota raportti sähköpostilla | — | — | — | — | ✅ | ✅ |

### 2.4 Incident / ylläpito (toimittaja)
| Toiminto | Superadmin | Support/On-call | Dev/Tech lead |
|---|---:|---:|---:|
| Häiriöbanneri ON/OFF | ✅ | — | — |
| Päivitä banneriteksti | ✅ | — | — |
| Incident-tiketti (ulkoinen) | — | ✅ | ✅ |
| Hotfix PR | — | — | ✅ |

## Mita muuttui
- Lisatty alias-mappaus tyomaa-rooleille ja acting role -periaate.

## Miksi
- Todelliset roolit vaihtelevat yrityksittain; alias-mappaus tukee SaaS-oikeuksia.

## Miten testataan (manuaali)
- Tarkista, etta acting role antaa oikeudet ajaksi ja kirjautuu audit-logiin.
