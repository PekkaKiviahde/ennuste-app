#!/usr/bin/env bash
set -euo pipefail

MIGRATION_FILE="${MIGRATION_FILE:-migrations/0048_change_requests_mt_lt.sql}"

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql not found. Install Postgres client or run in an environment with psql." >&2
  exit 2
fi

if [[ ! -f "$MIGRATION_FILE" ]]; then
  echo "ERROR: Migration file not found: $MIGRATION_FILE" >&2
  exit 2
fi

# Connection: uses DATABASE_URL if present, otherwise default psql env/config.
PSQL=(psql -v ON_ERROR_STOP=1 -At)
if [[ -n "${DATABASE_URL:-}" ]]; then
  PSQL+=( "$DATABASE_URL" )
fi

# Extract object names from migration (best-effort).
# We keep it simple and pragmatic: take the token after TABLE/VIEW/FUNCTION (and before '(' for functions).
extract_table_like() {
  # tables + (materialized) views
  grep -Eis '^\s*CREATE\s+(TABLE|VIEW|MATERIALIZED\s+VIEW)\b' "$MIGRATION_FILE" \
  | sed -E 's/--.*$//' \
  | awk '
    BEGIN{IGNORECASE=1}
    {
      # normalize spaces
      gsub(/\t/," ");
      # split into tokens
      n=split($0,a," ");
      # find keyword TABLE/VIEW
      for(i=1;i<=n;i++){
        if(tolower(a[i])=="table" || tolower(a[i])=="view"){
          j=i+1;
          # skip optional OR REPLACE / IF NOT EXISTS / MATERIALIZED
          while(j<=n && (tolower(a[j])=="or" || tolower(a[j])=="replace" || tolower(a[j])=="if" || tolower(a[j])=="not" || tolower(a[j])=="exists")){
            j++;
          }
          name=a[j];
          # strip trailing punctuation
          sub(/\(.*/,"",name);
          sub(/;$/,"",name);
          gsub(/"/,"",name);
          if(name!="") print name;
          break;
        }
        if(tolower(a[i])=="materialized" && tolower(a[i+1])=="view"){
          # handle MATERIALIZED VIEW
          j=i+2;
          while(j<=n && (tolower(a[j])=="if" || tolower(a[j])=="not" || tolower(a[j])=="exists")){
            j++;
          }
          name=a[j];
          sub(/\(.*/,"",name);
          sub(/;$/,"",name);
          gsub(/"/,"",name);
          if(name!="") print name;
          break;
        }
      }
    }' \
  | sort -u
}

extract_functions() {
  grep -Eis '^\s*CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\b' "$MIGRATION_FILE" \
  | sed -E 's/--.*$//' \
  | sed -E 's/.*FUNCTION\s+//I' \
  | sed -E 's/\s*\(.*$//' \
  | sed -E 's/;.*$//' \
  | sed -E 's/"//g' \
  | sort -u
}

missing=0
echo "== DB smoke: change requests (MT/LT) =="
echo "Migration: $MIGRATION_FILE"
echo

echo "-- Checking tables/views (to_regclass) --"
while IFS= read -r obj; do
  [[ -z "$obj" ]] && continue
  res="$("${PSQL[@]}" -c "SELECT to_regclass('$obj');" 2>/dev/null || true)"
  if [[ -z "$res" || "$res" == " " ]]; then
    echo "MISSING: $obj"
    missing=1
  else
    echo "OK: $obj"
  fi
done < <(extract_table_like)

echo
echo "-- Checking functions (pg_proc, name only) --"
while IFS= read -r fn; do
  [[ -z "$fn" ]] && continue
  schema="public"
  name="$fn"
  if [[ "$fn" == *.* ]]; then
    schema="${fn%%.*}"
    name="${fn#*.}"
  fi
  res="$("${PSQL[@]}" -c "SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='$schema' AND p.proname='$name' LIMIT 1;" 2>/dev/null || true)"
  if [[ "$res" != "1" ]]; then
    echo "MISSING: ${schema}.${name}()"
    missing=1
  else
    echo "OK: ${schema}.${name}()"
  fi
done < <(extract_functions)

echo
if [[ "$missing" -eq 1 ]]; then
  echo "FAIL: Some objects are missing. Did you run migrations on this DB?" >&2
  exit 1
fi

echo "PASS: All parsed objects appear to exist."
