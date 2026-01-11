# Codex – Repo-kohtaiset asetukset

Tämä hakemisto sisältää Codex CLI:n repo-kohtaiset asetukset.
Tavoite: turvallinen, toistettava ja dokumentoitu agenttityöskentely.

## Oletuskäyttö
```bash
codex
```

## Profiilit
- project_coach: projektikoutsi, ei koske koodiin (read-only)
- db: DB/migraatiot, harkittu kirjoitus
- review: koodikatselmointi ennen mergeä (read-only)
- ui: UI/UX-iterointi

## Käyttöohje
```bash
codex --profile project_coach
codex --profile db
codex --profile review
codex --profile ui
```
