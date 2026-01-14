# ADR

Päätösdokumentit: miksi teimme näin.

## Lista
- ADR-0001: Event sourcing -malli ennustukseen
- ADR-0002: MVP-työnkulkujen päätökset
- ADR-001: Hybridi data-malli (normalisoitu + JSONB)
- ADR-002: Tenant-eristys tenant_id:llä kaikessa domain-datassa
- ADR-003: RBAC + aikarajatut roolit (valid_from/to)
- ADR-004: Audit-log kriittisille muutoksille
- ADR-005: Projektin SaaS-tyypilliset metatiedot
- ADR-0006: Yhtenäinen kirjautumis- ja uloskirjautumisvirta
- ADR-0007: Kaikki merkittävät päätökset kirjataan ADR:iin
- ADR-0008: Postgres-taulurakenne speksin pohjalta
- ADR-0009: Raportoinnin indeksisuositukset
- ADR-0010: Ensisijainen UI-polku
- ADR-0013: Next-UI ainoa käyttöliittymä
- ADR-0014: Konserni/yhtiö/projekti-hierarkia ja onboarding
- ADR-0015: Append-only item-mäppäys (tavoitearviorivi → työpaketti)
- ADR-0016: Clean baseline ja mäppäyksen erottelu
- ADR-0017: Speksin taulunimet (monikko) + NFR-baseline
- ADR-0018: Ehdotuskerros importin jälkeen (ei kovakoodattua mäppäysautomaatiota)
- ADR-0019: Tuotannon taloudellisen suunnittelun jako (hankintapaketti → työpaketti) ja append-only “poisto/lisäys”

## Mitä muuttui
- Yhdenmukaistettiin ADR-0001-otsikko vastaamaan päätösdokumenttia.
- Lisättiin ADR-0010 listaan.

## Miksi
- Listauksen pitää vastata päätösdokumenttien otsikoita ja helpottaa hakua.
- UI-polun päätös on näkyvissä samasta listasta.

## Miten testataan (manuaali)
- Avaa `docs/adr/README.md` ja tarkista, että listan otsikot vastaavat ADR-tiedostojen otsikoita.
- Varmista, että ADR-0010 näkyy listassa.
- Varmista, että ADR-0013 näkyy listassa.
- Varmista, että ADR-0014 näkyy listassa.
