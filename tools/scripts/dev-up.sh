#!/usr/bin/env bash
set -euo pipefail

# Dev-start (Codespaces): käynnistä DB + pgAdmin + Next-UI ja ratkaise yleisimmät porttikolarit.
#
# Mitä muuttui:
# - Tämä skripti osaa tunnistaa Docker-kontit, jotka varaavat portit 3000 (UI) tai 5433 (DB),
#   ja pysäyttää ne automaattisesti, jotta Ennuste-stack käynnistyy kerralla.
# Miksi:
# - Codespacesissa 502 johtuu tyypillisesti siitä, että web_next ei nouse, koska portti on jo varattu.
# Miten testataan (manuaali):
# - Aja: `bash tools/scripts/dev-up.sh --auto`
# - Odota että tulostuu "OK: web_next vastaa portissa 3000."
# - Avaa UI portista 3000 (Codespaces: Ports -> Open in Browser)

AUTO=0
AUTO_STOP_CONFLICTS="${ENNUSTE_AUTO_STOP_PORT_CONFLICTS:-0}"
FORCE_RECREATE="${ENNUSTE_FORCE_RECREATE:-1}"
WAIT_SECONDS="${ENNUSTE_WAIT_SECONDS:-120}"

usage() {
  cat <<'TXT'
Käyttö:
  bash tools/scripts/dev-up.sh [--auto]

Valinnat:
  --auto  Pysäytä automaattisesti porttikolarit ja pakota web_next uusiksi.

Ympäristömuuttujat:
  ENNUSTE_AUTO_STOP_PORT_CONFLICTS=1  Pysäyttää myös tuntemattomat porttikolarit (varo!).
  ENNUSTE_FORCE_RECREATE=0|1          Oletus 1.
  ENNUSTE_WAIT_SECONDS=120            Oletus 120.
TXT
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ "${1:-}" == "--auto" ]]; then
  AUTO=1
  AUTO_STOP_CONFLICTS=1
  FORCE_RECREATE=1
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

compose=(docker compose -f docker-compose.yml -f docker-compose.next.yml)
services=(db pgadmin web_next)
required_ports=(3000 5433)

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Virhe: docker ei loydy PATH:sta."
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "Virhe: Docker-daemoniin ei saa yhteytta."
    exit 1
  fi
}

containers_using_port() {
  local port="$1"
  # Muodot: "0.0.0.0:3000->3000/tcp, [::]:3000->3000/tcp"
  docker ps --format '{{.Names}}\t{{.Ports}}' \
    | grep -E "(:|\\])${port}->" \
    | cut -f1 \
    | sort -u \
    || true
}

is_safe_to_stop() {
  local name="$1"
  case "$name" in
    codex_pg|codex_next_web|codex_saas_db|codex_saas_pgadmin|codex_saas_app)
      return 0
      ;;
  esac

  if [[ "$name" =~ ^(codex_|ennuste_) ]]; then
    return 0
  fi

  local compose_project=""
  compose_project="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' "$name" 2>/dev/null || true)"
  if [[ "$compose_project" == "ennuste-app" ]]; then
    return 0
  fi

  return 1
}

stop_container() {
  local name="$1"
  echo "Pysaytetaan kontti (porttikolari): $name"
  docker stop "$name" >/dev/null || true
}

free_ports() {
  local port
  for port in "${required_ports[@]}"; do
    mapfile -t names < <(containers_using_port "$port")
    if [[ "${#names[@]}" -eq 0 ]]; then
      continue
    fi

    local name
    for name in "${names[@]}"; do
      if is_safe_to_stop "$name"; then
        stop_container "$name"
        continue
      fi

      if [[ "$AUTO_STOP_CONFLICTS" == "1" ]]; then
        stop_container "$name"
        continue
      fi

      echo "Virhe: portti $port on kaytossa kontilla '$name'."
      echo "Pysayta se itse tai aja uudelleen: ENNUSTE_AUTO_STOP_PORT_CONFLICTS=1 bash tools/scripts/dev-up.sh --auto"
      exit 1
    done
  done
}

wait_for_web() {
  local deadline=$((SECONDS + WAIT_SECONDS))
  while (( SECONDS < deadline )); do
    if docker exec codex_next_web node -e "require('http').get('http://127.0.0.1:3000', r=>{process.exit((r.statusCode===200||r.statusCode===302||r.statusCode===303||r.statusCode===307)?0:1)}).on('error', ()=>process.exit(2));" >/dev/null 2>&1; then
      echo "OK: web_next vastaa portissa 3000."
      return 0
    fi
    sleep 2
  done

  echo "Virhe: web_next ei vastaa portissa 3000 (${WAIT_SECONDS}s)."
  echo "Lokit (web_next):"
  docker logs --tail 120 codex_next_web || true
  return 1
}

main() {
  require_docker
  free_ports

  up_args=(up -d --remove-orphans)
  if [[ "$FORCE_RECREATE" == "1" ]]; then
    up_args+=(--force-recreate)
  fi

  "${compose[@]}" "${up_args[@]}" "${services[@]}"

  wait_for_web

  echo "Avaa UI: http://localhost:3000 (Codespaces: Ports -> 3000 -> Open in Browser)"
}

main

