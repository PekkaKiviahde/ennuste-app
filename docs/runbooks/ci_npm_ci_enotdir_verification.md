# CI npm ci ENOTDIR – verification

## Mitä korjattiin (lyhyesti)
- `npm ci` saattoi kaatua CI:ssä virheeseen `ENOTDIR`, kun `node_modules` (tai `apps/web/node_modules`) oli checkoutissa **tiedosto tai symlink**, ei hakemisto.
- Korjaus on: `node_modules` ei saa olla gitissä trackattuna + ennen `npm ci`:tä ajetaan deterministinen **pre-clean**, ja lisäksi ajetaan **verifiointiraportti**.

## Mikä oli juurisyy
- Repo/checkout sisälsi polun `node_modules` (tai `apps/web/node_modules`) muodossa, joka ei ole hakemisto (tiedosto/symlink).
- Tällöin `npm ci` voi törmätä `ENOTDIR`-tilanteeseen asentaessaan riippuvuuksia.

## Mitä CI tekee nyt
- Vartija: CI failaa heti, jos gitissä on trackattuja `node_modules`-polkuja.
- Pre-clean: CI poistaa deterministisesti `node_modules`-artefaktit ennen `npm ci`:tä (dir/file/symlink).
- Raportti: CI ajaa erillisen verifioinnin, joka tuottaa PASS/FAIL-yhteenvedon ja kirjoittaa Step Summaryyn.

## Automaattinen CI-raportti (mistä se löytyy)
- GitHub Actions job: `CI`
- Step: `ENOTDIR verification report`
- Lisäksi Step Summary -osioon tulee sama PASS/FAIL-yhteenveto.

## PASS/FAIL-kriteerit
PASS, jos kaikki täyttyy:
1) Gitissä ei ole trackattuja `node_modules`-polkuja.
2) `.github/workflows/ci.yml` sisältää pre-clean-komennot:
   - `rm -rf node_modules apps/web/node_modules`
   - `find . -maxdepth 4 -name node_modules -prune -exec rm -rf {} +`
3) ENOTDIR-ansa (tiedosto `apps/web/node_modules`) poistuu onnistuneesti samoilla pre-clean-komennoilla.

FAIL, jos mikä tahansa yllä oleva ei täyty.

## Lokaali todennus (verkollinen ympäristö)
1) Aja deterministinen verifiointi (ei vaadi npm:ää eikä verkkoa):
```bash
bash tools/scripts/verify_ci_npm_ci_enotdir.sh
```

2) Aja varsinainen `npm ci` (vaatii verkon):
```bash
rm -rf node_modules apps/web/node_modules && npm ci
```

## Jos `npm ci` on BLOCKED (DNS / HOME write)
Tämä ei liity ENOTDIR-korjaukseen, vaan ympäristörajoitteisiin (tyypillistä tiukoissa sandbokseissa).

Tunnista:
- DNS / verkko:
  - `getent hosts registry.npmjs.org`
  - `curl -I https://registry.npmjs.org/`
- `$HOME` ei ole kirjoitettavissa:
  - `test -w "$HOME" || echo "HOME not writable"`

Vaihtoehdot:
- Luota CI:hin: anna GitHub Actionsin ajaa `npm ci` ja katso step `ENOTDIR verification report` + `npm ci`-stepin exit code.
- Aja verkollisessa dev-ympäristössä.
- Jos ympäristö sallii, vaihda kirjoitettava HOME (tilapäisesti):
  - `export HOME=/tmp`

## Mitä tehdä jos FAIL
- CHECK A FAIL (trackattu `node_modules`):
  - Poista `node_modules`-polut gitistä (ja varmista että ne ovat `.gitignore`:ssa), sitten uusi commit.
- CHECK B FAIL (pre-clean puuttuu CI:stä):
  - Lisää/korjaa pre-clean-komennot `.github/workflows/ci.yml`:iin.
- CHECK C FAIL (ansa ei poistu):
  - Varmista, että CI:n pre-clean poistaa sekä `apps/web/node_modules` että yleiset `node_modules`-polut (dir/file/symlink).

## Rollback
Rollback = revert tämä PR.
- Poistaa verifiointiscriptin, runbookin ja CI-stepin `ENOTDIR verification report`.
- Palauttaa CI:n takaisin tilaan ennen raportointia (ei suositella, jos halutaan toistettava todistepaketti).
