# scripts/dev-e2e.ps1
# Usage:
#   .\scripts\dev-e2e.ps1           # full E2E
#   .\scripts\dev-e2e.ps1 smoke     # @smoke subset
#   .\scripts\dev-e2e.ps1 invite    # partial name match

param(
  [string]$mode = "full"   # "full" | "smoke" | "<partial name or spec path>"
)

$ErrorActionPreference = "Stop"
function Log([string]$msg) { Write-Host "[$(Get-Date -Format HH:mm:ss)] $msg" }

# 0) Clean
Log "Killing port 3001 if needed…"
try { npx kill-port 3001 | Out-Null } catch {}
try { Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue } catch {}

# IMPORTANT: don't force NODE_ENV. Next sets it correctly:
# - `next build` => production
# - `next dev`   => development
$env:PORT = "3001"
$env:BASE_URL = "http://localhost:3001"
$env:NEXT_PUBLIC_USE_SUPABASE = "0"
$env:NEXT_PUBLIC_E2E_DEV_SAFETY = "1"
$env:NEXT_PUBLIC_E2E_REAL = "1"
$env:E2E_REAL = "1"

# 1) Install deps
Log "npm ci…"
npm ci

# 2) TS check (Windows-safe npx form)
Log "TypeScript check…"
npx --yes --package typescript@5.6.3 tsc -p . --noEmit

# 3) Playwright browsers
Log "Install Playwright browsers…"
npx playwright install --with-deps

# 4) Build & start (production build)
Log "Building Next.js…"
npm run build

Log "Starting server on :3001…"
Start-Process -FilePath "npm" -ArgumentList "run","start","--","-p","3001" -NoNewWindow
Start-Sleep -Seconds 1

# 5) Wait for server
Log "Waiting for $env:BASE_URL …"
$max = 60
for ($i=0; $i -lt $max; $i++) {
  try {
    Invoke-WebRequest -Uri "$env:BASE_URL" -UseBasicParsing -TimeoutSec 2 | Out-Null
    break
  } catch { Start-Sleep -Milliseconds 500 }
  if ($i -eq $max-1) { throw "Server did not start on $env:BASE_URL" }
}

# 6) Optional dev seed endpoints (ignore if missing)
try {
  Invoke-RestMethod -Method GET -Uri "$env:BASE_URL/api/test/reset" | Out-Null
  Invoke-RestMethod -Method GET -Uri "$env:BASE_URL/api/test/login-as?user=u_test" | Out-Null
} catch { Log "Dev reset endpoints not available (skipping)"; }

# 7) Choose tests
$cmd = @("npx","playwright","test","--workers=1","--reporter=line")
switch -Regex ($mode) {
  "^smoke$" { $cmd += @("-g","@smoke") }
  "^full$"  { } # run all
  default   { $cmd += @("-g",$mode) }
}

# 8) Run tests
Log "Running: $($cmd -join ' ')"
$code = (Start-Process -FilePath $cmd[0] -ArgumentList $cmd[1..($cmd.Length-1)] -NoNewWindow -PassThru -Wait).ExitCode
exit $code
