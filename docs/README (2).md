# Repo Docs Index

Tämä paketti sisältää arkkitehtuuri- ja toteutusspeksin multi-tenant SaaS:lle (MVP → v2).

## Sisältö

- **docs/01-architecture-brief.md**  
  Arkkitehtuurin malli: C4-henkinen kokonaiskuva, päätökset, data-malli, tenant-eristys, RBAC ja JSONB→normalisointi-polku.

- **docs/02-implementation-brief.md**  
  Kehittäjälle: konkreettiset toteutusvaatimukset, endpointit, RBAC-check, audit-log ja testikriteerit.

- **docs/03-api-min-spec.md**  
  Minimi-API-speksi (payload-esimerkit + suositellut statuskoodit).

- **docs/04-rbac.md**  
  Permission-avaimet, roolitus, sekä tarkistuslogiikka (valid_from/to).

- **docs/05-tenant-isolation.md**  
  Tenant-eristyksen toteutus MVP:ssä (app-layer) ja v2:ssa (Postgres RLS) + esimerkkipolitiikat.

- **docs/06-migration-jsonb-to-normalized.md**  
  Hallittu migraatiomalli JSONB-kentistä normalisoituun rakenteeseen (vaiheistus).

- **docs/adr/**  
  ADR-päätösdokumentit (lyhyet, helposti ylläpidettävät).

- **db/00-schema.sql**  
  PostgreSQL skeema (MVP). Sisältää myös valinnaiset RLS-osat kommentoituna.

- **db/01-seed-permissions.sql**  
  Oletus-permissionit (insertit) ja esimerkkiroolit (valinnainen).

- **docs/prompts/**  
  Valmiit promptit arkkitehdille ja koodarille (FI+EN), päivitetty viittaamaan repo-tiedostoihin.

## Käyttö
1) Lisää nämä tiedostot repoosi sellaisenaan.  
2) Käytä promptteja (docs/prompts/*) kun pyydät arkkitehdilta tai koodarilta jatkotyötä.  
3) Pidä ADR:t ajan tasalla, jos päätöksiä muutetaan.

## Mitä muuttui
- Lisätty muutososiot dokumentin loppuun.

## Miksi
- Dokumentaatiokäytäntö: muutokset kirjataan näkyvästi.

## Miten testataan (manuaali)
- Avaa dokumentti ja varmista, että osiot ovat mukana.
