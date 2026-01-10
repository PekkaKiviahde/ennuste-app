# AGENTS.md (packages/shared)

Tämä tiedosto täydentää repo-juuren AGENTS.md:ää shared-kerrokselle.

## Fokus
- Jaetut tyypit ja pienet apufunktiot, joita domain/application/infra/web käyttävät.
- Ei domain-sääntöjä (ne kuuluvat domainiin).
- Ei infraa (DB, verkko) eikä UI:ta.

## Käytännöt
- Pidä shared erittäin kevyt ja vakaa:
  - pieniä, helposti testattavia utilseja
  - ei “kaatopaikkaa” sekalaiselle koodille
- Jos apuri liittyy selvästi vain yhteen kerrokseen, älä laita sharediin.

## Laatu
- Vähintään typecheckin pitää mennä läpi (`npm run typecheck` rootista).
- Jos lisäät monimutkaisen helperin, lisää myös testit jos projekti käyttää sharedissa testejä; muuten pidä helper triviaalina.
