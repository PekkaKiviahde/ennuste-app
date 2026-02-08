# NEXT_SWC_LOCKFILE (Next.js SWC / lockfile virheet)

## Mita muuttui
- Lisatty tarkka minimipolku SWC/lockfile-virheiden selvitykseen Next-UI:ssa.
- Lisatty erottelu: milloin virhe on vain varoitus ja milloin se estaa kaynnistyksen.

## Miksi
- `Failed to patch lockfile` ja SWC-binariin liittyvat virheet sekoittuvat usein muihin ongelmiin.
- Tarkka runbook lyhentaa debugointia ja estaa tarpeettomat isot toimenpiteet.

## Miten testataan (manuaali)
1) Aja `npm --workspace apps/web run build`.
2) Jos virhe toistuu, aja korjausvaiheet jarjestyksessa kohdasta "Korjausvaiheet".
3) Varmista lopuksi, etta `npm --workspace apps/web run build` menee lapi.

## Oireet
- Logissa:
  - `Failed to patch lockfile`
  - `Found lockfile missing swc dependencies`
  - SWC-binari puuttuu / Next ei kaynnisty.

## Korjausvaiheet (min -> max)
1) Varmista Node-versio:
```bash
node -v
```
Odotus: `24.x`.

2) Varmista `web_next`-env:
- `NEXT_IGNORE_INCORRECT_LOCKFILE=1`

3) Uudelleenkaynnista vain Next-kontti:
```bash
docker compose -f docker-compose.yml -f docker-compose.next.yml up -d --build web_next
```

4) Jos ongelma jatkuu, kaynnista Next ilman vanhaa konttia:
```bash
docker rm -f codex_next_web
docker compose -f docker-compose.yml -f docker-compose.next.yml up -d web_next
```

5) Jos build yha kaatuu, aja hostissa puhdas asennus:
```bash
npm ci --workspaces --include-workspace-root --no-audit --no-fund
npm --workspace apps/web run build
```

## Varmistus
- `npm --workspace apps/web run build` onnistuu.
- `http://localhost:3000/login` avautuu ilman server erroria.

## Huomio
- Jos samanaikaisesti nakyy `Migraatio 0055 estetty`, kyse ei ole SWC-ongelmasta.
- Kayta silloin `docs/runbooks/CODEX_STARTUP.md` kohtaa "0055-vikatilannepolku".
