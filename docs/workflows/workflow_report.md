# Workflow-raportti (Task B)

Tämä on yhteenveto kanonisista workflow-speksistä (`spec/workflows/*`).
Tämä raportti ei ole speksi. Speksi voittaa ristiriidassa.

- Päiväys (UTC): 2026-01-17
- Commit-ref: (täytetään mergehetkellä)

---

## Tavoite

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

## Termit

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

## Päätökset

- (S-1) Yhtiön luonnissa luodaan demoprojekti. Kutsulinkki on email-sidottu, kertakäyttöinen ja vanheneva.
- (S0) Org-roolit ja projekt-roolit eivät periydy automaattisesti. Onboardingissa ORG_ADMIN saa demoprojektiin PROJECT_OWNER.
- (S1) Trial on ilman korttia ja aikarajattu. Trialin rajat: max 1 projekti, max 3 käyttäjää, max 1 import.
- (S1) Read-only ei saa estää maksamista. Commerce-endpointit ovat poikkeus.
- (S1) Grace-expiry tehdään ajastetulla jobilla (ei vain webhookilla).
- (E0) Importin jälkeen mäppäys on manuaalinen (suggestion only).
- (E2) Ennustetapahtuma sallitaan vasta lukitun baselinen jälkeen.
- (Baseline-korjaukset) Baselineen saa lisätä vain asioita, jotka olivat samassa TARGET_ESTIMATE:ssa. Muut menevät oppimiseen.

---

## Gate

Mitä estetään ja milloin.

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

## Audit-eventit

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

## Mitä muuttui
- Yhtenäistetty S/E-vaiheistus ja otsikkorakenne.
- Täsmennetty onboarding (demoprojekti + kutsulinkkisäännöt).
- Täsmennetty PLG-entitlement: read-only gate + commerce-poikkeus + grace-ajastus + reaktivoinnin idempotenssi.
- Täsmennetty baseline: import ensin, ennuste vasta lukituksen jälkeen.
- Täsmennetty viikkopäivitys ja ghost-kustannukset.
- Täsmennetty oppimisen muutosluokat (oli tavoitearviossa vs ei ollut).

---

## Miksi
- Integraatiotestit ja tuotanto vaativat yhden yhteisen workflow-totuuden.
- Gate estää virheelliset kirjoitukset (billing, trial, projekti, baseline).
- Append-only ja audit ovat välttämättömiä jäljitettävyyteen.

---

## Miten testataan

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

## Source specs

Luetut kanoniset speksit:
- `spec/workflows/00_workflow_outline.md`
- `spec/workflows/00_sales_phase.md`
- `spec/workflows/01_plg_entitlement_and_project_lifecycle.md`
- `spec/workflows/02_org_hierarchy_onboarding.md`
- `spec/workflows/02_work_phases_and_baseline.md`
- `spec/workflows/01_mvp_flow.md`
- `spec/workflows/03_weekly_update_ghost_and_reconciliation.md`
- `spec/workflows/04_change_control_and_learning.md`
