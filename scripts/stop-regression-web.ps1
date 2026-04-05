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
if ($process) {
  Stop-Process -Id ([int]$processId) -Force
  Write-Output "STOPPED:${processId}"
} else {
  Write-Output "STALE:${processId}"
}

if (Test-Path $pidPath) {
  Remove-Item $pidPath -Force
}
