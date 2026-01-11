#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WEB_DIR="$ROOT_DIR/apps/web"

if [ ! -d "$WEB_DIR" ]; then
  echo "apps/web not found"
  exit 1
fi

echo "Checking apps/web for OpenAI SDK imports and OPENAI_* references..."

if find "$WEB_DIR" -path "*/node_modules/*" -o -path "*/.next/*" -o -type f -print | \
  xargs grep -n "from \"openai\"" >/dev/null 2>&1; then
  echo "ERROR: OpenAI SDK import found in apps/web"
  exit 1
fi

if find "$WEB_DIR" -path "*/node_modules/*" -o -path "*/.next/*" -o -type f -print | \
  xargs grep -n "OPENAI_API_KEY\\|OPENAI_API_KEY_PROD" >/dev/null 2>&1; then
  echo "ERROR: OPENAI_API_KEY reference found in apps/web"
  exit 1
fi

echo "OK: apps/web has no OpenAI SDK or OPENAI_* references."
