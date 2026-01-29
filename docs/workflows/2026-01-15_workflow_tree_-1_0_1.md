# Työpuu: SaaS (S-1, S0, S1) ja ennustus (E0, E1)

Tämä tiedosto on “työpuu-näkymä” eri vaiheista.
Päivitämme tähän myöhemmin myös muita workflow-vaiheita ja tarkennuksia.

## Rajaus: missä on “totuus”
- Kanoninen prosessispeksi:
  - `spec/workflows/00_sales_phase.md` (S-1: myynti + provisiointi)
  - `spec/workflows/02_org_hierarchy_onboarding.md` (S0: onboarding)
  - `spec/workflows/01_plg_entitlement_and_project_lifecycle.md` (S1: trial + entitlement + projektin elinkaari)
  - `spec/workflows/01_mvp_flow.md` (E0–E5: ennustusprosessin vaiheet)
- Tämä tiedosto on tiivis puu, ei toteutusspeksi. Jos ristiriita, `spec/` voittaa.

## Nimeäminen (ettei “0” mene sekaisin)
- SaaS-vaiheet (org-taso): `S-1`, `S0`, `S1` (myynti/provisiointi → onboarding → trial/entitlement).
- Ennustusprosessin vaiheet (projektitaso): `E0..E5` (tavoitearvion import → suunnittelu → baseline → seuranta → loki → raportti).
- Älä käytä ilmaisua “Vaihe 0” ilman prefiksiä (`S0` tai `E0`).
- Tässä tiedostossa:
  - `S-1`, `S0` ja `S1` ovat SaaS-vaiheita
  - `E0` ja `E1` ovat ennustusprosessin vaiheita

## S-1 — SaaS-myynti + provisiointi (SaaS-myyjä)
```text
S-1 — SaaS-myynti + provisiointi (SaaS-myyjä)
├─ Myynti (ihmisprosessi)
│  ├─ Tuote-esittely + tarvekartoitus
│  ├─ Demo tutustuttavaksi
│  ├─ Hinnoittelu + tarjous
│  └─ Sopimus / tilaus vahvistuu
└─ Provisionointi (järjestelmässä)
   ├─ (Valinnainen) Luo konserni (Group) tai käytä “oma konserni”
   ├─ Luo yhtiö (Organization)
   │  └─ Järjestelmä luo demoprojektin (Project, `is_demo=true`)
   └─ Luo ORG_ADMIN-kutsu
      └─ Kutsulinkki: email-sidottu + kertakäyttöinen + vanheneva
```

## S0 — Organisaation onboarding (ORG_ADMIN)
```text
S0 — Organisaation onboarding (ORG_ADMIN)
├─ Avaa kutsulinkki
│  ├─ Validoi: ei käytetty, ei peruttu, ei vanhentunut, email täsmää
│  └─ Käyttäjä:
│     ├─ olemassa samalla emaililla → liitä
│     └─ ei ole → luo
├─ Hyväksy kutsu (redeem)
│  ├─ Myönnä org-rooli: ORG_ADMIN
│  └─ Myönnä demo-projektin rooli: PROJECT_OWNER
└─ Ota org käyttöön
   ├─ Luo varsinaiset projektit
   ├─ Roolita henkilöt projekteihin
   └─ Hallitse demoprojekti: arkistoi tai (myöhemmin) muunna oikeaksi
```

## S1 — PLG: Trial + entitlement + projektin elinkaari (SMB/PLG)
```text
S1 — PLG: Trial + entitlement + projektin elinkaari (SMB/PLG)
├─ Org entitlement (subscription_status)
│  ├─ trialing → active → past_due → read_only / canceled
│  ├─ past_due: grace_until (7–14 pv) → grace expired → read_only
│  └─ Gate: read_only/canceled → domain-write estyy (ENTITLEMENT_READ_ONLY)
├─ Poikkeus: commerce-endpointit
│  └─ checkout/portaali-session luonti sallittu myös read_only-tilassa
├─ Projektin tila (project_status)
│  ├─ ACTIVE | STANDBY | ARCHIVED
│  └─ Gate: != ACTIVE → projektin domain-write estyy (PROJECT_NOT_ACTIVE)
└─ Reaktivointi (STANDBY → ACTIVE)
   ├─ Käyttäjä pyytää checkoutin (idempotentti)
   └─ Webhook paid → projekti ACTIVE (idempotentti + audit)
```

## E0 — Tavoitearvioesityksen import (projekti)
```text
E0 — Tavoitearvioesityksen import (projekti)
├─ Importoi tavoitearvio projektille (TARGET_ESTIMATE import_batch)
├─ Esimäppäys: jokaiselle 4-num koodille vastinpari `litteras`-masterdatassa
│  ├─ koodi käsitellään merkkijonona `^\\d{4}$`
│  └─ leading zerot säilyvät (esim. "0310" ei muutu "310")
├─ (Valinn.) Ehdotukset (suggestion only, ei automaatiota)
└─ Näytä “selvitettävät” ennen suunnittelua (virheelliset/puutteelliset rivit)
```

## E1 — Tuotannon työpakettien taloudellinen suunnittelu (TP+HP)
```text
E1 — Tuotannon työpakettien taloudellinen suunnittelu (TP+HP)
├─ Precondition
│  ├─ Projekti on olemassa ja tiimi roolitettu
│  └─ Tavoitearvio on importattu projektille (E0: tavoitearvion import)
├─ Suunnittelun periaate
│  ├─ Perusyksikkö = tavoitearviorivi (item)
│  └─ Append-only, versioitu suunnitelma
├─ Hankintapaketti (HP): maksuerät
│  ├─ Luo HP (urakka/sopimus)
│  └─ Määritä maksuerät (2–10+)
│     ├─ `due_week` (ISO-viikko)
│     ├─ `amount_pct` tai `amount_eur`
│     └─ `label`
├─ Työpaketti (TP): 2 aikajanaa + painotus
│  ├─ Aseta työjakso: `work_start_week`..`work_end_week`
│  ├─ Aseta kustannusjakso: `cost_start_week`..`cost_end_week`
│  └─ Aseta painotus: `cost_bias_pct` (liukuri 0–100 + preview-jakauma)
├─ Mäppäys
│  ├─ Mäppää itemit työpaketteihin (item → TP)
│  └─ Linkitä TP hankintapakettiin (MVP-oletus 1:1)
└─ Postcondition
   ├─ Suunnitelma READY_FOR_FORECAST (tai DRAFT)
   └─ Seuraava: E2 baseline-lukitus
```

## Mitä muuttui
- Lisätty uusi workflow-työpuu tiedostona SaaS-vaiheille (S-1/S0/S1) ja ennustusvaiheille (E0/E1).
- Lisätty rajaus: kanoninen speksi on `spec/workflows/*`.
- Tarkennettu nimeäminen: SaaS-vaiheet `S-1/S0/S1` ja ennustusprosessin vaiheet `E0..`.
- Lisätty E0-puu (tavoitearvio import) eksplisiittisesti, ei vain esivaatimusviittauksena.
- Lisätty S1-puu (PLG trial/entitlement + projektin ACTIVE/STANDBY/ARCHIVED).
- Lisätty nimeämisohje: “Vaihe 0” vaatii prefiksin (`S0`/`E0`).

## Miksi
- Tarvitaan yhteinen, nopeasti silmäiltävä “vaihepuu”, joka erottaa myynnin/provisionoinnin, onboardingin ja tuotannon suunnittelun.
- Vähennetään S- ja E‑vaiheiden sekoittumista viestinnässä.

## Miten testataan (manuaali)
- Avaa `docs/workflows/2026-01-15_workflow_tree_-1_0_1.md` ja varmista, että `S-1`, `S0`, `S1`, `E0` ja `E1` ovat omissa osioissaan.
- Varmista, että `E0`-osio sisältää importin ja leading zero -säännön.
- Varmista, että E1:n esivaatimuksessa viitataan `E0`-importtiin (ei “vaihe 0”).
- Varmista, että `S1`-osio sisältää read-only-gaten, commerce-poikkeuksen ja STANDBY-reaktivoinnin.
- Varmista, että Nimeäminen‑osiossa on “Vaihe 0” + prefiksi ‑ohje.
