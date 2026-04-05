param(
  [int]$Port = 3090
)

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$tmpDir = Join-Path $workspaceRoot "tmp"
$pidPath = Join-Path $tmpDir "regression-web-$Port.pid"

$processId = $null
if (Test-Path $pidPath) {
  $processId = [System.IO.File]::ReadAllText($pidPath).Trim()
}

if (-not $processId) {
  Write-Output "NOT-RUNNING"
  exit 0
}

$process = Get-Process -Id ([int]$processId) -ErrorAction SilentlyContinue
if (-not $process) {
  if (Test-Path $pidPath) { Remove-Item $pidPath -Force }
  Write-Output "NOT-RUNNING"
  exit 0
}

try {
  $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/sign-in" -UseBasicParsing -TimeoutSec 2
  if ($response.StatusCode -eq 200) {
    Write-Output "READY:${processId}:${Port}"
    exit 0
  }
} catch {
}

Write-Output "RUNNING:${processId}:${Port}"
