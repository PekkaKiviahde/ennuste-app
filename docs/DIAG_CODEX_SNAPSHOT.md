# Codex-diagnoosi snapshot 2026-01-11T04:39:37+00:00 (/workspaces/ennuste-app)

## 1) Perusymparisto
- Komento: `pwd`
  - Tulos: `/workspaces/ennuste-app`
  - Tulkinta: OK
- Komento: `whoami`
  - Tulos: `codespace`
  - Tulkinta: OK
- Komento: `uname -a`
  - Tulos: `Linux codespaces-6d2413 6.8.0-1030-azure #35~22.04.1-Ubuntu SMP Mon May 26 18:08:30 UTC 2025 x86_64 x86_64 x86_64 GNU/Linux`
  - Tulkinta: OK
- Komento: `node -v`
  - Tulos: `v24.12.0`
  - Tulkinta: OK
- Komento: `npm -v`
  - Tulos: `11.6.2`
  - Tulkinta: OK

## 2) Codex CLI
- Komento: `command -v codex`
  - Tulos: `/home/codespace/nvm/current/bin/codex`
  - Tulkinta: OK
- Komento: `codex --version`
  - Tulos: `codex-cli 0.80.0`
  - Tulkinta: OK
- Komento: `codex --help | head -n 5`
  - Tulos: `Codex CLI` + `Usage: codex [OPTIONS] [PROMPT]`
  - Tulkinta: OK
- Komento: `codex login status`
  - Tulos: `Logged in using ChatGPT`
  - Tulkinta: OK

## 3) Env-muuttujat (SET/NOT SET)
- Komento: `echo $OPENAI_API_KEY`
  - Tulos: `OPENAI_API_KEY=SET`
  - Tulkinta: OK
- Komento: `echo $OPENAI_API_KEY_PROD`
  - Tulos: `OPENAI_API_KEY_PROD=NOT SET`
  - Tulkinta: HUOM
- Komento: `echo $OPENAI_ORG`
  - Tulos: `OPENAI_ORG=NOT SET`
  - Tulkinta: HUOM
- Komento: `echo $OPENAI_PROJECT`
  - Tulos: `OPENAI_PROJECT=NOT SET`
  - Tulkinta: HUOM
- Komento: `echo $HTTP_PROXY`
  - Tulos: `HTTP_PROXY=NOT SET`
  - Tulkinta: OK
- Komento: `echo $HTTPS_PROXY`
  - Tulos: `HTTPS_PROXY=NOT SET`
  - Tulkinta: OK
- Komento: `echo $NO_PROXY`
  - Tulos: `NO_PROXY=NOT SET`
  - Tulkinta: HUOM
- Komento: `echo $NODE_OPTIONS`
  - Tulos: `NODE_OPTIONS=NOT SET`
  - Tulkinta: OK
- Komento: `echo $CI`
  - Tulos: `CI=NOT SET`
  - Tulkinta: OK

## 4) Repo- ja workspace-asetukset
- Komento: `git status --porcelain`
  - Tulos: 15 riviä, esimerkit: `M .github/workflows/ci.yml`, `M package.json`, `?? apps/api/`
  - Tulkinta: HUOM
- Komento: `git rev-parse --abbrev-ref HEAD`
  - Tulos: `main`
  - Tulkinta: OK
- Komento: `ls -la .`
  - Tulos: `package.json`, `.nvmrc`, `.env`, `.env.example`, `.github/`
  - Tulkinta: OK
- Komento: `ls -la .github/workflows`
  - Tulos: `ci.yml`, `db-smoke.yml`
  - Tulkinta: OK

## 5) Codespaces-konteksti
- Komento: `echo $CODESPACES`
  - Tulos: `CODESPACES=SET`
  - Tulkinta: OK
- Komento: `echo $GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN`
  - Tulos: `GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN=SET`
  - Tulkinta: OK
- Komento: `ss -ltn`
  - Tulos: onnistui osittain; `Cannot open netlink socket: Operation not permitted` mutta listasi kuuntelevia portteja (esim. 2222, 2000)
  - Tulkinta: HUOM

## 6) Paatelma
### 5 tärkeinta ehtoa, joiden tayttyessa Codex toimii
1) `codex` loytyy PATH:sta (OK)
2) Node/npm ok (OK)
3) Auth ok (codex login status: OK)
4) `OPENAI_API_KEY` saatavilla (SET)
5) Proxy-ymparisto ei esta (HTTP/HTTPS proxy not set; OK)

### 5 yleisinta vikasyyta ja miten havaitaan snapshotista
1) `codex` ei loydy PATH:sta -> `command -v codex` tyhja (HUOM)
2) Node/npm puuttuu tai vanha -> `node -v` / `npm -v` puuttuu tai virhe
3) Auth puuttuu -> `codex login status` ei ok
4) API-key puuttuu -> `OPENAI_API_KEY=NOT SET`
5) Proxy estaa -> `HTTP_PROXY`/`HTTPS_PROXY` set ja yhteysongelmat
