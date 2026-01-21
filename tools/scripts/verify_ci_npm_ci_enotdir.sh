#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

CI_WORKFLOW_FILE=".github/workflows/ci.yml"

say() { printf '%s\n' "$*"; }
die() { say "FAIL: $*"; exit 1; }

SUMMARY_LINES=()
summary_add() { SUMMARY_LINES+=("$*"); }

write_step_summary() {
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    {
      printf '## CI npm ci ENOTDIR – verification\n\n'
      for line in "${SUMMARY_LINES[@]}"; do
        printf '%s\n' "$line"
      done
      if [[ "$CHECK_A" == "PASS" && "$CHECK_B" == "PASS" && "$CHECK_C" == "PASS" ]]; then
        printf '\n- OVERALL: PASS\n'
      else
        printf '\n- OVERALL: FAIL\n'
      fi
      printf '\n'
    } >>"$GITHUB_STEP_SUMMARY"
  fi
}

report_stdout() {
  say "REPORT"
  say "- CHECK A: $CHECK_A"
  say "- CHECK B: $CHECK_B"
  say "- CHECK C: $CHECK_C"
  if [[ "$CHECK_A" == "PASS" && "$CHECK_B" == "PASS" && "$CHECK_C" == "PASS" ]]; then
    say "- OVERALL: PASS"
  else
    say "- OVERALL: FAIL"
  fi
}

cleanup() {
  if [[ -n "${WORKDIR:-}" && -d "${WORKDIR:-}" ]]; then
    rm -rf -- "$WORKDIR"
  fi
}

on_exit() {
  set +e
  say
  report_stdout
  write_step_summary
  cleanup
}
trap on_exit EXIT

CHECK_A="FAIL"
CHECK_B="FAIL"
CHECK_C="FAIL"
WORKDIR=""

say "CI npm ci ENOTDIR – verification"
say

say "CHECK A: No tracked node_modules paths"
if git ls-files | grep -E '(^|/)node_modules(/|$)'; then
  say "Result: FAIL"
  say "Action: remove tracked node_modules paths from git (keep ignored)."
  summary_add "- CHECK A: FAIL (tracked node_modules paths found)"
  exit 1
else
  CHECK_A="PASS"
  say "Result: PASS"
  summary_add "- CHECK A: PASS"
fi
say

say "CHECK B: Pre-clean step exists in CI"
[[ -f "$CI_WORKFLOW_FILE" ]] || die "Missing $CI_WORKFLOW_FILE"

missing=0
if ! grep -Fq "rm -rf node_modules apps/web/node_modules" "$CI_WORKFLOW_FILE"; then
  say "Missing: rm -rf node_modules apps/web/node_modules"
  missing=1
fi
if ! grep -Fq "find . -maxdepth 4 -name node_modules -prune -exec rm -rf {} +" "$CI_WORKFLOW_FILE"; then
  say "Missing: find . -maxdepth 4 -name node_modules -prune -exec rm -rf {} +"
  missing=1
fi

if [[ "$missing" -ne 0 ]]; then
  say "Result: FAIL"
  summary_add "- CHECK B: FAIL (CI pre-clean commands missing)"
  exit 1
else
  CHECK_B="PASS"
  say "Result: PASS"
  summary_add "- CHECK B: PASS"
fi
say

say "CHECK C: ENOTDIR trap removal works"
WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/verify-ci-npm-ci-enotdir.XXXXXX")"
mkdir -p "$WORKDIR/apps/web"
printf "not a directory" >"$WORKDIR/apps/web/node_modules"
[[ -f "$WORKDIR/apps/web/node_modules" ]] || die "Trap setup failed: apps/web/node_modules is not a file"

(
  cd "$WORKDIR"
  rm -rf node_modules apps/web/node_modules
  find . -maxdepth 4 -name node_modules -prune -exec rm -rf {} +
)

if [[ -e "$WORKDIR/apps/web/node_modules" ]]; then
  say "Result: FAIL"
  say "Expected apps/web/node_modules to be removed by pre-clean."
  summary_add "- CHECK C: FAIL (ENOTDIR trap was not removed)"
  exit 1
else
  CHECK_C="PASS"
  say "Result: PASS"
  summary_add "- CHECK C: PASS"
fi
say

if [[ "$CHECK_A" == "PASS" && "$CHECK_B" == "PASS" && "$CHECK_C" == "PASS" ]]; then
  say "OVERALL: PASS"
  exit 0
else
  say "OVERALL: FAIL"
  exit 1
fi
