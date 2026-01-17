# Workflow-raportti (MVP)

Tämä on yhteenveto kanonisista workflow-speksistä (`spec/workflows/*`).
Tämä raportti ei ole speksi. Speksi voittaa ristiriidassa.

- Päiväys (UTC): 2026-01-17
- Commit-ref: (täytetään mergehetkellä)

---

## 1) Tavoite

- Antaa “workflow ensin” kokonaiskuva.
- Helpottaa keskustelua: missä vaiheessa ollaan ja mitä saa tehdä.
- Lukita MVP:n tärkeimmät säännöt:
  - ennuste vaatii lukitun baselinen
  - domain-write on append-only (korjaus = uusi tapahtuma)
  - SaaS-gate ja projektigate estävät kirjoitukset

### Rajaukset (MVP)
- Kanoninen totuus: `spec/workflows/*`.
- Tämä raportti on yhteenveto ja tarkistuslista.
- Ei muuteta liiketoiminnan sääntöjä tässä raportissa.

### Nimeäminen (ettei “0” sekoitu)
- SaaS/org-vaiheet: `S-1`, `S0`, `S1`.
- Projektin ennustusprosessi: `E0..E5`.
- `spec/workflows/01_mvp_flow.md` käyttää otsikoissa `0)–5)` = sama kuin `E0..E5`.

---

## 2) Termit

- **Group / konserni**: valinnainen liiketoiminnassa. Tietomallissa suositus: aina jokin Group (myös “oma konserni”, `is_implicit=true`).
- **Organization / yhtiö**: asiakasorganisaatio.
- **Project / projekti**: yhtiön työmaa. Demoprojekti on `is_demo=true`.
- **Invite / kutsulinkki**: email-sidottu, kertakäyttöinen ja vanheneva token. Tokenia ei tallenneta selkokielisenä (vain `token_hash`).
- **Entitlement / subscription_status**: sovelluksen oma gate-päätös. Billing on ulkoinen master.
- **Read-only (org)**: data näkyy, mutta domain-write estetään.
- **Projektin tila**: `ACTIVE | STANDBY | ARCHIVED`. `STANDBY` estää projektin domain-write-toiminnot.
- **TARGET_ESTIMATE import_batch**: tavoitearvion tuontierä.
- **Tavoitearviorivi (item)**: mäppäyksen perusyksikkö.
- **Littera (4-num koodi)**: säilytetään merkkijonona. Leading zerot säilyvät.
- **Työpaketti (TP)**: työjakso + kustannusjakso (ISO-viikot) + `cost_bias_pct`.
- **Hankintapaketti (HP)**: maksuerälista (milestones), `due_week` + `%` tai `€`.
- **Baseline (LOCKED)**: lukittu suunnitelma. Ennuste sallitaan vasta tämän jälkeen.
- **Ghost-kustannus**: “aiheutunut mutta ei vielä toteumassa”. Tilat `OPEN | SETTLED`.
- **Muutosluokat**:
  - `Correction` (oli tavoitearviossa)
  - `Missing from Target Estimate` (ei ollut tavoitearviossa)
- **Selvitettävät**: kohdistamattomat kustannukset/ghostit. Pakko käsitellä ennustekierroksessa.

---

## 3) Työnkulku vaiheittain (S/E)

### S-1: Myynti ja asiakkuuden avaus (Seller / Superadmin)
Tavoite: luo asiakkuus turvallisesti ja idempotentisti.
- Luo yhtiö.
- Luo demoprojekti automaattisesti.
- Luo ORG_ADMIN-kutsulinkki.
- Toimita kutsu asiakkaalle.

### S0: Onboarding ja hierarkia (konserni–yhtiö–projekti)
Tavoite: roolit ja vastuut selkeiksi.
- Roolit ovat scopekohtaisia:
  - org-roolit ja projekt-roolit ovat eri asia.
- ORG_ADMIN saa demoprojektiin `PROJECT_OWNER` automaattisesti (onboarding-poikkeus).
- ORG_ADMIN luo oikeat projektit ja roolittaa henkilöt.
- Demoprojekti arkistoidaan myöhemmin (ei muunneta “oikeaksi projektiksi” in-place).

### S1: Trial / entitlement / projektin elinkaari
Tavoite: gate käyttöoikeudelle.
- Trial:
  - aikarajattu
  - ei korttia
  - rajat: 1 org + 1 projekti + max 3 käyttäjää + max 1 tavoitearvio-importti
- Trialin jälkeen:
  - org read-only
  - projekti(t) STANDBY (reason `trial_ended`)
- past_due:
  - grace (7–14 päivää)
  - grace jälkeen org read-only ja projektit STANDBY (reason `past_due`)
- Reaktivointi:
  - kertamaksu per projekti per aktivointi
  - checkout → webhook → ACTIVE
  - idempotentti

---

### E0: Tavoitearvion import
Tavoite: saada lähtötieto järjestelmään.
- Importoi tavoitearvio (TARGET_ESTIMATE import_batch).
- Tee esimäppäys 4-num koodille `litteras`-masterdataan.
- Järjestelmä voi ehdottaa. Ihminen hyväksyy.
- Näytä “selvitettävät” ennen suunnittelua.

### E1: Suunnittelu ja mäppäys (TP/HP)
Tavoite: määritä “missä kustannus tehdään”.
- Liitä tavoitearviorivit työpaketteihin ja tarvittaessa hankintapaketteihin.
- Kaikki on append-only ja versioitua.
- “Poisto” tehdään poissulkemalla versiossa perustelulla.

### E2: Baseline-lukitus
Tavoite: lukittu suunnitelma ennen ennustamista.
- Baseline lukitsee:
  - HP maksuerät
  - TP työ- ja kustannusjaksot (ISO-viikot)
  - `cost_bias_pct`
  - itemien kuulumisen TP/HP:hen siinä baseline-versiossa
- Validoinnit:
  - HP maksuerät summa 100% tai €-summa täsmää
  - viikkijaksot: start <= end ja ISO-viikkoformaatti

### E3: Seuranta ja ennuste (viikko)
Tavoite: viikkotaso.
- Viikkopäivitys (% + memo).
- Ghost-kustannukset.
- Ennustetapahtumat ovat append-only.

### E4: Loki
Tavoite: perustelut näkyviin.
- Kaikki muutokset kirjataan tapahtumina.
- “Miksi muuttui” pysyy nähtävissä.

### E5: Raportti
Tavoite: johtamisen näkymä.
- Aggregointi (mm. group_code 0–9).
- EV/AC/CPI/SPI ja tarvittaessa EAC/BAC.
- Oppiminen: “oli tavoitearviossa” vs “ei ollut”.

---

## 4) Päätökset (yhteenveto)

- (S-1) Yhtiön luonnissa luodaan demoprojekti. Kutsulinkki on email-sidottu, kertakäyttöinen ja vanheneva.
- (S0) Org-roolit ja projekt-roolit eivät periydy automaattisesti. Onboardingissa ORG_ADMIN saa demoprojektiin PROJECT_OWNER.
- (S1) Trial on ilman korttia ja aikarajattu. Trialin rajat: max 1 projekti, max 3 käyttäjää, max 1 import.
- (S1) Read-only ei saa estää maksamista. Commerce-endpointit ovat poikkeus.
- (S1) Grace-expiry tehdään ajastetulla jobilla (ei vain webhookilla).
- (E0) Importin jälkeen mäppäys on manuaalinen (suggestion only).
- (E2) Ennustetapahtuma sallitaan vasta lukitun baselinen jälkeen.
- (Baseline-korjaukset) Baselineen saa lisätä vain asioita, jotka olivat samassa TARGET_ESTIMATE:ssa. Muut menevät oppimiseen.

---

## 5) Gate (mitä estetään ja milloin)

### Kutsulinkki (S-1 / S0)
Estä hyväksyntä, jos:
- vanhentunut (`expires_at`)
- peruttu (`revoked_at`)
- jo käytetty (`redeemed_at`)
- email ei täsmää kutsuun

### Entitlement (S1)
- Kun org on `read_only` tai `canceled`:
  - estä kaikki domain-write
  - palauta yhtenäinen virhe: `ENTITLEMENT_READ_ONLY`
- Poikkeus:
  - checkout/portaali-session on sallittu (maksaminen ei saa estyä)

### Trial (S1)
Trialing-tilassa estä:
- 2. projekti
- 4. käyttäjä
- 2. tavoitearvio-importti

### Projektin tila (S1)
- Kun projekti ei ole ACTIVE:
  - estä projektin domain-write
  - virhe: `PROJECT_NOT_ACTIVE`

### Baseline (E2/E3)
- Estä ennustetapahtumat ja viikkokirjaukset, jos baseline ei ole lukittu.

---

## 6) Audit-eventit (append-only)

### Spekseissä nimetyt eventit
- `group.created`, `org.created`, `project.created`, `project.archived`
- `invite.created`, `invite.revoked`, `invite.accepted`, `invite.expired`
- `role.granted` (org-scope), `role.granted` (project-scope)
- `org.entitlement.changed`, `project.status.changed`
- `billing.webhook.received`, `billing.webhook.verified`, `billing.webhook.rejected`
- `project.reactivation.checkout_created`, `project.reactivation.webhook_ignored_duplicate`

### Domain-tapahtumat (minimi, nimeäminen voidaan täsmentää)
- Import: import_batch luotu/julkaistu + validointivirheet (selvitettävät)
- Suunnittelu/mäppäys: uusi suunnitelmaversio + poissulkemiset perustelulla
- Baseline: lukituspyyntö + hyväksynnät + hylkäykset
- Viikko: valmiusaste + memo + ghost create/settle
- Muutosmuistio: Correction/Missing + hyväksyntä
- Ennuste: ennustetapahtuma luotu (korjaus = uusi tapahtuma)

---

## 7) Mitä muuttui
- Yhtenäistetty S/E-vaiheistus ja otsikkorakenne.
- Täsmennetty onboarding (demoprojekti + kutsulinkkisäännöt).
- Täsmennetty PLG-entitlement: read-only gate + commerce-poikkeus + grace-ajastus + reaktivoinnin idempotenssi.
- Täsmennetty baseline: import ensin, ennuste vasta lukituksen jälkeen.
- Täsmennetty viikkopäivitys ja ghost-kustannukset.
- Täsmennetty oppimisen muutosluokat (oli tavoitearviossa vs ei ollut).

---

## 8) Miksi
- Integraatiotestit ja tuotanto vaativat yhden yhteisen workflow-totuuden.
- Gate estää virheelliset kirjoitukset (billing, trial, projekti, baseline).
- Append-only ja audit ovat välttämättömiä jäljitettävyyteen.

---

## 9) Miten testataan (manuaali)

### S1 trial / entitlement (tiivis)
1) Aloita trial → org `trialing`, 1 projekti ACTIVE.
2) Yritä luoda 2. projekti → estyy.
3) Lisää 4. käyttäjä → estyy.
4) Tee 2. tavoitearvio-importti → estyy.
5) Trial päättyy → org read-only + projekti STANDBY.
6) Read-only: yritä domain-write (import/mäppäys/ennuste) → estyy.
7) Read-only: luo checkout/portaali-session → sallittu.
8) past_due: grace_until tulevaisuuteen → write sallittu graceen asti.
9) Grace vanhenee → org read-only + projektit STANDBY.
10) Maksetaan → org active, projektit pysyvät STANDBY.
11) Reaktivointi checkout → idempotentti retry palauttaa saman.
12) Webhook paid → projekti ACTIVE, retry ei tuplaa.

### E0–E3 (tiivis)
1) Importoi tavoitearvio → litterat näkyy ja selvitettävät listautuu.
2) Liitä itemit TP/HP:hen → syntyy uusi suunnitelmaversio (append-only).
3) Yritä ennustaa ennen baseline-lukitusta → estyy.
4) Lukitse baseline validoinnit läpäisten → ok.
5) Tee viikkopäivitys + ghost → ok.
6) Tee ennustetapahtuma → ok (append-only).

---

## Source specs (luetut kanoniset speksit)
- `spec/workflows/00_workflow_outline.md`
- `spec/workflows/00_sales_phase.md`
- `spec/workflows/01_plg_entitlement_and_project_lifecycle.md`
- `spec/workflows/02_org_hierarchy_onboarding.md`
- `spec/workflows/02_work_phases_and_baseline.md`
- `spec/workflows/01_mvp_flow.md`
- `spec/workflows/03_weekly_update_ghost_and_reconciliation.md`
- `spec/workflows/04_change_control_and_learning.md`

## Additional references (ei-kanoninen)
- `docs/adr/0002-mvp-workflow-decisions.md`
- `docs/workflows/master.md`
