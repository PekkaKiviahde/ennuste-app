# smoke.ps1 (robust, Windows-friendly)
[CmdletBinding()]
param(
  [switch]$ImportBudget,
  [switch]$ImportJyda
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---------- CONFIG ----------
$BudgetCsv   = "data\budget.csv"
$JydaCsv     = "excel\Jyda-ajo Kaarnatien Kaarna.csv"
$OccurredOn  = "2025-12-01"      # YYYY-MM-DD (kuukauden 1. päivä)
$ImportedBy  = "Pekka"

$DbContainer = "codex_saas_db"
$DbUser      = "codex"
$DbName      = "codex"

# ---------- HELPERS ----------
function Say($msg) { Write-Host "`n$msg" -ForegroundColor Cyan }
function Die($msg) { throw $msg }

function Load-DatabaseUrlFromEnv([string]$path) {
  if (!(Test-Path $path)) { return }

  $allowed = @("DATABASE_URL", "DATABASE_URL_HOST", "DATABASE_URL_DOCKER")
  Get-Content $path | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
      $key = $matches[1]
      if ($allowed -notcontains $key) { return }

      $value = $matches[2].Trim()
      if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
      }

      [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

function Redact-DatabaseUrl([string]$url) {
  if ([string]::IsNullOrWhiteSpace($url)) { return "" }
  try {
    $uri = [System.Uri]$url
    if ($uri.UserInfo) {
      $user = $uri.UserInfo.Split(":")[0]
      $port = if ($uri.IsDefaultPort) { "" } else { ":$($uri.Port)" }
      $db = $uri.AbsolutePath.TrimStart("/")
      return "postgresql://${user}:***@$($uri.Host)$port/$db"
    }
  } catch {
    # fallback to regex below
  }
  return ($url -replace '://([^:]+):[^@]+@', '://$1:***@')
}

function Run-Checked([string]$title, [scriptblock]$cmd) {
  Say $title
  & $cmd
  if ($LASTEXITCODE -ne 0) { Die "Komento epäonnistui (exit=$LASTEXITCODE): $title" }
}

function PsqlOneLine([string]$sql, [switch]$TupleOnly) {
  $args = @("exec","-i",$DbContainer,"psql","-U",$DbUser,"-d",$DbName,"-X","-v","ON_ERROR_STOP=1")
  if ($TupleOnly) { $args += @("-t","-A") }
  $out = & docker @args -c $sql
  if ($LASTEXITCODE -ne 0) { Die "psql epäonnistui: $sql" }
  return $out
}

function PsqlFromFile([string]$path) {
  if (!(Test-Path $path)) { Die "Tiedostoa ei löydy: $path" }

  # tärkeä: cmd/type tarvitsee varman, resolvatun polun
  $full = (Resolve-Path $path).Path

  # type -> docker exec psql (varma tapa Windowsissa)
  cmd /c "type `"$full`"" | docker exec -i $DbContainer psql -U $DbUser -d $DbName -X -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) { Die "psql epäonnistui tiedostolla: $full" }
}

# ---------- PRECHECK ----------
# ajetaan scriptin sijainnista (repo-juuri)
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoRoot

Load-DatabaseUrlFromEnv (Join-Path $RepoRoot ".env")
if (-not $env:DATABASE_URL -and $env:DATABASE_URL_HOST) {
  $env:DATABASE_URL = $env:DATABASE_URL_HOST
}

Write-Host "Käytetään tiedostoja:"
Write-Host "  BudgetCsv : $BudgetCsv"
Write-Host "  JydaCsv   : $JydaCsv"
Write-Host "  OccurredOn: $OccurredOn"
Write-Host "  ImportedBy: $ImportedBy"
if ($env:DATABASE_URL) {
  Write-Host "  DATABASE_URL (redacted): $(Redact-DatabaseUrl $env:DATABASE_URL)"
} else {
  Write-Host "  DATABASE_URL (redacted): ei asetettu"
}
Write-Host ""
Write-Host "VAROITUS: tämä poistaa docker-volyymin (DB-data nollautuu)!"

# ---------- DOCKER RESET ----------
Run-Checked "Docker: alas + volyymit pois" { docker compose down -v }
Run-Checked "Docker: ylös" { docker compose up -d }

# ---------- WAIT DB READY ----------
Say "Odotetaan että Postgres on valmis..."
$ok = $false
for ($i=0; $i -lt 60; $i++) {
  docker exec $DbContainer pg_isready -U $DbUser -d $DbName *> $null
  if ($LASTEXITCODE -eq 0) { $ok = $true; break }
  Start-Sleep -Seconds 1
}
if (-not $ok) { Die "Postgres ei tullut valmiiksi (60s). Katso: docker logs $DbContainer" }

# ---------- WAIT DB QUERY READY ----------
Say "Varmistetaan ett„ Postgres vastaanottaa kyselyit„..."
$queryOk = $false
for ($i=0; $i -lt 60; $i++) {
  docker exec $DbContainer psql -U $DbUser -d $DbName -X -v ON_ERROR_STOP=1 -c "SELECT 1" *> $null
  if ($LASTEXITCODE -eq 0) { $queryOk = $true; break }
  Start-Sleep -Seconds 1
}
if (-not $queryOk) { Die "Postgres ei tullut t„ysin valmiiksi (SELECT 1, 60s). Katso: docker logs $DbContainer" }

# ---------- MIGRATIONS ----------
Say "Ajetaan migraatiot 0001-0003"
PsqlFromFile "migrations\0001_init.sql"
PsqlFromFile "migrations\0002_views.sql"
if (Test-Path "migrations\0003_jyda_snapshot_views.sql") {
  PsqlFromFile "migrations\0003_jyda_snapshot_views.sql"
}

# ---------- CREATE PROJECT ----------
Say "Luodaan projekti (INSERT projects) ja otetaan PROJECT_ID talteen"
$ProjectId = ((PsqlOneLine "INSERT INTO projects (name, customer) VALUES ('Smoke project','SMOKE') RETURNING project_id;" -TupleOnly).Trim().Split()[0])
if ($ProjectId -notmatch '^[0-9a-fA-F-]{36}$') { Die "PROJECT_ID ei ollut UUID: $ProjectId" }
Write-Host "PROJECT_ID = $ProjectId"

# ---------- PYTHON IMPORTS ----------
if ($ImportBudget -or $ImportJyda) {
  $Py = ".\.venv\Scripts\python.exe"
  if (!(Test-Path $Py)) {
    Die "Python-venv puuttuu: $Py. Luo venv: python -m venv .venv; .venv\Scripts\activate; pip install -r tools\scripts\requirements.txt"
  }
}
}

if ($ImportBudget) {
  if (!(Test-Path $BudgetCsv)) { Die "BudgetCsv missing: $BudgetCsv. Provide the file or run without -ImportBudget." }

  Write-Host "ImportBudget: käytössä"

  # ---------- SEED LITTERAS (BUDGET) ----------
  Say "Seed litteras budget.csv:stä"
  & $Py "tools\scripts\seed_litteras_from_budget_csv.py" --project-id $ProjectId --file $BudgetCsv
  if ($LASTEXITCODE -ne 0) { Die "seed_litteras_from_budget_csv.py epäonnistui" }

  # ---------- IMPORT BUDGET ----------
  Say "Import budget.csv"
  & $Py "tools\scripts\import_budget.py" --project-id $ProjectId --file $BudgetCsv --imported-by $ImportedBy
  if ($LASTEXITCODE -ne 0) { Die "import_budget.py epäonnistui" }

  # Kopioi budjetti OccurredOn-kuukaudelle (append-only)
  Say "Kopioidaan budjetti OccurredOn-kuukaudelle (append-only)"
  $copyBudgetSql = @"
WITH month_start AS (SELECT date_trunc('month', '$OccurredOn'::date)::date AS d),
month_end AS (SELECT (date_trunc('month', '$OccurredOn'::date) + interval '1 month - 1 day')::date AS d),
last_batch AS (
  SELECT import_batch_id
  FROM import_batches
  WHERE project_id='$ProjectId'::uuid
    AND source_system='TARGET_ESTIMATE'
  ORDER BY imported_at DESC
  LIMIT 1
)
INSERT INTO budget_lines (project_id, target_littera_id, cost_type, amount, source, valid_from, valid_to, import_batch_id, created_by)
SELECT bl.project_id, bl.target_littera_id, bl.cost_type, bl.amount, bl.source,
       (SELECT d FROM month_start), (SELECT d FROM month_end),
       bl.import_batch_id, bl.created_by
FROM budget_lines bl
WHERE bl.project_id='$ProjectId'::uuid
  AND bl.import_batch_id=(SELECT import_batch_id FROM last_batch);
"@
  PsqlOneLine $copyBudgetSql | Out-Host
}

if (-not $ImportBudget -and -not $ImportJyda) {
  Write-Host "Imports skipped. Run .\\smoke.ps1 -ImportBudget and/or -ImportJyda"
}

# ---------- IMPORT JYDA ACTUALS (UNAPPROVED) ----------
if ($ImportJyda) {
  if (!(Test-Path $JydaCsv)) { Die "JydaCsv missing: $JydaCsv. Provide the file or run without -ImportJyda." }

  Write-Host "ImportJyda: käytössä"

  Say "Import JYDA actuals (sis. hyväksymätt.)"
  & $Py "tools\scripts\import_jyda_csv.py" --project-id $ProjectId --file $JydaCsv --occurred-on $OccurredOn --imported-by $ImportedBy --auto-seed-litteras --use-unapproved
  if ($LASTEXITCODE -ne 0) { Die "import_jyda_csv.py epäonnistui" }
}

# ---------- FORECAST TABLE + IMPORT FORECAST ----------
Say "Varmistetaan forecast_cost_lines taulu"
$forecastSchema = @"
CREATE TABLE IF NOT EXISTS forecast_cost_lines (
  forecast_cost_line_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  work_littera_id uuid NOT NULL REFERENCES litteras(littera_id) ON DELETE RESTRICT,
  cost_type cost_type NOT NULL,
  amount numeric(14,2) NOT NULL,
  occurred_on date NOT NULL,
  source actual_source NOT NULL DEFAULT 'JYDA'::actual_source,
  import_batch_id uuid REFERENCES import_batches(import_batch_id) ON DELETE SET NULL,
  external_ref text
);
CREATE INDEX IF NOT EXISTS idx_forecast_cost_lines_project_occurred ON forecast_cost_lines(project_id, occurred_on);
"@
PsqlOneLine $forecastSchema | Out-Host

if ($ImportJyda) {
  if (Test-Path "tools\scripts\import_forecast_from_jyda_csv.py") {
    Say "Import forecast (Ennustettu kustannus)"
    & $Py "tools\scripts\import_forecast_from_jyda_csv.py" --project-id $ProjectId --file $JydaCsv --occurred-on $OccurredOn --imported-by $ImportedBy --auto-seed-litteras
    if ($LASTEXITCODE -ne 0) { Die "import_forecast_from_jyda_csv.py epäonnistui" }
  } else {
    Write-Host "HUOM: tools/scripts/import_forecast_from_jyda_csv.py puuttuu -> forecast ohitetaan."
  }
}

# ---------- REPORT VIEW ----------
Say "Luodaan raporttinäkymä v_monthly_cost_report_by_cost_type"
$viewSql = @"
CREATE OR REPLACE VIEW v_monthly_cost_report_by_cost_type AS
WITH ct AS (SELECT unnest(enum_range(NULL::cost_type)) AS cost_type),
months AS (
  SELECT DISTINCT project_id, date_trunc('month', dt)::date AS month
  FROM (
    SELECT project_id, lower(valid_range) AS dt FROM budget_lines
    UNION ALL
    SELECT project_id, occurred_on AS dt FROM actual_cost_lines
    UNION ALL
    SELECT project_id, occurred_on AS dt FROM forecast_cost_lines
  ) x
),
b AS (
  SELECT m.project_id, m.month, bl.cost_type, SUM(bl.amount)::numeric(14,2) AS budget_amount
  FROM months m
  JOIN budget_lines bl ON bl.project_id=m.project_id AND bl.valid_range @> m.month
  GROUP BY 1,2,3
),
a AS (
  SELECT project_id, date_trunc('month', occurred_on)::date AS month, cost_type,
         SUM(amount)::numeric(14,2) AS actual_amount
  FROM actual_cost_lines
  GROUP BY 1,2,3
),
f AS (
  SELECT project_id, date_trunc('month', occurred_on)::date AS month, cost_type,
         SUM(amount)::numeric(14,2) AS forecast_amount
  FROM forecast_cost_lines
  GROUP BY 1,2,3
)
SELECT m.project_id, m.month, ct.cost_type,
       COALESCE(b.budget_amount,0)::numeric(14,2)   AS budget_amount,
       COALESCE(a.actual_amount,0)::numeric(14,2)   AS actual_amount,
       COALESCE(f.forecast_amount,0)::numeric(14,2) AS forecast_amount
FROM months m
CROSS JOIN ct
LEFT JOIN b ON b.project_id=m.project_id AND b.month=m.month AND b.cost_type=ct.cost_type
LEFT JOIN a ON a.project_id=m.project_id AND a.month=m.month AND a.cost_type=ct.cost_type
LEFT JOIN f ON f.project_id=m.project_id AND f.month=m.month AND f.cost_type=ct.cost_type;
"@
PsqlOneLine $viewSql | Out-Host

# ---------- SMOKE OUTPUT ----------
Say "SMOKE: rivimäärät"
$smokeCountsSql = @"
SELECT 'budget_lines' AS t, COUNT(*) FROM budget_lines WHERE project_id='$ProjectId'::uuid
UNION ALL SELECT 'actual_cost_lines', COUNT(*) FROM actual_cost_lines WHERE project_id='$ProjectId'::uuid
UNION ALL SELECT 'forecast_cost_lines', COUNT(*) FROM forecast_cost_lines WHERE project_id='$ProjectId'::uuid;
"@
PsqlOneLine $smokeCountsSql | Out-Host

Say "SMOKE: kuukausiraportti (PROJECT_ID + OccurredOn-kuukausi)"
$monthlyReportSql = @"
SELECT month, cost_type, budget_amount, actual_amount, forecast_amount
FROM v_monthly_cost_report_by_cost_type
WHERE project_id='$ProjectId'::uuid AND month=date_trunc('month','$OccurredOn'::date)::date
ORDER BY cost_type;
"@
PsqlOneLine $monthlyReportSql | Out-Host

Say "VALMIS ✅ (PROJECT_ID=$ProjectId)"
