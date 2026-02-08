#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[dev-keepalive] Starting Next-UI stack (db, pgadmin, web_next)..."
docker compose -f docker-compose.yml -f docker-compose.next.yml up -d --remove-orphans db pgadmin web_next

echo "[dev-keepalive] Waiting for http://127.0.0.1:3000 ..."
for attempt in $(seq 1 60); do
  if curl -fsS -o /dev/null http://127.0.0.1:3000; then
    echo "[dev-keepalive] UI is up at http://127.0.0.1:3000"
    exit 0
  fi
  sleep 2
done

echo "[dev-keepalive] UI did not respond in time. Check logs:"
echo "docker logs --tail 200 codex_next_web"
exit 1
