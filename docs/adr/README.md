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
- ADR-0010: Ensisijainen UI-polku

## Mitä muuttui
- Yhdenmukaistettiin ADR-0001-otsikko vastaamaan päätösdokumenttia.
- Lisättiin ADR-0010 listaan.

## Miksi
- Listauksen pitää vastata päätösdokumenttien otsikoita ja helpottaa hakua.
- UI-polun päätös on näkyvissä samasta listasta.

## Miten testataan (manuaali)
- Avaa `docs/adr/README.md` ja tarkista, että listan otsikot vastaavat ADR-tiedostojen otsikoita.
- Varmista, että ADR-0010 näkyy listassa.
