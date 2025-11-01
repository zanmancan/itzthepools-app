# scripts/dev-e2e.ps1
# Usage:
#   pwsh -File scripts/dev-e2e.ps1               # full e2e (headed off)
#   pwsh -File scripts/dev-e2e.ps1 smoke         # @smoke subset
#   pwsh -File scripts/dev-e2e.ps1 invite-flow   # single spec by name
# Environment: Next.js on :3001 (adjust below if needed)

param(
  [string]$mode = "full"   # "full" | "smoke" | "<partial name or spec path>"
)

$ErrorActionPreference = "Stop"

function Log([string]$msg) { Write-Host "[$(Get-Date -Format HH:mm:ss)] $msg" }

# 0) Clean & env
Log "Killing port 3001 if needed…"
try { npx kill-port 3001 | Out-Null } catch {}
try { Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue } catch {}

$env:NODE_ENV = "development"
$env:PORT = "3001"
$env:BASE_URL = "http://localhost:3001"
$env:NEXT_PUBLIC_USE_SUPABASE = "0"
$env:NEXT_PUBLIC_E2E_DEV_SAFETY = "1"
$env:NEXT_PUBLIC_E2E_REAL = "1"
$env:E2E_REAL = "1"

# 1) Install deps once
Log "npm ci…"
npm ci

# 2) TypeScript check (same as CI; avoid the fake npx tsc)
Log "TypeScript check…"
npx -y typescript@5.6.3 tsc -p . --noEmit

# 3) Install Playwright browsers once
Log "Install Playwright browsers…"
npx playwright install --with-deps

# 4) Build & start app
Log "Building Next.js…"
npm run build

Log "Starting dev server on :3001…"
# Start in background and capture PID
Start-Process -FilePath "npm" -ArgumentList "run","start" -NoNewWindow
Start-Sleep -Seconds 1

# 5) Wait for server to respond
Log "Waiting for $env:BASE_URL …"
$max = 60
for ($i=0; $i -lt $max; $i++) {
  try {
    Invoke-WebRequest -Uri "$env:BASE_URL" -UseBasicParsing -TimeoutSec 2 | Out-Null
    break
  } catch {
    Start-Sleep -Milliseconds 500
  }
  if ($i -eq $max-1) { throw "Server did not start on $env:BASE_URL" }
}

# 6) Reset test state (optional dev endpoints)
try {
  Invoke-RestMethod -Method GET -Uri "$env:BASE_URL/api/test/reset" | Out-Null
  Invoke-RestMethod -Method GET -Uri "$env:BASE_URL/api/test/login-as?user=u_test" | Out-Null
} catch { Log "Dev reset endpoints not available (skipping)"; }

# 7) Choose tests
$cmd = @("npx","playwright","test","--workers=1","--reporter=line")
switch -Regex ($mode) {
  "^smoke$"        { $cmd += @("-g","@smoke") }
  "^full$"         { } # run all tests
  default          { $cmd += @("tests/e2e"); $cmd += @("-g",$mode) } # partial name or path
}

# 8) Run tests
Log "Running: $($cmd -join ' ')"
$code = (Start-Process -FilePath $cmd[0] -ArgumentList $cmd[1..($cmd.Length-1)] -NoNewWindow -PassThru -Wait).ExitCode

# 9) Exit with playwright code (so CI-style behavior works locally)
exit $code
