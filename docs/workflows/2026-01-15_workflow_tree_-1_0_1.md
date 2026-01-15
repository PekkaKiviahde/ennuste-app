# Työpuu: vaihe −1, 0 ja 1

Tämä tiedosto on “työpuu-näkymä” eri vaiheista.
Päivitämme tähän myöhemmin myös muita workflow-vaiheita ja tarkennuksia.

## Rajaus: missä on “totuus”
- Kanoninen prosessispeksi:
  - `spec/workflows/00_sales_phase.md` (vaihe −1)
  - `spec/workflows/02_org_hierarchy_onboarding.md` (vaihe 0)
  - `spec/workflows/01_mvp_flow.md` (vaihe 1 →)
- Tämä tiedosto on tiivis puu, ei toteutusspeksi. Jos ristiriita, `spec/` voittaa.

## Vaihe −1 — SaaS-myynti + provisiointi (SaaS-myyjä)
```text
Vaihe −1 — SaaS-myynti + provisiointi (SaaS-myyjä)
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

## Vaihe 0 — Organisaation onboarding (ORG_ADMIN)
```text
Vaihe 0 — Organisaation onboarding (ORG_ADMIN)
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

## Vaihe 1 — Tuotannon työpakettien taloudellinen suunnittelu (TP+HP)
```text
Vaihe 1 — Tuotannon työpakettien taloudellinen suunnittelu (TP+HP)
├─ Precondition
│  ├─ Projekti on olemassa ja tiimi roolitettu
│  └─ Tavoitearvio on importattu projektille (operatiivinen vaihe 0)
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
   └─ Seuraava: baseline-lukitus (vaihe 2)
```

## Mitä muuttui
- Lisätty uusi workflow-työpuu tiedostona vaiheille −1, 0 ja 1.
- Lisätty rajaus: kanoninen speksi on `spec/workflows/*`.

## Miksi
- Tarvitaan yhteinen, nopeasti silmäiltävä “vaihepuu”, joka erottaa myynnin/provisionoinnin, onboardingin ja tuotannon suunnittelun.

## Miten testataan (manuaali)
- Avaa `docs/workflows/2026-01-15_workflow_tree_-1_0_1.md` ja varmista, että vaiheet −1, 0 ja 1 näkyvät omissa osioissaan ja sisältävät myyjän osuuden.
