# Demo-kaaviot: yritykset, tyomaat ja roolit

Paivitetty: 2026-02-08
Lahde: `data/samples/demo_catalog.v1.json` (kanoninen manifesti)

## Kaavio 1: Demo-rakenne

```mermaid
flowchart LR
  subgraph O["Yritykset"]
    OA["Demo organisaatio A"]
    OB["Demo organisaatio B"]
    OK["Kide-Asunnot Ot"]
  end

  subgraph P["Tyomaat / projektit"]
    PA["Demo projekti A (P1)"]
    PB["Demo projekti B (P1)"]
    PK1["Kide Kaarna (P0)"]
    PK2["Kide Puro (P1)"]
    PK3["Kide Kivi (P1)"]
    PK4["Kide Sointu (P1)"]
    PK5["Kide Kajo (P1)"]
    PK6["Kide Utu (P2)"]
  end

  subgraph R["Roolit demossa"]
    R1["ORG_ADMIN"]
    R2["SELLER"]
    R3["PROJECT_MANAGER"]
    R4["GENERAL_FOREMAN"]
    R5["SITE_FOREMAN"]
    R6["PRODUCTION_MANAGER"]
    R7["PROCUREMENT"]
    R8["EXEC_READONLY"]
  end

  OA --> PA
  OB --> PB
  OK --> PK1
  OK --> PK2
  OK --> PK3
  OK --> PK4
  OK --> PK5
  OK --> PK6

  OA --> R1
  OA --> R2
  OB --> R1
  OB --> R2
  OK --> R1

  PA --> R3
  PA --> R4
  PA --> R5
  PA --> R6
  PA --> R7
  PA --> R8

  PB --> R3
  PB --> R4
  PB --> R5
  PB --> R6
  PB --> R7
  PB --> R8

  PK1 --> R3
  PK1 --> R4
  PK1 --> R5
  PK1 --> R6
  PK1 --> R7
  PK1 --> R8
```

## Kaavio 2: Kide-ympariston roolijako tyomailla

```mermaid
flowchart TB
  subgraph KIDE["Kide-Asunnot Ot"]
    subgraph PM["Tyopaallikot"]
      PM1["kide.pm1 -> Kaarna, Puro, Kivi"]
      PM2["kide.pm2 -> Sointu, Kajo, Utu"]
    end

    subgraph GF["Vastaavat mestarit"]
      GF1["kide.gf1 -> Kaarna"]
      GF2["kide.gf2 -> Puro"]
      GF3["kide.gf3 -> Kivi"]
      GF4["kide.gf4 -> Sointu"]
      GF5["kide.gf5 -> Kajo"]
      GF6["kide.gf6 -> Utu"]
    end

    subgraph SF["Tyonjohtajat"]
      SF1["kide.sf1 -> Kaarna"]
      SF2["kide.sf2 -> Puro"]
      SF3["kide.sf3 -> Kivi"]
      SF4["kide.sf4 -> Sointu"]
      SF5["kide.sf5 -> Kajo"]
      SF6["kide.sf6 -> Utu"]
    end

    subgraph SHARED["Kaikille tyomaille jaetut roolit"]
      PROD["kide.prod -> PRODUCTION_MANAGER"]
      PROC["kide.proc -> PROCUREMENT"]
      EXEC["kide.exec -> EXEC_READONLY"]
    end
  end
```

## Kaavio 3: Demo-organisaatioiden roolimalli (A/B)

```mermaid
flowchart LR
  subgraph A["Demo organisaatio A"]
    AADMIN["org.admin.a -> ORG_ADMIN"]
    ASELL["seller.a -> SELLER"]
    ATEAM["site/general/project/production/procurement/exec .a"]
    APROJ["Demo projekti A"]
  end

  subgraph B["Demo organisaatio B"]
    BADMIN["org.admin.b -> ORG_ADMIN"]
    BSELL["seller.b -> SELLER"]
    BTEAM["site/general/project/production/procurement/exec .b"]
    BPROJ["Demo projekti B"]
  end

  AADMIN --> A
  ASELL --> A
  ATEAM --> APROJ

  BADMIN --> B
  BSELL --> B
  BTEAM --> BPROJ
```

## Mita muuttui

- Lisatty yksi ladattava kaaviodokumentti, jossa on 3 kaaviota.
- Kaaviot kuvaavat demossa olevat yritykset, tyomaat ja roolit.

## Miksi

- Tarvitaan yksi helposti jaettava dokumentti myynti- ja hyvaksyntakierroksille.

## Miten testataan (manuaali)

1) Avaa `docs/demo/DEMO_KAAVIOT.md`.
2) Varmista, etta Mermaid-kaaviot renderoituvat editorissa.
3) Vertaa sisaltoa tiedostoon `data/samples/demo_catalog.v1.json`.
smoke 2026-02-08
