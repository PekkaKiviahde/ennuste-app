#!/bin/sh
set -eu

# Best-effort pipefail (not POSIX; supported by bash/ksh/zsh).
(set -o pipefail) 2>/dev/null && set -o pipefail || true

require_env() {
  name="$1"
  eval "value=\${$name-}"
  if [ -z "${value:-}" ]; then
    echo "ERROR: missing env: $name" >&2
    exit 2
  fi
}

require_cmd() {
  name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "ERROR: missing command: $name" >&2
    exit 2
  fi
}

require_env AGENT_INTERNAL_TOKEN
require_env OPENAI_API_KEY
require_env GH_TOKEN

require_cmd docker
require_cmd curl
require_cmd node

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$repo_root"

compose_base="$repo_root/docker-compose.yml"
compose_agent="$repo_root/docker-compose.agent-api.yml"

override="$(mktemp /tmp/compose.agent-workflow-report.XXXXXX.yml)"
cleanup() {
  rm -f "$override" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

cat >"$override" <<'YAML'
services:
  agent_api:
    environment:
      AGENT_INTERNAL_TOKEN: ${AGENT_INTERNAL_TOKEN}
      GH_TOKEN: ${GH_TOKEN}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
YAML

docker compose -f "$compose_base" -f "$compose_agent" -f "$override" up -d --build db agent_api

deadline_s=60
i=0
while [ "$i" -lt "$deadline_s" ]; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:3011/agent/run" || true)"
  case "$code" in
    404|405|200) break ;;
    *) sleep 1 ;;
  esac
  i=$((i + 1))
done

if [ "$i" -ge "$deadline_s" ]; then
  echo "ERROR: agent_api not responding on http://127.0.0.1:3011 after ${deadline_s}s" >&2
  exit 1
fi

response_json="$(mktemp /tmp/agent.workflow-report.response.XXXXXX.json)"

payload="$(node - <<'NODE'
const projectId = process.env.AGENT_PROJECT_ID || "demo";
const task = `Paivita OLEMASSA OLEVAA tiedostoa docs/workflows/workflow_report.md kanonisten speksien spec/workflows/* pohjalta.
ALA luo uutta tiedostoa. ALA muuta yhtaan muuta tiedostoa kuin docs/workflows/workflow_report.md.
ALA koske spec/workflows/* tiedostoihin.
Pida raportin rakenne 00_workflow_outline.md mukaisena ja kayta otsikoita jarjestyksessa:
Tavoite, Termit, Paatokset, Gate, Audit-eventit, Mita muuttui, Miksi, Miten testataan.
Kirjoita suomeksi ja vain konkreettista sisaltoa spekseista.
Gate-osiossa mainitse: trial-raja (1 projekti/3 kayttajaa/1 importti), baseline lukitus ennen ennustetapahtumia,
project_status ACTIVE/STANDBY, entitlement read_only + commerce-poikkeus, viikkoprosessi + month close (jos spekseissa).
Audit-eventit: listaa spekseissa nimetyt eventit tarkasti.
Lisaa loppuun Source specs -lista kaikista luetuista spec/workflows/*.md tiedostoista.
Patchin pitaa olla validi paivitys olemassa olevaan tiedostoon (ei new file mode/dev/null).`;
process.stdout.write(
  JSON.stringify({
    mode: "change",
    dryRun: false,
    projectId,
    task,
  }),
);
NODE
)"

http_code="$(curl -sS -o "$response_json" -w '%{http_code}' \
  -X POST "http://127.0.0.1:3011/agent/run" \
  -H "x-internal-token: ${AGENT_INTERNAL_TOKEN}" \
  -H "authorization: Bearer ${AGENT_INTERNAL_TOKEN}" \
  -H "content-type: application/json" \
  -d "$payload" || true)"

if [ "$http_code" != "200" ]; then
  echo "ERROR: /agent/run returned HTTP $http_code" >&2
  cat "$response_json" >&2 || true
  exit 1
fi

redact_json() {
  # Redact tokenized GitHub URLs if they ever leak into stderr fields.
  sed -E 's#https://x-access-token:[^@]+@github\.com/#https://x-access-token:<REDACTED>@github.com/#g'
}

cat "$response_json" | redact_json

node - <<'NODE' "$response_json"
const fs = require("node:fs");
const file = process.argv[1];
const raw = fs.readFileSync(file, "utf8");
const res = JSON.parse(raw);

const changedFiles = Array.isArray(res.changedFiles) ? res.changedFiles : [];
const expected = "docs/workflows/workflow_report.md";

if (res.status !== "ok") {
  console.error("ERROR: status != ok");
  process.exit(1);
}

if (changedFiles.length !== 1 || changedFiles[0] !== expected) {
  console.error(`ERROR: changedFiles must be only ${expected}`);
  console.error(`changedFiles=${JSON.stringify(changedFiles)}`);
  process.exit(1);
}

if (res.prUrl) {
  console.log(`PR: ${res.prUrl}`);
} else if (res.compareLink) {
  console.log(`COMPARE: ${res.compareLink}`);
} else {
  console.error("ERROR: missing prUrl and compareLink");
  process.exit(1);
}
NODE

